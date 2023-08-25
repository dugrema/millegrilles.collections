import { ouvrirDB } from './idbCollections'

const STORE_DOWNLOADS = 'downloads'
const STORE_DOWNLOADS_FICHIERS = 'downloadsFichiers'

export function init() {
    return ouvrirDB()
}

export async function entretien() {
    const db = await ouvrirDB()

    // Retirer les valeurs expirees
    //await retirerDownloadsExpires(db)
}

export async function updateFichierDownload(doc) {
    const { fuuid, userId } = doc
    if(!fuuid) throw new Error('updateFichierUpload Le document doit avoir un champ fuuid')

    const db = await ouvrirDB()
    const store = db.transaction(STORE_DOWNLOADS, 'readwrite').store
    let docExistant = await store.get(fuuid)
    if(!docExistant) {
        if(!userId) throw new Error('updateFichierDownload Le document doit avoir un champ userId')
        docExistant = {...doc}
    } else {
        Object.assign(docExistant, doc)
    }

    docExistant.derniereModification = new Date().getTime()

    await store.put(docExistant)
}

export async function supprimerDownload(fuuid) {
    const db = await ouvrirDB()

    // Supprimer fichiers (blobs)
    const storeDownloadsFichiers = db.transaction(STORE_DOWNLOADS_FICHIERS, 'readwrite').store
    const keyRange = IDBKeyRange.bound([fuuid, 0], [fuuid, Number.MAX_SAFE_INTEGER])
    let cursorFichiers = await storeDownloadsFichiers.openCursor(keyRange, 'next')
    while(cursorFichiers) {
        const correlationCursor = cursorFichiers.value.fuuid
        if(correlationCursor === fuuid) {
            await cursorFichiers.delete()
        }
        cursorFichiers = await cursorFichiers.continue()
    }

    // Supprimer entree de download
    const storeDownloads = db.transaction(STORE_DOWNLOADS, 'readwrite').store
    await storeDownloads.delete(fuuid)
}

export async function chargerDownloads(userId) {
    if(!userId) throw new Error("Il faut fournir le userId")
    const db = await ouvrirDB()
    const store = db.transaction(STORE_DOWNLOADS, 'readonly').store
    let curseur = await store.openCursor()
    const uploads = []
    while(curseur) {
        const userIdCurseur = curseur.value.userId
        if(userIdCurseur === userId) uploads.push(curseur.value)
        curseur = await curseur.continue()
    }
    return uploads
}

export async function ajouterFichierDownloadFile(fuuid, position, blob) {
    const db = await ouvrirDB()
    const store = db.transaction(STORE_DOWNLOADS_FICHIERS, 'readwrite').store
    const row = {
        fuuid,
        position,
        blob,
        creation: new Date().getTime()
    }
    await store.put(row)
}

export async function getDownloadComplet(fuuid) {
    const db = await ouvrirDB()

    // Supprimer entree de download
    const storeDownloads = db.transaction(STORE_DOWNLOADS, 'readonly').store
    const info = await storeDownloads.get(fuuid)
    
    if(!info) return false

    console.debug("getDownloadComplet Info ", info)

    const mimetype = info.mimetype

    const storeDownloadsFichiers = db.transaction(STORE_DOWNLOADS_FICHIERS, 'readonly').store
    const keyRange = IDBKeyRange.bound([fuuid, 0], [fuuid, Number.MAX_SAFE_INTEGER])
    let cursorFichiers = await storeDownloadsFichiers.openCursor(keyRange, 'next')
    const blobs = []
    let position = 0
    while(cursorFichiers) {
        const correlationCursor = cursorFichiers.value.fuuid
        if(correlationCursor !== fuuid) {
            throw new Error("erreur index getDownloadComplet - fuuid mismatch")
        }

        const positionBlob = correlationCursor.position
        if(positionBlob === position) {
            throw new Error("erreur index getDownloadComplet - position non triee")
        }
        const blob = cursorFichiers.value.blob

        position = positionBlob + blob.size

        blobs.push(blob)

        cursorFichiers = await cursorFichiers.continue()
    }

    if(position === 0) {
        console.error("Aucun contenu de fichier trouve pour %s", fuuid)
        return false
    }

    const blobComplet = new Blob(blobs, {type: mimetype})
    // console.debug("getDownloadComplet Blob ", blobComplet)

    return { ...info, blob: blobComplet }
}
