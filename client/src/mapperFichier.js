import MediaLoader from './mediaLoader'
import { estMimetypeVideo } from '@dugrema/millegrilles.utiljs/src/mimetypes.js'

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

export { Icones }

export function mapDocumentComplet(workers, doc, opts) {
    opts = opts || {}
    // console.debug("mapDocumentComplet : %O (opts: %O)", doc, opts)
    const userId = opts.userId

    const { traitementFichiers } = workers

    const mediaLoader = new MediaLoader(traitementFichiers.getUrlFuuid, traitementFichiers.getCleSecrete)

    const { nom, tuuid, date_creation, mimetype, user_id, /* archive, */ } = doc
    const version_courante = doc.version_courante?{...doc.version_courante}:null
    const fuuid_v_courante = version_courante?version_courante.fuuid:null
    const copie = {...doc, version_courante}
    
    copie.partage = userId && user_id !== userId

    if(tuuid) {
        // Mapper vers fileId ou folderId
        // Utiliser mimetype pour detecter si c'est un repertoire ou fichier
        if(copie.type_node === 'Fichier') copie.fileId = tuuid
        else {
            copie.mimetype = 'Repertoire'
            copie.folderId = tuuid
        }

        // Remplacer le nom temporairement durant le dechiffrage
        if(!nom) copie.nom = tuuid
    }
    
    if(date_creation) copie.dateAjout = date_creation
    copie.dateFichier = doc.dateFichier || date_creation
    copie.dateItem = copie.dateFichier || doc.derniere_modification

    // Icones et image
    copie.thumbnail = {
        thumbnailIcon: getThumbnailIcon(mimetype),
        thumbnailCaption: nom,
    }

    // Loader du fichier source (principal), supporte thumbnail pour chargement
    copie.loader = mediaLoader.fichierLoader(fuuid_v_courante, {mimetype})

    if(version_courante) {
        const mimetype = doc.mimetype || version_courante.mimetype
        const { anime, taille, images, duration } = version_courante
        
        if(taille) copie.taille = taille
        if(duration) copie.duration = duration
        const cleId = version_courante.cle_id || fuuid_v_courante
        let nonce = version_courante.nonce
        if(version_courante.header) nonce = version_courante.header.slice(1)  // Retirer 'm' multibase

        if(images) {
            copie.imageLoader = mediaLoader.imageLoader(images, {cle_id: cleId, fuuid: fuuid_v_courante, mimetype, anime, nonce})
            copie.thumbnailLoader = mediaLoader.thumbnailLoader(images, {cle_id: cleId, local: true})
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
    } else if(estMimetypeVideo(mimetype)) {
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
    } else if(estMimetypeVideo(mimetype)) {
        return true
    }

    return false
}
