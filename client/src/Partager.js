import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import useWorkers, {useEtatConnexion, WorkerProvider, useUsager, useEtatPret} from './WorkerContext'
import { chargerInfoContacts, chargerPartagesUsager } from './redux/partagerSlice'
import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'

function Partager(props) {

    const workers = useWorkers(), 
          dispatch = useDispatch(),
          etatPret = useEtatPret()

    //const userId = useSelector(state=>state.fichiers.userId)

    useEffect(()=>{
        if(!etatPret) return
        // Charger les contacts
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.error("Erreur chargement contacts : ", err))
        // Charger tous les partages (paires contacts/cuuid)
        dispatch(chargerPartagesUsager(workers))
            .catch(err=>console.error("Erreur chargement des partages : ", err))
    }, [dispatch, workers, etatPret])

    // const naviguerCollection = useCallback( cuuid => {
    //     setAfficherVideo('')  // Reset affichage
    //     if(!cuuid) cuuid = ''
    //     try {
    //         if(cuuid) {
    //             dispatch(fichiersActions.breadcrumbPush({tuuid: cuuid}))
    //         } else {
    //             dispatch(fichiersActions.breadcrumbSlice())
    //         }
    //     } catch(err) {
    //         console.error("naviguerCollection Erreur dispatch breadcrumb : ", err)
    //     }
    //     try {
    //         if(cuuid) {
    //             dispatch(fichiersThunks.changerCollection(workers, cuuid))
    //                 .catch(err=>erreurCb(err, 'Erreur changer collection'))
    //         } else {
    //             dispatch(fichiersThunks.afficherPlusrecents(workers))
    //                 .catch(err=>erreurCb(err, 'Erreur changer collection'))
    //         }
    //     } catch(err) {
    //         console.error("naviguerCollection Erreur dispatch changerCollection", err)
    //     }
    // }, [dispatch, workers, erreurCb, setAfficherVideo])

    // Declencher chargement initial des favoris
    // useEffect(()=>{
    //     if(!etatPret || !userId) return  // Rien a faire
    //     dispatch(fichiersThunks.afficherPartagesUsager(workers))
    //         .catch(err=>console.error('Partager Erreur chargement partages ', err))

    // }, [etatPret, userId])

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

    const contacts = useSelector(state=>state.partager.listeContacts),
          partagesUsager = useSelector(state=>state.partager.listePartagesUsager)

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

            <Row>
                <Col>Contact</Col>
                <Col>Nombre de partages</Col>
                <Col>Actions</Col>
            </Row>

            {contacts.map(item=>{

                // Compter le nombre de partages pour ce contact
                const nombrePartages = partagesUsager.reduce((acc, partage)=>{
                    if(item.contact_id === partage.contact_id) return acc + 1
                    return acc
                }, 0)

                return (
                    <Row>
                        <Col>
                            <Button variant="link">
                                {item.nom_usager}
                            </Button>
                        </Col>
                        <Col>
                            {nombrePartages}
                        </Col>
                        <Col>
                            <Button variant="secondary" onClick={supprimerCb} value={item.contact_id}>Supprimer</Button>
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