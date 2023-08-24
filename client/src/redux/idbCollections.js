import { openDB } from 'idb'

const DB_NAME = 'collections',
      STORE_DOWNLOADS = 'downloads',
      STORE_DOWNLOADS_FICHIERS = 'downloadsFichiers',
      STORE_UPLOADS = 'uploads',
      STORE_UPLOADS_FICHIERS = 'uploadsFichiers',
      STORE_FICHIERS = 'fichiers',
      VERSION_COURANTE = 7

export function ouvrirDB(opts) {
    opts = opts || {}

    return openDB(DB_NAME, VERSION_COURANTE, {
        upgrade(db, oldVersion, newVersion, transaction) {
            createObjectStores(db, oldVersion, newVersion, transaction)
        },
        blocked() {
            console.error("OpenDB %s blocked", DB_NAME)
        },
        blocking() {
            console.warn("OpenDB, blocking")
        }
    })

}

function createObjectStores(db, oldVersion, newVersion, transaction) {
    // console.debug("dbUsagers upgrade, DB object (version %s): %O", oldVersion, db)
    /*eslint no-fallthrough: "off"*/
    console.info("DB fichiers upgrade de %s a %s", oldVersion, newVersion)
    let fichierStore = null
    try {
        switch(oldVersion) {
            case 0:
            case 1:
                db.createObjectStore(STORE_DOWNLOADS, {keyPath: 'fuuid'})
            case 2: // Plus recent, rien a faire
                db.createObjectStore(STORE_UPLOADS, {keyPath: 'correlation'})
                fichierStore = db.createObjectStore(STORE_FICHIERS, {keyPath: 'tuuid'})
                db.createObjectStore(STORE_UPLOADS_FICHIERS, {keyPath: ['correlation', 'position']})
            case 3:
                // ajouter index sur favorisIdx (nouveau champ helper)
                fichierStore = transaction.objectStore(STORE_FICHIERS)
                fichierStore.createIndex('cuuids', 'cuuids', {unique: false, multiEntry: true})
                fichierStore.createIndex('userFavoris', ['user_id', 'favorisIdx'], {unique: false, multiEntry: false})
            case 4:
                fichierStore = transaction.objectStore(STORE_FICHIERS)
                fichierStore.createIndex('cuuid', 'cuuid', {unique: false})
            case 5:
                fichierStore = transaction.objectStore(STORE_FICHIERS)
                fichierStore.clear()
                fichierStore.deleteIndex('cuuids')
                fichierStore.deleteIndex('userFavoris')
                fichierStore.createIndex('userTypeNode', ['user_id', 'type_node'], {unique: false, multiEntry: false})
                fichierStore.createIndex('pathCuuids', 'path_cuuids', {unique: false, multiEntry: true})
            case 6:
                db.createObjectStore(STORE_DOWNLOADS_FICHIERS, {keyPath: ['fuuid', 'position']})
            case 7: // Plus recent, rien a faire
                break
            default:
                console.warn("createObjectStores Default..., version %O", oldVersion)
        }
    } catch(err) {
        console.error("Erreur preparation IDB : ", err)
        throw err
    }
}
