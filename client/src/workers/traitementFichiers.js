import axios from 'axios'
import multibase from 'multibase'
import { trouverLabelImage, trouverLabelVideo } from '@dugrema/millegrilles.reactjs/src/labelsRessources'
import { ajouterUpload } from '../redux/uploaderSlice'
import * as Comlink from 'comlink'

const CACHE_TEMP_NAME = 'fichiersDechiffresTmp',
      CONST_TIMEOUT_DOWNLOAD = 120_000

function setup(workers) {
    return {
        // getFichierChiffre(fuuid, opts) {
        //     return getFichierChiffre(workers, fuuid, opts)
        // },
        // traiterAcceptedFiles(dispatch, usager, cuuid, acceptedFiles, opts) {
        //     opts = opts || {}
        //     return traiterAcceptedFiles(workers, dispatch, usager, cuuid, acceptedFiles, opts)
        // },
        traiterAcceptedFiles(dispatch, params, opts) {
            opts = opts || {}
            return traiterAcceptedFiles(workers, dispatch, params, opts)
        },
        submitBatchUpload(doc) {
            return submitBatchUpload(workers, doc)
        },
        resLoader,
        clean,
        downloadCache(fuuid, opts) {
            return downloadCache(workers, fuuid, opts)
        },

        // Remplacement pour getFichierChiffre
        getUrlFuuid,
        getCleSecrete(cle_id) {
            return getCleSecrete(workers, cle_id)
        },
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

function getUrlFuuid(fuuid, opts) {
    opts = opts || {}
    const jwt = opts.jwt

    const url = new URL(window.location.href)
    if(jwt) {
        // Mode streaming
        url.pathname = `/collections/streams/${fuuid}`
        url.searchParams.append('jwt', jwt)
    } else {
        // Fichiers (defaut)
        url.pathname = `/collections/fichiers/${fuuid}`
    }

    return url.href
}

// async function getFichierChiffre(workers, fuuid, opts) {
//     opts = opts || {}
//     const { dataChiffre, mimetype, controller, progress, ref_hachage_bytes } = opts
//     const { connexion, chiffrage, usagerDao } = workers

//     // Recuperer la cle de fichier
//     const cleFichierFct = async () => {
//         const hachage_bytes = ref_hachage_bytes || fuuid

//         let cleFichier = null
//         try {
//             cleFichier = await usagerDao.getCleDechiffree(hachage_bytes)
//             if(cleFichier) return cleFichier
//         } catch(err) {
//             console.error("Erreur acces usagerDao ", err)
//         }

//         const reponse = await connexion.getClesFichiers([hachage_bytes])

//         cleFichier = reponse.cles[hachage_bytes]
//         const cleSecrete = await chiffrage.dechiffrerCleSecrete(cleFichier.cle)
//         cleFichier.cleSecrete = cleSecrete

//         // Sauvegarder la cle pour reutilisation
//         usagerDao.saveCleDechiffree(hachage_bytes, cleSecrete, cleFichier)
//             .catch(err=>{
//                 console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
//             })

//         return cleFichier
//     }

//     let fichierFct = async () => {
//         if( dataChiffre ) {
//             // Convertir de multibase en array
//             // console.debug("Data chiffre a dechiffrer : %O", dataChiffre)
//             return multibase.decode(dataChiffre)
//         } else {
//             // const controller = new AbortController();
//             const signal = controller?controller.signal:null

//             // Recuperer le fichier
//             const reponse = await axios({
//                 method: 'GET',
//                 url: `/collections/fichiers/${fuuid}`,
//                 responseType: 'arraybuffer',
//                 timeout: CONST_TIMEOUT_DOWNLOAD,
//                 progress,
//                 // signal,
//             })
//             const abIn = Buffer.from(reponse.data)
//             return abIn
//         }
//     }

//     var [cleFichier, abFichier] = await Promise.all([cleFichierFct(), fichierFct()])
//     if(cleFichier && abFichier) {
//         // console.debug("Dechiffrer : cle %O, contenu : %O", cleFichier, abFichier)
//         try {
//             const champsOverrides = ['header', 'format']
//             const overrides = {}
//             for (const champ of champsOverrides) {
//                 if(opts[champ]) overrides[champ] = opts[champ]
//             }
//             const cleEffective = {...cleFichier, ...overrides}  // Permet override par header, format, etc pour images/video
//             // console.debug("Dechiffre avec cle effective %O (cle %O)", cleEffective, cleFichier)
//             const ab = await chiffrage.chiffrage.dechiffrer(cleFichier.cleSecrete, abFichier, cleEffective)
//             // console.debug("Contenu dechiffre : %O", ab)
//             const blob = new Blob([ab], {type: mimetype})
//             return blob
//         } catch(err) {
//             console.error("Erreur dechiffrage traitementFichiers : %O", err)
//             throw err
//         }
//     }

//     console.error("Erreur chargement image %s (erreur recuperation cle ou download)", fuuid)
// }

async function getCleSecrete(workers, cle_id) {
    if(!cle_id) throw new Error('dechiffrer Fournir cle_id ou cle_secrete+header')

    const { connexion, usagerDao, chiffrage } = workers

    try {
        const cleFichier = await usagerDao.getCleDechiffree(cle_id)
        // La cle existe localement
        if(cleFichier) return cleFichier
    } catch(err) {
        console.error("Erreur acces usagerDao ", err)
    }

    const reponse = await connexion.getClesFichiers([cle_id])

    const cleFichier = reponse.cles[cle_id]

    const cleSecrete = await chiffrage.dechiffrerCleSecrete(cleFichier.cle)
    cleFichier.cleSecrete = cleSecrete
    cleFichier.cle_secrete = cleSecrete  // Nouvelle approche

    // Sauvegarder la cle pour reutilisation
    usagerDao.saveCleDechiffree(cle_id, cleSecrete, cleFichier)
        .catch(err=>console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err))

    return cleFichier
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

        throw new Error('obsolete')
        // const controller = new AbortController()
        // const urlBlob = getFichierChiffre(fuuid, {mimetype, controller})
        //     .then(blob=>URL.createObjectURL(blob))
        //     // .catch(err=>console.error("Erreur creation url blob fichier %s : %O", selection.hachage, err))

        // return { srcPromise: urlBlob, clean: ()=>{
        //     try { controller.abort() } catch(err) {console.debug("Erreur annulation getFichierChiffre : %O", err)}
        //     clean(urlBlob) 
        // }}
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

export async function getResponseFuuid(fuuid) {
    if(fuuid.currentTarget) fuuid = fuuid.currentTarget.value
    const cacheTmp = await caches.open(CACHE_TEMP_NAME)
    const cacheFichier = await cacheTmp.match('/'+fuuid)
    return cacheFichier
}

export async function downloadCache(workers, fuuid, opts) {
    opts = opts || {}
    const { downloadFichiersDao } = workers
    if(fuuid.currentTarget) fuuid = fuuid.currentTarget.value
    console.debug("Download fichier : %s = %O", fuuid, opts)

    const resultat = await downloadFichiersDao.getDownloadComplet(fuuid)
    console.debug("Resultat donwload complet IDB DAO : ", resultat)

    if(resultat && resultat.blob) {
        promptSaveFichier(resultat.blob, opts)
    } else {
        const cacheTmp = await caches.open(CACHE_TEMP_NAME)
        const cacheFichier = await cacheTmp.match('/'+fuuid)
        // console.debug("Cache fichier : %O", cacheFichier)
        if(cacheFichier) {
            promptSaveFichier(await cacheFichier.blob(), opts)
        } else {
            console.warn("Fichier '%s' non present dans le cache", fuuid)
        }
    }
}

function promptSaveFichier(blob, opts) {
    opts = opts || {}
    const filename = opts.filename
    let objectUrl = null
    try {
        objectUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        if (filename) a.download = filename
        if (opts.newTab) a.target = '_blank'
        a.click()
    } finally {
        if (objectUrl) {
            try {
                URL.revokeObjectURL(objectUrl)
            } catch (err) {
                console.debug("Erreur revokeObjectURL : %O", err)
            }
        }
    }
}

async function traiterAcceptedFiles(workers, dispatch, params, opts) {
    opts = opts || {}
    const { acceptedFiles, /*token, batchId,*/ cuuid, userId } = params
    const { setProgres, signalAnnuler } = opts
    const { transfertFichiers } = workers
    // console.debug("traiterAcceptedFiles Debut upload vers cuuid %s pour fichiers %O", cuuid, acceptedFiles)

    // const certificatsMaitredescles = await workers.connexion.getClesChiffrage()
    const certificatsMaitredescles = await workers.clesDao.getCertificatsMaitredescles()
    // console.debug("Certificats : %O", certificatsMaitredescles)

    await transfertFichiers.up_setCertificats(certificatsMaitredescles)
    // console.debug("Certificat maitre des cles OK")

    const setProgresProxy = setProgres?Comlink.proxy(setProgres):null

    let tailleTotale = 0
    for(let idx=0; idx<acceptedFiles.length; idx++) {
        const file = acceptedFiles[idx]
        tailleTotale += file.size
    }
    const infoTaille = {
        total: tailleTotale,
        positionChiffre: 0,
        positionFichier: 0,
    }

    for await (let file of acceptedFiles) {
        // Recuperer un token, faire 1 fichier par batch
        const infoBatch = await workers.connexion.getBatchUpload()
        // console.debug("InfoBatch ", infoBatch)
        const { batchId, token } = infoBatch
        const paramBatch = {...params, acceptedFiles: [file], token, batchId, infoTaille}

        // console.debug("Params batch upload ", paramBatch)

        const updateFichierProxy = Comlink.proxy((doc, opts) => {
            const docWithIds = {...doc, userId, batchId, token}
            console.debug("updateFichierProxy docWithIds ", docWithIds)
            return updateFichier(workers, dispatch, docWithIds, opts)
        })

        const ajouterPartProxy = Comlink.proxy(
            (correlation, compteurPosition, chunk) => ajouterPart(workers, batchId, correlation, compteurPosition, chunk)
        )
    
        await transfertFichiers.traiterAcceptedFilesV2(
            paramBatch, 
            ajouterPartProxy, 
            updateFichierProxy,
            setProgresProxy,
            signalAnnuler
        )

        infoTaille.positionChiffre += file.size
        infoTaille.positionFichier++
    }
}

async function ajouterPart(workers, batchId, correlation, compteurPosition, chunk) {
    const { uploadFichiersDao } = workers
    // console.debug("ajouterPart %s position %d : %O", correlation, compteurPosition, chunk)
    await uploadFichiersDao.ajouterFichierUploadFile(batchId, correlation, compteurPosition, chunk)
}

async function updateFichier(workers, dispatch, doc, opts) {
    opts = opts || {}
    const correlation = doc.correlation
    const demarrer = opts.demarrer || false,
          err = opts.err

    const { uploadFichiersDao } = workers

    // console.debug("Update fichier %s demarrer? %s [err? %O] : %O", correlation, demarrer, err, doc)

    if(err) {
        console.error("Erreur upload fichier %s : %O", correlation, err)
        // Supprimer le fichier dans IDB
        uploadFichiersDao.supprimerFichier(correlation)
            .catch(err=>console.error('updateFichier Erreur nettoyage %s suite a une erreur : %O', correlation, err))
        return
    }
    
    await uploadFichiersDao.updateFichierUpload(doc)

    // Declencher l'upload si applicable
    console.debug("Ajouter upload ", doc)
    if(demarrer) dispatch(ajouterUpload(doc))
}

async function submitBatchUpload(workers, doc) {
    // console.debug("Submit batch ", doc)
    // Utiliser le token, garanti que l'usager n'essaie pas de faire un submit sur la batch d'un tiers
    await workers.connexion.submitBatchUpload(doc.token)
}
