import { useCallback } from 'react'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

export function SupprimerModal(props) {

    const { show, fermer, cuuid, fichiers, selection } = props

    const supprimer = useCallback( () => {
        console.debug("SUPRIMER")
        fermer()
    }, [fermer])

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

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Fichier ABCD-1234
            </Modal.Header>

            <p> ...  info fichier ... </p>

        </Modal>
    )
}

export function RenommerModal(props) {
    const { show, fermer, cuuid, fichiers, selection } = props

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Renommer ABCD-1234
            </Modal.Header>

            <p> ...  info fichier ... </p>

        </Modal>
    )
}