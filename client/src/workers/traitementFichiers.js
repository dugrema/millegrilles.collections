import { ajouterUpload } from '../redux/uploaderSlice'
import * as Comlink from 'comlink'
import * as CONST_TRANSFERT from '../transferts/constantes'
import {getPartsDownload} from '../transferts/storage'

var _pathServeur = new URL(window.location.href);
_pathServeur.pathname = '/filehost/';

function setup(workers) {
    return {
        traiterAcceptedFiles(dispatch, params, opts) {
            opts = opts || {}
            return traiterAcceptedFiles(workers, dispatch, params, opts)
        },
        submitBatchUpload(doc) {
            return submitBatchUpload(workers, doc)
        },
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
        ajouterPart(batchId, correlation, compteurPosition, chunk) {
            ajouterPart(workers, batchId, correlation, compteurPosition, chunk)
        },
        updateFichier(dispatch, doc, opts) {
            updateFichier(workers, dispatch, doc, opts)
        },
        setPathServeur(url) {
            _pathServeur = new URL(url);
            console.info("Path serveur: %O", _pathServeur);
        }
    }
}

export default setup

function getUrlFuuid(fuuid, opts) {
    opts = opts || {}
    const jwt = opts.jwt

    if(jwt) {
        // Mode streaming
        let url = new URL(window.location.href)
        // url.pathname = `/collections/streams/${fuuid}`
        url.pathname = `/streams/${fuuid}`
        url.searchParams.append('jwt', jwt)
        return url.href;
    } else {
        // Fichiers (defaut)
        let url = new URL(_pathServeur.href);
        url.pathname += `/files/${fuuid}`
        url.pathname = url.pathname.replaceAll('//', '/');
        return url.href;
    }
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

async function clean(urlBlobPromise) {
    try {
        const urlBlob = await urlBlobPromise
        // console.debug("Cleanup blob %s", urlBlob)
        URL.revokeObjectURL(urlBlob)
    } catch(err) {
        console.debug("Erreur cleanup URL Blob : %O", err)
    }
}

export async function downloadCache(workers, fuuid, opts) {
    opts = opts || {}
    const { downloadFichiersDao } = workers
    if(fuuid.currentTarget) fuuid = fuuid.currentTarget.value
    // console.debug("Download fichier : %s = %O", fuuid, opts)

    const resultat = await downloadFichiersDao.getDownload(fuuid)
    const taille = resultat.taille

    if(resultat && resultat.blob) {
        promptSaveFichier(resultat.blob, opts)
    } else {
        const parts = await getPartsDownload(fuuid, {cache: CONST_TRANSFERT.CACHE_DOWNLOAD_DECHIFFRE})
        // console.debug('downloadCache Parts : ', parts)
        // console.debug("Cache fichier : %O", cacheFichier)
        if(parts && parts.length > 0) {
            // promptSaveFichier(await cacheFichier.blob(), opts)
            const blobs = []
            for(const part of parts) {
                const blob = await part.response.blob()
                blobs.push(blob)
            }
            const blobFichier = new Blob(blobs)
            if(taille && blobFichier.size !== taille) throw new Error('mismatch taille fichier')
            promptSaveFichier(blobFichier, opts)
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
    const { acceptedFiles, userId, breadcrumbPath } = params
    const { setProgres, signalAnnuler } = opts
    const { transfertUploadFichiers, usagerDao } = workers
    // console.debug("traiterAcceptedFiles Debut upload pour fichiers %O", acceptedFiles)

    const certificatsMaitredescles = await workers.clesDao.getCertificatsMaitredescles()
    // console.debug("Certificats : %O", certificatsMaitredescles)

    await transfertUploadFichiers.up_setCertificats(certificatsMaitredescles)
    // console.debug("Certificat maitre des cles OK")

    const fichiersRejetes = []

    let setProgresProxy = null
    if(setProgres) {
        const setProgresCb = progres => {
            const valeur = {valeur: progres, complet: progres === 100}
            if(fichiersRejetes.length > 0) valeur.rejets = fichiersRejetes
            // console.debug("traiterAcceptedFiles Set progres ", valeur)
            setProgres(valeur)
        }
        setProgresProxy = Comlink.proxy(setProgresCb)
    }

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
        if(file.size === 0) {
            console.warn("Fichier %s de taille 0 bytes est non supporte - SKIP", file.name)
            fichiersRejetes.push({nom: file.name, code: 1, err: 'Fichier vide'})
            continue
        }

        try {
            // Recuperer un token, faire 1 fichier par batch
            const debutGetBatch = new Date().getTime()
            // const infoBatch = await workers.connexion.getBatchUpload()
            // console.debug("traiterAcceptedFiles InfoBatch %O (duree get %d)", infoBatch, new Date().getTime()-debutGetBatch)
            // const { batchId, token } = infoBatch
            let batchId = 'OBSOLETE-BATCHID', token = 'OBSOLETE-TOKEN'
            const paramBatch = {...params, acceptedFiles: [file], token, batchId, infoTaille}

            // console.debug("Params batch upload ", paramBatch)

            const updateFichierProxy = Comlink.proxy((doc, opts) => {
                const docWithIds = {...doc, userId, batchId, token, breadcrumbPath}
                // console.debug("updateFichierProxy docWithIds ", docWithIds)
                return updateFichier(workers, dispatch, docWithIds, opts)
            })

            const ajouterPartProxy = Comlink.proxy(
                (correlation, compteurPosition, chunk) => ajouterPart(workers, batchId, correlation, compteurPosition, chunk)
            )
        
            const resultat = await transfertUploadFichiers.traiterAcceptedFilesV2(
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
        } catch(err) {
            console.error("traiterAcceptedFiles Erreur traitement %O : %O", file, err)
        }
    }

    return({rejets: fichiersRejetes})
}

async function ajouterPart(workers, batchId, correlation, compteurPosition, chunk) {
    const { uploadFichiersDao } = workers
    // console.debug("ajouterPart %s position %d : %O", correlation, compteurPosition, chunk)
    await uploadFichiersDao.ajouterFichierUploadFile(batchId, correlation, compteurPosition, chunk)
}

export async function updateFichier(workers, dispatch, doc, opts) {
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
