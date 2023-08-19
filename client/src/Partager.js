import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

import { mapDocumentComplet } from './mapperFichier'
import useWorkers, {useEtatConnexion, WorkerProvider, useUsager, useEtatPret} from './WorkerContext'
import { chargerInfoContacts, chargerPartagesUsager, chargerPartagesDeTiers } from './redux/partagerSlice'
import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'

import { BoutonsFormat, SectionBreadcrumb, InformationListe, FormatterColonneDate, AffichagePrincipal } from './NavigationCommun'

function Partager(props) {

    const { erreurCb } = props

    const workers = useWorkers(), 
          dispatch = useDispatch(),
          etatPret = useEtatPret()

    const [contactId, setContactId] = useState('')
    const [userIdPartage, setUserIdPartage] = useState('')

    useEffect(()=>{
        if(!etatPret) return
        // Charger les contacts
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.error("Erreur chargement contacts : ", err))

        // Charger tous les partages (paires contacts/cuuid)
        dispatch(chargerPartagesUsager(workers))
            .catch(err=>console.error("Erreur chargement des partages usager : ", err))
        dispatch(chargerPartagesDeTiers(workers))
            .catch(err=>console.error("Erreur chargement des partages contacts (tiers avec usager local) : ", err))
    }, [dispatch, workers, etatPret])

    const choisirContactId = useCallback(e=>{
        setContactId(e.currentTarget.value)
    }, [setContactId])
    const fermerPageContact = useCallback(()=>setContactId(''), setContactId)
    const fermerPagePartageUsager = useCallback(()=>setUserIdPartage(''), setUserIdPartage)

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

    if(userIdPartage) {
        return <NavigationPartageTiers 
            userId={userIdPartage} 
            fermer={fermerPagePartageUsager} 
            erreurCb={erreurCb} />
    }

    if(contactId) {
        return <PageContact 
            contactId={contactId} 
            fermer={fermerPageContact} 
            erreurCb={erreurCb} />
    }

    return (
        <div>
            <h3>Partages</h3>
            <PartagesUsagersTiers onSelect={setUserIdPartage} />

            <h3>Contacts</h3>
            <ContactsPartage choisirContactId={choisirContactId} />
        </div>
    )
}

export default Partager

function NavigationPartageTiers(props) {

    const { userId, fermer, erreurCb } = props

    const workers = useWorkers(),
          dispatch = useDispatch()

    const userPartages = useSelector(state=>state.partager.userPartages),
          listePartagesAutres = useSelector(state=>state.partager.listePartagesAutres),
          contactId = useSelector(state=>state.fichiers.contactId),
          breadcrumb = useSelector(state=>state.fichiers.breadcrumb)

    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)
    const [ afficherVideo, setAfficherVideo ] = useState('')
    const [ afficherAudio, setAfficherAudio ] = useState('')

    const userInfo = useMemo(()=>{
        return userPartages.filter(item=>item.user_id === userId).pop()
    }, [userPartages, userId])

    const contactInfo = useMemo(()=>{
        if(!breadcrumb) return ''
        const tuuidPartage = breadcrumb[1]
        if(!tuuidPartage) return ''
        return listePartagesAutres.filter(item=>item.tuuid === tuuidPartage).pop()
    }, [breadcrumb, listePartagesAutres])

    const onScrollHandler = useCallback( pos => setScrollValue(pos), [setScrollValue])
    
    const naviguerCollection = useCallback( cuuid => {
        setAfficherVideo('')  // Reset affichage
        setAfficherAudio('')  // Reset affichage
        if(!cuuid) cuuid = ''
        try {
            if(cuuid) {
                dispatch(fichiersActions.breadcrumbPush({tuuid: cuuid}))
            } else {
                dispatch(fichiersActions.breadcrumbSlice())
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch breadcrumb : ", err)
        }
        try {
            let contactInfoEffectif = contactInfo
            if(!contactInfo && cuuid) {
                contactInfoEffectif = listePartagesAutres.filter(item=>item.tuuid === cuuid).pop()
            }
            console.debug("Changer collection pour contact %O, cuuid %O", contactInfoEffectif, cuuid)
            dispatch(fichiersActions.setUserContactId({userId: userInfo.user_id, contactId: contactInfoEffectif.contact_id}))
            dispatch(fichiersThunks.changerCollection(workers, cuuid))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, userInfo, erreurCb, contactInfo, setAfficherVideo, setAfficherAudio])

    const preparerColonnesCb = useCallback(()=>preparerColonnes(workers), [workers])

    useEffect(()=>{
        if(!userId) return  // Il faut au moins avoir une selection d'usager
        // Reset navigation en mode partage, top-level
        //setAfficherVideo('')  // Reset affichage
        //setAfficherAudio('')  // Reset affichage
        try {
            // Set tri par date modification desc
            dispatch(fichiersThunks.afficherPartagesContact(workers, userId, contactId))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }

    }, [dispatch, userId, contactId])

    return (
        <div>
            <Row>
                <Col xs={11}><h3>Partage {userInfo.nom_usager}</h3></Col>
                <Col>
                    <Button variant="secondary" onClick={fermer}>X</Button>
                </Col>
            </Row>

            <Row className='fichiers-header-buttonbar'>
                <Col xs={12} lg={5}>
                    <SectionBreadcrumb naviguerCollection={naviguerCollection} />
                </Col>

                <Col xs={12} sm={3} md={4} lg={2}>
                    {'nombreFichiers'}
                </Col>

                <Col xs={12} sm={9} md={8} lg={5} className="buttonbars">
                    <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                </Col>
            </Row>

            <Suspense fallback={<p>Loading ...</p>}>
                <AffichagePrincipal 
                    preparerColonnes={preparerColonnesCb}
                    modeView={modeView}
                    naviguerCollection={naviguerCollection}
                    // showPreviewAction={showPreviewAction}
                    // setContextuel={setContextuel}
                    afficherVideo={afficherVideo}
                    afficherAudio={afficherAudio}
                    setAfficherVideo={setAfficherVideo}
                    setAfficherAudio={setAfficherAudio}
                    // showInfoModalOuvrir={showInfoModalOuvrir}
                    scrollValue={scrollValue}
                    onScroll={onScrollHandler}
                    erreurCb={erreurCb}
                />
            </Suspense>

            <InformationListe />

        </div>
    )
}

function UsagerPartage(props) {

    const { value, onSelect } = props

    return (
        <Row>
            <Col>
                <Button variant="link" onClick={onSelect} value={value.user_id}>{value.nom_usager}</Button>
            </Col>
        </Row>
    )
}

function PartagesUsagersTiers(props) {

    const { onSelect } = props

    const userPartages = useSelector(state=>state.partager.userPartages)

    const userIdOnSelect = useCallback(e=>{
        const { value } = e.currentTarget
        onSelect(value)
    }, [onSelect])

    return (
        <div>
            {userPartages.map(item=>{
                return <UsagerPartage key={item.user_id} value={item} onSelect={userIdOnSelect} />
            })}
        </div>
    )
}

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

function preparerColonnes(workers) {

    const rowLoader = (item, idx) => mapDocumentComplet(workers, item, idx)

    const params = {
        ordreColonnes: ['nom', 'taille', 'mimetype', 'dateFichier' /*, 'boutonDetail'*/],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 5},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2},
            // 'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterColonneDate, xs: 5, lg: 2},
            'dateFichier': {'label': 'Date', className: 'details', formatteur: FormatterColonneDate, xs: 6, lg: 3},
            // 'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 1},
        },
        tri: {colonne: 'nom', ordre: 1},
        rowLoader,
    }
    return params
}
