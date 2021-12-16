import { useState, useEffect, useCallback } from 'react'

import { 
    ListeFichiers, FormatteurTaille, FormatterDate, saveCleDechiffree, getCleDechiffree,
} from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import { SupprimerModal, CopierModal, InfoModal, RenommerModal } from './ModalOperations'

import { mapper, onContextMenu } from './mapperFichier'
import { detecterSupport } from './fonctionsFichiers'

function Recents(props) {
    const { workers, etatConnexion, usager } = props
    const [ recents, setRecents ] = useState('')

    useEffect(()=>{ if(etatConnexion) chargerRecents(workers, setRecents) }, [workers, etatConnexion, setRecents])

    return (
        <>
            <h1>Recents</h1>
            <NavigationRecents
                recents={recents} 
                workers={workers} 
                etatConnexion={etatConnexion}
                usager={usager}
            />
        </>
    )
}

export default Recents

function NavigationRecents(props) {

    const { workers, recents, usager } = props

    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ selection, setSelection ] = useState('')
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState('')
    const [ showPreview, setShowPreview ] = useState(false)
    const [ support, setSupport ] = useState({})
    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)

    const showSupprimerModalOuvrir = useCallback(()=>{ setShowSupprimerModal(true) }, [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>{ setShowSupprimerModal(false) }, [setShowSupprimerModal])
    const showCopierModalOuvrir = useCallback(()=>{ setShowCopierModal(true) }, [setShowCopierModal])
    const showCopierModalFermer = useCallback(()=>{ setShowCopierModal(false) }, [setShowCopierModal])
    const showInfoModalOuvrir = useCallback(()=>{ setShowInfoModal(true) }, [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>{ setShowInfoModal(false) }, [setShowInfoModal])
    const showRenommerModalOuvrir = useCallback(()=>{ setShowRenommerModal(true) }, [setShowRenommerModal])
    const showRenommerModalFermer = useCallback(()=>{ setShowRenommerModal(false) }, [setShowRenommerModal])

    const showPreviewAction = useCallback( async tuuid => {
        await setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, setTuuidSelectionne])

    const onDoubleClick = useCallback((event, value)=>{
        window.getSelection().removeAllRanges()
        // console.debug("Ouvrir %O (liste courante: %O)", value, liste)
        if(value.folderId) {
            // const folderItem = recents.filter(item=>item.folderId===value.folderId).pop()
            // setBreadcrumb([...breadcrumb, folderItem])
            // setCuuidCourant(value.folderId)
        } else {
            // Determiner le type de fichier
            showPreviewAction(value.fileId)
        }
    }, [recents, setTuuidSelectionne, showPreviewAction])

    const onSelectionLignes = useCallback(selection=>{setSelection(selection)}, [setSelection])
    // const onSelectionThumbs = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])

    const fermerContextuel = useCallback(()=>{
        setContextuel(false)
    }, [setContextuel])

    // Detect support divers de l'appareil/navigateur
    useEffect(()=>detecterSupport(setSupport), [setSupport])

    return (
        <div>
            <ListeFichiers 
                modeView="recents"
                rows={recents} 
                // onClick={onClick} 
                onDoubleClick={onDoubleClick}
                onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
                onSelection={onSelectionLignes}
                // onClickEntete={colonne=>{
                    // console.debug("Entete click : %s", colonne)
                //}}
            />

            <MenuContextuelRecents
                workers={props.workers}
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                fichiers={recents}
                tuuidSelectionne={tuuidSelectionne}
                selection={selection}
                showPreview={showPreviewAction}
                usager={usager}
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
            />

            <PreviewFichiers 
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={recents}
                support={support}
            />

            <SupprimerModal
                show={showSupprimerModal}
                fermer={showSupprimerModalFermer}
                fichiers={recents}
                selection={selection}
                workers={workers}
            />

            <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                fichiers={recents}
                selection={selection}
                workers={workers}
            />

            <InfoModal 
                show={showInfoModal} 
                fermer={showInfoModalFermer}
                fichiers={recents}
                selection={selection}
                workers={workers}
            />

            <RenommerModal
                show={showRenommerModal} 
                fermer={showRenommerModalFermer}
                fichiers={recents}
                selection={selection}
                workers={workers}
            />            

        </div>
    )
}

async function chargerRecents(workers, setRecents) {
    console.debug("Charger recents")
    const { connexion } = workers
    try {
        const message = await connexion.getRecents({})
        const recents = message.fichiers || {}
        const listeMappee = preprarerDonnees(recents, workers)
        console.debug("Recents mappes : %O", recents)

        setRecents(listeMappee)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }
}

function preprarerDonnees(liste, workers, opts) {
    opts = opts || {}
    const listeMappee = liste.map(item=>mapper(item, workers))

    if(opts.trier) {
        listeMappee.sort(opts.trier)
    }

    return listeMappee
}

function MenuContextuelRecents(props) {

    const { contextuel, fichiers, selection } = props

    if(!contextuel.show) return ''

    if( selection && selection.length > 1 ) {
        return <MenuContextuelMultiselect {...props} />
    } else if(selection.length>0) {
        const fichierTuuid = selection[0]
        const fichier = fichiers.filter(item=>(item.folderId||item.fileId)===fichierTuuid).pop()
        if(fichier) {
            if(fichier.folderId) {
                return <MenuContextuelRepertoire {...props} repertoire={fichier} />
            } else if(fichier.fileId) {
                return <MenuContextuelFichier fichier={fichier} {...props} />
            }
        }
    }

    return ''
}

