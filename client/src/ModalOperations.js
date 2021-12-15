import { useCallback, useEffect, useState } from 'react'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { FormatteurTaille, FormatterDate, Thumbnail } from '@dugrema/millegrilles.reactjs'

export function SupprimerModal(props) {

    const { workers, show, fermer, fichiers, selection } = props

    const supprimer = useCallback( () => {
        console.debug("SUPRIMER %O", selection)

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

    const { show, fermer, cuuid, fichiers, selection } = props

    const copier = useCallback( () => {
        console.debug("COPIER")
        fermer()
    }, [fermer])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Copier
            </Modal.Header>

            <p> ...  navigation ... </p>

            <Modal.Footer>
                <Button onClick={copier}>Copier</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function DeplacerModal(props) {

    const { show, fermer, cuuid, fichiers, selection } = props

    const deplacer = useCallback( () => {
        console.debug("DEPLACER")
        fermer()
    }, [fermer])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Decplacer
            </Modal.Header>

            <p> ...  navigation ... </p>

            <Modal.Footer>
                <Button onClick={deplacer}>Deplacer</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function InfoModal(props) {
    const { workers, show, fermer, cuuid, fichiers, selection } = props
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
        if(!show || !connexion || !tuuidSelectionne) return
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
    }, [show, connexion, tuuidSelectionne, setDoc])

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
                    cuuid={cuuid}
                    valueItem={docSelectionne}
                    value={doc}
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
