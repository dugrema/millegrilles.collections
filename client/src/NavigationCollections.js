import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { proxy as comlinkProxy } from 'comlink'

import Alert from 'react-bootstrap/Alert'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { ArchiverModal, SupprimerModal, CopierModal, DeplacerModal, InfoModal, RenommerModal, PartagerModal, ConversionVideoModal } from './ModalOperations'
import { mapDocumentComplet } from './mapperFichier'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import useWorkers, { useEtatPret, useUsager } from './WorkerContext'

import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'
import { ajouterDownload, ajouterZipDownload } from './redux/downloaderSlice'

import { BarreInformation, FormatterColonneDate, AffichagePrincipal } from './NavigationCommun'

function NavigationCollections(props) {

    const { erreurCb } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )

    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)
    const [modeSelection, setModeSelection] = useState(false)

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
    const [ showConversionVideo, setShowConversionVideo ] = useState(false)

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

        if(opts.retourFichier) return   // Plus rien a faire

        if(!cuuid) {
            cuuid = ''
        }
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
            dispatch(fichiersThunks.changerCollection(workers, cuuid))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, setShowPreview, erreurCb, setAfficherVideo, setAfficherAudio])

    const signalAnnuler = useMemo(()=>{
        let valeur = false
        return {
            setValeur: v => { valeur = v },
            signal: comlinkProxy(() => valeur)
        }
    }, [])

    const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const annulerPreparationUpload = useCallback(()=>{
        console.debug("Annuler preparation upload")
        signalAnnuler.setValeur(true)
    }, [signalAnnuler])

    const onScrollHandler = useCallback( pos => setScrollValue(pos), [setScrollValue])

    const preparerColonnesCb = useCallback(()=>preparerColonnes(workers), [workers])

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
        if(!etatPret || !userId) return  // Rien a faire
        dispatch(fichiersActions.setSource('collection'))
        naviguerCollection('')
    }, [dispatch, naviguerCollection, etatPret, userId])

    useEffect(()=>{
        if(!modeSelection) dispatch(fichiersActions.selectionTuuids(''))  // Vider selection
    }, [dispatch, modeSelection])

    return (
        <>
            <div>
                <BarreInformation 
                    hide={!!showPreview}
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
                    modeSelection={modeSelection}
                    setModeSelection={setModeSelection}
                    />

                <Suspense fallback={<p>Loading ...</p>}>
                    <AffichagePrincipal 
                        hide={!!showPreview}
                        preparerColonnes={preparerColonnesCb}
                        modeView={modeView}
                        naviguerCollection={naviguerCollection}
                        showPreviewAction={showPreviewAction}
                        setContextuel={setContextuel}
                        afficherVideo={afficherVideo}
                        afficherAudio={afficherAudio}
                        setAfficherVideo={setAfficherVideo}
                        setAfficherAudio={setAfficherAudio}
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
                        showInfoModalOuvrir={showInfoModalOuvrir}
                        setShowConversionVideo={setShowConversionVideo}
                        scrollValue={scrollValue}
                        onScroll={onScrollHandler}
                        modeSelection={modeSelection}
                        erreurCb={erreurCb}
                    />
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
                showConversionVideo={showConversionVideo}
                setShowConversionVideo={setShowConversionVideo}
                annulerPreparationCb={annulerPreparationUpload}
                downloadRepertoire={downloadRepertoireCb}
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
        // console.debug("HandlerEvenements Enregistrer listeners collection ", cuuid)
        if(cuuid) {
            connexion.enregistrerCallbackMajCollection(cuuid, evenementCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
            connexion.enregistrerCallbackMajContenuCollection(cuuid, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        } else {
            // Favoris
            connexion.enregistrerCallbackMajContenuCollection(userId, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        }

        // Cleanup listeners
        return () => {
            // console.debug("HandlerEvenements Retirer listeners collection ", cuuid)
            if(cuuid) {
                connexion.retirerCallbackMajCollection(cuuid, evenementCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
                connexion.retirerCallbackMajContenuCollection(cuuid, evenementContenuCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
            } else {
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
        contextuel, setContextuel, preparationUploadEnCours,
        showInfoModal, setShowInfoModal, annulerPreparationCb,
        showSupprimerModal, setShowSupprimerModal,
        showCopierModal, setShowCopierModal,
        showDeplacerModal, setShowDeplacerModal,
        showConversionVideo, setShowConversionVideo,
        downloadRepertoire,
        erreurCb,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showArchiverModal, setShowArchiverModal ] = useState(false)
    // const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    // const [ showCopierModal, setShowCopierModal ] = useState(false)
    // const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    // const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)
    const [ showPartagerModal, setShowPartagerModal ] = useState(false)

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])
    const showArchiverModalOuvrir = useCallback(()=>setShowArchiverModal(true), [setShowArchiverModal])
    const showArchiverModalFermer = useCallback(()=>setShowArchiverModal(false), [setShowArchiverModal])
    const showSupprimerModalOuvrir = useCallback(()=>setShowSupprimerModal(true), [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>setShowSupprimerModal(false), [setShowSupprimerModal])
    const showRenommerModalOuvrir = useCallback(()=>setShowRenommerModal(true), [setShowRenommerModal])
    const showRenommerModalFermer = useCallback(()=>setShowRenommerModal(false), [setShowRenommerModal])
    const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>setShowInfoModal(false), [setShowInfoModal])
    const showCopierModalOuvrir = useCallback(()=>setShowCopierModal(true), [setShowCopierModal])
    const showCopierModalFermer = useCallback(()=>setShowCopierModal(false), [setShowCopierModal])
    const showDeplacerModalOuvrir = useCallback(()=>setShowDeplacerModal(true), [setShowDeplacerModal])
    const showDeplacerModalFermer = useCallback(()=>setShowDeplacerModal(false), [setShowDeplacerModal])
    const showPartagerModalOuvrir = useCallback(()=>setShowPartagerModal(true), [setShowPartagerModal])
    const showPartagerModalFermer = useCallback(()=>setShowPartagerModal(false), [setShowPartagerModal])
    const showConversionVideoOuvrir = useCallback(()=>setShowConversionVideo(true), [setShowConversionVideo])
    const showConversionVideoFermer = useCallback(()=>setShowConversionVideo(false), [setShowConversionVideo])

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
            console.debug("!!! Modals.downloadAction params %O, fichier %O, infoVideo: %O", params, fichier, infoVideo)
            dispatch(ajouterDownload(workers, fichier))
                .catch(err=>erreurCb(err, 'Erreur ajout download'))
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
                showArchiverModalOuvrir={showArchiverModalOuvrir}
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showDeplacerModalOuvrir={showDeplacerModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
                showPartagerModalOuvrir={showPartagerModalOuvrir}
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
                showConversionVideo={showConversionVideoOuvrir}
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
                show={typeof(preparationUploadEnCours)==='number'?true:false} 
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

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton>Creer nouvelle collection</Modal.Header>

            <Modal.Body>
                <Form onSubmit={creerCollection}>
                    <Form.Group className="mb-3" controlId="formNomCollection">
                        <Form.Label>Nom de la collection</Form.Label>
                        <Form.Control 
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
        ordreColonnes: ['nom', 'taille', 'mimetype', 'dateFichier' /*, 'boutonDetail'*/],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 5},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2},
            // 'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterColonneDate, xs: 5, lg: 2},
            'dateFichier': {'label': 'Date', className: 'details', formatteur: FormatterColonneDate, xs: 6, lg: 3},
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
    const { show, progres, annulerCb } = props

    return (
        <Modal show={show}>
            <Modal.Header>Preparation de fichiers</Modal.Header>
            <Modal.Body>
                <PreparationModalProgress progres={progres} />
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={annulerCb}>Annuler</Button>
            </Modal.Footer>
        </Modal>
    )
}

function PreparationModalProgress(opts) {
    const { progres } = opts

    if(isNaN(progres)) return <p>Pret</p>

    return (
        <div>
            <Row>
                <Col>
                    <p><i className='fa fa-key'/> Chiffrage en cours ...</p>
                </Col>
                <Col>
                    <ProgressBar now={progres} label={progres + ' %'} />
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

function InformationListe(_props) {

    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const chargementTermine = useSelector(state => state.fichiers.dechiffrageInitialComplete)?true:false

    if (!liste && !chargementTermine) return <p>Chargement en cours...</p>

    if(!cuuid) {
        const tailleListe = (liste && liste.length) || 0
        if(tailleListe === 0) {
            return (
                <div>
                    <br/>
                    <Alert>
                        <Alert.Heading>Aucune collection</Alert.Heading>
                        <p>
                            Cliquez sur le bouton <span><i className="fa fa-folder"/> Collection</span> pour creer votre premiere collection.
                        </p>
                    </Alert>
                </div>
            )
        }
    } else {
        const tailleListe = (liste && liste.length) || 0
        if(tailleListe === 0) {
            if(!chargementTermine) {
            //     return <p>Aucuns fichiers.</p>
            // } else {
                return <p>Chargement en cours...</p>
            }
        }
    }

    return ''
}

function traiterCollectionEvenement(workers, dispatch, evenement) {
    // console.debug("traiterCollectionEvenement ", evenement)
}

async function traiterContenuCollectionEvenement(workers, dispatch, evenement) {
    // console.debug("traiterContenuCollectionEvenement ", evenement)

    const message = evenement.message || {}
    
    // Conserver liste tuuids (et dedupe)
    const dirtyTuuids = {}
    const champs = ['fichiers_ajoutes', 'fichiers_modifies', 'collections_ajoutees', 'collections_modifiees', 'retires']
    for (const champ of champs) {
        const value = message[champ]
        if(value) value.forEach(item=>{dirtyTuuids[item] = true})
    }
    const tuuids = Object.keys(dirtyTuuids)

    if(tuuids.length > 0) {
        // console.debug("traiterCollectionEvenement Refresh tuuids ", tuuids)
        return dispatch(fichiersThunks.chargerTuuids(workers, tuuids))
    }

}

// function InformationStatistiques(props) {

//     const [info, setInfo] = useState('')

//     const etatPret = useEtatPret(),
//           workers = useWorkers()

//     const cuuid = useSelector(state=>state.fichiers.cuuid)

//     const infoCalculee = useMemo(()=>{
//         if(!info) return null

//         const nombreRepertoires = info.reduce((acc, item)=>{
//             if(['Collection', 'Repertoire'].includes(item.type_node)) acc += item.count
//             return acc
//         }, 0)
//         const fichier = info.filter(item=>item.type_node === 'Fichier').pop() || {}

//         return {nombreRepertoires, taille: fichier.taille, nombreFichiers: fichier.count}
//     }, [info])

//     useEffect(()=>{
//         if(!etatPret) return
//         // console.debug("InformationStatistiques charger : %O", cuuid)
//         const cuuidStats = cuuid?cuuid:null
//         workers.connexion.getInfoStatistiques(cuuidStats)
//             .then(reponse=>{
//                 // console.debug("Reponse stats : %O", reponse)
//                 setInfo(reponse.info)
//             })
//             .catch(err=>console.error("Erreur recuperer stats : %O", err))
//     }, [workers, etatPret, cuuid, setInfo])

//     if(!infoCalculee) return 'Chargement info en cours'

//     return (
//         <Alert variant='info' show={true}>
//             <Alert.Heading>Information</Alert.Heading>
//             <Row>
//                 <Col></Col>
//                 <Col>Repertoires</Col>
//                 <Col>Fichiers</Col>
//                 <Col>Taille</Col>
//             </Row>
//             <Row>
//                 <Col>Repertoire</Col>
//                 <Col>...todo...</Col>
//                 <Col>...todo...</Col>
//                 <Col>...todo...</Col>
//             </Row>
//             <Row>
//                 <Col>Sous-repertoires</Col>
//                 <Col>{infoCalculee.nombreRepertoires}</Col>
//                 <Col>{infoCalculee.nombreFichiers}</Col>
//                 <Col><FormatteurTaille value={infoCalculee.taille} /></Col>
//             </Row>
//         </Alert>
//     )
// }