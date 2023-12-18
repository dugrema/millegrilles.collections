import { useCallback, useMemo } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { MenuContextuel } from '@dugrema/millegrilles.reactjs'

export function MenuContextuelFichier(props) {
    const { 
        fichier, contextuel, fermerContextuel, showPreview, cuuid, 
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, 
        showRenommerModalOuvrir, downloadAction, 
        // showInfoModalOuvrir,
    } = props

    // Determiner si preview est disponible
    let previewDisponible = false
    if(fichier) {
        const mimetype = fichier.mimetype || '',
              mimetypeBase = mimetype.split('/').shift()
        if(mimetype === 'application/pdf') {
            previewDisponible = true
        } else {
            const versionCourante = fichier.version_courante || {}
            if(mimetypeBase === 'image' && versionCourante.images) {
                previewDisponible = true
            } else if(mimetypeBase === 'video' && versionCourante.video) {
                previewDisponible = true
            }
        }
    }

    const posX = useMemo(()=>{
        return contextuel.x || 0
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y || 0
    }, [contextuel])    

    const showPreviewAction = useCallback( event => {
        if(previewDisponible) showPreview(fichier.fileId)
        fermerContextuel()
    }, [fichier, previewDisponible, fermerContextuel, showPreview])

    const downloadEvent = useCallback( async event => {
        console.debug("Download fichier %O", fichier)
        const tuuid = fichier.tuuid
        downloadAction(tuuid)
        fermerContextuel()
    }, [fichier, downloadAction, fermerContextuel])

    const supprimerAction = useCallback( () => supprimerDocuments(fermerContextuel, showSupprimerModalOuvrir), [fermerContextuel, showSupprimerModalOuvrir] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )
    const renommerAction = useCallback( () => renommer(fermerContextuel, showRenommerModalOuvrir), [fermerContextuel, showRenommerModalOuvrir] )
    // const infoAction = useCallback( () => infoModal(fermerContextuel, showInfoModalOuvrir), [fermerContextuel, showInfoModalOuvrir] )

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={showPreviewAction} disabled={!previewDisponible}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadEvent}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={renommerAction}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction} disabled={!cuuid}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelFichierRecherche(props) {
    const { 
        fichier, contextuel, fermerContextuel, showPreview,
        showSupprimerModalOuvrir, showCopierModalOuvrir, 
        showInfoModalOuvrir, downloadAction,
    } = props

    // Determiner si preview est disponible
    let previewDisponible = false
    if(fichier) {
        const mimetype = fichier.mimetype || '',
              mimetypeBase = mimetype.split('/').shift()
        if(mimetype === 'application/pdf') {
            previewDisponible = true
        } else if(mimetypeBase === 'image' && fichier.images) {
            previewDisponible = true
        } else if(mimetypeBase === 'video' && fichier.video) {
            previewDisponible = true
        }
    }

    const posX = useMemo(()=>{
        return contextuel.x || 0
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y || 0
    }, [contextuel])

    const showPreviewAction = useCallback( event => {
        if(previewDisponible) showPreview(fichier.tuuid || fichier.fileId)
        fermerContextuel()
    }, [fichier, previewDisponible, fermerContextuel, showPreview])

    const downloadEvent = useCallback( async event => {
        //console.debug("Download fichier %O", fichier)
        downloadAction(fichier)
        fermerContextuel()
    }, [fichier, downloadAction, fermerContextuel])

    const supprimerAction = useCallback( () => supprimerDocuments(fermerContextuel, showSupprimerModalOuvrir), [fermerContextuel, showSupprimerModalOuvrir] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    // const infoAction = useCallback( () => infoModal(fermerContextuel, showInfoModalOuvrir), [fermerContextuel, showInfoModalOuvrir] )

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={showPreviewAction} disabled={!previewDisponible}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadEvent}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelRepertoire(props) {

    const { 
        workers, selection, repertoire, contextuel, fermerContextuel, cuuid,
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, 
        showInfoModalOuvrir, showRenommerModalOuvrir, showPartagerModalOuvrir,
        downloadRepertoire,
    } = props

    // console.debug("MenuContextuelRepertoire Proppies ", props)

    const supprimerAction = useCallback( () => supprimerDocuments(fermerContextuel, showSupprimerModalOuvrir), [fermerContextuel, showSupprimerModalOuvrir] )
    // const favorisAction = useCallback( () => toggleFavoris(workers, fermerContextuel, cuuid, repertoire), [workers, fermerContextuel, repertoire, cuuid] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )
    const renommerAction = useCallback( () => renommer(fermerContextuel, showRenommerModalOuvrir), [fermerContextuel, showRenommerModalOuvrir] )
    const partagerAction = useCallback( () => infoModal(fermerContextuel, showPartagerModalOuvrir), [fermerContextuel, showPartagerModalOuvrir] )

    const downloadRepertoireCb = useCallback(()=>{
        if(downloadRepertoire && selection && selection.length === 1) {
            const tuuid = selection[0]
            console.debug("Downloader repertoire %s", tuuid)
            downloadRepertoire({currentTarget: {value: tuuid}})
        }
    }, [selection, downloadRepertoire])

    const posX = useMemo(()=>{
        return contextuel.x
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y
    }, [contextuel])

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={partagerAction}><i className="fa fa-share-alt"/> Partager</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadRepertoireCb} disabled={!downloadRepertoire}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            {/* <Row><Col><Button variant="link" onClick={favorisAction}><i className="fa fa-star"/> Favoris</Button></Col></Row> */}
            <Row><Col><Button variant="link" onClick={renommerAction}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction} disabled={!cuuid}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelMultiselect(props) {

    const { 
        workers, fichiers, selection, contextuel, fermerContextuel, cuuid,
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, 
    } = props

    const supprimerAction = useCallback( () => supprimerDocuments(fermerContextuel, showSupprimerModalOuvrir), [fermerContextuel, showSupprimerModalOuvrir] )
    // const favorisAction = useCallback( () => toggleFavorisMultiples(workers, fermerContextuel, cuuid, fichiers, selection), [workers, fermerContextuel, fichiers, selection, cuuid] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )

    const listeContientFichiers = fichiers.filter(item=>item.fileId).reduce((f, item)=>f||item.fileId?true:false, false)

    const posX = useMemo(()=>{
        return contextuel.x || 0
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y || 0
    }, [contextuel])

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction} disabled={!cuuid}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelCorbeille(props) {

    const { workers, selection, contextuel, fermerContextuel, onRestore } = props

    const recupererAction = useCallback( 
        () => {
            onRestore(selection)
        }, [workers, fermerContextuel, selection, onRestore] 
    )

    const posX = useMemo(()=>{
        return contextuel.x || 0
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y || 0
    }, [contextuel])    

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={recupererAction}><i className="fa fa-recycle"/> Recuperer</Button></Col></Row>
        </MenuContextuel>
    )
}

function supprimerDocuments(fermer, showSupprimerModalOuvrir) {
    showSupprimerModalOuvrir()
    fermer()
}

function recupererMultiple(workers, fermer, selection, onRecuperer) {

    const connexion = workers.connexion

    if(selection && selection.length > 0) {

        console.debug("Recuperer selection %O", selection)
        connexion.recupererDocuments(selection)
        .then(reponse=>{
            console.debug("Recuperer documents %O, reponse : %O", selection, reponse)
            if(reponse.ok === true && onRecuperer) onRecuperer(selection)
        })
        .catch(err=>{
            console.error("Erreur retrait documents de collection : %O", err)
        })

    }

    fermer()
}

// function toggleFavoris(workers, fermer, cuuid, collection) {

//     const connexion = workers.connexion

//     // if(cuuid) {
//         console.debug("Toggle favoris %O", collection)
//         if(collection.favoris === true) {
//             // Desactiver favoris
//             connexion.toggleFavoris({[collection.folderId]: false})
//         } else {
//             // Activer favoris
//             connexion.toggleFavoris({[collection.folderId]: true})
//         }
//     // } else {
//     //     console.debug("Retirer favoris %O", collection)
//     //     connexion.toggleFavoris({[collection.folderId]: false})
//     // }

//     fermer()
// }

// function toggleFavorisMultiples(workers, fermer, cuuid, liste, selection) {
 
//     const connexion = workers.connexion

//     if(cuuid) {
//         console.debug("Toggle favoris %O (liste complete: %O)", selection, liste)
//         const commande = liste.filter(item=>selection.includes(item.folderId)).reduce((commande, item)=>{
//             commande[item.folderId] = item.favoris?false:true  // Inverser etat favoris
//             return commande
//         }, {})
//         console.debug("Toggle favoris cuuid %s commande : %O", cuuid, commande)
//         connexion.toggleFavoris(commande)
//     } else {
//         console.debug("Retirer favoris %O (liste complete: %O)", selection, liste)
//         const commande = selection.reduce((commande, item)=>{
//             commande[item] = false
//             return commande
//         }, {})
//         console.debug("Toggle favoris commande : %O", commande)
//         connexion.toggleFavoris(commande)
//     }

//     fermer()
// }

function copier(fermer, showSupprimerModalOuvrir) {
    showSupprimerModalOuvrir()
    fermer()
}

function deplacer(fermer, showSupprimerModalOuvrir) {
    showSupprimerModalOuvrir()
    fermer()
}

function infoModal(fermer, showInfoModalOuvrir) {
    showInfoModalOuvrir()
    fermer()
}

function renommer(fermer, showRenommerModalOuvrir) {
    showRenommerModalOuvrir()
    fermer()
}

export function onContextMenu(event, value, setContextuel) {
    if('preventDefault' in event) event.preventDefault()

    const {clientX, clientY} = event

    const posx = clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    const posy = clientY + document.body.scrollTop + document.documentElement.scrollTop;

    const params = {show: true, x: posx, y: posy}

    setContextuel(params)
}

export function MenuContextuelPartageFichier(props) {
    const { 
        fichier, contextuel, fermerContextuel, showPreview, cuuid, 
        showCopierModalOuvrir, downloadAction, 
    } = props

    // Determiner si preview est disponible
    let previewDisponible = false
    if(fichier) {
        const mimetype = fichier.mimetype || '',
              mimetypeBase = mimetype.split('/').shift()
        if(mimetype === 'application/pdf') {
            previewDisponible = true
        } else {
            const versionCourante = fichier.version_courante || {}
            if(mimetypeBase === 'image' && versionCourante.images) {
                previewDisponible = true
            } else if(mimetypeBase === 'video' && versionCourante.video) {
                previewDisponible = true
            }
        }
    }

    const posX = useMemo(()=>{
        return contextuel.x || 0
    }, [contextuel])

    const posY = useMemo(()=>{
        return contextuel.y || 0
    }, [contextuel])    

    const showPreviewAction = useCallback( event => {
        if(previewDisponible) showPreview(fichier.fileId)
        fermerContextuel()
    }, [fichier, previewDisponible, fermerContextuel, showPreview])

    const downloadEvent = useCallback( async event => {
        console.debug("Download fichier %O", fichier)
        const tuuid = fichier.tuuid
        downloadAction(tuuid)
        fermerContextuel()
    }, [fichier, downloadAction, fermerContextuel])

    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )

    return (
        <MenuContextuel show={contextuel.show} posX={posX} posY={posY} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={showPreviewAction} disabled={!previewDisponible}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadEvent}><i className="fa fa-download"/> Download</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
        </MenuContextuel>
    )
}