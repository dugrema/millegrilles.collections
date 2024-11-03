import { proxy, wrap, releaseProxy } from 'comlink'

import { usagerDao } from '@dugrema/millegrilles.reactjs'
import * as collectionsDao from '../redux/collectionsIdbDao'
import * as uploadFichiersDao from '../redux/uploaderIdbDao'
import * as downloadFichiersDao from '../redux/downloaderIdbDao'
import clesDao from './clesDao'
import contactsDao from './contactsDao'
import setupTraitementFichiers from './traitementFichiers'

let _block = false

export function setupWorkers() {
    if(_block) throw new Error("double init")
    _block = true

    // Chiffrage et x509 sont combines, reduit taille de l'application
    const connexion = wrapWorker(new Worker(new URL('./connexion.worker', import.meta.url), {type: 'module'}))
    const chiffrage = wrapWorker(new Worker(new URL('./chiffrage.worker', import.meta.url), {type: 'module'}))
    const transfertUploadFichiers = wrapWorker(new Worker(new URL('./transfert.upload', import.meta.url), {type: 'module'}))
    const transfertDownloadFichiers = wrapWorker(new Worker(new URL('./transfert.download', import.meta.url), {type: 'module'}))
  
    const workerInstances = { 
        chiffrage, connexion, 
        transfertUploadFichiers, transfertDownloadFichiers
    }
  
    const workers = Object.keys(workerInstances).reduce((acc, item)=>{
        acc[item] = workerInstances[item].proxy
        return acc
      }, {})

    // Pseudo-worker
    workers.collectionsDao = collectionsDao         // IDB collections
    workers.usagerDao = usagerDao                   // IDB usager
    workers.traitementFichiers = setupTraitementFichiers(workers) // Upload et download
    workers.clesDao = clesDao(workers)              // Cles asymetriques
    workers.contactsDao = contactsDao(workers)      // Contacts pour partage de fichiers
    workers.uploadFichiersDao = uploadFichiersDao   // IDB upload fichiers
    workers.downloadFichiersDao = downloadFichiersDao  // IDB download fichiers

    // Wiring
    const ready = wireWorkers(workers)

    return { workerInstances, workers: proxy(workers), ready }
}

async function wireWorkers(workers) {
    const { 
        connexion, chiffrage, downloadFichiersDao,
        transfertUploadFichiers, transfertDownloadFichiers
    } = workers
    transfertDownloadFichiers.down_setChiffrage(chiffrage).catch(err=>console.error("Erreur chargement transfertDownloadFichiers/down worker : %O", err))

    const urlLocal = new URL(window.location.href)
    // urlLocal.pathname = '/collections/fichiers'
    urlLocal.pathname = '/filehost'
    transfertDownloadFichiers.down_setUrlDownload(urlLocal.href)
    
    const callbackAjouterChunkIdb = proxy((fuuid, position, blob, opts) => {
        // console.debug("callbackAjouterChunkIdb proxy fuuid %s, position %d, blob %O", fuuid, position, blob)
        return downloadFichiersDao.ajouterFichierDownloadFile(fuuid, position, blob, opts)
    })
    transfertDownloadFichiers.down_setCallbackAjouterChunkIdb(callbackAjouterChunkIdb)

    // urlLocal.pathname = '/collections/fichiers/upload'
    transfertUploadFichiers.up_setPathServeur(urlLocal.href)

    const location = new URL(window.location)
    location.pathname = '/fiche.json'
    // console.debug("Charger fiche ", location.href)
  
    const axiosImport = await import('axios')
    const axios = axiosImport.default
    const reponse = await axios.get(location.href)
    console.debug("Reponse fiche ", reponse)
    const data = reponse.data || {}
    const fiche = JSON.parse(data.contenu)
    const ca = fiche.ca
    if(ca) {
        // console.debug("initialiserCertificateStore (connexion, chiffrage)")
        await Promise.all([
            connexion.initialiserCertificateStore(ca, {isPEM: true, DEBUG: false}),
            chiffrage.initialiserCertificateStore(ca, {isPEM: true, DEBUG: false})
        ])
    } else {
        throw new Error("Erreur initialisation - fiche/CA non disponible")
    }
}

function wrapWorker(worker) {
    const proxy = wrap(worker)
    return {proxy, worker}
}

export function cleanupWorkers(workers) {
    Object.values(workers).forEach((workerInstance) => {
        try {
            const {worker, proxy} = workerInstance
            proxy[releaseProxy]()
            worker.terminate()
        } catch(err) {
            console.warn("Errreur fermeture worker : %O\n(Workers: %O)", err, workers)
        }
    })
}
