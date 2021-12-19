import { useState, useEffect } from 'react'

import { ModalViewer } from '@dugrema/millegrilles.reactjs'

import { resLoader } from './workers/traitementFichiers.js'

function PreviewFichiers(props) {

    const { tuuidSelectionne, fichiers, showPreview, setShowPreview, support } = props

    const [ liste, setListe ] = useState([])

    useEffect(()=>{
        if(showPreview) {
            const liste = preparerPreviews(tuuidSelectionne, fichiers, support)
            setListe(liste)
        } else {
            // Vider la liste
            setListe([])
        }
    }, [tuuidSelectionne, fichiers, showPreview, support, setListe] )

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

function preparerPreviews(tuuidSelectionne, liste, support) {

    console.debug("!!! PreparerPreviews %s : %O", tuuidSelectionne, liste)

    const optionsLoader = {supporteWebm: support.webm, supporteWebp: support.webp}

    const fichierSelectionne = liste.filter(item=>item.fileId===tuuidSelectionne).pop()
    const versionCourante = fichierSelectionne.version_courante || {}
    const mimetypeSelectionne = versionCourante.mimetype || '',
          mimetypeBase = mimetypeSelectionne.split('/').shift()

    if(mimetypeBase === 'video') {
        // Mode video player - 1 seul fichier
        return [mapFichier(fichierSelectionne, optionsLoader)]
    } else {
        // Mode carousel
        return liste.filter(filtrerTypesPreview).map(item=>mapFichier(item, optionsLoader))
    }
}

function mapFichier(item, optionsLoader) {
    return {
        ...item,
        tuuid: item.fileId,
        loader: (typeRessource, opts) => resLoader(item, typeRessource, optionsLoader)
    }
}

function filtrerTypesPreview(item) {
    if(item && item.mimetype) {
        const mimetype = item.mimetype.toLowerCase(),
              mimetypeBase = mimetype.split('/').shift()
        
        if(mimetype === 'application/pdf') return true
        if(mimetypeBase === 'image') return true
    }
    return false
}
