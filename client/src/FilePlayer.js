import { useState, useEffect } from 'react'

import { ModalViewer } from '@dugrema/millegrilles.reactjs'
import {trouverLabelImage} from '@dugrema/millegrilles.reactjs/src/labelsRessources'
import {loadFichierChiffre, fileResourceLoader} from '@dugrema/millegrilles.reactjs/src/imageLoading'

import { resLoader } from './workers/traitementFichiers.js'

function PreviewFichiers(props) {
    console.debug("PreviewFichiers proppies : %O", props)

    const { workers, tuuidSelectionne, fichiers, showPreview, setShowPreview, support } = props

    const [ liste, setListe ] = useState([])

    useEffect(()=>{
        if(showPreview) {
            const liste = preparerPreviews(workers, tuuidSelectionne, fichiers, support)
            console.debug("Liste fichiers pour previews : %O", liste)
            setListe(liste)
        } else {
            // Vider la liste
            setListe([])
        }
    }, [workers, tuuidSelectionne, fichiers, showPreview, support, setListe] )

    console.debug("PreviewFichiers liste : %O", liste)

    return (
        <ModalViewer 
            show={ showPreview } 
            handleClose={ () => setShowPreview(false) } 
            fichiers={liste} 
            tuuidSelectionne={ tuuidSelectionne }
        />
    )
}

export default PreviewFichiers

function preparerPreviews(workers, tuuidSelectionne, liste, support) {

    console.debug("!!! PreparerPreviews %s : %O", tuuidSelectionne, liste)

    const optionsLoader = {supporteWebm: support.webm, supporteWebp: support.webp}

    const fichierSelectionne = liste.filter(item=>item.fileId===tuuidSelectionne).pop()
    const versionCourante = fichierSelectionne.version_courante || {}
    const mimetypeSelectionne = versionCourante.mimetype || '',
          mimetypeBase = mimetypeSelectionne.split('/').shift()

    if(mimetypeBase === 'image') {
        // Mode carousel d'images
        return liste.filter(filtrerTypesPreview).map(item=>mapImage(workers, item, optionsLoader))
    } else {
        // Mode lecteur fichier / video player - 1 seul fichier
        return [mapFichier(fichierSelectionne, optionsLoader)]
    }
}

function mapFichier(item, optionsLoader) {
    optionsLoader = optionsLoader || {}
    return {
        ...item,
        tuuid: item.fileId,
        // loader: (typeRessource, opts) => resLoader(item, typeRessource, {...optionsLoader, ...opts})
    }
}

function mapImage(workers, item, optionsLoader) {

    const traitementFichiersWorker = workers.traitementFichiers

    const version_courante = item.version_courante || {}
    const images = version_courante.images || {}
    console.debug("Trouver labels images : %O", images)
    const labelImage = trouverLabelImage(Object.keys(images), {supporteWebp: true})
    const image = images[labelImage]
    console.debug("Label trouve : %s, image : %O", labelImage, image)
    const thumbnail = images.thumbnail || images.thumb

    let loader = ''
    if(image && image.hachage) {
        const imageFuuid = image.hachage
        loader = fileResourceLoader(traitementFichiersWorker.getFichierChiffre, imageFuuid, {thumbnail})
    } else if(thumbnail && thumbnail.hachage && thumbnail.data_chiffre) {
        loader = loadFichierChiffre(traitementFichiersWorker.getFichierChiffre, thumbnail.hachage, {dataChiffre: thumbnail.data_chiffre})
    } else {
        console.debug("Aucune information d'image pour %O", item)
        return null
    }

    return {
        ...item,
        tuuid: item.fileId,
        loader,
    }
}

function filtrerTypesPreview(item) {
    if(item && item.mimetype) {
        const mimetype = item.mimetype.toLowerCase(),
              mimetypeBase = mimetype.split('/').shift()
        
        // if(mimetype === 'application/pdf') return true
        if(mimetypeBase === 'image') return true
    }
    return false
}
