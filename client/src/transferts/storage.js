import * as CONST_TRANSFERT from './constantes'

export async function supprimerCacheFuuid(fuuid, opts) {
    opts = opts || {}
    const parts = await getPartsDownload(fuuid)
    const cacheChiffre = await caches.open(CONST_TRANSFERT.CACHE_DOWNLOAD_CHIFFRE)
    for await(const part of parts) {
        await cacheChiffre.delete(part.request)
    }
  
    if(!opts.keepDechiffre) {
        const cacheDechiffre = await caches.open(CONST_TRANSFERT.CACHE_DOWNLOAD_DECHIFFRE)
        const partsDechiffre = await getPartsDownload(fuuid, {cache: CONST_TRANSFERT.CACHE_DOWNLOAD_DECHIFFRE})
        await cacheDechiffre.delete('/'+fuuid)
        for await(const part of partsDechiffre) {
            await cacheDechiffre.delete(part.request)
        }
    }
}

export async function getPartsDownload(fuuid, opts) {
    opts = opts || {}
    const cacheName = opts.cache || CONST_TRANSFERT.CACHE_DOWNLOAD_CHIFFRE
    const cache = await caches.open(cacheName)
  
    const parts = []
    {
        const keys = await cache.keys()
        for await(const key of keys) {
            // console.debug("getPartsDownload Key : ", key.url)
            const pathName = new URL(key.url).pathname
            if(pathName.startsWith('/'+fuuid)) {
                const position = Number.parseInt(pathName.split('/').pop())
                if(position !== undefined && !isNaN(position)) {
                    const response = await cache.match(key)
                    parts.push({position, request: key, response})
                }
            }
        }
    }

    parts.sort(trierPositionsCache)
    return parts
}

/** Stream toutes les parts chiffrees d'un fichier downloade vers un writable. */
export async function streamPartsChiffrees(fuuid, writable, opts) {
    opts = opts || {}
    const tailleChiffre = opts.tailleChiffre
    const progressCb = opts.progressCb

    // Recuperer parts tries en ordre de position
    const parts = await getPartsDownload(fuuid, opts)
  
    // Pipe tous les blobs (response)
    let positionDechiffrage = 0
    for await(const part of parts) {
        const blob = await part.response.blob()
        const readerPart = blob.stream()
        // S'assurer de ne pas fermer le writable apres le pipeTo
        await readerPart.pipeTo(writable, {preventClose: true})

        // Mise a jour de l'etat (progress)
        if(progressCb) {
            const tailleBlob = blob.size
            positionDechiffrage += tailleBlob
            await progressCb(positionDechiffrage, {'champ': 'tailleDechiffree'})
        }
    }
    writable.close()

    // Validation de la taille du fichier (optionelle)
    if(tailleChiffre && tailleChiffre !== positionDechiffrage) throw new Error('mismatch taille chiffree')
}

/**
 * Lit un stream vers le cache de fichiers dechiffres. Split le contenu.
 * @param {*} fuuid 
 * @param {*} stream 
 * @param {*} opts limitSplitBytes: int
 */
export async function streamToCacheParts(fuuid, stream, opts) {
    opts = opts || {}
    // const {downloadFichiersDao} = workers
    const limitSplitBytes = opts.splitLimit || CONST_TRANSFERT.LIMITE_DOWNLOAD_CACHE_SPLIT
    let arrayBuffers = [], tailleChunks = 0
    let position = 0
  
    const cache = await caches.open(CONST_TRANSFERT.CACHE_DOWNLOAD_DECHIFFRE)
  
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
  
        if(tailleChunks > limitSplitBytes) {
          // Split chunks en parts
          const blob = new Blob(arrayBuffers)
          const positionBlob = position - blob.size
          arrayBuffers = []
          tailleChunks = 0
          const response = new Response(blob, {status: 200})
          const fuuidPath = '/'+fuuid+'/'+positionBlob
          await cache.put(fuuidPath, response)
        }
  
        if(val.done === undefined) throw new Error('Erreur lecture stream, undefined')
    }
  
    if(arrayBuffers.length > 0) {
        const blob = new Blob(arrayBuffers)
        const positionBlob = position - blob.size
        arrayBuffers = []
        const response = new Response(blob, {status: 200})
        const fuuidPath = '/'+fuuid+'/'+positionBlob
        await cache.put(fuuidPath, response)
    }
}

function trierPositionsCache(a, b) {
    if(a === b) return 0
    if(!a) return 1
    if(!b) return -1
  
    // Trier par date de creation
    const positionA = a.position,
          positionB = b.position
    // if(dateCreationA === dateCreationB) return 0
    if(positionA !== positionB) return positionA - positionB
    return 0
}
  