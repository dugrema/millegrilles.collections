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
    let cleFichier = await getCleDechiffree(fuuid)
    console.debug("!!! getThumbnail cleFichier : %O", cleFichier)

    // Recuperer la cle de fichier
    const cleFichierPromise = connexion.getClesFichiers([fuuid])
        .then(async reponse=>{
            console.debug("Recuperation cle fichier %O", reponse)

            const cleFichier = reponse.cles[fuuid]
            const cleSecrete = await chiffrage.preparerCleSecreteSubtle(cleFichier.cle, cleFichier.iv)
            cleFichier.cleSecrete = cleSecrete
            console.debug("Cle secrete fichier %O", cleFichier)
            saveCleDechiffree(fuuid, cleSecrete, cleFichier)
                .catch(err=>{
                    console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
                })

            return cleFichier
        })
        .catch(err=>{
            console.error("Erreur chargement cle thumbnail %s", fuuid)
            return false
        })

    // Verifier si le thumbnail est deja dans collections.thumbnails

    let fichierPromise = null
    if( dataChiffre ) {
        // Convertir de multibase en array
        fichierPromise = Promise.resolve( multibase.decode(dataChiffre) )
    } else {
        // Recuperer le fichier
        fichierPromise = axios({
            method: 'GET',
            url: `/fichiers/${fuuid}`,
            responseType: 'arraybuffer',
            timeout: 5000,
        })
            .then(reponse=>{
                console.debug("!!! Reponse axios : %O", reponse)
                return reponse.data
            })
            .catch(err=>{
                console.error("Erreur recuperation thumbnail %s : %O", fuuid, err)
                return false
            })
    }

    var [cleFichier2, abFichier] = await Promise.all([cleFichierPromise, fichierPromise])

    console.debug("!!! Fichiers a dechiffrer : %O/%O", cleFichier2, abFichier)

    if(cleFichier2 && abFichier) {
        console.debug("Dechiffrer le fichier %O avec cle %O", abFichier, cleFichier2)
        const ab = await chiffrage.dechiffrerSubtle(abFichier, cleFichier2.cleSecrete, cleFichier2.iv, cleFichier2.tag)
        console.debug("Resultat dechiffrage : %O", ab)
        const blob = new Blob([ab])
        console.debug("Sauvegarder le thumbnail dechiffre : %O", blob)
        saveThumbnailDechiffre(fuuid, blob)

        return blob
    }

    console.error("Erreur chargement thumbnail %s (erreur recuperation cle ou download)", fuuid)
}
