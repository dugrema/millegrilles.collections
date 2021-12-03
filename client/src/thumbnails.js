import { getThumbnail } from './idbCollections'
/* 
Charge une image de format special nomme (e.g. thumbnail, small, poster, etc) 
Utilise une table a cet effet dans IndexDB storage (collections.thumbnails)
*/
export async function chargerImageNommee(workers, fuuid) {

    // Verifier si l'image est deja downloadee et dechiffree
    const dbimage = await getThumbnail(fuuid) || {}
    if(dbimage.dechiffree) {
        // L'image existe, on la retourne
        return dbimage.dechiffree
    }

    const cle = getCle(fuuid)

}