import axios from 'axios'
import multibase from 'multibase'
import { v4 as uuidv4 } from 'uuid'
import { getAcceptedFileReader, streamAsyncIterable } from '@dugrema/millegrilles.reactjs/src/stream'
import { trouverLabelImage, trouverLabelVideo } from '@dugrema/millegrilles.reactjs/src/labelsRessources'
import { ajouterUpload } from '../redux/uploaderSlice'
import { pki } from '@dugrema/node-forge'
import * as Comlink from 'comlink'

const UPLOAD_BATCH_SIZE = 5 * 1024 * 1024,
      ETAT_PREPARATION = 1,
      ETAT_PRET = 2

function setup(workers) {
    return {
        getFichierChiffre(fuuid, opts) {
            return getFichierChiffre(workers, fuuid, opts)
        },
        traiterAcceptedFiles(dispatch, usager, cuuid, acceptedFiles, opts) {
            opts = opts || {}
            const setProgres = opts.setProgres
            return traiterAcceptedFiles(workers, dispatch, usager, cuuid, acceptedFiles)
        },
        resLoader,
        clean,
    }
}

export default setup

// var _workers = null

// export function setWorkers(workers) {
//     _workers = workers
// }

// export async function getThumbnail(fuuid, opts) {
//     opts = opts || {}
//     const blob = await getFichierChiffre(fuuid, opts)
//     return blob
// }

async function getFichierChiffre(workers, fuuid, opts) {
    opts = opts || {}
    const { dataChiffre, mimetype, controller, progress } = opts
    const { connexion, chiffrage, usagerDao } = workers

    // Recuperer la cle de fichier
    const cleFichierFct = async () => {
        let cleFichier = null
        try {
            cleFichier = await usagerDao.getCleDechiffree(fuuid)
            if(cleFichier) return cleFichier
        } catch(err) {
            console.error("Erreur acces usagerDao ", err)
        }

        const reponse = await connexion.getClesFichiers([fuuid])

        cleFichier = reponse.cles[fuuid]
        const cleSecrete = await chiffrage.dechiffrerCleSecrete(cleFichier.cle)
        cleFichier.cleSecrete = cleSecrete

        // Sauvegarder la cle pour reutilisation
        usagerDao.saveCleDechiffree(fuuid, cleSecrete, cleFichier)
            .catch(err=>{
                console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
            })

        return cleFichier
    }

    let fichierFct = async () => {
        if( dataChiffre ) {
            // Convertir de multibase en array
            // console.debug("Data chiffre a dechiffrer : %O", dataChiffre)
            return multibase.decode(dataChiffre)
        } else {
            // const controller = new AbortController();
            const signal = controller?controller.signal:null

            // Recuperer le fichier
            const reponse = await axios({
                method: 'GET',
                url: `/collections/fichiers/${fuuid}`,
                responseType: 'arraybuffer',
                timeout: 20000,
                progress,
                // signal,
            })
            const abIn = Buffer.from(reponse.data)
            return abIn
        }
    }

    var [cleFichier, abFichier] = await Promise.all([cleFichierFct(), fichierFct()])
    if(cleFichier && abFichier) {
        // console.debug("Dechiffrer : cle %O, contenu : %O", cleFichier, abFichier)
        try {
            const ab = await chiffrage.chiffrage.dechiffrer(cleFichier.cleSecrete, abFichier, cleFichier)
            // console.debug("Contenu dechiffre : %O", ab)
            const blob = new Blob([ab], {type: mimetype})
            return blob
        } catch(err) {
            console.error("Erreur dechiffrage traitementFichiers : %O", err)
            throw err
        }
    }

    console.error("Erreur chargement image %s (erreur recuperation cle ou download)", fuuid)
}

/* Donne acces aux ressources, selection via typeRessource. Chargement async. 
   Retourne { src } qui peut etre un url ou un blob. 
*/
export function resLoader(fichier, typeRessource, opts) {
    // console.debug("Res loader fichier %s : typeRessource %O, opts %O", fichier, typeRessource, opts)
    opts = opts || {}
    const { fileId } = fichier
    const versionCourante = fichier.version_courante || {}
    const { anime } = versionCourante
    // console.debug("Loader %s avec sources %O (opts: %O)", typeRessource, fichier, opts)

    let selection = ''
    if(typeRessource === 'video') {
        // Charger video pleine resolution
        const {video} = versionCourante
        if(video) {
            const labelVideo = trouverLabelVideo(Object.keys(video), opts)
            // console.debug("Label video trouve : '%s'", labelVideo)
            selection = video[labelVideo]
        }
    } else if(typeRessource === 'image') {
        // Charger image pleine resolution
        const mimetype = versionCourante.mimetype
        if(anime && mimetype.startsWith('image/')) {
            // Pas un video et anime
            selection = {versionCourante, fuuid: fichier.fuuid}
        } else {
            const images = versionCourante.images || {}
            const labelImage = trouverLabelImage(Object.keys(images), opts)
            // console.debug("Label image trouve : '%s'", labelImage)
            selection = images[labelImage]
        }
    } else if(typeRessource === 'poster') {
        // Charger poster (fallback image pleine resolution)
        const images = versionCourante.images || {}
        if(images.poster) selection = images.poster
        else {
            const labelImage = trouverLabelImage(Object.keys(images), opts)
            // console.debug("Label image trouve : '%s'", labelImage)
            selection = images[labelImage]
        }
    } else if(typeRessource === 'thumbnail') {
        // Charger thumbnail (fallback image poster, sinon pleine resolution)
        const images = versionCourante.images || {}
        if(images.thumbnail) selection = images.thumbnail
        else if(images.poster) selection = images.poster
        else {
            const labelImage = trouverLabelImage(Object.keys(images), opts)
            // console.debug("Label image trouve : '%s'", labelImage)
            selection = images[labelImage]
        }
    } else if(typeRessource === 'original') {
        // Charger contenu original
        selection = {versionCourante, fuuid: fichier.fuuid}
    }

    if(selection) {
        const fuuid = selection.fuuid_video || selection.hachage || selection.fuuid
        const mimetype = selection.mimetype || versionCourante.mimetype || fichier.mimetype
        if(!fuuid) {
            console.warn("Aucun fuuid trouve pour file_id: %s (selection: %O)", fileId, selection)
            throw new Error(`Aucun fuuid trouve pour file_id: ${fileId}`)
        }
        // console.debug("Charger video selection %O, mimetype: %O, fuuid video: %s", selection, mimetype, fuuid)
        const controller = new AbortController()
        const urlBlob = getFichierChiffre(fuuid, {mimetype, controller})
            .then(blob=>URL.createObjectURL(blob))
            // .catch(err=>console.error("Erreur creation url blob fichier %s : %O", selection.hachage, err))

        return { srcPromise: urlBlob, clean: ()=>{
            try { controller.abort() } catch(err) {console.debug("Erreur annulation getFichierChiffre : %O", err)}
            clean(urlBlob) 
        }}
    }

    return false
}

async function clean(urlBlobPromise) {
    try {
        const urlBlob = await urlBlobPromise
        // console.debug("Cleanup blob %s", urlBlob)
        URL.revokeObjectURL(urlBlob)
    } catch(err) {
        console.debug("Erreur cleanup URL Blob : %O", err)
    }
}

async function traiterAcceptedFiles(workers, dispatch, usager, cuuid, acceptedFiles, opts) {
    opts = opts || {}
    const { setProgres } = opts
    const { clesDao, transfertFichiers } = workers
    const userId = usager.extensions.userId
    console.debug("traiterAcceptedFiles Debut pour userId %s, cuuid %s, fichiers %O", userId, cuuid, acceptedFiles)

    const certificatMaitredescles = await clesDao.getCertificatsMaitredescles()
    console.debug("Set certificat maitre des cles ", certificatMaitredescles)
    await transfertFichiers.up_setCertificat(certificatMaitredescles.certificat)

    const ajouterPartProxy = Comlink.proxy((correlation, compteurPosition, chunk) => ajouterPart(workers, correlation, compteurPosition, chunk))
    const updateFichierProxy = Comlink.proxy((doc, opts) => updateFichier(workers, dispatch, doc, opts))
    const setProgresProxy = setProgres?Comlink.proxy(setProgres):null
    const resultat = await transfertFichiers.traiterAcceptedFiles(
        acceptedFiles, userId, cuuid, 
        ajouterPartProxy, 
        updateFichierProxy,
        setProgresProxy
    )
    return resultat
}

async function ajouterPart(workers, correlation, compteurPosition, chunk) {
    const { uploadFichiersDao } = workers
    console.debug("ajouterPart %s position %d : %O", correlation, compteurPosition, chunk)
    await uploadFichiersDao.ajouterFichierUploadFile(correlation, compteurPosition, chunk)
}

async function updateFichier(workers, dispatch, doc, opts) {
    opts = opts || {}
    const correlation = doc.correlation
    const demarrer = opts.demarrer || false,
          err = opts.err

    const { uploadFichiersDao } = workers

    console.debug("Update fichier %s demarrer? %s err? %O : %O", correlation, demarrer, err, doc)

    if(err) {
        console.error("Erreur upload fichier %s : %O", correlation, err)
        // Supprimer le fichier dans IDB
        uploadFichiersDao.supprimerFichier(correlation)
            .catch(err=>console.error('updateFichier Erreur nettoyage %s suite a une erreur : %O', correlation, err))
        return
    }
    
    await uploadFichiersDao.updateFichierUpload(doc)

    // Declencher l'upload si applicable
    if(demarrer) dispatch(ajouterUpload(doc))
}

// async function traiterAcceptedFiles(workers, dispatch, usager, acceptedFiles, setProgres) {
//     const { uploadFichiersDao, clesDao } = workers
//     const now = new Date().getTime()

//     console.debug("Accepted files ", acceptedFiles)
//     let tailleTotale = 0
//     for (const file of acceptedFiles) {
//         tailleTotale += file.size
//     }
//     console.debug("Preparation de %d bytes", tailleTotale)

//     const userId = usager.extensions.userId,
//           certificatCa = usager.ca

//     const { cipher: transform } = await creerCipher(workers, certificatCa)

//     let taillePreparee = 0
//     for await (const file of acceptedFiles) {
//         const correlation = '' + uuidv4()
//         const stream = file.stream()
//         console.debug("File %s stream : %O", file.name, stream)

//         const reader = getAcceptedFileReader(file)
//         const iterReader = streamAsyncIterable(reader, {batchSize: UPLOAD_BATCH_SIZE, transform})
//         let compteurChunks = 0,
//             compteurPosition = 0

//         const docIdb = {
//             // PK
//             correlation, userId, 

//             // Metadata recue
//             nom: file.name || correlation,
//             taille: file.size,
//             mimetype: file.type || 'application/octet-stream',

//             // Etat initial
//             etat: ETAT_PREPARATION, 
//             positionsCompletees: [],
//             tailleCompletee: 0,
//             dateCreation: now,
//             retryCount: -1,  // Incremente sur chaque debut d'upload
//             transactionGrosfichiers: null,
//             transactionMaitredescles: null,
//         }

//         await uploadFichiersDao.updateFichierUpload(docIdb)
        
//         const frequenceUpdate = 500
//         let dernierUpdate = 0

//         try {
//             for await (const chunk of iterReader) {
//                 console.debug("Traitement chunk %d transforme taille %d", compteurChunks, chunk.length)

//                 // Conserver dans idb
//                 await uploadFichiersDao.ajouterFichierUploadFile(correlation, compteurPosition, chunk)
//                 compteurPosition += chunk.length

//                 taillePreparee += chunk.length
//                 const now = new Date().getTime()
//                 if(dernierUpdate + frequenceUpdate < now) {
//                     dernierUpdate = now
//                     setProgres(Math.floor(100*taillePreparee/tailleTotale))
//                 }

//                 compteurChunks ++
//             }

//             // const hachage_bytes = resultatChiffrage.hachage
//             // const identificateurs_document = { fuuid: hachage_bytes }
//             // const commandeMaitreDesCles = await preparerCommandeMaitrecles(
//             //     [_certificat[0]], transformHandler.secretKey, _domaine, hachage_bytes, identificateurs_document, {...paramsChiffrage, DEBUG: false})

//             docIdb.etat = ETAT_PRET
//             docIdb.taille = compteurPosition
            
//             // Update idb
//             await uploadFichiersDao.updateFichierUpload(docIdb)

//             // Dispatch pour demarrer upload
//             dispatch(ajouterUpload(docIdb))
//         } catch(err) {
//             uploadFichiersDao.supprimerFichier(correlation)
//                 .catch(err=>console.error('traiterAcceptedFiles Erreur nettoyage %s suite a une erreur : %O', correlation, err))
//             throw err
//         }

//         // Fermer affichage preparation des fichiers
//         setProgres(false)
//     }
// }

// async function creerCipher(workers, certificatCa) {
//     const { chiffrage, clesDao } = workers

//     const certCa = pki.certificateFromPem(certificatCa)
//     console.debug("CertCa : ", certCa)
//     const publicKeyCa = certCa.publicKey.publicKeyBytes
//     const fingerprintCa = await chiffrage.hacherCertificat(certificatCa)
//     console.debug("Fingerprint keyCA %O, certificat CA : %s", publicKeyCa, fingerprintCa)

//     const certificatsInfo = await clesDao.getCertificatsMaitredescles()
//     const certificats = certificatsInfo.certificat
//     console.debug("CA: %O, Certificats : %O", certificatCa, certificats)

//     const cipherHandler = await chiffrage.chiffrage.preparerCipher({clePubliqueEd25519: publicKeyCa})
//     console.debug("creerCipher handler : %O", cipherHandler)

//     throw new Error("fix me")

//     const cipher = cipherHandler.cipher

//     // return {
//     //     cipher(chunk) {
//     //         return cipher.update(chunk)
//     //     },
//     //     handler: cipherHandler,
//     // }
// }
