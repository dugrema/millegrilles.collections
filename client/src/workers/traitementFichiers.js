import axios from 'axios'
import multibase from 'multibase'
import { saveCleDechiffree, getCleDechiffree } from '@dugrema/millegrilles.reactjs'
import { getThumbnail as getIdbThumbnail, saveThumbnailDechiffre } from '../idbCollections'
import { trouverLabelImage, trouverLabelVideo } from '@dugrema/millegrilles.reactjs'

var _workers = null

export function setWorkers(workers) {
    _workers = workers
}

export async function getThumbnail(fuuid, opts) {
    opts = opts || {}

    // Verifier si le thumbnail est deja dans collections.thumbnails
    const thumbnailCache = await getIdbThumbnail(fuuid)
    if(thumbnailCache && thumbnailCache.blob) {
        // console.debug("!!! Thumbnail cache : %O", thumbnailCache)
        return thumbnailCache.blob
    }

    const blob = await getFichierChiffre(fuuid, opts)
    if(blob) {
        // console.debug("Sauvegarder le thumbnail dechiffre : %O", blob)
        saveThumbnailDechiffre(fuuid, blob)
    }

    return blob
}

export async function getFichierChiffre(fuuid, opts) {
    opts = opts || {}
    const { dataChiffre } = opts
    const { connexion, chiffrage } = _workers

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
            // console.debug("!!! Reponse axios : %O", reponse)
            return reponse.data
        }
    }

    var [cleFichier, abFichier] = await Promise.all([cleFichierFct(), fichierFct()])
    if(cleFichier && abFichier) {
        // console.debug("Dechiffrer le fichier %O avec cle %O", abFichier, cleFichier)
        const ab = await chiffrage.dechiffrerSubtle(abFichier, cleFichier.cleSecrete, cleFichier.iv, cleFichier.tag)
        // console.debug("Resultat dechiffrage : %O", ab)
        const blob = new Blob([ab])
        return blob
    }

    console.error("Erreur chargement image %s (erreur recuperation cle ou download)", fuuid)
}

/* Donne acces aux ressources, selection via typeRessource. Chargement async. 
   Retourne { src } qui peut etre un url ou un blob. 
*/
export function resLoader(fichier, typeRessource, opts) {
    opts = opts || {}
    const {fileId, version_courante} = fichier

    // console.debug("Loader %s avec sources %O (opts: %O)", typeRessource, fichier, opts)

    let selection = ''
    if(typeRessource === 'video') {
        // Charger video pleine resolution
        const {video} = version_courante
        const labelVideo = trouverLabelVideo(Object.keys(video), opts)
        // console.debug("Label video trouve : '%s'", labelVideo)
        selection = video[labelVideo]
    } else if(typeRessource === 'original') {
        // Charger contenu original
        selection = {version_courante, fuuid: fichier.fuuid}
    } else if(typeRessource === 'image') {
        // Charger image pleine resolution
        const images = version_courante.images
        const labelImage = trouverLabelImage(Object.keys(images), opts)
        // console.debug("Label image trouve : '%s'", labelImage)
        selection = images[labelImage]
    } else if(typeRessource === 'poster') {
        // Charger poster (fallback image pleine resolution)
        const images = version_courante.images
        if(images.poster) selection = images.poster
        else {
            const labelImage = trouverLabelImage(Object.keys(images), opts)
            // console.debug("Label image trouve : '%s'", labelImage)
            selection = images[labelImage]
        }
    } else if(typeRessource === 'thumbnail') {
        // Charger thumbnail (fallback image poster, sinon pleine resolution)
        const images = version_courante.images
        if(images.thumbnail) selection = images.thumbnail
        else if(images.poster) selection = images.poster
        else {
            const labelImage = trouverLabelImage(Object.keys(images), opts)
            // console.debug("Label image trouve : '%s'", labelImage)
            selection = images[labelImage]
        }
    }

    if(selection) {
        const fuuid = selection.hachage || selection.fuuid
        if(!fuuid) {
            console.warn("Aucun fuuid trouve pour file_id: %s (selection: %O)", fileId, selection)
            return false
        }
        const urlBlob = getFichierChiffre(fuuid)
            .then(blob=>URL.createObjectURL(blob))
            .catch(err=>console.error("Erreur creation url blob fichier %s : %O", selection.hachage, err))

        return { srcPromise: urlBlob, clean: ()=>clean(urlBlob) }
    }

    return false
}

async function clean(urlBlobPromise) {
    try {
        const urlBlob = await urlBlobPromise
        // console.debug("Cleanup blob %s", urlBlob)
        URL.revokeObjectURL(urlBlob)
    } catch(err) {
        console.warn("Erreur cleanup URL Blob")
    }
}