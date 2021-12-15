import { useCallback, useEffect, useState } from 'react'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

export function SupprimerModal(props) {

    const { workers, show, fermer, fichiers, selection } = props

    const supprimer = useCallback( async () => {
        console.debug("SUPRIMER %O", selection)

        const connexion = workers.connexion

        try {
            const reponse = await connexion.supprimerDocuments(selection)
            if(reponse.ok === false) {
                console.error("Erreur suppression documents %O : %s", selection, reponse.message)
            }
        } catch(err) {
            console.error("Erreur suppression documents %O : %O", selection, err)
        }

        fermer()
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
    const { show, fermer, cuuid, fichiers, selection } = props

    const appliquer = useCallback(()=>{
        console.debug("Appliquer")
        fermer()
    }, [])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Fichier ABCD-1234
            </Modal.Header>

            <Form.Group controlId="formNom">
                <Form.Label>Nom</Form.Label>
                <Form.Control type="text" placeholder="Saisir le nom ..." />
            </Form.Group>

            <Modal.Footer>
                <Button onClick={appliquer}>OK</Button>
            </Modal.Footer>

        </Modal>
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
    }, docSelectionne)

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
