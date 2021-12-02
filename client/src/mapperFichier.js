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

// function sampleData1() {
//     return [
//         {fuuid: 'abcd-1234', nom: 'fichier1.jpg', taille: 1234, date: 1637264900, mimetype: 'image/jpg', thumbnailSrc: '/reactjs/res/001_128.jpg'},
//         {fuuid: 'abcd-1235', nom: 'fichier2 avec un nom long.jpg', taille: 2938481, date: 1637264901, mimetype: 'image/jpg', thumbnailLoader: loadImage()},
//         {fuuid: 'abcd-1236', nom: 'fichier3 avec un nom encore plus long que lautre pour depasser la limite de lecran.jpg', taille: 10023, date: 1637264902, mimetype: 'image/jpg'},
//         {fuuid: 'abcd-1237', nom: 'article1.pdf', taille: 84511, date: 1637265416, mimetype: 'application/pdf'},
//         {fuuid: 'abcd-1238', nom: 'mon film 1.mov', taille: 134874998, date: 1637278941, mimetype: 'video/qt', duree: 123},
//         {cuuid: 'efgh-5678', nom: 'Repertoire 1', date: 1637264902},
//     ]
// }

export function mapper(row) {
    const {tuuid, nom, mimetype, fuuid_v_courante} = row

    let thumbnailIcon = '',
        ids = {}
    if(!fuuid_v_courante) {
        ids.folderId = tuuid  // Collection, tuuid est le folderId
        thumbnailIcon = Icones.ICONE_FOLDER
    } else {
        ids.fileId = tuuid    // Fichier, tuuid est le fileId
        const mimetypeBase = mimetype.split('/').shift()

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
        mimetype: ids.folderId?'Repertoire':mimetype,
        thumbnailIcon,
        thumbnailCaption: nom,
    }
}

export function onContextMenu(event, value, setContextuel) {
    event.preventDefault()
    const {clientX, clientY} = event
    console.debug("ContextMenu %O (%d, %d)", value, clientX, clientY)

    const params = {show: true, x: clientX, y: clientY}

    setContextuel(params)
}
