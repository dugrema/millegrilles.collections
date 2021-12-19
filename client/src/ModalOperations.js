import { useCallback, useEffect, useState } from 'react'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { FormatteurTaille, FormatterDate, Thumbnail, FilePicker } from '@dugrema/millegrilles.reactjs'

import { ConversionVideo } from './OperationsVideo'

export function SupprimerModal(props) {

    const { workers, show, fermer, fichiers, selection } = props

    const supprimer = useCallback( () => {
        // console.debug("SUPRIMER %O", selection)

        const connexion = workers.connexion

        connexion.supprimerDocuments(selection)
        .then(reponse=>{
            if(reponse.ok === false) {
                console.error("Erreur suppression documents %O : %s", selection, reponse.message)
            }
        })
        .catch(err=>{
            console.error("Erreur suppression documents %O : %O", selection, err)
        })
        .finally(()=>{
            fermer()
        })
        
    }, [fermer, selection])

    if(!selection || selection.length === 0) return ''

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Supprimer
            </Modal.Header>

            <p>Supprimer le fichier?</p>

            <Modal.Footer>
                <Button onClick={supprimer}>Supprimer</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function CopierModal(props) {

    const { workers, show, fermer, favoris, selection } = props
    const { connexion } = workers

    const [ path, setPath ] = useState([])

    const copier = useCallback( () => {
        const tuuidSelectionne = path.length>0?path[path.length-1]:''

        if(tuuidSelectionne) {
            connexion.copierVersCollection(tuuidSelectionne, selection)
                .then(reponse=>{
                    // console.debug("Reponse copierVersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        console.error("Erreur copierVersCollection : %O", reponse.message)
                    } else {
                        fermer()
                    }
                })
                .catch(err=>{
                    console.error("Erreur copierVersCollection : %O", err)
                })
        } else {
            // Ajouter au favoris?
            console.error("Erreur copierVersCollection - aucune collection selectionnee")
        }
    }, [connexion, selection, path, fermer])

    const actionPath = useCallback( cuuidpath => {
        // console.debug("Set path : %O", cuuidpath)
        setPath(cuuidpath)
    }, [setPath])

    const loadCollection = useCallback( cuuid => {
        if(!cuuid) {
            // Root, utiliser favoris
            // console.debug("CopierModalFAVORIS : %O", favoris)
            return Promise.resolve(favoris)
        } else {
            return connexion.getContenuCollection(cuuid)
                .then(reponse=>{
                    // console.debug("Reponse contenu collection: %O", reponse)
                    const docs = reponse.documents.filter(item=>!item.fuuid_v_courante)
                    return docs
                })
        }
    }, [connexion, favoris])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Copier
            </Modal.Header>

            <FilePicker setPath={actionPath} loadCollection={loadCollection} />

            <Modal.Footer>
                <Button onClick={copier} disabled={path.length===0}>Copier</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function DeplacerModal(props) {

    const { workers, show, fermer, favoris, cuuid, selection } = props
    const { connexion } = workers

    const [ path, setPath ] = useState([])

    const deplacer = useCallback( () => {
        const tuuidSelectionne = path.length>0?path[path.length-1]:''

        if(tuuidSelectionne) {
            connexion.deplacerFichiersCollection(cuuid, tuuidSelectionne, selection)
                .then(reponse=>{
                    console.debug("Reponse deplacerFichiersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        console.error("Erreur deplacerFichiersCollection : %O", reponse.message)
                    } else {
                        fermer()
                    }
                })
                .catch(err=>{
                    console.error("Erreur deplacerFichiersCollection : %O", err)
                })
        } else {
            // Ajouter au favoris?
            console.error("Erreur deplacerFichiersCollection - aucune collection selectionnee")
        }
    }, [connexion, cuuid, selection, path, fermer])

    const actionPath = useCallback( cuuidpath => {
        // console.debug("Set path : %O", cuuidpath)
        setPath(cuuidpath)
    }, [setPath])

    const loadCollection = useCallback( cuuid => {
        if(!cuuid) {
            // Root, utiliser favoris
            // console.debug("CopierModalFAVORIS : %O", favoris)
            return Promise.resolve(favoris)
        } else {
            return connexion.getContenuCollection(cuuid)
                .then(reponse=>{
                    // console.debug("Reponse contenu collection: %O", reponse)
                    const docs = reponse.documents.filter(item=>!item.fuuid_v_courante)
                    return docs
                })
        }
    }, [connexion, favoris])

    return (
        <Modal show={show} onHide={fermer} className="modal-picklist">
            <Modal.Header closeButton={true}>
                Deplacer
            </Modal.Header>

            <FilePicker setPath={actionPath} loadCollection={loadCollection} />

            <Modal.Footer>
                <Button onClick={deplacer} disabled={path.length===0}>Deplacer</Button>
            </Modal.Footer>
        </Modal>
    )

}

export function InfoModal(props) {
    const { workers, etatConnexion, show, fermer, cuuid, fichiers, selection, support, downloadAction, evenementFichier, usager } = props
    const { connexion } = workers

    let tuuidSelectionne = null,
        docSelectionne = null,
        header = null
    if(selection && selection.length === 1) {
        tuuidSelectionne = selection[0]
        docSelectionne = fichiers.filter(item=>tuuidSelectionne===(item.fileId || item.folderId)).pop()

        if(!docSelectionne) {
            header = 'N/D'
        } else if(docSelectionne.fileId) {
            header = 'Information fichier'
        } else if(docSelectionne.folderId) {
            header = 'Information collection'
        }
    }

    const [doc, setDoc] = useState('')

    useEffect(()=>{
        console.debug("!!! !!! Update fichier : %O", evenementFichier)
        if(!show || !connexion || !tuuidSelectionne) return
        if(evenementFichier && evenementFichier.tuuid !== tuuidSelectionne) return  // Update autre fichier
        console.debug("Charger document '%s' ", tuuidSelectionne)
        connexion.getDocuments([tuuidSelectionne])
            .then(reponse => {
                console.debug("Reponse getDoc %s = %O", tuuidSelectionne, reponse)
                if(reponse.ok !== false) {
                    setDoc(reponse.fichiers[0])
                }
            })
            .catch(err=>{
                console.error("Erreur getDocument %s : %O", tuuidSelectionne, err)
            })
    }, [show, connexion, tuuidSelectionne, setDoc, evenementFichier])

    let Body = InfoVide
    if(!docSelectionne) {
        // Rien a faire
    } else if(docSelectionne.fileId) {
        Body = InfoFichier
    } else if(docSelectionne.folderId) {
        Body = InfoCollection
    }

    return (
        <Modal show={show} onHide={fermer} size="lg">
            <Modal.Header closeButton={true}>{header}</Modal.Header>

            <Modal.Body>
                <Body
                    workers={workers}
                    support={support}
                    cuuid={cuuid}
                    valueItem={docSelectionne}
                    value={doc}
                    downloadAction={downloadAction}
                    etatConnexion={etatConnexion}
                    evenementFichier={evenementFichier}
                    usager={usager}
                />
            </Modal.Body>

        </Modal>
    )
}

function InfoVide(props) {
    return ''
}

function InfoFichier(props) {
    console.debug("InfoFichier PROPPYS : %O", props)

    const { workers, etatConnexion, support, downloadAction, evenementFichier, usager } = props

    const valueItem = props.valueItem || {}
    const thumbnailIcon = valueItem.thumbnailIcon,
          thumbnailLoader = valueItem.thumbnailLoader

    const fichier = props.value || {}
    const nom = valueItem.nom
    const versionCourante = fichier.version_courante || {}
    const { mimetype, taille } = versionCourante
    const derniereModification = fichier.derniere_modification || versionCourante.dateFichier

    return (
        <div>
            <Row>
                <Col xs={12} md={4}>
                    <Thumbnail loader={thumbnailLoader} placeholder={thumbnailIcon}>
                        <span></span>
                    </Thumbnail>
                </Col>
                <Col xs={12} md={8} className="text-hardwrap info-labels">
                    <Row>
                        <Col xs={12} md={2}>Nom</Col>
                        <Col xs={12} md={10}>{nom}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={2}>Type</Col>
                        <Col xs={12} md={10}>{mimetype}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={2}>Taille</Col>
                        <Col xs={12} md={10}><FormatteurTaille value={taille} /></Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={2}>Date</Col>
                        <Col xs={12} md={10}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                </Col>
            </Row>

            <ConversionVideo 
                workers={workers}
                fichier={fichier} 
                support={support}
                downloadAction={downloadAction}
                etatConnexion={etatConnexion}
                evenementFichier={evenementFichier}
                usager={usager}
            />
        </div>
    )
}

function InfoCollection(props) {
    console.debug("InfoCollection PROPPYS : %O", props)

    const valueItem = props.valueItem || {}
    const thumbnailIcon = valueItem.thumbnailIcon
    const fichier = props.value || {}
    const nom = valueItem.nom
    const derniereModification = fichier.derniere_modification || valueItem.dateAjout

    return (
        <div>
            <Row>
                <Col xs={12} md={4}>
                    <Thumbnail placeholder={thumbnailIcon}>
                        <span></span>
                    </Thumbnail>
                </Col>
                <Col xs={12} md={8}>
                    <Row>
                        <Col xs={12} md={2}>Nom</Col>
                        <Col xs={12} md={10}>{nom}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={2}>Date</Col>
                        <Col xs={12} md={10}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                </Col>
            </Row>
        </div>
    )
}

export function RenommerModal(props) {
    const { workers, show, fermer, fichiers, selection } = props
    const { connexion } = workers

    let tuuidSelectionne = null,
        docSelectionne = null
    if(selection && selection.length === 1) {
        tuuidSelectionne = selection[0]
        docSelectionne = fichiers.filter(item=>tuuidSelectionne===(item.fileId || item.folderId)).pop()
    }

    const [nom, setNom] = useState('')

    useEffect(()=>{ 
        if(!docSelectionne) return
        setNom(docSelectionne.nom) 
    }, [docSelectionne])

    const appliquer = useCallback( async event => {
        event.preventDefault()
        event.stopPropagation()
        
        console.debug("Appliquer a %s", tuuidSelectionne)
        try {
            let reponse = null
            if(docSelectionne.fileId) {
                // Fichier
                reponse = await connexion.decrireFichier(docSelectionne.fileId, {nom})
            } else if(docSelectionne.folderId) {
                // Collection
                reponse = connexion.decrireCollection(docSelectionne.folderId, {nom})
            }

            if(reponse.ok === false) {
                console.error("Erreur renommer fichier/collection : %O", reponse.message)
            }
        } catch(err) {
            console.error("Erreur renommer fichier/collection : %O", err)
        }

        fermer()
    }, [connexion, tuuidSelectionne, docSelectionne, nom])

    const changerNom = useCallback(event=>{
        const { value } = event.currentTarget
        setNom(value)
    }, [setNom])

    if(!docSelectionne) return ''

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton={true}>
                Renommer {docSelectionne.nom}
            </Modal.Header>

            <Modal.Body>

                <Form onSubmit={appliquer}>
                    <Form.Group controlId="formNom">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control 
                            type="text"
                            placeholder="Saisir le nom ..."
                            value={nom}
                            onChange={changerNom}
                        />
                    </Form.Group>
                </Form>

            </Modal.Body>

            <Modal.Footer>
                <Button onClick={appliquer}>OK</Button>
            </Modal.Footer>

        </Modal>
    )
}


export function ReindexerModal(props) {

    const { workers, show, fermer } = props
    const { connexion } = workers

    const lancer = useCallback(event=>{
        const reset = true
        connexion.indexerContenu(reset)
            .then(reponse=>{
                if(reponse.ok === false) {
                    console.error("ReindexerModal Reponse erreur : %O", reponse.message)
                } else {
                    fermer()
                }
            })
            .catch(err=>{
                console.error("ReindexerModal erreur : %O", err)
            })
    }, [connexion, fermer])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Reindexer pour la recherche
            </Modal.Header>
            <Modal.Footer>
                <Button onClick={lancer}>Lancer</Button>
            </Modal.Footer>
        </Modal>
    )

}