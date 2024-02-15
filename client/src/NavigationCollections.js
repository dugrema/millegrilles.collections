import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { proxy as comlinkProxy } from 'comlink'

import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Collapse from 'react-bootstrap/Collapse'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { ArchiverModal, SupprimerModal, CopierModal, DeplacerModal, InfoModal, RenommerModal, PartagerModal, ConversionVideoModal } from './ModalOperations'
import { mapDocumentComplet } from './mapperFichier'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import useWorkers, { useCapabilities, useEtatPret, useUsager } from './WorkerContext'

import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'
import { ajouterDownload, ajouterZipDownload } from './redux/downloaderSlice'
import { chargerInfoContacts, chargerPartagesUsager, chargerPartagesDeTiers } from './redux/partagerSlice'

import { BarreInformation, FormatterColonneDate, AffichagePrincipal, InformationListe } from './NavigationCommun'
import { PartagesUsagersTiers } from './Partager'
import { BadgeUpload } from './Menu'

function NavigationCollections(props) {

    const { hideMenu, setHideMenu, erreurCb, ouvrirPartageUserId, cuuidTransfere, setCuuidTransfere } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const capabilities = useCapabilities()

    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )

    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)
    const [modeSelection, setModeSelection] = useState(false)
    const [toggleOffCarousel, setToggleOffCarousel] = useState(false)
    const [navInitDone, setNavInitDone] = useState(false)

    // Modals
    const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ showPreview, setShowPreview ] = useState(false)
    const [ afficherVideo, setAfficherVideo ] = useState('')
    const [ afficherAudio, setAfficherAudio ] = useState('')
    const [ preparationUploadEnCours, setPreparationUploadEnCours ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)
    const [ showConversionVideo, setShowConversionVideo ] = useState(false)
    const [ showUploadBatch, setShowUploadBatch ] = useState(false)
    const [ showPartagerModal, setShowPartagerModal ] = useState(false)

    // Preview
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState(false)
    const showPreviewAction = useCallback( tuuid => {
        if(!tuuid && selection && selection.length > 0) {
            tuuid = selection[0]
        }
        setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, selection, setTuuidSelectionne])
    
    const naviguerCollection = useCallback( (cuuid, opts) => {
        opts = opts || {}

        // Reset affichage
        setAfficherVideo('')
        setAfficherAudio('')
        setShowPreview(false)
        setToggleOffCarousel(true)
        setShowUploadBatch(false)

        if(opts.retourFichier) return   // Plus rien a faire

        if(!cuuid) {
            cuuid = ''
        }
        try {
            if(cuuid) {
                // Ajouter le repertoire a la fin du breadcrumb
                dispatch(fichiersActions.breadcrumbPush({tuuid: cuuid}))
            } else {
                dispatch(fichiersActions.breadcrumbSlice())
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch breadcrumb : ", err)
        }
        try {
            dispatch(fichiersThunks.changerCollection(workers, cuuid, opts))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, setShowPreview, erreurCb, setAfficherVideo, setAfficherAudio, setToggleOffCarousel, setShowUploadBatch])

    const signalAnnuler = useMemo(()=>{
        let valeur = false
        return {
            setValeur: v => { valeur = v },
            signal: comlinkProxy(() => valeur)
        }
    }, [])

    const cacherAffichage = useMemo(()=>{
        if(!!showPreview || showUploadBatch) return true
        //if(modeView === 'carousel') return true
        return false
    }, [showPreview, modeView, showUploadBatch])

    // const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const annulerPreparationUpload = useCallback(()=>{
        console.debug("Annuler preparation upload")
        signalAnnuler.setValeur(true)
    }, [signalAnnuler])

    const onScrollHandler = useCallback( pos => setScrollValue(pos), [setScrollValue])

    const preparerColonnesCb = useCallback(()=>preparerColonnes(workers), [workers])

    const fermerUploadBatchHandler = useCallback(()=>setShowUploadBatch(false), [setShowUploadBatch])

    const downloadRepertoireCb = useCallback(e=>{
        const { value } = e.currentTarget
        const cuuid = value || cuuidCourant
        console.debug("Download repertoire tuuid ", cuuid)
        dispatch(ajouterZipDownload(workers, {cuuid}))
            .then(()=>{
                console.debug("Preparation et download pour ZIP %O commence", cuuid)
            })
            .catch(err=>{
                console.error("Erreur ajout download ZIP %s : %O", cuuid, err)
                erreurCb(err, 'Erreur creation download ZIP')
            })
    }, [workers, dispatch, cuuidCourant, erreurCb])

    // Reset signal annuler
    useEffect(()=>{
        if(preparationUploadEnCours===false) signalAnnuler.setValeur(false)
    }, [preparationUploadEnCours, signalAnnuler])

    // Declencher chargement initial des favoris
    useEffect(()=>{
        // if(!etatPret || !userId || cuuidCourant) return  // Rien a faire
        if(!etatPret || !userId || navInitDone) return  // Rien a faire
        dispatch(fichiersActions.setSource('collection'))
        dispatch(fichiersActions.setSortKeys({key: 'nom', ordre: 1}))
        setNavInitDone(true)
        if(cuuidTransfere) {
            // Navigation vers une collection a partir d'un lien externe
            setCuuidTransfere('')
            naviguerCollection(cuuidTransfere)
        } else {
            naviguerCollection('')
        }
    }, [dispatch, naviguerCollection, etatPret, userId, navInitDone, cuuidTransfere, setCuuidTransfere, setNavInitDone])

    useEffect(()=>{
        // if(!modeSelection) 
        // Vider selection sur chaque toggle de modeSelection
        dispatch(fichiersActions.selectionTuuids(''))
    }, [dispatch, modeSelection])

    useEffect(()=>{
        if(modeView === 'carousel' && capabilities.mobile) setHideMenu(true)
        else setHideMenu(false)
    }, [capabilities, modeView])

    useEffect(()=>{
        if(!toggleOffCarousel) return
        setToggleOffCarousel(false)
        if(modeView === 'carousel') setModeView('liste')
    }, [modeView, setModeView, toggleOffCarousel, setToggleOffCarousel])

    return (
        <>
            <div>
                <BarreInformation 
                    hide={cacherAffichage}
                    hideMenu={hideMenu}
                    naviguerCollection={naviguerCollection}
                    modeView={modeView}
                    setModeView={setModeView} 
                    setShowCreerRepertoire={setShowCreerRepertoire} 
                    setPreparationUploadEnCours={setPreparationUploadEnCours} 
                    afficherVideo={afficherVideo} 
                    afficherAudio={afficherAudio}
                    signalAnnuler={signalAnnuler.signal} 
                    setShowInfoModal={setShowInfoModal}
                    showSupprimerModal={showSupprimerModal}
                    setShowSupprimerModal={setShowSupprimerModal}
                    showCopierModal={showCopierModal}
                    setShowCopierModal={setShowCopierModal}
                    showDeplacerModal={showDeplacerModal}
                    setShowDeplacerModal={setShowDeplacerModal}
                    setShowRenommerModal={setShowRenommerModal}
                    modeSelection={modeSelection}
                    setModeSelection={setModeSelection}
                    setShowUploadBatch={setShowUploadBatch}
                    setShowPartagerModal={setShowPartagerModal}
                    />

                <Suspense fallback={<p>Loading ...</p>}>
                    <AffichagePrincipal 
                        hide={cacherAffichage}
                        preparerColonnes={preparerColonnesCb}
                        modeView={modeView}
                        setModeView={setModeView}
                        hideMenu={hideMenu}
                        setHideMenu={setHideMenu}
                        naviguerCollection={naviguerCollection}
                        showPreviewAction={showPreviewAction}
                        setContextuel={setContextuel}
                        afficherVideo={afficherVideo}
                        afficherAudio={afficherAudio}
                        setAfficherVideo={setAfficherVideo}
                        setAfficherAudio={setAfficherAudio}
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
                        // showInfoModalOuvrir={showInfoModalOuvrir}
                        setShowConversionVideo={setShowConversionVideo}
                        scrollValue={scrollValue}
                        onScroll={onScrollHandler}
                        modeSelection={modeSelection}
                        erreurCb={erreurCb}
                    />

                    <PartagesUsager hide={!!cuuidCourant} onSelect={ouvrirPartageUserId} />

                    <UploadBatchZip hide={!showUploadBatch} fermer={fermerUploadBatchHandler} />
                </Suspense>
            </div>

            <HandlerEvenements />

            <Modals 
                showCreerRepertoire={showCreerRepertoire}
                setShowCreerRepertoire={setShowCreerRepertoire} 
                showPreview={showPreview}
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                showPreviewAction={showPreviewAction}
                preparationUploadEnCours={preparationUploadEnCours}
                setPreparationUploadEnCours={setPreparationUploadEnCours}
                contextuel={contextuel}
                setContextuel={setContextuel} 
                showInfoModal={showInfoModal}
                setShowInfoModal={setShowInfoModal}
                showSupprimerModal={showSupprimerModal}
                showCopierModal={showCopierModal}
                setShowCopierModal={setShowCopierModal}
                showDeplacerModal={showDeplacerModal}
                setShowDeplacerModal={setShowDeplacerModal}
                setShowSupprimerModal={setShowSupprimerModal}
                showRenommerModal={showRenommerModal}
                setShowRenommerModal={setShowRenommerModal}
                showConversionVideo={showConversionVideo}
                setShowConversionVideo={setShowConversionVideo}
                annulerPreparationCb={annulerPreparationUpload}
                downloadRepertoire={downloadRepertoireCb}
                showPartagerModal={showPartagerModal}
                setShowPartagerModal={setShowPartagerModal}
                erreurCb={erreurCb} />
        </>
    )

}

export default NavigationCollections

function HandlerEvenements(_props) {

    const workers = useWorkers()
    const etatPret = useEtatPret()
    const dispatch = useDispatch()
    const usager = useUsager()
    const fichiersInfo = useSelector(state => state.fichiers)
    const { cuuid } = fichiersInfo
    const extensions = usager.extensions || {}
    const { userId } = extensions

    const { connexion } = workers
    
    const evenementCollectionCb = useMemo(
        () => comlinkProxy( evenement => traiterCollectionEvenement(workers, dispatch, evenement) ),
        [workers, dispatch]
    )
    
    const evenementContenuCollectionCb = useMemo(
        () => comlinkProxy( evenement => traiterContenuCollectionEvenement(workers, dispatch, evenement) ), 
        [workers, dispatch]
    )

    // Enregistrer changement de collection
    useEffect(()=>{
        // console.debug("HandlerEvenements listener collection connexion %O, etatPret %O, userId %O, cuuid %O", connexion, etatPret, userId, cuuid)
        if(!connexion || !etatPret) return  // Pas de connexion, rien a faire

        // Enregistrer listeners
        if(cuuid) {
            // console.debug("HandlerEvenements Enregistrer listeners collection ", cuuid)
            connexion.enregistrerCallbackMajCollection(cuuid, evenementCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
            connexion.enregistrerCallbackMajContenuCollection(cuuid, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        } else if(userId) {
            // Favoris
            // console.debug("HandlerEvenements Enregistrer listeners collection pour userId ", userId)
            connexion.enregistrerCallbackMajContenuCollection(userId, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        }

        // Cleanup listeners
        return () => {
            if(cuuid) {
                // console.debug("HandlerEvenements Retirer listeners collection ", cuuid)
                connexion.retirerCallbackMajCollection(cuuid, evenementCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
                connexion.retirerCallbackMajContenuCollection(cuuid, evenementContenuCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
            } else if(userId) {
                // console.debug("HandlerEvenements Retirer listeners collections pour userId ", userId)
                connexion.retirerCallbackMajContenuCollection(userId, evenementContenuCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
            }
        }
    }, [connexion, etatPret, userId, cuuid, evenementCollectionCb, evenementContenuCollectionCb])

    return ''  // Aucun affichage
}

function Modals(props) {

    const {
        showCreerRepertoire, setShowCreerRepertoire,
        showPreview, tuuidSelectionne, showPreviewAction, setShowPreview,
        contextuel, setContextuel, 
        preparationUploadEnCours, setPreparationUploadEnCours,
        showInfoModal, setShowInfoModal, annulerPreparationCb,
        showSupprimerModal, setShowSupprimerModal,
        showCopierModal, setShowCopierModal,
        showDeplacerModal, setShowDeplacerModal,
        showConversionVideo, setShowConversionVideo,
        showRenommerModal, setShowRenommerModal,
        showPartagerModal, setShowPartagerModal,
        downloadRepertoire,
        erreurCb,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )
    const breadcrumb = useSelector(state => state.fichiers.breadcrumb)

    const [ showArchiverModal, setShowArchiverModal ] = useState(false)
    // const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    // const [ showCopierModal, setShowCopierModal ] = useState(false)
    // const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    // const [ showInfoModal, setShowInfoModal ] = useState(false)
    // const [ showRenommerModal, setShowRenommerModal ] = useState(false)
    // const [ showPartagerModal, setShowPartagerModal ] = useState(false)

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])
    const showArchiverModalOuvrir = useCallback(()=>setShowArchiverModal(true), [setShowArchiverModal])
    const showArchiverModalFermer = useCallback(()=>setShowArchiverModal(false), [setShowArchiverModal])
    const showSupprimerModalOuvrir = useCallback(()=>setShowSupprimerModal(true), [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>setShowSupprimerModal(false), [setShowSupprimerModal])
    const showRenommerModalOuvrir = useCallback(()=>setShowRenommerModal(true), [setShowRenommerModal])
    const showRenommerModalFermer = useCallback(()=>setShowRenommerModal(false), [setShowRenommerModal])
    // const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>setShowInfoModal(false), [setShowInfoModal])
    const showCopierModalOuvrir = useCallback(()=>setShowCopierModal(true), [setShowCopierModal])
    const showCopierModalFermer = useCallback(()=>setShowCopierModal(false), [setShowCopierModal])
    const showDeplacerModalOuvrir = useCallback(()=>setShowDeplacerModal(true), [setShowDeplacerModal])
    const showDeplacerModalFermer = useCallback(()=>setShowDeplacerModal(false), [setShowDeplacerModal])
    const showPartagerModalOuvrir = useCallback(()=>setShowPartagerModal(true), [setShowPartagerModal])
    const showPartagerModalFermer = useCallback(()=>setShowPartagerModal(false), [setShowPartagerModal])
    const showConversionVideoOuvrir = useCallback(()=>setShowConversionVideo(true), [setShowConversionVideo])
    const showConversionVideoFermer = useCallback(()=>setShowConversionVideo(false), [setShowConversionVideo])
    const preparationEnCoursFermer = useCallback(()=>setPreparationUploadEnCours(false), [setPreparationUploadEnCours])

    const dispatch = useDispatch()
    const workers = useWorkers()

    const downloadAction = useCallback(params => {
        // console.debug("downloadAction params ", params)
        const modeVideo = params.modeVideo || false
        const dechiffre = params.dechiffre || false
        const url = params.url
        let fichier = liste.filter(item=>item.tuuid === params.tuuid).pop()
        if(!fichier) return  // Pas de fichier
        const version_courante = fichier.version_courante || {}
        try {
            const breadcrumbPath = breadcrumb.map(item=>item.label).join('/')
            // console.debug("!!! breadcrumb download %O, %s", breadcrumb, breadcrumbPath)
            fichier.breadcrumbPath = breadcrumbPath
        } catch (err) {
            console.info("downloadAction Erreur preparation breadcrumbpath : ", err)
        }
        if(params.fuuid && version_courante.video) {
            const videos = fichier.version_courante.video
            const infoVideo = Object.values(videos).filter(item=>item.fuuid_video === params.fuuid).pop()
            // console.debug("!!! DownloadAction params %O, fichier %O, infoVideo: %O", params, fichier, infoVideo)
            // Set le fuuid de video a downloader, params dechiffrage
            fichier = {
                ...fichier, 
                infoDechiffrage: infoVideo,
                fuuidDownload: params.fuuid,
                url, dechiffre, noSave: modeVideo,
            }
            // console.debug("!!! Modals.downloadAction params %O, fichier %O, infoVideo: %O", params, fichier, infoVideo)
            dispatch(ajouterDownload(workers, fichier))
                .catch(err=>erreurCb(err, 'Erreur ajout download'))
        } else {
            fichier = {
                ...fichier, 
                url, dechiffre, noSave: modeVideo,
            }
            dispatch(ajouterDownload(workers, fichier))
                .catch(err=>erreurCb(err, 'Erreur ajout download'))
        }
    }, [workers, dispatch, liste, breadcrumb])

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
                showArchiverModalOuvrir={showArchiverModalOuvrir}
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showDeplacerModalOuvrir={showDeplacerModalOuvrir}
                // showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
                showPartagerModalOuvrir={showPartagerModalOuvrir}
                cuuid={cuuid}
                etatConnexion={etatPret}
                etatAuthentifie={etatPret}
                downloadRepertoire={downloadRepertoire}
                erreurCb={erreurCb}
              />

            <PreviewFichiers 
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={liste}
                showConversionVideo={showConversionVideoOuvrir}
                downloadAction={downloadAction}
              />

            <ModalCreerRepertoire 
                show={showCreerRepertoire} 
                fermer={()=>{setShowCreerRepertoire(false)}} 
              />

            <ArchiverModal show={showArchiverModal} fermer={showArchiverModalFermer} />

            <SupprimerModal
                show={showSupprimerModal}
                fermer={showSupprimerModalFermer}
                cuuid={cuuid}
                fichiers={liste}
                selection={selection}
                workers={workers}
              />

            <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                selection={selection}
                workers={workers}
                erreurCb={erreurCb}
              />

            <DeplacerModal 
                show={showDeplacerModal} 
                fermer={showDeplacerModalFermer}
                selection={selection}
                workers={workers}
                erreurCb={erreurCb}
              />

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
                downloadRepertoire={downloadRepertoire}
              />

            <RenommerModal
                show={showRenommerModal} 
                fermer={showRenommerModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
              />       

            <PreparationModal 
                show={!!preparationUploadEnCours} 
                fermer={preparationEnCoursFermer}
                progres={preparationUploadEnCours} 
                annulerCb={annulerPreparationCb}
              />

            <PartagerModal 
                show={showPartagerModal} 
                hide={showPartagerModalFermer} 
                fichiers={liste}
                selection={selection}
                />

            <ConversionVideoModal 
                show={showConversionVideo} 
                fermer={showConversionVideoFermer} 
                fichiers={liste}
                selection={selection}
                downloadAction={downloadAction}
                />
        </>
    )
}

function ModalCreerRepertoire(props) {

    const { show, fermer } = props

    const workers = useWorkers()
    const usager = useUsager()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const refInput = useRef()

    const { connexion, chiffrage } = workers
    const userId = usager?usager.extensions.userId:''

    const [ nomCollection, setNomCollection ] = useState('')

    const changerNomCollection = useCallback(event=>{
        const value = event.currentTarget.value
        setNomCollection(value)
    }, [setNomCollection])
    
    const creerCollection = useCallback(event=>{
        event.preventDefault()
        event.stopPropagation()
        
        new Promise(async resolve => {
            const metadataDechiffre = {nom: nomCollection}
            const identificateurs_document = {type: 'collection'}
            const certificatsChiffrage = await connexion.getCertificatsMaitredescles()
            // console.debug("creerCollection certificatChiffrage ", certificatsChiffrage)
            const {doc: metadataChiffre, commandeMaitrecles} = await chiffrage.chiffrerDocument(
                metadataDechiffre, 'GrosFichiers', certificatsChiffrage, {identificateurs_document, userId, DEBUG: false})
            // console.debug("creerCollection metadataChiffre %O, commande Maitre des cles : %O", metadataChiffre, commandeMaitrecles)

            const opts = {}
            if(cuuidCourant) opts.cuuid = cuuidCourant
            else opts.favoris = true

            resolve(connexion.creerCollection(metadataChiffre, commandeMaitrecles, opts))
          })
            .then(()=>{
                setNomCollection('')  // Reset
                fermer()
              })
            .catch(err=>{
                console.error("Erreur creation collection : %O", err)
              })
    }, [connexion, userId, nomCollection, cuuidCourant, setNomCollection, fermer])

    useEffect(()=>{
        if(show && refInput.current) refInput.current.focus()
    }, [show, refInput])

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton>Creer nouvelle collection</Modal.Header>

            <Modal.Body>
                <Form onSubmit={creerCollection}>
                    <Form.Group className="mb-3" controlId="formNomCollection">
                        <Form.Label>Nom de la collection</Form.Label>
                        <Form.Control 
                            ref={refInput}
                            type="text" 
                            placeholder="Saisir le nom ..." 
                            onChange={changerNomCollection}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={creerCollection}>Creer</Button>
            </Modal.Footer>

        </Modal>
    )
}

function preparerColonnes(workers) {

    const rowLoader = (item, idx) => mapDocumentComplet(workers, item, idx)

    const params = {
        ordreColonnes: ['nom', 'taille', 'mimetype', 'dateFichier'],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 6, xl: 7},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1, xl: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2, xl: 2},
            // 'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterColonneDate, xs: 5, lg: 2},
            'dateFichier': {'label': 'Date', className: 'details', formatteur: FormatterColonneDate, xs: 6, lg: 3, xl: 2},
            // 'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 1},
        },
        ordreColonnesMobile: ['nom', 'taille', 'dateFichier', 'mimetype'],
        paramsColonnesMobile: {
            'nom': {'label': 'Nom', xs: 12},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 12},
            'dateFichier': {'label': 'Date', className: 'details', formatteur: FormatterColonneDate, xs: 12},
            'mimetype': {'label': 'Type', className: 'details', xs: 12},
        },
        tri: {colonne: 'nom', ordre: 1},
        rowLoader,
    }
    return params
}

function MenuContextuel(props) {

    const { contextuel, selection, erreurCb } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const fichiers = useSelector(state => state.fichiers.liste)
    const breadcrumb = useSelector(state => state.fichiers.breadcrumb)
    
    const downloadAction = useCallback(tuuid => {
        const breadcrumbPath = breadcrumb.map(item=>item.label).join('/')
        // console.debug("MenuContextuel.downloadAction breadcrumb %O, path %s", breadcrumb, breadcrumbPath)

        const fichier = fichiers.filter(item=>item.tuuid === tuuid).pop()
        if(fichier) {
            const fichierCopy = {...fichier, breadcrumbPath, dechiffre: false}
            dispatch(ajouterDownload(workers, fichierCopy))
                .catch(err=>erreurCb(err, 'Erreur ajout download'))
        }
    }, [workers, dispatch, fichiers, breadcrumb])

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
                    return <MenuContextuelFichier {...props} workers={workers} fichier={fichier} downloadAction={downloadAction} />
                } else {
                    return <MenuContextuelRepertoire {...props} workers={workers} repertoire={fichier} downloadAction={downloadAction} />
                }
            }
        }
    }

    return ''
}

function PreparationModal(props) {
    const { show, progres, fermer, annulerCb } = props

    const [valeur, setValeur] = useState('')
    const [complet, setComplet] = useState(false)
    const [err, setErr] = useState('')
    const [rejets, setRejets] = useState('')

    const reset = useCallback(()=>{
        setValeur('')
        setComplet(false)
        setErr('')
        setRejets('')
    }, [setValeur, setComplet, setErr, setRejets])

    const nePlusAfficher = useCallback(()=>{
        window.localStorage.setItem('uploadHint1', 'false')
        fermer()
    }, [fermer])

    const afficherHint1 = useMemo(()=>{
        if(!complet) return false
        return window.localStorage.getItem('uploadHint1') !== 'false'
    }, [complet])

    const hideCb = useCallback(e=>{
        if(!complet) return annulerCb()
        return fermer()
    }, [fermer, annulerCb, complet])

    useEffect(()=>{
        // console.debug("Progres : ", progres)
        if(show === false) return reset()
        if(!progres) return reset()

        if(progres.annuler === true) {
            reset()
            fermer()
            return
        }

        if(progres.valeur !== undefined) setValeur(progres.valeur)
        if(progres.complet !== undefined) setComplet(progres.complet)
        if(progres.err !== undefined) setErr(progres.err)
        if(progres.rejets !== undefined) setRejets(progres.rejets)
    }, [show, reset, progres, setValeur, setComplet, setErr, setRejets])

    useEffect(()=>{
        if(!complet) return
        // console.debug("Err : %O, rejets: %O, valeur: %O", err, rejets, valeur)
        if(err || rejets) return
        if(isNaN(valeur)) return fermer()
        if(window.localStorage.getItem('uploadHint1') === 'false') return fermer()
    }, [complet, valeur, fermer])

    return (
        <Modal show={show} onHide={hideCb}>
            <Modal.Header>Preparation de fichiers</Modal.Header>
            <Modal.Body>
                <PreparationModalProgress valeur={valeur} err={err} complet={complet} rejets={rejets} />
            </Modal.Body>
            <Modal.Footer>
                {afficherHint1?
                    <div>
                        <Button onClick={fermer}>Ok</Button>
                        {' '}
                        <Button variant='dark' onClick={nePlusAfficher}>Ne plus afficher</Button>
                    </div>
                    :
                    complet?
                        <Button onClick={fermer}>Ok</Button>
                        :
                        <Button variant="dark" onClick={annulerCb}>Annuler</Button>
                }
            </Modal.Footer>
        </Modal>
    )
}

function PreparationModalProgress(opts) {
    const { valeur, err, complet, rejets } = opts

    if(complet) 
    {
        if(!(err || rejets)) {
            return (
                <div>
                    <p>Les fichiers sont maintenant chiffres et en cours de transfert.</p>
                    <hr />
                    <h4>Transfert de fichiers</h4>
                    <p>
                        Surveillez l'indicateur de transfert <BadgeUpload/> dans le menu. 
                        Lorsque le nombre atteint 100%, le transfert est termine. Si l'indicateur devient 
                        rouge, le transfert a echoue.
                    </p>
                    <p>
                        La fenetre de transfert de fichiers s'ouvre lorsque vous cliquez sur l'indicateur 
                        d'upload <i className='fa fa-upload'/> ou de download <i className='fa fa-download'/> dans le menu.
                    </p>
                </div>
            )
        } else {
            return (
                <div>
                    <p>
                        Certains fichiers n'ont pas pu etre traites, les autres sont en cours de transfert.
                        Voir la liste des erreurs ci-dessous.
                    </p>
                    <AfficherRejets rejets={rejets} />
                </div>
            )
        }
    }

    return (
        <div>
            <Row>
                <Col>
                    <p>Chiffrage en cours ...</p>
                </Col>
                <Col>
                    <ProgressBar now={valeur} label={valeur + ' %'} />
                </Col>
            </Row>
            <Row>
                <Col>
                    <p>
                        Noter que l'upload vers le serveur demarre des qu'un fichier est 
                        completement chiffre meme si plusieurs fichiers sont en traitement.
                    </p>
                </Col>
            </Row>
        </div>
    )
}

function AfficherRejets(props) {
    const rejets = props.rejets || []
    return (
        <div>
            <h4>Fichiers rejetes</h4>
            <Row>
                <Col>Nom</Col>
                <Col>Raison</Col>
            </Row>
            {rejets.map((item, idx)=>{
                return (
                    <Row key={idx}>
                        <Col>{item.nom}</Col>
                        <Col>{item.err}</Col>
                    </Row>
                )
            })}
        </div>
    )
}

// function InformationListe(_props) {

//     const liste = useSelector(state => state.fichiers.liste)
//     const cuuid = useSelector(state => state.fichiers.cuuid)
//     // const dechiffrageInitialComplete = useSelector(state => state.fichiers.dechiffrageInitialComplete)?true:false
//     const etapeChargement = useSelector(state => state.fichiers.etapeChargement)
//     const chargementTermine = true  //!!liste  //etapeChargement === 5

//     if (!liste || !chargementTermine) return <p>Chargement en cours...</p>

//     if(!cuuid) {
//         const tailleListe = (liste && liste.length) || 0
//         if(tailleListe === 0) {
//             return (
//                 <div>
//                     <br/>
//                     <Alert>
//                         <Alert.Heading>Aucune collection</Alert.Heading>
//                         <p>
//                             Cliquez sur le bouton <span><i className="fa fa-folder"/> Collection</span> pour creer votre premiere collection.
//                         </p>
//                     </Alert>
//                 </div>
//             )
//         }
//     } else {
//         const tailleListe = (liste && liste.length) || 0
//         if(tailleListe === 0) {
//             if(!chargementTermine) {
//             //     return <p>Aucuns fichiers.</p>
//             // } else {
//                 return <p>Chargement en cours...</p>
//             }
//         }
//     }

//     return ''
// }

function traiterCollectionEvenement(workers, dispatch, evenement) {
    console.debug("traiterCollectionEvenement ", evenement)
}

async function traiterContenuCollectionEvenement(workers, dispatch, evenement) {
    // console.debug("traiterContenuCollectionEvenement ", evenement)

    const message = evenement.message || {}
    
    // Conserver liste tuuids (et dedupe)
    const dirtyTuuids = {}
    const cuuid = message.cuuid
    const retires = message.retires
    const champs = ['fichiers_ajoutes', 'fichiers_modifies', 'collections_ajoutees', 'collections_modifiees']
    for (const champ of champs) {
        const value = message[champ]
        if(value) value.forEach(item=>{dirtyTuuids[item] = true})
    }
    const tuuids = Object.keys(dirtyTuuids)

    const promises = []

    if(tuuids.length > 0) {
        // console.debug("traiterCollectionEvenement Refresh tuuids ", tuuids)
        promises.push(dispatch(fichiersThunks.chargerTuuids(workers, tuuids)))
    }

    if(retires) {
        // console.debug("traiterCollectionEvenement Retirer tuuids de la collection courante (%s) %O", cuuid, retires)
        promises.push(dispatch(fichiersThunks.retirerTuuidsCollection(workers, cuuid, retires)))
    }

    if(promises.length > 0) return Promise.all(promises)
}

function PartagesUsager(props) {

    const { hide, onSelect } = props

    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()

    const listePartagesAutres = useSelector(state=>state.partager.listePartagesAutres)

    // Partage
    const userIdPartageTiersHandler = useCallback(onSelect, [onSelect])
    
    useEffect(()=>{
        if(!etatPret) return
        // Charger les contacts
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.error("Erreur chargement contacts : ", err))

        // Charger tous les partages (paires contacts/cuuid)
        dispatch(chargerPartagesDeTiers(workers))
            .catch(err=>console.error("Erreur chargement des partages contacts (tiers avec usager local) : ", err))
    }, [dispatch, workers, etatPret])

    const show = useMemo(()=>{
        if(hide || !listePartagesAutres || listePartagesAutres.length === 0) return false
        return true
    }, [hide, listePartagesAutres])
    
    if(!onSelect) return ''

    return (
        <Collapse in={show}>
            <div>
                <h3>Collections partagees</h3>
                <PartagesUsagersTiers onSelect={userIdPartageTiersHandler} />
            </div>
        </Collapse>
    )

}

function UploadBatchZip(props) {

    const { hide, fermer } = props

    const dispatch = useDispatch()
    const workers = useWorkers()

    const cuuid = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)

    const batchId = 'batchzip-TODO-FIXME'
    const token = 'FAKETOKEN-TODO-FIXME'

    const [traitementEnCours, setTraitementEnCours] = useState(false)
    const [erreurTraitement, setErreurTraitement] = useState('')
    const [fichiers, setFichiers] = useState('')

    const ajouterPartProxy = useMemo(()=>comlinkProxy((correlation, compteurPosition, chunk) => {
        return workers.traitementFichiers.ajouterPart(batchId, correlation, compteurPosition, chunk)
        // return workers.uploadFichiersDao.ajouterFichierUploadFile(batchId, correlation, compteurPosition, chunk)
    }), [workers, batchId])

    const updateFichierProxy = useMemo(()=>comlinkProxy((doc, opts) => {
        const docWithIds = {...doc, userId, batchId, token}
        // console.debug("updateFichierProxy docWithIds ", docWithIds)
        return workers.traitementFichiers.updateFichier(dispatch, docWithIds, opts)
        // return workers.uploadFichiersDao.updateFichierUpload(docWithIds)
    }), [workers, userId, token, batchId])

    const fichiersChangeHandler = useCallback(e=>{
        const files = e.currentTarget.files
        if(files.length !== 1) return false
        const file = files[0]
        console.debug("File : ", file)
        const filename = file.name.toLowerCase()
        if(!filename.endsWith('.zip')) {
            return false
        }
        setFichiers(files)
    }, [setFichiers])

    const demarrerUpload = useCallback(e=>{
        // const fichiers = e.currentTarget.files
        console.debug("UploadBatchZip fichiers %O dans cuuid %O", fichiers, cuuid)
        setTraitementEnCours(true)
        setErreurTraitement('')
        Promise.resolve()
            .then(async () => {
                for await (const fichier of fichiers) {
                    await workers.transfertUploadFichiers.parseZipFile(workers, userId, fichier, cuuid, updateFichierProxy, ajouterPartProxy)
                }
                fermer()
            })
            .catch(err=>{
                console.error("UploadBatchZip Erreur traitement zip ", err)
                setErreurTraitement(''+err)
            })
            .finally(()=>{
                setTraitementEnCours(false)
                setFichiers('')
            })
    }, [workers, userId, cuuid, setTraitementEnCours, setErreurTraitement, fichiers, setFichiers])

    if(!!hide) return ''

    return (
        <div>
            <h3>Upload zip</h3>

            <p>
                Cette page permet d'inserer le contenu d'un fichier .zip dans le repertoire courant.
                Le fichier .zip va etre ouvert, son contenu chiffre et copie en conservant la structure des repertoires.
            </p>

            <p>
                Noter que le tranfert des fichiers procede de la maniere habituelle. 
                Cette page effectue le chiffrage des fichiers. Elle va se fermer une fois le chiffrage termine.
            </p>

            <Alert variant='info'>
                <Alert.Heading>Note</Alert.Heading>
                <p>
                    Veuillez surveiller l'indicateur de transfert de fichiers dans la barre de menu 
                    pour savoir quand le transfert sera complete.
                </p>
            </Alert>

            <p>
                Choississez un fichier .zip et cliquez sur demarrer pour proceder.
            </p>

            <hr />

            <Form>
                <Form.Label htmlFor='btn-upload'>Choisir un fichier .zip</Form.Label>
                <Form.Control id='btn-upload' className='btn-upload' type='file' onChange={fichiersChangeHandler} accept='application/zip'/>
                <p></p>
                <div className='buttonbar'>
                    <Button onClick={demarrerUpload} disabled={!fichiers}>Demarrer</Button>
                    <Button variant='secondary' onClick={fermer}>Fermer</Button>
                </div>
            </Form>

            <p></p>

            <Alert show={!!traitementEnCours} variant='info'>
                <Alert.Heading>
                    Traitement du fichier ZIP en cours.
                </Alert.Heading>
                <p>
                    Cette page va se fermer lorsque l'extraction et le chiffrage des fichiers seront termines.
                </p>
            </Alert>

            <Alert show={!!erreurTraitement} variant='danger'>
                <p>Erreur de traitement du fichier ZIP.</p>
                <pre>{erreurTraitement}</pre>
            </Alert>
        </div>
    )
}
