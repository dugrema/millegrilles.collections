import {supporteFormatWebp, /*supporteFormatWebm*/ } from '@dugrema/millegrilles.reactjs/src/detecterAppareils'
import MediaLoader from '@dugrema/millegrilles.reactjs/src/mediaLoader'

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
// const supporteWebm = supporteFormatWebm()
let supporteWebp = false
supporteFormatWebp().then(supporte=>supporteWebp=supporte).catch(err=>console.warn("Erreur detection webp : %O", err))
// console.debug("Support webm : %O", supporteWebm)

export { Icones }

// function mapper(row, workers) {
//     const version_courante = row.version_courante || {}
//     const { tuuid, nom, supprime, date_creation, fuuid_v_courante, favoris } = row
//     const { anime, date_fichier, taille, images, video, duration, videoCodec } = version_courante || row
//     const mimetype = version_courante.mimetype || row.mimetype

//     // console.debug("!!! MAPPER %O", row)

//     const creerToken = async fuuids => {
//         if(typeof(fuuids) === 'string') fuuids = [fuuids]  // Transformer en array
//         const reponse = await workers.connexion.creerTokenStream(fuuids)
//         // console.debug("!!! creerToken reponse : ", reponse)
//         return reponse.jwts
//     }

//     let date_version = '', 
//         mimetype_fichier = '',
//         taille_fichier = ''

//     let thumbnailIcon = '',
//         ids = {},
//         miniThumbnailLoader = null,
//         smallThumbnailLoader = null,
//         loader = null,
//         imageLoader = null,
//         videoLoader = null
//     if(!mimetype) {
//         ids.folderId = tuuid  // Collection, tuuid est le folderId
//         thumbnailIcon = Icones.ICONE_FOLDER
//     } else {
//         // const { anime, mimetype, date_fichier, taille, images, video } = version_courante || row
//         mimetype_fichier = mimetype
//         date_version = date_fichier
//         taille_fichier = taille
//         ids.fileId = tuuid    // Fichier, tuuid est le fileId
//         const mimetypeBase = mimetype.split('/').shift()

//         if(workers && workers.traitementFichiers) {
//             const getFichierChiffre = workers.traitementFichiers.getFichierChiffre

//             // Thumbnails pour navigation
//             if(images) {
//                 const thumbnail = images.thumb || images.thumbnail,
//                     small = images.small || images.poster
//                 if(thumbnail && thumbnail.data_chiffre) {
//                     miniThumbnailLoader = loadFichierChiffre(getFichierChiffre, thumbnail.hachage, thumbnail.mimetype, {dataChiffre: thumbnail.data_chiffre})
//                 }
//                 if(small) smallThumbnailLoader = fileResourceLoader(getFichierChiffre, small.hachage, small.mimetype, {thumbnail})

//                 imageLoader = imageResourceLoader(getFichierChiffre, images, {anime, supporteWebp, fuuid: fuuid_v_courante, mimetype})
//             }

//             if(mimetypeBase === 'video') {
//                 if(video && Object.keys(video).length > 0) {
//                     videoLoader = videoResourceLoader(video, {creerToken, fuuid: fuuid_v_courante, version_courante})
//                 } else {
//                     // console.debug("Video - original seulement")
//                     videoLoader = videoResourceLoader({}, {creerToken, fuuid: fuuid_v_courante, version_courante})
//                 }
//             }
        
//             // Loader du fichier source (principal), supporte thumbnail pour chargement
//             loader = loadFichierChiffre(getFichierChiffre, fuuid_v_courante, mimetype)
//         }

//         if(mimetype === 'application/pdf') {
//             thumbnailIcon = ICONE_FICHIER_PDF
//         } else if(mimetypeBase === 'image') {
//             thumbnailIcon = ICONE_FICHIER_IMAGE
//         } else if(mimetypeBase === 'video') {
//             thumbnailIcon = ICONE_FICHIER_VIDEO
//         } else if(mimetypeBase === 'audio') {
//             thumbnailIcon = ICONE_FICHIER_AUDIO
//         } else if(mimetypeBase === 'application/text') {
//             thumbnailIcon = ICONE_FICHIER_TEXT
//         } else if(mimetypeBase === 'application/zip') {
//             thumbnailIcon = ICONE_FICHIER_ZIP
//         } else { 
//             thumbnailIcon = ICONE_FICHIER
//         }
//     }

//     let upload = null
//     if(row.status) {
//         upload = { status: row.status, position: row.position }
//     }

//     return {
//         // fileId: tuuid,
//         // folderId: tuuid,
//         ...ids,
//         nom,
//         supprime, 
//         taille: taille_fichier,
//         dateAjout: date_version || date_creation,
//         mimetype: ids.folderId?'Repertoire':mimetype_fichier,
//         duration, videoCodec,
//         fuuid: fuuid_v_courante,
//         version_courante,
//         favoris,

//         // Upload
//         upload,

//         // Loaders
//         thumbnail: {
//             miniLoader: miniThumbnailLoader,
//             smallLoader: smallThumbnailLoader,
//             thumbnailIcon,
//             thumbnailCaption: nom,
//         },
//         loader,
//         imageLoader,
//         videoLoader,
//     }
// }

export function mapDocumentComplet(workers, doc) {

    // console.debug("mapDocumentComplet : ", doc)

    const { connexion, traitementFichiers } = workers

    // Instance mediaLoader pour contenu (fichier, images, videos)
    const creerTokenStreamInst = commande => connexion.creerTokenStream(commande)
    const mediaLoader = new MediaLoader(traitementFichiers.getUrlFuuid, traitementFichiers.getCleSecrete, creerTokenStreamInst)

    const { nom, tuuid, date_creation, fuuid_v_courante, mimetype, archive } = doc
    const version_courante = doc.version_courante?{...doc.version_courante}:null
    const copie = {...doc, version_courante}

    if(tuuid) {
        // Mapper vers fileId ou folderId
        // Utiliser mimetype pour detecter si c'est un repertoire ou fichier
        if(mimetype) copie.fileId = tuuid
        else {
            copie.mimetype = 'Repertoire'
            copie.folderId = tuuid
        }

        // Remplacer le nom temporairement durant le dechiffrage
        if(!nom) copie.nom = tuuid
    }
    
    if(date_creation) copie.dateAjout = date_creation
    copie.dateFichier = doc.dateFichier || date_creation

    // Icones et image
    copie.thumbnail = {
        thumbnailIcon: getThumbnailIcon(mimetype),
        thumbnailCaption: nom,
    }

    // Loader du fichier source (principal), supporte thumbnail pour chargement
    copie.loader = mediaLoader.fichierLoader(fuuid_v_courante, {mimetype})

    if(version_courante) {
        const { anime, taille, images, video, duration, mimetype, header } = version_courante
        
        if(taille) copie.taille = taille
        if(duration) copie.duration = duration

        if(images) {
            copie.imageLoader = mediaLoader.imageLoader(images, {cle_id: fuuid_v_courante, fuuid: fuuid_v_courante, mimetype, anime, header})
            copie.thumbnailLoader = mediaLoader.thumbnailLoader(images, {cle_id: fuuid_v_courante})
        }

        if(mimetype.toLowerCase().startsWith('video/')) {
            // const creerToken = async fuuidVideo => {
            //     if(Array.isArray(fuuidVideo)) fuuidVideo = fuuidVideo[0]
            //     // console.debug("mapDocumentComplet.creerToken fuuidVideo : %O, info version courante : ", fuuidVideo, version_courante)
            //     let dechiffrageVideo = null,
            //         mimetypeVideo = mimetype
            //     if(fuuidVideo === fuuid_v_courante) {
            //         // Rien a faire
            //     } else {
            //         const videoInfo = Object.values(video).filter(item=>item.fuuid_video === fuuidVideo).pop()

            //         // Changer mimetype pour celui du video selectionne
            //         mimetypeVideo = videoInfo.mimetype

            //         // Inserer valeurs de dechiffrage dans la reponse
            //         const champsDechiffrage = ['format', 'header', 'iv', 'tag']
            //         dechiffrageVideo = {}
            //         for (const champ of champsDechiffrage) {
            //             if(videoInfo[champ]) dechiffrageVideo[champ] = videoInfo[champ]
            //         }
            //     }
            //     const fuuids = [fuuid_v_courante]

            //     const commande = {
            //         fuuids,
            //         fuuidVideo,
            //         mimetype: mimetypeVideo,
            //     }
            //     if(dechiffrageVideo) commande.dechiffrageVideo = dechiffrageVideo

            //     const reponse = await connexion.creerTokenStream(commande)
            //     // console.debug("!!! creerToken reponse : ", reponse)
            //     return reponse.jwts
            // }

            copie.videoLoader = mediaLoader.videoLoader(video || {}, {fuuid: fuuid_v_courante, mimetype})

            // if(video) {
            //     //copie.videoLoader = videoResourceLoader(video, {creerToken, fuuid: fuuid_v_courante, version_courante})
            //     copie.videoLoader = mediaLoader.videoLoader(video, {fuuid: fuuid_v_courante, mimetype})
            // } else {
            //     // Utilisation du video original seulement
            //     copie.videoLoader = videoResourceLoader({}, {fuuid: fuuid_v_courante, mimetype})
            // }

            // console.debug("videoLoader : ", copie.videoLoader.getSelecteurs())
        } else if(mimetype.toLowerCase().startsWith('audio/')) {
            // const creerToken = async fuuidAudio => {
            //     if(Array.isArray(fuuidAudio)) fuuidAudio = fuuidAudio[0]
            //     // console.debug("mapDocumentComplet.creerToken fuuidAudio : %O, info version courante : ", fuuidAudio, version_courante)
            //     const fuuids = [fuuid_v_courante]
            //     const commande = {
            //         fuuids,
            //         fuuidMedia: fuuidAudio,
            //         mimetype,
            //     }
            //     const reponse = await connexion.creerTokenStream(commande)
            //     // console.debug("!!! creerToken reponse : ", reponse)
            //     return reponse.jwts
            // }
            // copie.audioLoader = audioResourceLoader(fuuid_v_courante, {creerToken, version_courante})
            copie.audioLoader = mediaLoader.audioLoader(fuuid_v_courante, mimetype)
        }
    }

    return copie
}

export function mapperPathCuuids(workers, pathCuuids) {
    if(!pathCuuids) return ''
    return '/' + pathCuuids.join('/')
}

function getThumbnailIcon(mimetype) {
    if(!mimetype) return ICONE_FOLDER

    if(mimetype === 'application/pdf') {
        return ICONE_FICHIER_PDF
    }
    
    const mimetypeBase = mimetype.split('/').shift()

    if(mimetypeBase === 'image') {
        return ICONE_FICHIER_IMAGE
    } else if(mimetypeBase === 'video') {
        return ICONE_FICHIER_VIDEO
    } else if(mimetypeBase === 'audio') {
        return ICONE_FICHIER_AUDIO
    } else if(mimetypeBase === 'application/text') {
        return ICONE_FICHIER_TEXT
    } else if(mimetypeBase === 'application/zip') {
        return ICONE_FICHIER_ZIP
    }

    return ICONE_FICHIER
}

export function estMimetypeMedia(mimetype) {
    if(mimetype === 'application/pdf') return true
    
    const mimetypeBase = mimetype.split('/').shift()
    if(mimetypeBase === 'image') {
        return true
    } else if(mimetypeBase === 'video') {
        return true
    }

    return false
}
