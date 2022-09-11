import {loadFichierChiffre, fileResourceLoader, imageResourceLoader, videoResourceLoader} from '@dugrema/millegrilles.reactjs/src/imageLoading'
import {supporteFormatWebp, /*supporteFormatWebm*/ } from '@dugrema/millegrilles.reactjs/src/detecterAppareils'

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

            if(mimetypeBase === 'video') {
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

export function mapDocumentComplet(workers, doc) {

    const { connexion, traitementFichiers } = workers

    const { nom, tuuid, date_creation, fuuid_v_courante, mimetype } = doc
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
    copie.loader = loadFichierChiffre(traitementFichiers.getFichierChiffre, fuuid_v_courante, mimetype)    

    if(version_courante) {
        const { anime, taille, images, video, duration, mimetype } = version_courante
        
        if(taille) copie.taille = taille
        if(duration) copie.duration = duration

        if(images) {
            const imageLoader = imageResourceLoader(
                traitementFichiers.getFichierChiffre, 
                images, 
                {anime, supporteWebp: true, fuuid: fuuid_v_courante, mimetype}
            )
            copie.imageLoader = imageLoader
        }

        if(video) {
            const creerToken = async fuuids => {
                if(typeof(fuuids) === 'string') fuuids = [fuuids]  // Transformer en array
                const reponse = await connexion.creerTokenStream(fuuids)
                return reponse.token
            }

            if(Object.keys(video).length > 0) {
                copie.videoLoader = videoResourceLoader(
                    traitementFichiers.getFichierChiffre, video, {creerToken, fuuid: fuuid_v_courante, version_courante})
            } else {
                // Utilisation du video original seulement
                copie.videoLoader = videoResourceLoader(
                    traitementFichiers.getFichierChiffre, {}, {creerToken, fuuid: fuuid_v_courante, version_courante})
            }
        }
    }

    return copie
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
