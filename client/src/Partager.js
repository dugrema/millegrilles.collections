import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

import { mapDocumentComplet } from './mapperFichier'
import useWorkers, {useEtatConnexion, WorkerProvider, useUsager, useEtatPret, useCapabilities} from './WorkerContext'
import { ajouterDownload } from './redux/downloaderSlice'
import { chargerInfoContacts, chargerPartagesUsager, chargerPartagesDeTiers } from './redux/partagerSlice'
import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'
import PreviewFichiers from './FilePlayer'

import { MenuContextuelPartageFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import { BoutonsFormat, SectionBreadcrumb, InformationListe, FormatterColonneDate, AffichagePrincipal } from './NavigationCommun'
import { CopierModal, InfoModal } from './ModalOperations'

function Partager(props) {

    const { erreurCb, userIdPartageTransfere: userIdTransfere, ouvrirPartageUserId, hideMenu, setHideMenu } = props

    const workers = useWorkers(), 
          dispatch = useDispatch(),
          etatPret = useEtatPret()

    const [contactId, setContactId] = useState('')
    const [userIdPartage, setUserIdPartage] = useState('')

    // Reset userId transfere (e.g. via NavigationCollections)
    useEffect(()=>{
        if(!userIdTransfere) return
        ouvrirPartageUserId('')
        setUserIdPartage(userIdTransfere)
    }, [userIdTransfere, ouvrirPartageUserId, setUserIdPartage])

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
        const contactId = e.currentTarget.value
        console.debug("choisirContactId contactId")
        setContactId(contactId)
        dispatch(fichiersActions.setUserContactId({userId: userIdPartage, contactId}))
    }, [dispatch, userIdPartage, setContactId])
    const fermerPageContact = useCallback(()=>setContactId(''), [setContactId])
    const fermerPagePartageUsager = useCallback(()=>setUserIdPartage(''), [setUserIdPartage])

    if(userIdPartage) {
        return <NavigationPartageTiers 
            userId={userIdPartage} 
            fermer={fermerPagePartageUsager} 
            hideMenu={hideMenu}
            setHideMenu={setHideMenu}
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

    const { userId, fermer, hideMenu, setHideMenu, erreurCb } = props

    const workers = useWorkers(),
          dispatch = useDispatch()
    const capabilities = useCapabilities()

    const userPartages = useSelector(state=>state.partager.userPartages),
          listePartagesAutres = useSelector(state=>state.partager.listePartagesAutres),
          contactId = useSelector(state=>state.fichiers.contactId),
          breadcrumb = useSelector(state=>state.fichiers.breadcrumb)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showPreview, setShowPreview ] = useState(false)
    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)
    const [ afficherVideo, setAfficherVideo ] = useState('')
    const [ afficherAudio, setAfficherAudio ] = useState('')
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [toggleOffCarousel, setToggleOffCarousel] = useState(false)

    const userInfo = useMemo(()=>{
        return userPartages.filter(item=>item.user_id === userId).pop()
    }, [userPartages, userId])

    const contactInfo = useMemo(()=>{
        // console.debug("NavigationPartageTiers breadcrumb %O", breadcrumb)
        if(!breadcrumb) return ''
        const tuuidPartage = breadcrumb[0]
        if(!tuuidPartage) return ''
        const contactInfo = listePartagesAutres.filter(item=>item.tuuid === tuuidPartage.tuuid).pop()
        // console.debug("NavigationPartageTiers contactInfo %O", contactInfo)
        return contactInfo
    }, [breadcrumb, listePartagesAutres])

    const itemRootBreadcrumb = useMemo(()=>{
        if(!userInfo) return {label: 'Partages', onClick: fermer}

        const afficherPartageUser = () => {
            // Reset affichage
            setAfficherVideo('')
            setAfficherAudio('')
            setToggleOffCarousel(true)

            dispatch(fichiersThunks.afficherPartagesContact(workers, userId, null))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        }

        return [{label: 'Partages', onClick: fermer}, {label: userInfo.nom_usager, onClick: afficherPartageUser}]
    }, [userInfo, fermer, setAfficherVideo, setAfficherAudio, setToggleOffCarousel])

    const fichierBreadcrumb = useMemo(()=>{
        if( !afficherAudio && !afficherVideo) return ''
        return selection[0]
    }, [afficherAudio, afficherVideo, selection])

    // Preview
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState(false)
    const showPreviewAction = useCallback( tuuid => {
        if(!tuuid && selection && selection.length > 0) {
            tuuid = selection[0]
        }
        setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, selection, setTuuidSelectionne])

    const onScrollHandler = useCallback( pos => setScrollValue(pos), [setScrollValue])
    
    const naviguerCollection = useCallback( (cuuid, opts) => {
        opts = opts || {}
        setAfficherVideo('')  // Reset affichage
        setAfficherAudio('')  // Reset affichage
        setShowPreview(false)
        setToggleOffCarousel(true)

        if(opts.retourFichier) return   // Plus rien a faire

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
            // console.debug("naviguerCollection contactinfo initial : %O", contactInfo)
            let contactInfoEffectif = contactInfo
            if(!contactInfo && cuuid) {
                // On n'a pas deja de contactInfo
                contactInfoEffectif = listePartagesAutres.filter(item=>item.tuuid === cuuid).pop()
            }
            // console.debug("naviguerCollection contactinfo initial : %O, effectif : %O", contactInfo, contactInfoEffectif)
            if(!contactInfoEffectif) {
                console.error("contactInfoEffectif pour %s introuvable (listePartagesAutres: %O)", cuuid, listePartagesAutres)
                throw new Error(`contactInfoEffectif pour ${cuuid} introuvable`)
            }
            // console.debug("Changer collection pour contact %O, cuuid %O", contactInfoEffectif, cuuid)
            dispatch(fichiersActions.setUserContactId({userId: userInfo.user_id, contactId: contactInfoEffectif.contact_id}))
            if(cuuid) {
                dispatch(fichiersThunks.changerCollection(workers, cuuid))
                    .catch(err=>erreurCb(err, 'Erreur changer collection'))
            } else {
                dispatch(fichiersThunks.afficherPartagesContact(workers, userId, contactId))
                    .catch(err=>erreurCb(err, 'Erreur changer collection'))
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, userInfo, erreurCb, contactInfo, setShowPreview, setAfficherVideo, setAfficherAudio, setToggleOffCarousel])

    const preparerColonnesCb = useCallback(()=>preparerColonnes(workers), [workers])

    useEffect(()=>{
        if(modeView === 'carousel' && capabilities.mobile) setHideMenu(true)
        else setHideMenu(false)
    }, [capabilities, modeView])

    useEffect(()=>{
        if(!userId) return  // Il faut au moins avoir une selection d'usager
        // Reset navigation en mode partage, top-level
        setAfficherVideo('')
        setAfficherAudio('')
        setShowPreview(false)
        setToggleOffCarousel(true)
        try {
            // Set tri par date modification desc
            dispatch(fichiersThunks.afficherPartagesContact(workers, userId, contactId))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }

    }, [dispatch, userId, contactId, setAfficherVideo, setAfficherAudio, setShowPreview, setToggleOffCarousel])

    useEffect(()=>{
        // console.debug("modeview %O, toggle %O", modeView, toggleOffCarousel)
        if(!toggleOffCarousel) return
        setToggleOffCarousel(false)
        if(modeView === 'carousel') setModeView('liste')
    }, [modeView, setModeView, toggleOffCarousel, setToggleOffCarousel])

    return (
        <div>
            {((capabilities.mobile && !!showPreview) || hideMenu)?'':
                <Row className='partage-header'>
                    <Row>
                        <Col xs={11}><h3>Partage {userInfo.nom_usager}</h3></Col>
                    </Row>

                    <Row className='fichiers-header-buttonbar'>
                        <Col xs={12} lg={5}>
                            <SectionBreadcrumb 
                                naviguerCollection={naviguerCollection} 
                                prependItems={itemRootBreadcrumb} 
                                fichier={fichierBreadcrumb} />
                        </Col>

                        <Col xs={12} sm={9} md={8} lg={5} className="buttonbars">
                            <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                        </Col>
                    </Row>
                </Row>
            }

            <Suspense fallback={<p>Loading ...</p>}>
                <AffichagePrincipal 
                    hide={!!showPreview}
                    hideMenu={hideMenu}
                    setHideMenu={setHideMenu}
                    preparerColonnes={preparerColonnesCb}
                    modeView={modeView}
                    setModeView={setModeView}
                    naviguerCollection={naviguerCollection}
                    showPreviewAction={showPreviewAction}
                    setContextuel={setContextuel}
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

            <Modals 
                showPreview={!!showPreview}
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                showPreviewAction={showPreviewAction}
                contextuel={contextuel}
                setContextuel={setContextuel} 
                showInfoModal={showInfoModal}
                setShowInfoModal={setShowInfoModal}
                erreurCb={erreurCb} />            

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

export function PartagesUsagersTiers(props) {

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

    const contactsRender = useMemo(()=>{
        if(!contacts) return ''

        return contacts.map(item=>{
            // Compter le nombre de partages pour ce contact
            const nombrePartages = partagesUsager.reduce((acc, partage)=>{
                if(item.contact_id === partage.contact_id) return acc + 1
                return acc
            }, 0)

            return (
                <Row key={item.contact_id}>
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
        })

    }, [contacts])

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

            {contactsRender}

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

    // const workers = useWorkers(),
    //       dispatch = useDispatch()

    const etatPret = useEtatPret()
    const contacts = useSelector(state=>state.partager.listeContacts)
    // const userId = useSelector(state=>state.fichiers.userId)
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

    // useEffect(()=>{
    //     console.debug("Collections partagees : %O", collections)
    // }, [collections])

    if(!contact) return 'Aucune information sur le contact'

    // let ListePartages = 'Aucune information sur le contact'
    // switch(modePartage) {
    //     case 'usager': ListePartages = ListePartagesUsager; break
    //     // case 'contact': ListePartages = ListePartagesContact; break
    //     default:
    //         break
    // }

    // if(modePartage === 'usager') return <ListePartagesUsager contactId={contactId} fermer={fermer} />
    // if(modePartage === 'contact') return <ListePartagesContact contactId={contactId} fermer={fermer} />

    // return 'Mode non supporte'

    return (
        <div>
            <ListePartagesUsager contactId={contactId} fermer={fermer} />
        </div>
    )
}

function CollectionsPartagesUsager(props) {
    const { value, supprimer } = props

    if(!value || value.length === 0) return (
        <Alert variant="info">
            <Alert.Heading>Aucunes collections partagee</Alert.Heading>
            <p>Pour ajouter un partage, aller dans vos collections et choisissez-en une a partager (option Partager).</p>
        </Alert>
    )

    return value.map(item=>{
        return (
            <Row key={item.tuuid}>
                <Col>
                    {item.nom}
                </Col>
                <Col>
                    <Button variant="secondary" value={item.tuuid} onClick={supprimer}>Supprimer</Button>
                </Col>
            </Row>
        )
    })
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
        console.debug("ListePartagesUsager Supprimer partage %s avec usager %s", tuuid, contactId)
        workers.connexion.supprimerPartageUsager(contactId, tuuid)
            .catch(err=>console.error("Erreur suppression partage ", err))
    }, [workers, contactId])

    // Charger les informations de dossiers partages avec le contact
    useEffect(()=>{
        if(!etatPret || !userId || !contact) return  // Rien a faire
        dispatch(fichiersThunks.afficherPartagesUsager(workers, contactId))
            .catch(err=>console.error('Partager Erreur chargement partages ', err))
    }, [workers, etatPret, userId, contactId])

    // useEffect(()=>{
    //     console.debug("Collections partagees : %O", collections)
    // }, [collections])

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

            <CollectionsPartagesUsager value={collections} supprimer={supprimerPartageCb} />

        </div>
    )
}

// function ListePartagesContact(props) {
//     const { contactId, fermer } = props

//     const workers = useWorkers(),
//           dispatch = useDispatch()

//     const etatPret = useEtatPret()
//     const contacts = useSelector(state=>state.partager.listeContacts)
//     const userId = useSelector(state=>state.fichiers.userId)
//     const collections = useSelector(state=>state.fichiers.liste)

//     const contact = useMemo(()=>{
//         if(!contacts) return
//         return contacts.filter(item=>item.contact_id === contactId).pop()
//     }, [contacts])
    
//     const supprimerPartageCb = useCallback(e=>{
//         const tuuid = e.currentTarget.value
//         workers.connexion.supprimerPartageUsager(contactId, tuuid)
//             .catch(err=>console.error("Erreur suppression partage ", err))
//     }, [workers])

//     // Charger les informations de dossiers partages avec le contact
//     useEffect(()=>{
//         if(!etatPret || !userId || !contact) return  // Rien a faire
//         dispatch(fichiersThunks.afficherPartagesContact(workers, contactId))
//             .catch(err=>console.error('Partager Erreur chargement partages ', err))
//     }, [workers, etatPret, userId, contactId])

//     useEffect(()=>{
//         console.debug("Collections partagees : %O", collections)
//     }, [collections])

//     if(!contact) return 'Aucune information sur le contact'

//     return (
//         <div>
//             <Row>
//                 <Col xs={11}>
//                     <h3>Partages avec {contact.nom_usager}</h3>
//                 </Col>
//                 <Col>
//                     <Button variant="secondary" onClick={fermer}>X</Button>
//                 </Col>
//             </Row>
            
//             {collections && collections.map(item=>{
//                 return (
//                     <Row>
//                         <Col>
//                             {item.nom||item.tuuid}
//                         </Col>
//                         <Col>
//                             <Button variant="secondary" value={item.tuuid} onClick={supprimerPartageCb}>Supprimer</Button>
//                         </Col>
//                     </Row>
//                 )
//             })}

//         </div>
//     )
// }

function preparerColonnes(workers, getState) {

    const rowLoader = (item, idx) => mapDocumentComplet(workers, item, idx, {getState})

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

function Modals(props) {

    const {
        showPreview, tuuidSelectionne, showPreviewAction, setShowPreview,
        contextuel, setContextuel, showInfoModal, setShowInfoModal,
        erreurCb,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showCopierModal, setShowCopierModal ] = useState(false)

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])
    const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>setShowInfoModal(false), [setShowInfoModal])
    const showCopierModalOuvrir = useCallback(()=>setShowCopierModal(true), [setShowCopierModal])

    const dispatch = useDispatch()
    const workers = useWorkers()

    const downloadAction = useCallback((params) => {
        let fichier = liste.filter(item=>item.tuuid === params.tuuid).pop()
        if(fichier) {
            const videos = fichier.version_courante.video
            const infoVideo = Object.values(videos).filter(item=>item.fuuid_video === params.fuuid).pop()
            // console.debug("!!! DownloadAction params %O, fichier %O, infoVideo: %O", params, fichier, infoVideo)
            // Set le fuuid de video a downloader, params dechiffrage
            fichier = {
                ...fichier, 
                infoDechiffrage: infoVideo,
                fuuidDownload: params.fuuid
            }
            throw new Error("fix me")
            // dispatch(ajouterDownload(workers, fichier))
            //     .catch(err=>erreurCb(err, 'Erreur ajout download'))
        }
    }, [workers, dispatch, liste])

    return (
        <>
            <InformationListe />

            <MenuContextuel
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                fichiers={liste}
                tuuidSelectionne={tuuidSelectionne}
                selection={selection}
                showPreview={showPreviewAction}
                usager={usager}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                cuuid={cuuid}
                etatConnexion={etatPret}
                etatAuthentifie={etatPret}
                erreurCb={erreurCb}
              />

            <PreviewFichiers 
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={liste}
              />

            {/* <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                selection={selection}
                workers={workers}
                erreurCb={erreurCb}
              />
 */}
            <InfoModal 
                show={showInfoModal} 
                fermer={showInfoModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
                etatConnexion={etatPret}
                etatAuthentifie={etatPret}
                usager={usager}
                erreurCb={erreurCb}
                downloadAction={downloadAction}
              />

        </>
    )
}

function MenuContextuel(props) {

    const { contextuel, selection, erreurCb } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const fichiers = useSelector(state => state.fichiers.liste)
    
    const downloadAction = useCallback(tuuid => {
        const fichier = fichiers.filter(item=>item.tuuid === tuuid).pop()
        if(fichier) {
            dispatch(ajouterDownload(workers, fichier))
                .catch(err=>erreurCb(err, 'Erreur ajout download'))
        }
    }, [workers, dispatch, fichiers])

    if(!contextuel.show) return ''

    if(selection && fichiers) {
        // console.debug("Selection : ", selection)
        if( selection.length > 1 ) {
            return <MenuContextuelMultiselect {...props} workers={workers} />
        } else if( selection.length === 1 ) {
            const fichierTuuid = selection[0]
            const fichier = fichiers.filter(item=>item.tuuid===fichierTuuid).pop()
            if(fichier) {
                if(fichier.mimetype && fichier.mimetype !== 'Repertoire') {
                    return <MenuContextuelPartageFichier {...props} workers={workers} fichier={fichier} downloadAction={downloadAction} />
                } else {
                    return <MenuContextuelRepertoire {...props} workers={workers} repertoire={fichier} downloadAction={downloadAction} />
                }
            }
        }
    }

    return ''
}
