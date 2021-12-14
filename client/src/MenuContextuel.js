import { useCallback} from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { MenuContextuel } from '@dugrema/millegrilles.reactjs'

export function MenuContextuelFichier(props) {
    const { workers, fichier, contextuel, fermerContextuel, showPreview } = props
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
    }, [fichier, previewDisponible])

    const downloadAction = useCallback( async event => {
        console.debug("Download fichier %O", fichier)
        const { fuuid, mimetype, nom: filename, taille} = fichier

        const reponseCle = await workers.connexion.getCleFichierProtege(fuuid)
        if(reponseCle.code === 1) {
            // Permis
            const {cle, iv, tag, format} = reponseCle.cles[fuuid]
            transfertFichiers.down_ajouterDownload(fuuid, {mimetype, filename, taille, passwordChiffre: cle, iv, tag, format})
                .catch(err=>{console.error("Erreur debut download : %O", err)})
        } else {
            console.warn("Cle refusee/erreur (code: %s) pour %s", reponseCle.code, fuuid)
        }

    }, [fichier, workers])

    const retirerAction = useCallback( () => retirerFichier(workers, fermerContextuel, fichier), [workers, fermerContextuel, fichier] )
    const supprimerAction = useCallback( () => supprimerFichier(workers, fermerContextuel, fichier), [workers, fermerContextuel, fichier] )

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={showPreviewAction} disabled={!previewDisponible}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={downloadAction}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-star"/> Favoris</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelRepertoire(props) {

    const { workers, repertoire, contextuel, fermerContextuel } = props

    const retirerAction = useCallback( () => retirerCollection(workers, fermerContextuel, repertoire), [workers, fermerContextuel, repertoire] )
    const supprimerAction = useCallback( () => supprimerCollection(workers, fermerContextuel, repertoire), [workers, fermerContextuel, repertoire] )

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-star"/> Favoris</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

export function MenuContextuelMultiselect(props) {

    const { workers, selection, contextuel, fermerContextuel } = props

    const retirerAction = useCallback( () => retirerMultiple(workers, fermerContextuel, selection), [workers, fermerContextuel, selection] )
    const supprimerAction = useCallback( () => supprimerMultiple(workers, fermerContextuel, selection), [workers, fermerContextuel, selection] )

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-star"/> Favoris</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" disabled={true}><i className="fa fa-edit"/> Renommer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-cut"/> Deplacer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-copy"/> Copier</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={retirerAction}><i className="fa fa-remove"/> Retirer</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={supprimerAction}><i className="fa fa-trash-o" /> Supprimer</Button></Col></Row>
        </MenuContextuel>
    )
}

function retirerFichier(workers, fermer, fichier) {
    const { fileId } = fichier
    console.debug("Retirer fichier %s", fileId)
    fermer()
}

function supprimerFichier(workers, fermer, fichier) {
    const { fileId } = fichier
    console.debug("Supprimer fichier %s", fileId)
    fermer()
}

function retirerCollection(workers, fermer, collection) {
    const { folderId } = collection
    console.debug("Retirer collection %s", folderId)
    fermer()
}

function supprimerCollection(workers, fermer, collection) {
    const { folderId } = collection
    console.debug("Supprimer collection %s", folderId)
    fermer()
}

function retirerMultiple(workers, fermer, selection) {
    console.debug("Retirer selection %O", selection)
    fermer()
}

function supprimerMultiple(workers, fermer, selection) {
    console.debug("Supprimer selection %O", selection)
    fermer()
}
