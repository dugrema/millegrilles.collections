import axios from 'axios'
import multibase from 'multibase'
import { saveCleDechiffree, getCleDechiffree } from '@dugrema/millegrilles.reactjs'
import { getThumbnail as getIdbThumbnail, saveThumbnailDechiffre } from '../idbCollections'

var _workers = null

export function setWorkers(workers) {
    _workers = workers
}

export async function getThumbnail(fuuid, opts) {
    opts = opts || {}
    const { dataChiffre } = opts
    const { connexion, chiffrage } = _workers

    // Verifier si le thumbnail est deja dans collections.thumbnails
    const thumbnailCache = await getIdbThumbnail(fuuid)
    if(thumbnailCache && thumbnailCache.blob) {
        // console.debug("!!! Thumbnail cache : %O", thumbnailCache)
        return thumbnailCache.blob
    }

    // Recuperer la cle de fichier
    const cleFichierFct = async () => {
        let cleFichier = await getCleDechiffree(fuuid)
        // console.debug("!!! getThumbnail cleFichier : %O", cleFichier)
        if(cleFichier) return cleFichier

        const reponse = await connexion.getClesFichiers([fuuid])
        // console.debug("Recuperation cle fichier %O", reponse)

        cleFichier = reponse.cles[fuuid]
        const cleSecrete = await chiffrage.preparerCleSecreteSubtle(cleFichier.cle, cleFichier.iv)
        cleFichier.cleSecrete = cleSecrete
        // console.debug("Cle secrete fichier %O", cleFichier)

        // Sauvegarder la cle pour reutilisation
        saveCleDechiffree(fuuid, cleSecrete, cleFichier)
            .catch(err=>{
                console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
            })

        return cleFichier
    }

    let fichierFct = async () => {
        if( dataChiffre ) {
            // Convertir de multibase en array
            return multibase.decode(dataChiffre)
        } else {
            // Recuperer le fichier
            const reponse = await axios({
                method: 'GET',
                url: `/fichiers/${fuuid}`,
                responseType: 'arraybuffer',
                timeout: 5000,
            })
            console.debug("!!! Reponse axios : %O", reponse)
            return reponse.data
        }
    }

    var [cleFichier, abFichier] = await Promise.all([cleFichierFct(), fichierFct()])
    if(cleFichier && abFichier) {
        console.debug("Dechiffrer le fichier %O avec cle %O", abFichier, cleFichier)
        const ab = await chiffrage.dechiffrerSubtle(abFichier, cleFichier.cleSecrete, cleFichier.iv, cleFichier.tag)
        // console.debug("Resultat dechiffrage : %O", ab)
        const blob = new Blob([ab])
        // console.debug("Sauvegarder le thumbnail dechiffre : %O", blob)
        saveThumbnailDechiffre(fuuid, blob)

        return blob
    }

    console.error("Erreur chargement thumbnail %s (erreur recuperation cle ou download)", fuuid)
}
