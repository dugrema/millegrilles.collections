import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'

function TransfertModal(props) {
    return (
        <Modal 
            show={props.show} 
            onHide={props.fermer} 
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    Transfert de fichiers
                </Modal.Title>
            </Modal.Header>
            <p>Transfert</p>
        </Modal>
    )
}

export default TransfertModal
