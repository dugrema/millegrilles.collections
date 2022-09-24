import { openDB } from 'idb'

const DB_NAME = 'collections',
      STORE_DOWNLOADS = 'downloads',
      STORE_UPLOADS = 'uploads',
      STORE_UPLOADS_FICHIERS = 'uploadsFichiers',
      STORE_FICHIERS = 'fichiers',
      VERSION_COURANTE = 3

export function ouvrirDB(opts) {
    opts = opts || {}

    return openDB(DB_NAME, VERSION_COURANTE, {
        upgrade(db, oldVersion) {
            createObjectStores(db, oldVersion)
        },
        blocked() {
            console.error("OpenDB %s blocked", DB_NAME)
        },
        blocking() {
            console.warn("OpenDB, blocking")
        }
    })

}

function createObjectStores(db, oldVersion) {
    // console.debug("dbUsagers upgrade, DB object (version %s): %O", oldVersion, db)
    /*eslint no-fallthrough: "off"*/
    let fichierStore = null
    try {
        switch(oldVersion) {
            case 0:
                db.createObjectStore(STORE_DOWNLOADS, {keyPath: 'fuuid'})
            case 1: // Plus recent, rien a faire
                db.createObjectStore(STORE_UPLOADS, {keyPath: 'correlation'})
                fichierStore = db.createObjectStore(STORE_FICHIERS, {keyPath: 'tuuid'})
                db.createObjectStore(STORE_UPLOADS_FICHIERS, {keyPath: ['correlation', 'position']})
            case 2:
                // Recreer store fichiers pour ajouter index sur favorisIdx (nouveau champ helper)
                db.deleteObjectStore(STORE_FICHIERS)
                fichierStore = db.createObjectStore(STORE_FICHIERS, {keyPath: 'tuuid'})
                fichierStore.createIndex('cuuids', 'cuuids', {unique: false, multiEntry: true})
                fichierStore.createIndex('userFavoris', ['user_id', 'favorisIdx'], {unique: false, multiEntry: false})
            case 3: // Plus recent, rien a faire
                break
            default:
            console.warn("createObjectStores Default..., version %O", oldVersion)
        }
    } catch(err) {
        console.error("Erreur preparation IDB : ", err)
        throw err
    }
}
