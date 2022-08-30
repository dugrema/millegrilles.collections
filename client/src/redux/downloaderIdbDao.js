import { ouvrirDB } from './idbCollections'

const STORE_DOWNLOADS = 'downloads'

export function init() {
    return ouvrirDB()
}

export async function entretien() {
    const db = await ouvrirDB()

    // Retirer les valeurs expirees
    //await retirerDownloadsExpires(db)
}
