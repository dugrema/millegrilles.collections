console.info('sw.js Self : ', self)

const CACHE_NAME = 'collections-cache'
const CONST_CACHE_DOWNLOADS = 'fichiersDownloadDechiffres'

self.addEventListener('install', e => {
    console.log('installing service worker 2024.0.64')

    e.waitUntil(
        fetch('/collections/asset-manifest.json')
            .then(response => {
                if(response.status !== 200) {
                    console.warn("Erreur installation assets : http status ", response.status)
                    return
                }
                
                response.json()
                    .then(async manifest => {
                        console.debug("Asset manifest : ", manifest)
                        const fileKeys = Object.keys(manifest.files).filter(item=>{
                            return ! ['index.html'].includes(item)
                        })
                        const files = fileKeys.map(key=>manifest.files[key])

                        // Cleanup du cache precedent
                        await caches.delete(CACHE_NAME)

                        console.debug("Cache all files ", files)
                        const cache = await caches.open(CACHE_NAME)
                        await cache.addAll(files)
                        console.debug("Caching de %d fichiers reussi", files.length)
                    })
                    .catch(err=>console.error("Erreur lecture asset-manifest.json ou caching assets ", err))

            })
    )

})

self.addEventListener('activate', e => {
    console.log('activating service worker')
    //e.waitUntil(self.clients.claim())
})

const METHODS_STREAM = ['GET', 'HEAD']

self.addEventListener('fetch', e => {
    const method = e.request.method
    const url = new URL(e.request.url)
    // console.info("fetch %s url %s, destination %s", method, url, destination)

    if(METHODS_STREAM.includes(method) && url.pathname.startsWith('/collections/streams/')) {
        traiterCacheStream(e)
        return
    }

    if(method !== 'GET') return
    
    if(url.pathname.startsWith('/collections/static/')) {
        traiterCacheApp(e)
        return
    }
})

function traiterCacheApp(e) {
    // Path /collections/static
    const reponse = caches.match(e.request)
        .then( response => {
            if(response) {
                // console.debug("fetch utilise cache ", response)
                return response
            }

            if( navigator.onLine ) {
                console.info(`fetching/caching ${e.request.url}`)
                const fetchRequest = e.request.clone()
                return fetch(fetchRequest).then( response => {
                    if (!response || response.status !== 200 || response.type !== 'basic' ) {
                        return response
                    }

                    const responseToCache = response.clone()

                    caches.open(CACHE_NAME)
                        .then( cache => {
                            cache.put(e.request, responseToCache)
                        })

                    return response
                })
            }
        })
    e.respondWith(reponse)    
}

function traiterCacheStream(e) {
    try {
        const url = new URL(e.request.url)
        const method = e.request.method
        // console.debug("traiterCacheStream Request (method: %s) : %O ", method, e.request)
        
        const pathname = url.pathname
        const pathsplit = pathname.split('/')
        if(pathsplit.length <= 3) {
            // console.debug("Pas de fuuid sur ", url.href)
            return  // Pas de fuuid
        }

        const fuuid = pathsplit[3]
        console.debug("traiterCacheStream fuuid %s", fuuid)

        const promise = caches.open(CONST_CACHE_DOWNLOADS)
            .then( async cache => {
                const pathFuuid0 = `/${fuuid}/0`
                const elem0 = await cache.match(pathFuuid0)
                if(elem0) {
                    // On va combiner tous les elemens de cache en un seul blob pour recreer le video complet
                    // console.debug("On a trouver le video en cache : ", elem0)

                    if(method === 'HEAD') {
                        // console.debug("Reponse HEAD")
                        return new Response('', {status: 200})
                    }

                    const parts = await getPartsDownload(fuuid)
                    const partsBlobs = []
                    for(const part of parts) {
                        partsBlobs.push(await part.response.blob())
                    }

                    // Extraire information de posision
                    const headers = e.request.headers
                    const range = headers.get('Range')

                    const blobComplet = new Blob(partsBlobs)
                    const taille = blobComplet.size

                    let start = 0, end = taille - 1
                    if(range) {
                        // console.debug("Range stream : ", range)
                        const paramsRange = range.split('=').pop()
                        const splitRange = paramsRange.split('-')
                        start = Number.parseInt(splitRange[0])
                        if(splitRange.length > 1) {
                            if(splitRange[1]) {
                                end = Number.parseInt(splitRange[1])
                            }
                        }
                        // console.debug("Split start %d, end %d, splitRange %O", start, end, splitRange)
                    }

                    const contentRange = `bytes ${start}-${end}/${taille}`
                    const blobSlice = blobComplet.slice(start, end+1)

                    const headersResponse = new Headers()
                    headersResponse.set('Content-Length', ''+(end - start + 1))
                    headersResponse.set('Content-Range', contentRange)

                    const responseCache = new Response(blobSlice, {status: 206, headers: headersResponse})
                    return responseCache
                }
                
                // console.debug("Cache miss sur %s, executer %s", fuuid, e.request.url)
                return fetch(e.request)
            })
            .catch(err=>{
                console.error("Erreur traitement cache streaming, on fait le fetch demande", err)
                return fetch(e.request)
            })

        e.respondWith(promise)
    } catch(err) {
        console.error("traiterCacheStream Erreur generique", err)
    }
}

async function getPartsDownload(fuuid, opts) {
    opts = opts || {}
    const cacheName = opts.cache || CONST_CACHE_DOWNLOADS
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
