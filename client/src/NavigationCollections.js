import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { proxy as comlinkProxy } from 'comlink'

import Alert from 'react-bootstrap/Alert'
import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { ListeFichiers, FormatteurTaille, FormatterDate } from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import AfficherVideo from './AfficherVideo'
import { SupprimerModal, CopierModal, DeplacerModal, InfoModal, RenommerModal } from './ModalOperations'
import { mapDocumentComplet } from './mapperFichier'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect, onContextMenu } from './MenuContextuel'
// import { uploaderFichiers } from './fonctionsFichiers'
import useWorkers, { useEtatPret, useUsager } from './WorkerContext'

// import { 
//     chargerTuuids, changerCollection, breadcrumbPush, breadcrumbSlice, selectionTuuids,
//     // setUserId, afficherPlusrecents, afficherCorbeille,
//     // ajouterFichierVolatil, supprimerFichier, restaurerFichier, rafraichirCollection,
// } from './redux/fichiersSlice'

import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'
import { ajouterDownload } from './redux/downloaderSlice'

const ETAT_PREPARATION = 1,
      ETAT_PRET = 2,
      ETAT_UPLOADING = 3,
      ETAT_COMPLETE = 4,
      ETAT_ECHEC = 5,
      ETAT_CONFIRME = 6,
      ETAT_UPLOAD_INCOMPLET = 7

function NavigationCollections(props) {

    const { erreurCb } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )
    const liste = useSelector(state => state.fichiers.liste )

    const [modeView, setModeView] = useState('')

    // Modals
    const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ showPreview, setShowPreview ] = useState(false)
    const [ afficherVideo, setAfficherVideo ] = useState('')
    const [ preparationUploadEnCours, setPreparationUploadEnCours ] = useState(false)

    // Preview
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState(false)
    const showPreviewAction = useCallback( tuuid => {
        if(!tuuid && selection && selection.length > 0) {
            tuuid = selection[0]
        }
        setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, selection, setTuuidSelectionne])
    
    const naviguerCollection = useCallback( cuuid => {
        setAfficherVideo('')  // Reset affichage
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
            dispatch(fichiersThunks.changerCollection(workers, cuuid))
                // .then(()=>console.debug("Succes changerCollection : ", cuuid))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, erreurCb, setAfficherVideo])

    // Declencher chargement initial des favoris
    useEffect(()=>{
        // console.debug("Declencher chargement initial? etatPret %O, cuuidCourant %O", etatPret, cuuidCourant)
        if(!etatPret || !userId || cuuidCourant) return  // Rien a faire
        naviguerCollection('')
    }, [naviguerCollection, etatPret, cuuidCourant, userId])

    let nombreFichiers = ''
    if(liste) {
        if(liste.length > 1) {
            nombreFichiers = <span>{liste.length} fichiers</span>
        }
    }

    return (
        <>
            <h1>Collections</h1>

            <div>
                <Row className='fichiers-header-buttonbar'>
                    <Col xs={12} lg={5}>
                        <SectionBreadcrumb naviguerCollection={naviguerCollection} />
                    </Col>

                    <Col xs={12} sm={3} md={4} lg={2}>
                        {nombreFichiers}
                    </Col>

                    <Col xs={12} sm={9} md={8} lg={5} className="buttonbars">
                        <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                        <BoutonsAction 
                            cuuid={cuuidCourant}
                            setShowCreerRepertoire={setShowCreerRepertoire}
                            setPreparationUploadEnCours={setPreparationUploadEnCours}
                        />
                    </Col>
                </Row>

                <Suspense fallback={<p>Loading ...</p>}>
                    <AffichagePrincipal 
                        modeView={modeView}
                        naviguerCollection={naviguerCollection}
                        showPreviewAction={showPreviewAction}
                        setContextuel={setContextuel}
                        afficherVideo={afficherVideo}
                        setAfficherVideo={setAfficherVideo}
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
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
                erreurCb={erreurCb} />
        </>
    )

}

export default NavigationCollections

function AffichagePrincipal(props) {

    const {
        modeView, 
        naviguerCollection,
        showPreviewAction,
        afficherVideo, setAfficherVideo,
        setContextuel, 
        enteteOnClickCb,
        showInfoModalOuvrir
    } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const liste = useSelector(state => state.fichiers.liste)

    const colonnes = useMemo(()=>preparerColonnes(workers), [workers])

    const onSelectionLignes = useCallback(selection=>{
        dispatch(fichiersActions.selectionTuuids(selection))
    }, [dispatch])
    const fermerAfficherVideo = useCallback(()=>setAfficherVideo(false), [setAfficherVideo])
    const onContextMenuClick = useCallback((event, value)=>{
        onContextMenu(event, value, setContextuel)
    }, [setContextuel])

    const onDoubleClick = useCallback( (event, value) => {
        const dataset = event.currentTarget.dataset
        window.getSelection().removeAllRanges()
        
        const folderId = value.folderId || dataset.folderId
        const fileId = value.fileId || dataset.fileId

        if(folderId) {
            naviguerCollection(folderId)
        } else if(fileId) {
            // console.debug("dbl click liste : %O, value : %O", liste, value)
            const fileItem = liste.filter(item=>item.tuuid===value.fileId).pop()
            const mimetype = fileItem.mimetype || ''
            if(mimetype.startsWith('video/')) setAfficherVideo(fileId)
            else showPreviewAction(fileId)
        }

    }, [naviguerCollection, showPreviewAction, liste])

    if(afficherVideo) {
        return (
            <AfficherVideoView
                liste={liste}
                tuuid={afficherVideo}
                fermer={fermerAfficherVideo} 
                showInfoModalOuvrir={showInfoModalOuvrir} />
        )
    }

    // Default - liste fichiers
    return (
        <ListeFichiers 
            modeView={modeView}
            colonnes={colonnes}
            rows={liste} 
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenuClick}
            onSelection={onSelectionLignes}
            onClickEntete={enteteOnClickCb}
        />
    )
}

function AfficherVideoView(props) {

    const { tuuid, liste, fermer, showInfoModalOuvrir } = props

    const workers = useWorkers()

    const fichier = useMemo(()=>{
        if(!tuuid || !liste) return
        let fichier = liste.filter(item=>item.tuuid===tuuid).pop()
        if(fichier) fichier = mapDocumentComplet(workers, fichier)
        return fichier
    }, [tuuid, liste])

    if(!fichier) return (
        <>
            <p>Erreur chargement de video</p>
            <p>Error loading video</p>
            <Button onClick={fermer}>Retour/Back</Button>
        </>
    )

    return (
        <AfficherVideo
            fichier={fichier}
            tuuidSelectionne={tuuid}
            fermer={fermer} 
            showInfoModalOuvrir={showInfoModalOuvrir} />
    )
}

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
            connexion.enregistrerCallbackMajCollections({cuuids: [cuuid]}, evenementCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
            connexion.enregistrerCallbackMajContenuCollection({cuuid}, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        } else {
            // Favoris
            connexion.enregistrerCallbackMajContenuCollection({cuuid: userId}, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        }

        // Cleanup listeners
        return () => {
            // console.debug("HandlerEvenements Retirer listeners collection ", cuuid)
            if(cuuid) {
                connexion.retirerCallbackMajCollections({cuuids: [cuuid]}, evenementCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
                connexion.retirerCallbackMajContenuCollection({cuuid}, evenementContenuCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
            } else {
                connexion.retirerCallbackMajContenuCollection({cuuid: userId}, evenementContenuCollectionCb)
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
        erreurCb,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])
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

    const workers = useWorkers()

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
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showDeplacerModalOuvrir={showDeplacerModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
                cuuid={cuuid}
                etatConnexion={etatPret}
                etatAuthentifie={etatPret}
                erreurCb={erreurCb}
              />

            <PreviewFichiers 
                workers={workers}
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={liste}
              />

            <ModalCreerRepertoire 
                show={showCreerRepertoire} 
                fermer={()=>{setShowCreerRepertoire(false)}} 
              />

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
            const certificatChiffrage = await connexion.getCertificatsMaitredescles()
            console.debug("creerCollection certificatChiffrage ", certificatChiffrage)
            const certificatChiffragePem = certificatChiffrage.certificat
            const {doc: metadataChiffre, commandeMaitrecles} = await chiffrage.chiffrerDocument(
                metadataDechiffre, 'GrosFichiers', certificatChiffragePem, {identificateurs_document, userId, DEBUG: true})
            console.debug("creerCollection metadataChiffre %O, commande Maitre des cles : %O", metadataChiffre, commandeMaitrecles)

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

function SectionBreadcrumb(props) {

    const { naviguerCollection } = props

    const dispatch = useDispatch()
    const breadcrumb = useSelector((state) => state.fichiers.breadcrumb)

    const handlerSliceBreadcrumb = useCallback(event => {
        event.preventDefault()
        event.stopPropagation()

        const value = event.currentTarget.dataset.idx
        let tuuid = ''
        if(value) {
            let level = Number.parseInt(value)
            const collection = breadcrumb[level]
            tuuid = collection.tuuid
            dispatch(fichiersActions.breadcrumbSlice(level))
            try {
                Promise.resolve(naviguerCollection(tuuid))
                    .catch(err=>console.error("SectionBreadcrumb Erreur navigation ", err))
            } catch(err) {
                console.error("handlerSliceBreadcrumb Erreur naviguerCollection %s: ", tuuid, err)
            }
        } else {
            try {
                Promise.resolve(naviguerCollection())
                    .catch(err=>console.error("SectionBreadcrumb Erreur navigation vers favoris", err))
            } catch(err) {
                console.error("handlerSliceBreadcrumb Erreur naviguerCollection favoris : ", err)
            }
        }
    }, [dispatch, breadcrumb, naviguerCollection])

    return (
        <Breadcrumb>
            
            <Breadcrumb.Item onClick={handlerSliceBreadcrumb}>Favoris</Breadcrumb.Item>
            
            {breadcrumb.map((item, idxItem)=>{
                // Dernier
                if(idxItem === breadcrumb.length - 1) {
                    return <span key={idxItem}>&nbsp; / {item.label}</span>
                }
                
                // Parents
                return (
                    <Breadcrumb.Item key={idxItem} onClick={handlerSliceBreadcrumb} data-idx={''+idxItem}>
                        {item.label}
                    </Breadcrumb.Item>
                )
            })}

        </Breadcrumb>
    )

}

function BoutonsFormat(props) {

    const { modeView, setModeView } = props

    const setModeListe = useCallback(()=>{ setModeView('liste') }, [setModeView])
    const setModeThumbnails = useCallback(()=>{ setModeView('thumbnails') }, [setModeView])

    let variantListe = 'secondary', variantThumbnail = 'outline-secondary'
    if( modeView === 'thumbnails' ) {
        variantListe = 'outline-secondary'
        variantThumbnail = 'secondary'
    }

    return (
        <ButtonGroup>
            <Button variant={variantListe} onClick={setModeListe}><i className="fa fa-list" /></Button>
            <Button variant={variantThumbnail} onClick={setModeThumbnails}><i className="fa fa-th-large" /></Button>
        </ButtonGroup>
    )
}

function BoutonsAction(props) {

    const { setShowCreerRepertoire, setPreparationUploadEnCours } = props

    return (
        <>
            <BoutonUpload setPreparationUploadEnCours={setPreparationUploadEnCours}>
                <i className="fa fa-plus"/> Fichier
            </BoutonUpload>
            &nbsp;
            <Button 
                variant="secondary" 
                className="individuel"
                onClick={setShowCreerRepertoire}
            >
                <i className="fa fa-folder"/> Collection
            </Button>
        </>
    )
}

function BoutonUpload(props) {

    const { setPreparationUploadEnCours } = props

    const refUpload = useRef()
    const workers = useWorkers()
    const usager = useUsager()
    const dispatch = useDispatch()
    const cuuid = useSelector(state=>state.fichiers.cuuid)

    const [className, setClassName] = useState('')

    const { traitementFichiers } = workers

    const handlerPreparationUploadEnCours = useCallback(event=>{
        // console.debug('handlerPreparationUploadEnCours ', event)
        setPreparationUploadEnCours(event)
    }, [setPreparationUploadEnCours])

    const upload = useCallback( acceptedFiles => {
        // console.debug("Files : %O pour usager: %O", acceptedFiles, usager)
        
        handlerPreparationUploadEnCours(0)  // Debut preparation

        traitementFichiers.traiterAcceptedFiles(dispatch, usager, cuuid, acceptedFiles, {setProgres: handlerPreparationUploadEnCours})
            .then(uploads=>{
                // const correlationIds = uploads.map(item=>item.correlation)
                // return dispatch(demarrerUploads(workers, correlationIds))
            })
            .catch(err=>console.error("Erreur fichiers : %O", err))
            .finally( () => handlerPreparationUploadEnCours(false) )

    }, [handlerPreparationUploadEnCours, traitementFichiers, dispatch, usager, cuuid])

    const fileChange = event => {
        event.preventDefault()
        setClassName('')

        const acceptedFiles = event.currentTarget.files
        upload(acceptedFiles)
    }

    const onButtonDrop = event => {
        event.preventDefault()
        setClassName('')

        const acceptedFiles = event.dataTransfer.files
        upload(acceptedFiles)
    }

    const handlerOnDragover = event => {
        event.preventDefault()
        setClassName('dropping')
        event.dataTransfer.dropEffect = "move"
    }

    const handlerOnDragLeave = event => { event.preventDefault(); setClassName(''); }

    const handlerOnClick = event => {
        refUpload.current.click()
    }

    return (
        <div 
            className={'upload ' + className}
            onDrop={onButtonDrop}
            onDragOver={handlerOnDragover} 
            onDragLeave={handlerOnDragLeave}
          >
            <Button 
                variant="secondary" 
                className="individuel"
                onClick={handlerOnClick}
                disabled={!cuuid}
              >
                {props.children}
            </Button>
            <input
                id='file_upload'
                type='file' 
                ref={refUpload}
                multiple
                onChange={fileChange}
              />
        </div>
    )
}

function preparerColonnes(workers) {

    const rowLoader = (item, idx) => mapDocumentComplet(workers, item, idx)

    const params = {
        ordreColonnes: ['nom', 'taille', 'mimetype', 'dateAjout', 'boutonDetail'],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 5},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2},
            'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterColonneDate, xs: 5, lg: 2},
            'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 1},
        },
        tri: {colonne: 'nom', ordre: 1},
        rowLoader,
    }
    return params
}

function FormatterColonneDate(props) {
    const data = props.data || {}
    const { upload } = data
    if(upload) {
        if( upload.status === 1 ) {
            return <span>En attente</span>
        } else if( upload.status === 2 ) {
            const taille = data.size || data.taille
            const pct = Math.min(Math.round(upload.position / taille * 100)) || 0
            return <ProgressBar now={pct} label={pct + '%'} />
        } else {
            return <span>En cours de traitement</span>
        }
    } else {
        return <FormatterDate value={props.value} />   
    }
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
    const { show, progres } = props

    return (
        <Modal show={show}>
            <Modal.Header>Preparation de fichiers</Modal.Header>
            <Modal.Body>
                <PreparationModalProgress progres={progres} />
            </Modal.Body>
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
                    <p>Chiffrage <i className='fa fa-key'/> en cours ...</p>
                </Col>
                <Col>
                    <ProgressBar now={progres} label={progres + ' %'} />
                </Col>
            </Row>
            <Row>
                <Col>
                    <p>
                        Noter que l'upload vers le serveur demarre des qu'un fichier est 
                        completement chiffre meme si plusieurs fichiers sont en attente.
                    </p>
                </Col>
            </Row>
        </div>
    )
}

function InformationListe(_props) {

    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)

    if (!liste) return <p>Chargement en cours...</p>

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
            return <p>Aucuns fichiers.</p>
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
