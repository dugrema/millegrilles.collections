console.info('sw.js Self : ', self)

const CACHE_NAME = 'collections-cache'

self.addEventListener('install', e => {
    console.log('installing service worker')

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

    // e.waitUntil(
    //     caches.open(CACHE_NAME).then( cache => {
    //         return cache.addAll([
    //             '/collections',
    //             '/collections/index.html',
    //             '/collections/static/js/bundle.js'
    //         ])
    //     })
    //     .then(() => self.skipWaiting())
    // )
})

self.addEventListener('activate', e => {
    console.log('activating service worker')
    e.waitUntil(self.clients.claim())
})

const PATHNAMES_GET_SUPPORTES = ['static', 'streams']

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url)
    console.info("fetch ", url)
    const method = e.request.method

    // Determiner si la path supporte le caching
    const pathname = url.pathname
    let subpath = null
    if( ['HEAD', 'GET'].includes(method)) {
        const pathSplit = pathname.split('/')
        console.debug("path split ", pathSplit)
        if(pathSplit.length > 2) {
            subpath = pathSplit[2]
            if(!PATHNAMES_GET_SUPPORTES.includes(subpath)) 
            {
                // pas de caching
                return
            }
        }
    } else {
        // pas de caching
        return
    }

    if(subpath === 'streams') {
        traiterCacheStream(e)
        return
    }

    // Path /collections/static
    const reponse = caches.match(e.request)
        .then( response => {
            if(response) {
                console.debug("fetch utilise cache ", response)
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
})

const CONST_CACHE_DOWNLOADS = 'fichiersDownloadDechiffres'

function traiterCacheStream(e) {
    const url = new URL(e.request.url)
    const method = e.request.method
    console.debug("traiterCacheStream Request (method: %s) : %O ", method, e.request)
    
    const pathname = url.pathname
    const pathsplit = pathname.split('/')
    if(pathsplit.length <= 3) {
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
                console.debug("On a trouver le video en cache : ", elem0)

                // Extraire information de posision
                const headers = e.request.headers
                const range = headers.get('Range')

                const blobComplet = new Blob([await elem0.blob()])
                const taille = blobComplet.size

                let start = 0, end = taille - 1
                if(range) {
                    console.debug("Range stream : ", range)
                    const paramsRange = range.split('=').pop()
                    const splitRange = paramsRange.split('-')
                    start = Number.parseInt(splitRange[0])
                    if(splitRange.length > 1) {
                        if(splitRange[1]) {
                            end = Number.parseInt(splitRange[1])
                        }
                    }
                    console.debug("Split start %d, end %d, splitRange %O", start, end, splitRange)
                }

                if(method === 'HEAD') {
                    console.debug("Reponse HEAD")
                    const headersResponse = new Headers()
                    headersResponse.set('Content-Length', ''+taille)
                    return new Response('', {status: 200, headers: headersResponse})
                }

                const contentRange = `bytes ${start}-${end}/${taille}`
                const blobSlice = blobComplet.slice(start, end+1)

                const headersResponse = new Headers()
                headersResponse.set('Content-Length', ''+(end - start + 1))
                headersResponse.set('Content-Range', contentRange)

                const responseCache = new Response(blobSlice, {status: 206, headers: headersResponse})
                return responseCache
            }
            console.debug("Cache miss sur %s", fuuid)
            return fetch(e.request).then(response=>{
                console.debug("Response status ", response.status)
                return response
            })
        })
        .catch(err=>{
            console.error("Erreur traitement cache streaming, on fait le fetch demande", err)
            return fetch(e.request)
        })

    e.waitUntil(promise)
    e.respondWith(promise)
}
