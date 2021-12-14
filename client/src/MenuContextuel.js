import { useCallback} from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { MenuContextuel } from '@dugrema/millegrilles.reactjs'

export function MenuContextuelFichier(props) {
    const { 
        workers, fichier, contextuel, fermerContextuel, showPreview, usager, cuuid, 
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, 
        showInfoModalOuvrir, showRenommerModalOuvrir,
    } = props
    const { transfertFichiers } = workers

    // Determiner si preview est disponible
    let previewDisponible = false
    if(fichier) {
        const mimetype = fichier.mimetype || '',
              mimetypeBase = mimetype.split('/').shift()
        if(mimetype === 'application/pdf' || mimetypeBase === 'image' || mimetypeBase === 'video') {
            previewDisponible = true
        }
    }

    const showPreviewAction = useCallback( event => {
        if(previewDisponible) showPreview(fichier.fileId)
        fermerContextuel()
    }, [fichier, previewDisponible, fermerContextuel])

    const downloadAction = useCallback( async event => {
        //console.debug("Download fichier %O", fichier)
        const { fuuid, mimetype, nom: filename, taille} = fichier

        const reponseCle = await workers.connexion.getClesFichiers([fuuid], usager)
        // console.debug("REPONSE CLE pour download : %O", reponseCle)
        if(reponseCle.code === 1) {
            // Permis
            const {cle, iv, tag, format} = reponseCle.cles[fuuid]
            transfertFichiers.down_ajouterDownload(fuuid, {mimetype, filename, taille, passwordChiffre: cle, iv, tag, format})
                .catch(err=>{console.error("Erreur debut download : %O", err)})
        } else {
            console.warn("Cle refusee/erreur (code: %s) pour %s", reponseCle.code, fuuid)
        }

    }, [fichier, workers, usager])

    const retirerAction = useCallback( () => retirerFichier(workers, fermerContextuel, fichier, cuuid), [workers, fermerContextuel, fichier, cuuid] )
    const supprimerAction = useCallback( () => supprimerFichier(workers, fermerContextuel, fichier, showSupprimerModalOuvrir), [workers, fermerContextuel, fichier, showSupprimerModalOuvrir] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )
    const renommerAction = useCallback( () => renommer(fermerContextuel, showRenommerModalOuvrir), [fermerContextuel, showRenommerModalOuvrir] )
    const infoAction = useCallback( () => infoModal(fermerContextuel, showInfoModalOuvrir), [fermerContextuel, showInfoModalOuvrir] )

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={showPreviewAction} disabled={!previewDisponible}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadAction}><i className="fa fa-download"/> Download</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={infoAction}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={renommerAction}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelRepertoire(props) {

    const { 
        workers, repertoire, contextuel, fermerContextuel, cuuid,
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, 
        showInfoModalOuvrir, showRenommerModalOuvrir,
    } = props

    const retirerAction = useCallback( 
        () => retirerCollection(workers, fermerContextuel, repertoire, cuuid), 
        [workers, fermerContextuel, repertoire, cuuid]
    )
    const supprimerAction = useCallback( () => supprimerCollection(workers, fermerContextuel, repertoire, showSupprimerModalOuvrir), [workers, fermerContextuel, repertoire, showSupprimerModalOuvrir] )
    const favorisAction = useCallback( () => toggleFavoris(workers, fermerContextuel, cuuid, repertoire), [workers, fermerContextuel, repertoire, cuuid] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )
    const renommerAction = useCallback( () => renommer(fermerContextuel, showRenommerModalOuvrir), [fermerContextuel, showRenommerModalOuvrir] )
    const infoAction = useCallback( () => infoModal(fermerContextuel, showInfoModalOuvrir), [fermerContextuel, showInfoModalOuvrir] )

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={infoAction}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={favorisAction}><i className="fa fa-star"/> Favoris</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={renommerAction}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelMultiselect(props) {

    const { 
        workers, fichiers, selection, contextuel, fermerContextuel, cuuid,
        showSupprimerModalOuvrir, showCopierModalOuvrir, showDeplacerModalOuvrir, showInfoModalOuvrir,
    } = props

    const retirerAction = useCallback( () => retirerMultiple(workers, fermerContextuel, selection, cuuid), [workers, fermerContextuel, selection, cuuid] )
    const supprimerAction = useCallback( () => supprimerMultiple(fermerContextuel, showSupprimerModalOuvrir), [fermerContextuel, selection] )
    const favorisAction = useCallback( () => toggleFavorisMultiples(workers, fermerContextuel, cuuid, fichiers, selection), [workers, fermerContextuel, fichiers, selection, cuuid] )
    const copierAction = useCallback( () => copier(fermerContextuel, showCopierModalOuvrir), [fermerContextuel, showCopierModalOuvrir] )
    const deplacerAction = useCallback( () => deplacer(fermerContextuel, showDeplacerModalOuvrir), [fermerContextuel, showDeplacerModalOuvrir] )

    const listeContientFichiers = fichiers.filter(item=>item.fileId).reduce((f, item)=>f||item.fileId?true:false, false)

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={favorisAction} disabled={listeContientFichiers}><i className="fa fa-star"/> Favoris</Button></Col></Row>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={deplacerAction}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={copierAction}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

function retirerFichier(workers, fermer, fichier, cuuid) {
    const { fileId } = fichier

    console.debug("Retirer fichier %s de collection %s", fileId, cuuid)

    fermer()
}

function supprimerFichier(workers, fermer, fichier, showSupprimerModalOuvrir) {
    const { fileId } = fichier
    console.debug("Supprimer fichier %s", fileId)
    showSupprimerModalOuvrir()
    fermer()
}

function retirerCollection(workers, fermer, collection, cuuid) {
    const { folderId } = collection

    if(!cuuid) {
        // Enlever flags favoris
        console.debug("Retirer favoris %s", folderId)
    } else {
        console.debug("Retirer collection %s de %s", folderId, cuuid)
    }

    fermer()
}

function supprimerCollection(workers, fermer, collection, showSupprimerModalOuvrir) {
    const { folderId } = collection
    console.debug("Supprimer collection %s", folderId)
    showSupprimerModalOuvrir()
    fermer()
}

function retirerMultiple(workers, fermer, selection, cuuid) {
    if(cuuid) {
        console.debug("Retirer selection %O", selection)
    } else {
        console.debug("Retirer favoris %O", selection)
    }

    fermer()
}

function supprimerMultiple(fermer, selection) {
    console.debug("Supprimer selection %O", selection)
    fermer()
}

function toggleFavoris(workers, fermer, cuuid, collection) {

    const connexion = workers.connexion

    if(cuuid) {
        console.debug("Toggle favoris %O", collection)
        if(collection.favoris === true) {
            // Desactiver favoris
            connexion.toggleFavoris({[collection.folderId]: false})
        } else {
            // Activer favoris
            connexion.toggleFavoris({[collection.folderId]: true})
        }
    } else {
        console.debug("Retirer favoris %O", collection)
        connexion.toggleFavoris({[collection.folderId]: false})
    }

    fermer()
}

function toggleFavorisMultiples(workers, fermer, cuuid, liste, selection) {
 
    if(cuuid) {
        console.debug("Toggle favoris %O (liste complete: %O)", selection, liste)
    } else {
        console.debug("Retirer favoris %O (liste complete: %O)", selection, liste)
    }

    fermer()
}

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
