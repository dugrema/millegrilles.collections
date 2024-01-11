import path from 'path'
import { openDB } from 'idb'
import { base64 } from "multiformats/bases/base64"

import { chiffrage } from '@dugrema/millegrilles.reactjs/src/chiffrage'

import * as CONST_TRANSFERT from './constantes'

const { dechiffrer, preparerDecipher } = chiffrage

var _urlDownload = '/collections/fichiers',
    _nomIdb = 'collections'

const CACHE_TEMP_NAME = 'fichiersDechiffresTmp',
      CONST_1MB = 1024 * 1024,
      TAILLE_LIMITE_BLOCKCIPHER = 50 * CONST_1MB,  // La limite de dechiffrage sans stream pour ciphers sans streaming comme mgs3
      DECHIFFRAGE_TAILLE_BLOCK = 64 * 1024,
      STORE_DOWNLOADS = 'downloads',
      EXPIRATION_CACHE_MS = 24 * 60 * 60 * 1000,
      CONST_PROGRESS_UPDATE_THRESHOLD = 10 * CONST_1MB,
      CONST_PROGRESS_UPDATE_INTERVAL = 1000,
      CONST_BLOB_DOWNLOAD_CHUNKSIZE = 100 * CONST_1MB,
      CONST_HIGH_WATERMARK_DECHIFFRAGE = 10

// Globals
var _chiffrage = null

// Structure downloads : {}
var _downloadEnCours = null,
    _callbackEtatDownload = null,
    _callbackAjouterChunkIdb = null,
    _fuuidsAnnulerDownload = null  // Array de fuuids pour annuler le download en cours - doit matcher le fuuid courant

const STATUS_NOUVEAU = 1,
  STATUS_ENCOURS = 2,
  STATUS_SUCCES = 3,
  STATUS_ERREUR = 4

export function down_setNomIdb(nomIdb) {
  _nomIdb = nomIdb
}

export async function down_getEtatCourant() {
  const db = await ouvrirIdb()

  const store = db.transaction(STORE_DOWNLOADS, 'readonly').objectStore(STORE_DOWNLOADS)
  let cursor = await store.openCursor()

  const downloads = []

  while(cursor) {
    const {key, value} = cursor
    // console.log(key, value)
    downloads.push(value)
    cursor = await cursor.continue()
  }

  // Trier pending, completes par date queuing
  downloads.sort(trierPending)

  const etat = {
      downloads,
      downloadEnCours: _downloadEnCours,
  }
  // console.debug("Retourner etat : %O", etat)
  return etat
}

export async function down_ajouterDownload(fuuid, opts) {
  opts = opts || {}
  // Note: opts doit avoir iv, tag et password/passwordChiffre pour les fichiers chiffres
  const url = path.join(_urlDownload, ''+fuuid)  // Peut etre override dans opts

  // console.debug("ajouterDownload %s, %O", fuuid, opts)

  if(_fuuidsAnnulerDownload) {
    // S'assurer que le download ajoute n'est pas dans la liste des downloads annules
    _fuuidsAnnulerDownload = _fuuidsAnnulerDownload.filter(item=>item !== fuuid)
  }

  const infoDownload = {
    url,
    taille: '',
    conserver: false,  // Indique de conserver le fichier dans un cache longue duree (offline viewing)
    ...opts,  // Overrides et params

    fuuid,
    hachage_bytes: fuuid,  // Cle de la collection

    annuler: false,
    status: STATUS_NOUVEAU,
    dateQueuing: new Date().getTime(),
    dateComplete: '',
  }

  // console.debug("ajouterDownload push %O", infoDownload)

  const db = await ouvrirIdb()
  await db.transaction(STORE_DOWNLOADS, 'readwrite')
    .objectStore(STORE_DOWNLOADS)
    .put(infoDownload)

  traiterDownloads()
}

async function traiterDownloads() {
  if(_downloadEnCours) return  // Rien a faire

  const progressCb = (loaded, size, flags) => {
    flags = flags || {}
    emettreEtat({loaded, size, ...flags})
  }

  let complete = ''
  let downloadsPending = await getDownloadsPending()
  //for(_downloadEnCours = downloadsPending.shift(); _downloadEnCours; _downloadEnCours = downloadsPending.shift()) {
  while(downloadsPending.length > 0) {
      _downloadEnCours = downloadsPending.shift()
      // console.debug("Traitement fichier %O", _downloadEnCours)
      
      //_downloadEnCours.status = STATUS_ENCOURS
      await majDownload(_downloadEnCours.hachage_bytes, {status: STATUS_ENCOURS})
      emettreEtat({complete}).catch(err=>(console.warn("Erreur maj etat : %O", err)))
      
      try {
          // Reset downloads annules
          _fuuidsAnnulerDownload = null

          // Download le fichier.
          await downloadCacheFichier(_downloadEnCours, {progressCb})
          emettreEtat({fuuidReady: _downloadEnCours.fuuid}).catch(err=>(console.warn("Erreur maj etat apres download complet : %O", err)))
      } catch(err) {
          console.error("Erreur GET fichier : %O (downloadEnCours : %O)", err, _downloadEnCours)
          _downloadEnCours.status = STATUS_ERREUR
          await majDownload(_downloadEnCours.hachage_bytes, {complete: true, status: STATUS_ERREUR, dateComplete: new Date()})
      } finally {
          //if(!_downloadEnCours.annuler) {
              // _downloadsCompletes.push(_downloadEnCours)
          //}
          complete = _downloadEnCours.correlation
          // _downloadEnCours.complete = true
          if(_downloadEnCours.status !== STATUS_ERREUR) {
            await majDownload(_downloadEnCours.hachage_bytes, {
              complete: true, 
              status: STATUS_SUCCES, 
              dateComplete: new Date(),
              annuler: _downloadEnCours.annuler,
            })
          }

          _downloadEnCours = null
          emettreEtat({complete}).catch(err=>(console.warn("Erreur maj etat : %O", err)))
      }

      downloadsPending = await getDownloadsPending()
  }

}

async function getDownloadsPending() {
  const db = await ouvrirIdb()
  const store = db.transaction(STORE_DOWNLOADS, 'readonly').objectStore(STORE_DOWNLOADS)
  let cursor = await store.openCursor()

  const downloadsPending = []
  while(cursor) {
    const { key, value } = cursor
    // console.log(key, value)
    if(value.status === STATUS_NOUVEAU) {
      downloadsPending.push(value)
    }
    cursor = await cursor.continue()
  }

  // Trier par dateQueining
  downloadsPending.sort(trierPending)
  return downloadsPending
}

/** Permet d'annuler le download en cours - doit matcher le fuuid dans la boucle de download */
export async function annulerDownload(fuuids) {
  if(typeof(fuuids) === 'string') fuuids = [fuuids]
  if(!_fuuidsAnnulerDownload) _fuuidsAnnulerDownload = fuuids
  else _fuuidsAnnulerDownload = [..._fuuidsAnnulerDownload, ...fuuids]
}

function trierPending(a, b) {
  if(a===b) return 0
  const aDate = a.dateQueuing, bDate = b.dateQueuing
  return aDate.getTime() - bDate.getTime()
}

async function majDownload(hachage_bytes, value) {
  const db = await ouvrirIdb()
  const data = await db.transaction(STORE_DOWNLOADS, 'readonly').objectStore(STORE_DOWNLOADS).get(hachage_bytes)
  await db.transaction(STORE_DOWNLOADS, 'readwrite')
    .objectStore(STORE_DOWNLOADS)
    .put({...data, ...value})
}

/** Fetch fichier, permet d'acceder au reader */
async function fetchAvecProgress(url, opts) {
  opts = opts || {}
  const progressCb = opts.progressCb,
        downloadEnCours = opts.downloadEnCours,
        position = opts.position || 0,
        partSize = opts.partSize,
        taille = opts.taille,
        DEBUG = opts.DEBUG

  var dataProcessor = opts.dataProcessor

  const abortController = new AbortController()
  const signal = abortController.signal
  // Note : cache no-store evite des problemes de memoire sur Firefox
  const startPosition = position || 0
  let headerContentRange = `bytes=${startPosition}-`
  let tailleTransfert = taille
  if(position !== undefined && partSize && taille) {
    let endPosition = position + partSize - 1
    if(endPosition >= taille) {
      endPosition = taille - 1
    }
    tailleTransfert = endPosition - startPosition + 1
    headerContentRange = `bytes=${startPosition}-${endPosition}/${tailleTransfert}`
  }
  // console.debug("fetch url %s header range %O", url, headerContentRange)
  const reponse = await fetch(url, {
    signal, cache: 'no-store', keepalive: false,
    headers: {'Range': headerContentRange}
  })
  const contentLengthRecu = Number(reponse.headers.get('Content-Length'))
  if(tailleTransfert && tailleTransfert !== contentLengthRecu) {
    throw new Error("mismatch content length")
  }
  
  const contentLength = taille || contentLengthRecu

  progressCb(startPosition, contentLength, {})

  if(dataProcessor && dataProcessor.start) {
    // Initialiser le data processor au besoin
    const actif = await dataProcessor.start(reponse)
    if(!actif) dataProcessor = null
  }

  // Creer un transform stream pour dechiffrer le fichier
  const { writable, readable } = createTransformStreamDechiffrage(
    dataProcessor, {...opts, contentLength})

  // Pipe la reponse pour la dechiffrer au passage
  let stream = reponse.body
  if(progressCb) {
    const progresStream = creerProgresTransformStream(progressCb, contentLength, {start: startPosition, downloadEnCours, abortController})
    stream = reponse.body.pipeThrough(progresStream)
  }
  const promisePipe = stream.pipeTo(writable)

  return {
    reader: readable,           // Stream dechiffre
    headers: reponse.headers,
    status: reponse.status,
    done: promisePipe,           // Faire un await pour obtenir resultat download
    abortController,
  }

}

async function preparerDataProcessor(opts) {
  // console.debug("preparerDataProcessor opts : %O", opts)
  opts = opts || {}
  const DEBUG = opts.DEBUG || false
  let {password, passwordChiffre} = opts
  const tailleLimiteSubtle = opts.tailleLimiteSubtle || TAILLE_LIMITE_BLOCKCIPHER
  let blockCipher = null

  if(!password && !passwordChiffre) throw new Error("Il faut fournir opts.password ou opts.passwordChiffre")
  
  // Charger cle privee subtle, dechiffrer mot de passe
  if(!password) {
    // Dechiffrage du password - agit comme validation si subtle est utilise (on ne sauvegarde pas le password)
    password = await _chiffrage.dechiffrerCleSecrete(passwordChiffre)
  } else if(typeof(password) === 'string') {
    password = base64.decode(password)
  }

  let estActif = false
  const dataProcessor = {
    start: async params => {
      // On active le blockCipher si le fichier depasse le seuil pour utiliser subtle
      try {
        const cipher = await preparerDecipher(password, {...opts})
        estActif = true
        blockCipher = cipher
      } catch(err) {
        throw err
        // Stream decipher n'est pas supporte
        // const size = Number(response.headers.get('content-length'))
        // if(size > tailleLimiteSubtle) {
        //   throw new Error(`Streaming decipher non disponible, taille fichier > limite (${tailleLimiteSubtle}) : Err : ${''+err}`)
        // }
        // if(DEBUG) console.debug("Fichier taille %d sous seuil, on utilise subtle pour dechiffrer", size)
      }

      return estActif
    },
    update: data => {
      if(!blockCipher) throw new Error("Data processor est inactif")
      // return data
      return blockCipher.update(data)
    },
    finish: () => {
      // if(!blockCipher) throw new Error("Data processor est inactif")
      return blockCipher.finalize()
    },
    password,
    estActif: () => estActif,
  }

  return dataProcessor
}

function createTransformStreamDechiffrage(dataProcessor) {
  // Demander un high watermark de 10 buffers de 64kb (64kb est la taille du buffer de dechiffrage)
  const queuingStrategy = new ByteLengthQueuingStrategy({ highWaterMark: 1024 * 64 * 10 });

  return new TransformStream({
    async transform(chunk, controller) {
      if(!chunk || chunk.length === 0) return controller.error("Aucun contenu")
      try {
        if(dataProcessor) {
          const sousBlockOutput = await dataProcessor.update(chunk)
          if(sousBlockOutput) controller.enqueue(sousBlockOutput)
        } else {
          controller.enqueue(chunk)
        }      
      } catch(err) {
        controller.error(err)
      }
    },
    async flush(controller) {
      console.debug("createTransformStreamDechiffrage Close stream")
      if(dataProcessor) {
        const value = await dataProcessor.finish()
        const {message: chunk} = value
        if(chunk && chunk.length > 0) {
          controller.enqueue(chunk)
        }
      }
      return controller.terminate()
    }
  }, queuingStrategy)
}

function creerProgresTransformStream(progressCb, size, opts) {
    opts = opts || {}
    console.debug("creerProgresTransformStream size: %s", size)

    const downloadEnCours = opts.downloadEnCours,
          abortController = opts.abortController

    let position = opts.start || 0
    let afficherProgres = true

    const setAfficherProgres = () => { afficherProgres = true }

    // let termine = false

    // Demander un high watermark de 10 buffers de 64kb (64kb est la taille du buffer de dechiffrage)
    // const queuingStrategy = new ByteLengthQueuingStrategy({ highWaterMark: 1024 * 64 * 10 });

    return new TransformStream({
      async transform(chunk, controller) {
        if(!chunk || chunk.length === 0) return controller.error("Aucun contenu")
        // console.trace("creerProgresTransformStream Chunk size %s", chunk.length)
        // if(termine) {
        //   console.warn("creerProgresTransformStream Appele apres fin")
        //   return controller.error("Termine")
        // }
        if(_fuuidsAnnulerDownload) {
          const fuuidAnnuler = _fuuidsAnnulerDownload
          _fuuidsAnnulerDownload = null  // Vider le signal - doit matcher le fuuid courant
          if(fuuidAnnuler.includes(downloadEnCours.fuuid)) {
            if(abortController) {
              abortController.abort()
              console.debug("creerProgresTransformStream AbortController.abort")
            } else {
            // termine = true
              return controller.error(new Error('download annule'))
            }
          }
        }
        try{
          position += chunk.length
          if(afficherProgres) {
            const positionPonderee = position  // Math.floor(0.95 * position)
            afficherProgres = false
            await progressCb(positionPonderee, size, {flag: 'Dechiffrage en cours'})
            setTimeout(setAfficherProgres, 500)
          }
          controller.enqueue(chunk)
        } catch(err) {
          controller.error(err)
        }
      },
      flush(controller) { 
        // termine = true
        return controller.terminate() 
      }
    })
    // }, queuingStrategy, queuingStrategy)
  }

/** Download un fichier, effectue les transformations (e.g. dechiffrage) et
 *  conserve le resultat dans cache storage */
export async function downloadCacheFichier(downloadEnCours, progressCb, opts) {
  opts = opts || {}
  progressCb = progressCb || function() {}  // Par defaut fonction vide

  if(!_callbackAjouterChunkIdb) { throw new Error('_callbackAjouterChunkIdb non initialise') }

  // console.debug("downloadCacheFichier %O, Options : %O", downloadEnCours, opts)
  const DEBUG = opts.DEBUG || false

  var dataProcessor = null
  const {fuuid, url, filename, mimetype, password, passwordChiffre} = downloadEnCours
  if((password || passwordChiffre)) {
    const paramsDataProcessor = {...downloadEnCours, password, passwordChiffre}
    // console.debug("Dechifrer avec params : %O", paramsDataProcessor)
    dataProcessor = await preparerDataProcessor(paramsDataProcessor)
  }

  let urlDownload = new URL(_urlDownload)
  try {
    // Verifier si URL fourni est valide/global
    urlDownload = new URL(url)
  } catch(err) {
    // Ajouter url au path
    urlDownload.pathname = path.join(urlDownload.pathname, url)
  }
  // console.debug("URL de download de fichier : %O", urlDownload)

  let pathname
  try {
    const {
      reader: stream, 
      headers, 
      status,
      done,
      abortController
    } = await fetchAvecProgress(
      urlDownload,
      {progressCb, dataProcessor, downloadEnCours, DEBUG}
    )

    if(DEBUG) console.debug("Stream url %s recu (status: %d): %O", url, status, stream)
    if(status>299) {
      const err = new Error(`Erreur download fichier ${url} (code ${status})`)
      err.status = status
      throw err
    }

    const size = Number(headers.get('content-length'))

    // Utiliser stockage via callback (generalement pour stocker sous IDB)
    console.debug("downloadCacheFichier Conserver fichier download via IDB")
    const promiseTraitement = streamToDownloadIDB(fuuid, stream, _callbackAjouterChunkIdb)

    await Promise.all([done, promiseTraitement])

    // // Attendre que le download soit termine
    // if(DEBUG) console.debug("Attendre que le download soit termine, response : %O", response)

    // await promiseCache
    progressCb(size, size, {})
    // if(DEBUG) console.debug("Caching complete")
  } catch(err) {
    console.error("Erreur download/processing : %O", err)
    if(progressCb) progressCb(-1, -1, {flag: 'Erreur', err: ''+err, stack: err.stack})
    // try {
    //   const cache = await caches.open(CACHE_TEMP_NAME)
    //   cache.delete(pathname)
    // } catch(err) {console.warn("Erreur suppression cache %s : %O", pathname, err)}
    throw err
  } finally {
    downloadEnCours.termine = true
    // _downloadEnCours = null
  }
}

/** 
 * Download un fichier en le separant en parts (e.g. 100 mb). 
 * Ne dechiffre pas le fichier. Supporte le resume en detectant les parts recus dans IDB. */
export async function downloadFichierParts(workers, downloadEnCours, progressCb, opts) {
  opts = opts || {}
  progressCb = progressCb || function() {}  // Par defaut fonction vide

  if(!_callbackAjouterChunkIdb) { throw new Error('_callbackAjouterChunkIdb non initialise') }

  // console.debug("downloadFichierParts %O, Options : %O", downloadEnCours, opts)
  const DEBUG = opts.DEBUG || false
  const { downloadFichiersDao } = workers

  const {fuuid, url} = downloadEnCours

  let urlDownload = new URL(_urlDownload)
  try {
    // Verifier si URL fourni est valide/global
    urlDownload = new URL(url)
  } catch(err) {
    // Ajouter url au path
    urlDownload.pathname = path.join(urlDownload.pathname, url)
  }
  // console.debug("URL de download de fichier : %O", urlDownload)

  // const infoDownload = await downloadFichiersDao.getDownload(fuuid)

  // Verifier taille fichier chiffree
  const reponseHead = await fetch(urlDownload, {method: 'HEAD'})
  const tailleFichierChiffre = Number.parseInt(reponseHead.headers.get('Content-Length'))
  // console.debug("Reponse head %d, taille : %s", reponseHead.status, tailleFichierChiffre)

  // const taille = infoDownload.taille

  // Detecter la position courante (plus grand chunk deja recu)
  let positionPartCourant = 0
  const partsExistants = await downloadFichiersDao.getPartsDownloadChiffre(fuuid)
  if(partsExistants) {
    const partCourantPosition = partsExistants[partsExistants.length-1]
    const partCourantObj = await downloadFichiersDao.getPartDownload(fuuid, partCourantPosition)
    positionPartCourant = partCourantPosition + partCourantObj.blobChiffre.size
    console.info("downloadFichierParts Resume download a position ", positionPartCourant)
  }

  const partSize = CONST_TRANSFERT.LIMITE_DOWNLOAD_SPLIT

  let pathname
  try {
    for(let positionPart = positionPartCourant; positionPart < tailleFichierChiffre - 1; positionPart += partSize) {
      const {
        reader: stream, 
        headers, 
        status,
        done,
        abortController
      } = await fetchAvecProgress(
        urlDownload,
        {progressCb, downloadEnCours, position: positionPart, partSize, taille: tailleFichierChiffre, DEBUG}
      )

      if(DEBUG) console.debug("Stream url %s recu (status: %d): %O", url, status, stream)

      const sizeRecu = Number(headers.get('content-length'))
      if(sizeRecu > partSize) {
        throw new Error("Reception d'une part trop grande")
      }

      if(status === 200) {
        throw new Error("HTTP code 200, devrait etre 206")
      }

      if(status>299) {
        const err = new Error(`Erreur download fichier ${url} (code ${status})`)
        err.status = status
        throw err
      }

      // Utiliser stockage via callback (generalement pour stocker sous IDB)
      // console.debug("downloadCacheFichier Conserver fichier download via IDB")
      const promiseStream = streamToDownloadIDB(fuuid, stream, _callbackAjouterChunkIdb, {position: positionPart, dechiffre: false})

      await Promise.all([done, promiseStream])
    }  // Fin loop download parts

    // // Attendre que le download soit termine
    // if(DEBUG) console.debug("Attendre que le download soit termine, response : %O", response)

    // await promiseCache
    progressCb(tailleFichierChiffre, tailleFichierChiffre, {})
    // if(DEBUG) console.debug("Caching complete")
  } catch(err) {
    console.error("Erreur download/processing : %O", err)
    if(progressCb) progressCb(-1, -1, {flag: 'Erreur', err: ''+err, stack: err.stack})
    // try {
    //   const cache = await caches.open(CACHE_TEMP_NAME)
    //   cache.delete(pathname)
    // } catch(err) {console.warn("Erreur suppression cache %s : %O", pathname, err)}
    throw err
  } finally {
    downloadEnCours.termine = true
  }
}

export async function dechiffrerPartsDownload(workers, params, progressCb, opts) {
  opts = opts || {}
  const { downloadFichiersDao } = workers
  const {fuuid, url, filename, mimetype, password, passwordChiffre} = params
  if((!password && !passwordChiffre)) { throw new Error('Params dechiffrage absents') }

  const parts = await downloadFichiersDao.getPartsDownloadChiffre(fuuid)

  const paramsDataProcessor = {...params, password, passwordChiffre}
  // console.debug("Dechifrer avec params : %O", paramsDataProcessor)
  const dataProcessor = await preparerDataProcessor(paramsDataProcessor)

  if(dataProcessor && dataProcessor.start) {
    // Initialiser le data processor au besoin
    const actif = await dataProcessor.start()
    if(!actif) throw new Error("Echec activation data processor")
  }

  // Parcourir les parts de fichiers en ordre
  for await(const part of parts) {
    // console.debug("Dechiffrer part : ", part)
    const partObj = await downloadFichiersDao.getPartDownload(fuuid, part.position)
    // console.debug("Dechiffrer partObj ", partObj)
    const blob = partObj.blobChiffre
    const reader = blob.stream().getReader()
    const arrayBuffers = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if(value) {
          const data = await dataProcessor.update(value)
          arrayBuffers.push(data)
        }
        break
      }
      const data = await dataProcessor.update(value)
      arrayBuffers.push(data)
    }
    // console.debug("Part %s buffers %O", part, arrayBuffers)
    const blobDechiffre = new Blob(arrayBuffers)
    partObj.blob = blobDechiffre
    // console.debug("Maj part download ", partObj)
    await downloadFichiersDao.updatePartDownload(partObj)
  }

  const resultatDechiffrage = await dataProcessor.finish()
  // console.debug("Resultat dechiffrage ", resultatDechiffrage)

  // Ajouter la derniere partie dechiffree
  if(resultatDechiffrage.message && resultatDechiffrage.message.length > 0) {
    // console.debug("Ajout message final ", resultatDechiffrage.message)
    const partFinalObj = await downloadFichiersDao.getPartDownload(fuuid, parts[parts.length-1].position)
    const blobDechiffreFinal = partFinalObj.blob
    const blobFinal = new Blob([await blobDechiffreFinal.arrayBuffer(), resultatDechiffrage.message])
    partFinalObj.blob = blobFinal
    await downloadFichiersDao.updatePartDownload(partFinalObj)
  }

  // Cleanup de tous les parts, retirer blobChiffre et faire un append du message final
  for await (const part of parts) {
    // console.debug("Cleanup part", part)
    const partObj = await downloadFichiersDao.getPartDownload(fuuid, part.position)
    delete partObj.blobChiffre
    partObj.dechiffre = true
    await downloadFichiersDao.updatePartDownload(partObj)
  }
}

async function emettreEtat(flags) {
  flags = flags || {}
  if(_callbackEtatDownload) {

      if(_downloadEnCours) {
          flags.enCoursFuuid = _downloadEnCours.fuuid
          flags.enCoursTaille = isNaN(_downloadEnCours.taille)?0:_downloadEnCours.taille
          flags.enCoursLoaded = isNaN(_downloadEnCours.loaded)?0:_downloadEnCours.loaded
      }

      const loadedEnCours = flags.loaded || flags.enCoursLoaded

      // Calculer information pending
      const etatCourant = await down_getEtatCourant()
      let {total, loaded, pending} = etatCourant.downloads.reduce((compteur, item)=>{
        const { taille, complete, status } = item
        if(complete) compteur.loaded += taille
        else {
          compteur.pending += 1
          if(status === STATUS_ENCOURS && item.hachage_bytes === _downloadEnCours.fuuid) {
            compteur.loaded += loadedEnCours
          }
        }
        compteur.total += taille
        return compteur
      }, {total: 0, loaded: 0, pending: 0})

      flags.total = total

      const pctFichiersEnCours = Math.floor(loaded * 100 / total)
      // console.debug("Emettre etat : pending %O, pctFichiersEnCours : %O, flags: %O", pending, pctFichiersEnCours, flags)

      _callbackEtatDownload(
          pending,
          pctFichiersEnCours,
          flags,
      )
  }
}

export async function down_annulerDownload(fuuid) {

  const etatAnnule = {complete: true, status: STATUS_ERREUR, annuler: true, dateComplete: new Date()}

  if(!fuuid) {
    // console.debug("Annuler tous les downloads")
    await majIdb(item=>item.status===STATUS_NOUVEAU, etatAnnule)
    if(_downloadEnCours) _downloadEnCours.annuler = true
  } else {
    // console.warn("Annuler download %s", fuuid)
    if(_downloadEnCours && _downloadEnCours.fuuid === fuuid) {
      _downloadEnCours.annuler = true
    } else {
      await majDownload(fuuid, etatAnnule)
    }
  }

  // Met a jour le client
  emettreEtat()
}

/** Maj des downloads avec filtre/values */
async function majIdb(filtre, values) {
  const db = await ouvrirIdb()
  const store = db.transaction(STORE_DOWNLOADS, 'readwrite').objectStore(STORE_DOWNLOADS)
  let cursor = await store.openCursor()
  while(cursor) {
    const { key, value } = cursor
    if(filtre(value)) {
      cursor.update({...value, ...values})
    }
    cursor = await cursor.continue()
  }
}

function ouvrirIdb() {
  return openDB(_nomIdb)
}

/** Set le chiffrage worker */
export function down_setChiffrage(chiffrage) {
  _chiffrage = chiffrage
}

export function down_setCallbackDownload(cb) {
  _callbackEtatDownload = cb
}

export function down_setCallbackAjouterChunkIdb(cb) {
  _callbackAjouterChunkIdb = cb
}

export function down_setUrlDownload(urlDownload) {
  _urlDownload = urlDownload
}

export function down_setCertificatCa(certificat) {
  // _certificatCa = certificat
}

export async function down_retryDownload(fuuid) {
  const db = await ouvrirIdb()

  const data = await db.transaction(STORE_DOWNLOADS, 'readonly').objectStore(STORE_DOWNLOADS).get(fuuid)
  await db.transaction(STORE_DOWNLOADS, 'readwrite')
    .objectStore(STORE_DOWNLOADS)
    .put({
      ...data, 
      status: STATUS_NOUVEAU, 
      err: null, 
      annuler: false, 
      complete: false, 
      dateComplete: '', 
      dateQueuing: new Date().getTime(),
    })
  
  // Demarrer download
  traiterDownloads()
}

export async function down_supprimerDownloads(params) {
  params = params || {}
  const { hachage_bytes, completes, filtre } = params

  const [cache, db] = await Promise.all([caches.open(CACHE_TEMP_NAME), ouvrirIdb()])
  if(hachage_bytes) {
    // console.debug("Supprimer download/cache pour %s", hachage_bytes)
    const store = db.transaction(STORE_DOWNLOADS, 'readwrite').objectStore(STORE_DOWNLOADS)
    await store.delete(hachage_bytes)
    await cache.delete('/' + hachage_bytes)
  } else if(completes === true || filtre) {
    const verifierItem = params.filtre?params.filtre:value=>value.complete
    // Supprimer tout les downloads completes
    // console.debug("down_supprimerDownloads: ouvrir curseur readwrite")
    const store = db.transaction(STORE_DOWNLOADS, 'readwrite').objectStore(STORE_DOWNLOADS)
    let cursor = await store.openCursor()
    while(cursor) {
      const { key, value } = cursor
      try {
        if(verifierItem(value)) {
          cache.delete('/' + value.hachage_bytes).catch(err=>{console.warn("Erreur suppression cache entry %s : %O", value.hachage_bytes, err)})
          await cursor.delete()
        }
      } catch(err) {
        console.warn("Erreur suppression entree cache %s : %O", key, err)
      }
      cursor = await cursor.continue()
    }
  }
  // console.debug("down_supprimerDownloads: fermer curseur readwrite")

  // Met a jour le client
  emettreEtat()
}

export async function down_supprimerDownloadsCache(fuuid) {
    await annulerDownload(fuuid)  // Ajouter le fuuid a la liste des downloads a annuler
    const cache = await caches.open(CACHE_TEMP_NAME)
    await cache.delete('/' + fuuid)
}

/** Nettoie les entrees dans le cache de download qui ne correspondent a aucune entree de la IndexedDB */
export async function cleanupCacheOrphelin() {
  const [cache, db] = await Promise.all([caches.open(CACHE_TEMP_NAME), ouvrirIdb()])
  const keysCache = await cache.keys()
  const dbKeys = await db.transaction(STORE_DOWNLOADS, 'readonly').objectStore(STORE_DOWNLOADS).getAllKeys()
  // console.debug("DB Keys : %O", dbKeys)

  for(let idx in keysCache) {
    const req = keysCache[idx]
    // console.debug("KEY %s", req.url)
    const urlKey = new URL(req.url)
    const fuuid = urlKey.pathname.split('/').pop()
    // console.debug("FUUID : %O", fuuid)
    if(!dbKeys.includes(fuuid)) {
      // console.debug("Cle cache inconnue, on va supprimer %s", fuuid)
      cache.delete(req).catch(err=>{console.warn("Erreur suppression entree cache %s", fuuid)})
    }
  }

}

/** Effectue l'entretie du cache et IndexedDb */
export async function down_entretienCache() {
  // console.debug("Entretien cache/idb de download")
  
  // Cleanup fichiers downloades de plus de 24h
  const dateExpiration = new Date().getTime() - EXPIRATION_CACHE_MS
  // const dateExpiration = new Date().getTime() - (60 * 1000)
  await down_supprimerDownloads({
    filtre: item => item.dateComplete.getTime() < dateExpiration
  })
  
  // Cleanup entrees de download cache inutilisees
  await cleanupCacheOrphelin()
}

async function streamToDownloadIDB(fuuid, stream, conserverChunkCb, opts) {
  opts = opts || {}
  // const {downloadFichiersDao} = workers
  let arrayBuffers = [], tailleChunks = 0
  let position = opts.position || 0

  const reader = stream.getReader()
  while(true) {
      const val = await reader.read()
      // console.debug("genererFichierZip Stream read %O", val)
      if(val.done) break  // Termine

      const data = val.value
      if(data) {
          arrayBuffers.push(data)
          tailleChunks += data.length
          position += data.length
      }

      if(tailleChunks > CONST_BLOB_DOWNLOAD_CHUNKSIZE) {
          // Split chunks en parts
          const blob = new Blob(arrayBuffers)
          const positionBlob = position - blob.size
          arrayBuffers = []
          tailleChunks = 0
          // console.debug("Blob cree position %s : ", positionBlob, blob)
          // await downloadFichiersDao.ajouterFichierDownloadFile(fuuid, positionBlob, blob)
          await conserverChunkCb(fuuid, positionBlob, blob, opts)
      }

      if(val.done === undefined) throw new Error('Erreur lecture stream, undefined')
  }

  if(arrayBuffers.length > 0) {
      const blob = new Blob(arrayBuffers)
      const positionBlob = position - blob.size
      arrayBuffers = []
      tailleChunks = 0
      console.debug("Dernier blob position %s : ", positionBlob, blob)
      // await downloadFichiersDao.ajouterFichierDownloadFile(fuuid, positionBlob, blob)
      await conserverChunkCb(fuuid, positionBlob, blob, opts)
  }
}
