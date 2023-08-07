import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import useWorkers, {useEtatConnexion, WorkerProvider, useUsager, useEtatPret} from './WorkerContext'
import { chargerInfoContacts, chargerPartagesUsager, chargerPartagesContact } from './redux/partagerSlice'
import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'

function Partager(props) {

    const workers = useWorkers(), 
          dispatch = useDispatch(),
          etatPret = useEtatPret()

    const [contactId, setContactId] = useState('')

    useEffect(()=>{
        if(!etatPret) return
        // Charger les contacts
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.error("Erreur chargement contacts : ", err))

        // Charger tous les partages (paires contacts/cuuid)
        // dispatch(chargerPartagesUsager(workers))
        //     .catch(err=>console.error("Erreur chargement des partages usager : ", err))
        // dispatch(chargerPartagesContact(workers))
        //     .catch(err=>console.error("Erreur chargement des partages contacts : ", err))
    }, [dispatch, workers, etatPret])

    const choisirContactId = useCallback(e=>setContactId(e.currentTarget.value), [setContactId])
    const fermerPageContact = useCallback(()=>setContactId(''), setContactId)

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

    if(contactId) {
        return <PageContact contactId={contactId} fermer={fermerPageContact} />
    }

    return (
        <div>
            <h3>Contacts</h3>
            <ContactsPartage choisirContactId={choisirContactId} />
        </div>
    )
}

export default Partager

/** Contacts supportes pour le partage */
function ContactsPartage(props) {

    const { choisirContactId } = props

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
                            <Button variant="link" onClick={choisirContactId} value={item.contact_id}>
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

function PageContact(props) {

    const { contactId, fermer } = props

    const workers = useWorkers(),
          dispatch = useDispatch()

    const etatPret = useEtatPret()
    const contacts = useSelector(state=>state.partager.listeContacts)
    const userId = useSelector(state=>state.fichiers.userId)
    const collections = useSelector(state=>state.fichiers.liste)

    const [modePartage, setModePartage] = useState('usager')

    const contact = useMemo(()=>{
        if(!contacts) return
        return contacts.filter(item=>item.contact_id === contactId).pop()
    }, [contacts])
    
    // const supprimerPartageCb = useCallback(e=>{
    //     const tuuid = e.currentTarget.value
    //     workers.connexion.supprimerPartageUsager(contactId, tuuid)
    //         .catch(err=>console.error("Erreur suppression partage ", err))
    // }, [workers])

    // // Charger les informations de dossiers partages avec le contact
    // useEffect(()=>{
    //     if(!etatPret || !userId || !contact) return  // Rien a faire
    //     if(modePartage === 'usager') {
    //         dispatch(fichiersThunks.afficherPartagesUsager(workers, contactId))
    //             .catch(err=>console.error('Partager Erreur chargement partages ', err))
    //     } else if(modePartage === 'contact') {
    //         dispatch(fichiersThunks.afficherPartagesContact(workers, contactId))
    //             .catch(err=>console.error('Partager Erreur chargement partages ', err))
    //     }
    // }, [workers, etatPret, userId, contactId, modePartage])

    useEffect(()=>{
        console.debug("Collections partagees : %O", collections)
    }, [collections])

    if(!contact) return 'Aucune information sur le contact'

    let ListePartages = 'Aucune information sur le contact'
    switch(modePartage) {
        case 'usager': ListePartages = ListePartagesUsager; break
        case 'contact': ListePartages = ListePartagesContact; break
        default:
            break
    }

    // if(modePartage === 'usager') return <ListePartagesUsager contactId={contactId} fermer={fermer} />
    // if(modePartage === 'contact') return <ListePartagesContact contactId={contactId} fermer={fermer} />

    // return 'Mode non supporte'

    return (
        <div>
            <Button onClick={()=>setModePartage('usager')}>Usager</Button>
            <Button onClick={()=>setModePartage('contact')}>Contact</Button>
            <ListePartages contactId={contactId} fermer={fermer} />
        </div>
    )
}

function ListePartagesUsager(props) {
    const { contactId, fermer } = props

    const workers = useWorkers(),
          dispatch = useDispatch()

    const etatPret = useEtatPret()
    const contacts = useSelector(state=>state.partager.listeContacts)
    const userId = useSelector(state=>state.fichiers.userId)
    const collections = useSelector(state=>state.fichiers.liste)

    const contact = useMemo(()=>{
        if(!contacts) return
        return contacts.filter(item=>item.contact_id === contactId).pop()
    }, [contacts])
    
    const supprimerPartageCb = useCallback(e=>{
        const tuuid = e.currentTarget.value
        workers.connexion.supprimerPartageUsager(contactId, tuuid)
            .catch(err=>console.error("Erreur suppression partage ", err))
    }, [workers])

    // Charger les informations de dossiers partages avec le contact
    useEffect(()=>{
        if(!etatPret || !userId || !contact) return  // Rien a faire
        dispatch(fichiersThunks.afficherPartagesUsager(workers, contactId))
            .catch(err=>console.error('Partager Erreur chargement partages ', err))
    }, [workers, etatPret, userId, contactId])

    useEffect(()=>{
        console.debug("Collections partagees : %O", collections)
    }, [collections])

    if(!contact) return 'Aucune information sur le contact'

    return (
        <div>
            <Row>
                <Col xs={11}>
                    <h3>Partages avec {contact.nom_usager}</h3>
                </Col>
                <Col>
                    <Button variant="secondary" onClick={fermer}>X</Button>
                </Col>
            </Row>
            
            {collections && collections.map(item=>{
                return (
                    <Row>
                        <Col>
                            {item.nom}
                        </Col>
                        <Col>
                            <Button variant="secondary" value={item.tuuid} onClick={supprimerPartageCb}>Supprimer</Button>
                        </Col>
                    </Row>
                )
            })}

        </div>
    )
}

function ListePartagesContact(props) {
    const { contactId, fermer } = props

    const workers = useWorkers(),
          dispatch = useDispatch()

    const etatPret = useEtatPret()
    const contacts = useSelector(state=>state.partager.listeContacts)
    const userId = useSelector(state=>state.fichiers.userId)
    const collections = useSelector(state=>state.fichiers.liste)

    const contact = useMemo(()=>{
        if(!contacts) return
        return contacts.filter(item=>item.contact_id === contactId).pop()
    }, [contacts])
    
    const supprimerPartageCb = useCallback(e=>{
        const tuuid = e.currentTarget.value
        workers.connexion.supprimerPartageUsager(contactId, tuuid)
            .catch(err=>console.error("Erreur suppression partage ", err))
    }, [workers])

    // Charger les informations de dossiers partages avec le contact
    useEffect(()=>{
        if(!etatPret || !userId || !contact) return  // Rien a faire
        dispatch(fichiersThunks.afficherPartagesContact(workers, contactId))
            .catch(err=>console.error('Partager Erreur chargement partages ', err))
    }, [workers, etatPret, userId, contactId])

    useEffect(()=>{
        console.debug("Collections partagees : %O", collections)
    }, [collections])

    if(!contact) return 'Aucune information sur le contact'

    return (
        <div>
            <Row>
                <Col xs={11}>
                    <h3>Partages avec {contact.nom_usager}</h3>
                </Col>
                <Col>
                    <Button variant="secondary" onClick={fermer}>X</Button>
                </Col>
            </Row>
            
            {collections && collections.map(item=>{
                return (
                    <Row>
                        <Col>
                            {item.nom||item.tuuid}
                        </Col>
                        <Col>
                            <Button variant="secondary" value={item.tuuid} onClick={supprimerPartageCb}>Supprimer</Button>
                        </Col>
                    </Row>
                )
            })}

        </div>
    )
}