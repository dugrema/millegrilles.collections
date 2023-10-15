import { trouverLabelImage, trouverLabelVideo } from '@dugrema/millegrilles.reactjs/src/labelsRessources'
import { ajouterUpload } from '../redux/uploaderSlice'
import * as Comlink from 'comlink'

const CACHE_TEMP_NAME = 'fichiersDechiffresTmp',
      CONST_1MB = 1024 * 1024

function setup(workers) {
    return {
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
        getCleSecrete(cle_id, opts) {
            opts = opts || {}
            return getCleSecrete(workers, cle_id, opts)
        },
    }
}

export default setup

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

async function getCleSecrete(workers, cle_id, opts) {
    opts = opts || {}
    if(!cle_id) throw new Error('dechiffrer Fournir cle_id ou cle_secrete+header')

    const { connexion, usagerDao, chiffrage } = workers
    const local = opts || false

    try {
        const cleFichier = await usagerDao.getCleDechiffree(cle_id)
        // La cle existe localement
        if(cleFichier) return cleFichier
    } catch(err) {
        console.error("Erreur acces usagerDao ", err)
    }

    if(local) return  // La cle n'existe pas localement, abort

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
    // console.debug("Download fichier : %s = %O", fuuid, opts)

    const resultat = await downloadFichiersDao.getDownloadComplet(fuuid)
    // console.debug("Resultat donwload complet IDB DAO : ", resultat)

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
    const { acceptedFiles, /*token, batchId, cuuid, */ userId } = params
    const { setProgres, signalAnnuler } = opts
    const { transfertFichiers, usagerDao } = workers
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

    // let debutFichier = new Date().getTime()
    for await (let file of acceptedFiles) {
        // Recuperer un token, faire 1 fichier par batch
        // const debutGetBatch = new Date().getTime()
        const infoBatch = await workers.connexion.getBatchUpload()
        // console.debug("traiterAcceptedFiles InfoBatch %O (duree get %d)", infoBatch, new Date().getTime()-debutGetBatch)
        const { batchId, token } = infoBatch
        const paramBatch = {...params, acceptedFiles: [file], token, batchId, infoTaille}

        // console.debug("Params batch upload ", paramBatch)

        const updateFichierProxy = Comlink.proxy((doc, opts) => {
            const docWithIds = {...doc, userId, batchId, token}
            // console.debug("updateFichierProxy docWithIds ", docWithIds)
            return updateFichier(workers, dispatch, docWithIds, opts)
        })

        const ajouterPartProxy = Comlink.proxy(
            (correlation, compteurPosition, chunk) => ajouterPart(workers, batchId, correlation, compteurPosition, chunk)
        )
    
        // const resultat = await transfertFichiers.traiterAcceptedFilesV2(
        //     paramBatch, 
        //     ajouterPartProxy, 
        //     updateFichierProxy,
        //     setProgresProxy,
        //     signalAnnuler
        // )
        const resultat = await transfertFichiers.traiterAcceptedFilesV2(
            Comlink.transfer(paramBatch),
            ajouterPartProxy, 
            updateFichierProxy,
            setProgresProxy,
            signalAnnuler
        )

        // Conserver les cles dans IDB pour reference future
        for await (const cle of resultat.chiffrage) {
            await usagerDao.saveCleDechiffree(cle.hachage, cle.key, cle)
        }

        infoTaille.positionChiffre += file.size
        infoTaille.positionFichier++

        // console.debug("traiterAcceptedFiles Temps traiter fichier %d ms", new Date().getTime()-debutFichier)
        // debutFichier = new Date().getTime()
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
    // console.debug("Ajouter upload ", doc)
    if(demarrer) dispatch(ajouterUpload(doc))
}

async function submitBatchUpload(workers, doc) {
    // console.debug("Submit batch ", doc)
    // Utiliser le token, garanti que l'usager n'essaie pas de faire un submit sur la batch d'un tiers
    await workers.connexion.submitBatchUpload(doc.token)
}
