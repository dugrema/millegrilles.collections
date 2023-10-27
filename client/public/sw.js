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

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url)
    const method = e.request.method

    if( method !== 'GET' || ! url.pathname.startsWith('/collections/static/') ) {
        // Pas de caching
        // console.log(`${method} ${e.request.url}`)
        return
    }

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
