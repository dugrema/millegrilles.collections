import {loadFichierChiffre, fileResourceLoader, imageResourceLoader, videoResourceLoader} from '@dugrema/millegrilles.reactjs/src/imageLoading'
import {supporteFormatWebp, supporteFormatWebm} from '@dugrema/millegrilles.reactjs/src/detecterAppareils'

const ICONE_FOLDER = <i className="fa fa-folder fa-lg"/>
const ICONE_FICHIER = <i className="fa fa-file fa-lg"/>
const ICONE_FICHIER_PDF = <i className="fa fa-file-pdf-o fa-lg"/>
const ICONE_FICHIER_IMAGE = <i className="fa fa-file-image-o fa-lg"/>
const ICONE_FICHIER_AUDIO = <i className="fa fa-file-audio-o fa-lg"/>
const ICONE_FICHIER_VIDEO = <i className="fa fa-file-video-o fa-lg"/>
const ICONE_FICHIER_TEXT = <i className="fa fa-file-text-o fa-lg"/>
const ICONE_FICHIER_ZIP = <i className="fa fa-file-zip-o fa-lg"/>
const ICONE_QUESTION = <i className="fa fa-question fa-lg"/>

const Icones = {
    ICONE_FOLDER, ICONE_FICHIER, ICONE_FICHIER_PDF, ICONE_FICHIER_IMAGE, ICONE_FICHIER_AUDIO, 
    ICONE_FICHIER_VIDEO, ICONE_FICHIER_TEXT, ICONE_FICHIER_ZIP, ICONE_QUESTION,
}

// Detection format media
const supporteWebm = supporteFormatWebm()
let supporteWebp = false
supporteFormatWebp().then(supporte=>supporteWebp=supporte).catch(err=>console.warn("Erreur detection webp : %O", err))
// console.debug("Support webm : %O", supporteWebm)

export { Icones }

export function mapper(row, workers) {
    const version_courante = row.version_courante || {}
    const { tuuid, nom, supprime, date_creation, fuuid_v_courante, favoris } = row
    const { anime, date_fichier, taille, images, video, duration, videoCodec } = version_courante || row
    const mimetype = version_courante.mimetype || row.mimetype

    // console.debug("!!! MAPPER %O", row)

    const creerToken = async fuuids => {
        if(typeof(fuuids) === 'string') fuuids = [fuuids]  // Transformer en array
        const reponse = await workers.connexion.creerTokenStream(fuuids)
        return reponse.token
    }

    let date_version = '', 
        mimetype_fichier = '',
        taille_fichier = ''

    let thumbnailIcon = '',
        ids = {},
        miniThumbnailLoader = null,
        smallThumbnailLoader = null,
        loader = null,
        imageLoader = null,
        videoLoader = null
    if(!mimetype) {
        ids.folderId = tuuid  // Collection, tuuid est le folderId
        thumbnailIcon = Icones.ICONE_FOLDER
    } else {
        // const { anime, mimetype, date_fichier, taille, images, video } = version_courante || row
        mimetype_fichier = mimetype
        date_version = date_fichier
        taille_fichier = taille
        ids.fileId = tuuid    // Fichier, tuuid est le fileId
        const mimetypeBase = mimetype.split('/').shift()

        if(workers && workers.traitementFichiers) {
            const getFichierChiffre = workers.traitementFichiers.getFichierChiffre

            // Thumbnails pour navigation
            if(images) {
                const thumbnail = images.thumb || images.thumbnail,
                    small = images.small || images.poster
                if(thumbnail && thumbnail.data_chiffre) {
                    miniThumbnailLoader = loadFichierChiffre(getFichierChiffre, thumbnail.hachage, thumbnail.mimetype, {dataChiffre: thumbnail.data_chiffre})
                }
                if(small) smallThumbnailLoader = fileResourceLoader(getFichierChiffre, small.hachage, small.mimetype, {thumbnail})

                imageLoader = imageResourceLoader(getFichierChiffre, images, {anime, supporteWebp, fuuid: fuuid_v_courante, mimetype})
            }

            if(mimetypeBase == 'video') {
                if(video && Object.keys(video).length > 0) {
                    videoLoader = videoResourceLoader(getFichierChiffre, video, {creerToken, fuuid: fuuid_v_courante, version_courante})
                } else {
                    videoLoader = videoResourceLoader(getFichierChiffre, {}, {creerToken, fuuid: fuuid_v_courante, version_courante})
                }
            }
        
            // Loader du fichier source (principal), supporte thumbnail pour chargement
            loader = loadFichierChiffre(getFichierChiffre, fuuid_v_courante, mimetype)
        }

        if(mimetype === 'application/pdf') {
            thumbnailIcon = ICONE_FICHIER_PDF
        } else if(mimetypeBase === 'image') {
            thumbnailIcon = ICONE_FICHIER_IMAGE
        } else if(mimetypeBase === 'video') {
            thumbnailIcon = ICONE_FICHIER_VIDEO
        } else if(mimetypeBase === 'audio') {
            thumbnailIcon = ICONE_FICHIER_AUDIO
        } else if(mimetypeBase === 'application/text') {
            thumbnailIcon = ICONE_FICHIER_TEXT
        } else if(mimetypeBase === 'application/zip') {
            thumbnailIcon = ICONE_FICHIER_ZIP
        } else { 
            thumbnailIcon = ICONE_FICHIER
        }
    }

    let upload = null
    if(row.status) {
        upload = { status: row.status, position: row.position }
    }

    return {
        // fileId: tuuid,
        // folderId: tuuid,
        ...ids,
        nom,
        supprime, 
        taille: taille_fichier,
        dateAjout: date_version || date_creation,
        mimetype: ids.folderId?'Repertoire':mimetype_fichier,
        duration, videoCodec,
        fuuid: fuuid_v_courante,
        version_courante,
        favoris,

        // Upload
        upload,

        // Loaders
        thumbnail: {
            miniLoader: miniThumbnailLoader,
            smallLoader: smallThumbnailLoader,
            thumbnailIcon,
            thumbnailCaption: nom,
        },
        loader,
        imageLoader,
        videoLoader,
    }
}

export function mapperRecherche(row, workers) {
    const { 
        fuuid, tuuid, nom, supprime, favoris, date_creation, date_version, 
        // mimetype, taille, 
        thumb_data, thumb_hachage_bytes,
        version_courante,
        score,
    } = row

    // console.debug("!!! MAPPER %O", row)

    let mimetype_fichier = '',
        taille_fichier = ''

    let thumbnailIcon = '',
        ids = {},
        miniThumbnailLoader = null
    if(!fuuid) {
        ids.folderId = tuuid  // Collection, tuuid est le folderId
        thumbnailIcon = Icones.ICONE_FOLDER
    } else {
        const { mimetype, taille } = version_courante
        mimetype_fichier = mimetype
        taille_fichier = taille
        ids.fileId = tuuid    // Fichier, tuuid est le fileId
        ids.fuuid = fuuid
        const mimetypeBase = mimetype.split('/').shift()

        if(workers && thumb_data && thumb_hachage_bytes) {
            if(thumb_hachage_bytes && thumb_data) {
                miniThumbnailLoader = loadFichierChiffre(workers.traitementFichiers, thumb_hachage_bytes, 'image/jpeg', {dataChiffre: thumb_data})
            }
        }

        if(mimetype === 'application/pdf') {
            thumbnailIcon = ICONE_FICHIER_PDF
        } else if(mimetypeBase === 'image') {
            thumbnailIcon = ICONE_FICHIER_IMAGE
        } else if(mimetypeBase === 'video') {
            thumbnailIcon = ICONE_FICHIER_VIDEO
        } else if(mimetypeBase === 'audio') {
            thumbnailIcon = ICONE_FICHIER_AUDIO
        } else if(mimetypeBase === 'application/text') {
            thumbnailIcon = ICONE_FICHIER_TEXT
        } else if(mimetypeBase === 'application/zip') {
            thumbnailIcon = ICONE_FICHIER_ZIP
        } else { 
            thumbnailIcon = ICONE_FICHIER
        }
    }

    return {
        // fileId: tuuid,
        // folderId: tuuid,
        ...ids,
        nom,
        supprime, 
        taille: taille_fichier,
        dateAjout: date_version || date_creation,
        mimetype: ids.folderId?'Repertoire':mimetype_fichier,
        // thumbnailSrc,
        // thumbnailLoader,
        // thumbnailIcon,
        // thumbnailCaption: nom,
        thumbnail: {
            miniLoader: miniThumbnailLoader,
            thumbnailIcon,
            thumbnailCaption: nom,
        },
        version_courante,
        fuuid,
        favoris,
        score,
    }
}

// export function onContextMenu(event, value, setContextuel) {
//     event.preventDefault()
//     const {clientX, clientY} = event
//     // console.debug("ContextMenu %O (%d, %d)", value, clientX, clientY)

//     const params = {show: true, x: clientX, y: clientY}

//     setContextuel(params)
// }

// // Charge un thumbnail/image. 
// // Utilise un cache/timer pour reutiliser le blob si l'image est chargee/dechargee rapidement.
// function loadImageChiffree(workers, fuuid, opts) {
//     opts = opts || {}
//     const { traitementFichiers } = workers
//     const { delay } = opts

//     let blobPromise = null
//     let timeoutCleanup = null
    
//     return {
//         load: async setSrc => {
//             opts = opts || {}

//             if(!blobPromise) {
//                 console.debug("Reload blob pour %s", fuuid)
//                 blobPromise = reloadThumbnail(traitementFichiers.getThumbnail, fuuid, opts)
//             } else if(timeoutCleanup) {
//                 console.debug("Reutilisation blob pour thumbnail %s", fuuid)
//                 clearTimeout(timeoutCleanup)
//                 timeoutCleanup = null
//             }

//             try {
//                 var urlBlob = await blobPromise
//                 // console.debug("!!! Blob charger pour thumbnail %s (opts: %O)", fuuid, opts)

//                 if(delay) await new Promise(resolve=>(setTimeout(resolve, 2000)))

//                 if(setSrc) setSrc(urlBlob)
//                 return urlBlob
//             } catch(err) {
//                 // Cleanup
//                 blobPromise = null
//                 if(urlBlob) URL.revokeObjectURL(urlBlob)
//                 throw err
//             }
//         },
//         unload: async () => {
//             console.debug("Unload thumbnail %s", fuuid)
//             if(blobPromise) {
//                 try {
//                     const urlBlob = await blobPromise
//                     // console.debug("Cleanup URL blob : %O", urlBlob)
//                     if(urlBlob) {
//                         timeoutCleanup = setTimeout(()=>{
//                             console.debug("Cleanup blob pour %s", fuuid)
//                             URL.revokeObjectURL(urlBlob)
//                             blobPromise = null  // Vider promise, permet un reload
//                             timeoutCleanup = null
//                         }, CONST_TIMEOUT_THUMBNAIL_BLOB)
//                     }
//                 } catch(err) {
//                     console.debug("Erreur nettoyage blob %s : %O", fuuid, err) 
//                 }
//             }
//         }
//     }
// }

// async function reloadThumbnail(getThumbnail, fuuid, opts) {
//     const blob = await getThumbnail(fuuid, opts)
//     return URL.createObjectURL(blob)
// }

// // Genere un loader concurrentiel qui affiche le premier de mini/small et tente
// // d'afficher small lorsqu'il est pret
// function imageResourceLoader(workers, thumbnail, imageFuuid) {
//     const thumbnailFuuid = thumbnail.hachage

//     // Preparation du mini-thumbnail (pour fallback ou attente de download) et de l'image pleine grandeur
//     const miniLoader = loadImageChiffree(workers, thumbnailFuuid, {dataChiffre: thumbnail.data_chiffre})
//     const imageLoader = loadImageChiffree(workers, imageFuuid)

//     const loader = {
//         load: async setSrc => {

//             const miniPromise = miniLoader.load()
//             const imagePromise = imageLoader.load()

//             // Charger le premier blob qui est pret
//             try {
//                 const blobPret = await Promise.any([imagePromise, miniPromise])
//                 setSrc(blobPret)

//                 // Attendre que le blob de l'image complete soit pret, puis afficher
//                 // Note : aucun effet si le premier blob pret etait l'image
//                 try {
//                     const blobImage = await imagePromise
//                     setSrc(blobImage)
//                 } catch(err) {
//                     if(err && err.response && err.response.status === 404) {
//                         console.warn("Image %s inconnue (404)", imageFuuid)
//                     } else {
//                         console.debug("Erreur chargement de l'image %s : %O", imageFuuid, err)
//                     }
//                 }
    
//             } catch(err) {
//                 // Aucune image n'a charge
//                 console.error("Erreur chargement image %O", err)

//                 // Tenter de trouver un blob valide
//                 const blobPret = await Promise.race([miniPromise, imagePromise])
//                 setSrc(blobPret)
//             }
//         },
//         unload: () => {
//             miniLoader.unload().catch(err=>console.debug("Erreur unload mini thumbnail %s", thumbnailFuuid))
//             imageLoader.unload().catch(err=>console.debug("Erreur unload image %s", imageFuuid))
//         }
//     }

//     return loader
// }
