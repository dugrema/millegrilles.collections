import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import useWorkers, {useEtatConnexion, WorkerProvider, useUsager} from './WorkerContext'
import { chargerInfoContacts } from './redux/partagerSlice'

function Partager(props) {

    const workers = useWorkers(), 
          dispatch = useDispatch()

    useEffect(()=>{
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.error("Erreur chargement contacts : ", err))
    }, [dispatch, workers])

    return (
        <div>
            <h2>Collections partagees par quelqu'un d'autre</h2>

            <CollectionsPartageesParAutres />

            <h2>Mes collections partagees</h2>

            <h3>Contacts</h3>

            <ContactsPartage />

            <h3>Collections</h3>

            <CollectionsPartageesParUsager />

        </div>
    )
}

export default Partager

/** Affiche les collections partagees avec d'autres usagers */
function CollectionsPartageesParUsager(props) {
    return 'collections par usager'
}

/** Affiche les collections partagees par un autre avec l'usager courant */
function CollectionsPartageesParAutres(props) {
    return 'collections par autres'
}

/** Contacts supportes pour le partage */
function ContactsPartage(props) {

    const workers = useWorkers()

    const contacts = useSelector(state=>state.partager.listeContacts)

    const [showContacts, setShowContacts] = useState(false)

    const showAjouterCb = useCallback( e => setShowContacts(true), [])
    const hideAjouterCb = useCallback( e => setShowContacts(false), [])

    const supprimerCb = useCallback( e => {
        const contactId = e.currentTarget.value
        workers.contactsDao.supprimerContacts(contactId)
            .catch(err=>console.error("ContactsPartage Erreur supprimer %s : %O", contactId, err))
    }, [workers])

    return (
        <div>
            <Row>
                <Col>
                    <Button variant='secondary' onClick={showAjouterCb}>Ajouter +</Button>
                </Col>
            </Row>

            {contacts.map(item=>{
                return (
                    <Row>
                        <Col>{item.nom_usager}</Col>
                        <Col>
                            <Button onClick={supprimerCb} value={item.contact_id}>Supprimer</Button>
                        </Col>
                    </Row>
                )
            })}

            <ModalAjouterUsager show={showContacts} hide={hideAjouterCb} />
        </div>
    )
}

function ContactPartage(props) {

}

function ModalAjouterUsager(props) {

    const { show, hide } = props

    const workers = useWorkers()

    const [nomUsager, setNomUsager] = useState('')

    const nomUsagerChangeHandler = useCallback(e=>setNomUsager(e.currentTarget.value), [setNomUsager])

    const ajouterCb = useCallback( () => {
        if(!nomUsager) return

        workers.connexion.ajouterContactLocal(nomUsager)
            .then(reponse => {
                if(reponse.ok !== false) {
                    hide()
                } else {
                    console.error("ModalAjouterUsager Erreur ajout contact : %O", reponse)
                }
            })
            .catch(err=>console.error("ModalAjouterUsager Erreur ajout contact : ", err))
    }, [nomUsager, hide])

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton>
                Ajouter un contact
            </Modal.Header>

            <Modal.Body>
                <Form onSubmit={ajouterCb}>
                    <Form.Group className="mb-3" controlId="formNomContact">
                        <Form.Label>Nom d'usager du contact</Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="Saisir le nom ..." 
                            onChange={nomUsagerChangeHandler}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>


            <Modal.Footer>
                <Button onClick={ajouterCb}>OK</Button>
                <Button variant='secondary' onClick={hide}>Fermer</Button>
            </Modal.Footer>
        </Modal>
    )
}