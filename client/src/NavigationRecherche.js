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
import InputGroup from 'react-bootstrap/InputGroup'

import { FormatteurTaille, FormatteurNombre } from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { ArchiverModal, SupprimerModal, CopierModal, DeplacerModal, InfoModal, RenommerModal } from './ModalOperations'
import { mapDocumentComplet } from './mapperFichier'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import useWorkers, { useEtatPret, useUsager } from './WorkerContext'

import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'
import { ajouterDownload } from './redux/downloaderSlice'

import { FormatterColonneDate, AffichagePrincipal, BoutonsFormat } from './NavigationCommun'

function NavigationRecherche(props) {

    const { setCuuidTransfere, erreurCb } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )
    const liste = useSelector(state => state.fichiers.liste)
    const nombreFichiersTotal = useSelector(state => state.fichiers.nombreFichiersTotal )

    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)

    // Modals
    const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ showPreview, setShowPreview ] = useState(false)
    const [ afficherVideo, setAfficherVideo ] = useState('')
    const [ afficherAudio, setAfficherAudio ] = useState('')
    const [ preparationUploadEnCours, setPreparationUploadEnCours ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)

    // Preview
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState(false)
    const showPreviewAction = useCallback( tuuid => {
        if(!tuuid && selection && selection.length > 0) {
            tuuid = selection[0]
        }
        setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, selection, setTuuidSelectionne])
    
    const rechercheChangeHandler = useCallback( e => {
        const value = e.currentTarget.value
        dispatch(fichiersActions.setParametresRecherche(value))
    }, [dispatch])

    const rechercherCb = useCallback( e => {
        if(e) {
            e.preventDefault()
            e.stopPropagation()
        }

        setAfficherVideo('')  // Reset affichage
        setAfficherAudio('')  // Reset affichage
        try {
            // Set tri par date modification desc
            dispatch(fichiersThunks.afficherRecherche(workers))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, erreurCb, setAfficherVideo, setAfficherAudio])

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

    const preparerColonnesCb = useCallback(()=>preparerColonnes(workers, userId), [workers, userId])

    const naviguerCollectionCb = useCallback(cuuid=>{
        console.debug("Naviguer vers collection tuuid:%s", cuuid)
        setCuuidTransfere(cuuid)
    }, [setCuuidTransfere])

    // Reset signal annuler
    useEffect(()=>{
        if(preparationUploadEnCours===false) signalAnnuler.setValeur(false)
    }, [preparationUploadEnCours, signalAnnuler])

    // Declencher chargement initial des favoris
    useEffect(()=>{
        if(!etatPret || !userId) return  // Rien a faire
        rechercherCb()
    }, [rechercherCb, etatPret, cuuidCourant, userId])

    return (
        <>
            <div>
                <BarreInformation 
                    hide={!!showPreview}
                    onSearch={rechercherCb}
                    onSearchChange={rechercheChangeHandler}
                    modeView={modeView}
                    setModeView={setModeView} 
                    setShowCreerRepertoire={setShowCreerRepertoire} 
                    setPreparationUploadEnCours={setPreparationUploadEnCours} 
                    afficherVideo={afficherVideo} 
                    afficherAudio={afficherAudio}
                    signalAnnuler={signalAnnuler.signal} 
                    />

                <Suspense fallback={<p>Loading ...</p>}>
                    <AffichagePrincipal 
                        hide={(!!showPreview || !liste || liste.length === 0)}
                        preparerColonnes={preparerColonnesCb}
                        modeView={modeView}
                        showPreviewAction={showPreviewAction}
                        naviguerCollection={naviguerCollectionCb}
                        setContextuel={setContextuel}
                        afficherVideo={afficherVideo}
                        afficherAudio={afficherAudio}
                        setAfficherVideo={setAfficherVideo}
                        setAfficherAudio={setAfficherAudio}
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
                        showInfoModalOuvrir={showInfoModalOuvrir}
                        scrollValue={scrollValue}
                        onScroll={onScrollHandler}
                    />
                </Suspense>

                <Alert variant='secondary' show={liste && liste.length < nombreFichiersTotal}>
                    Note : la liste de {nombreFichiersTotal} resultats est tronquee a {liste?liste.length:0} elements.
                </Alert>
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
                annulerPreparationCb={annulerPreparationUpload}
                setCuuidTransfere={setCuuidTransfere}
                erreurCb={erreurCb} />
        </>
    )

}

export default NavigationRecherche

export function BarreInformation(props) {

    const { 
        hide, afficherVideo, afficherAudio, modeView, setModeView, 
        onSearch, onSearchChange,
    } = props

    const liste = useSelector(state => state.fichiers.liste )
    const bytesTotalDossier = useSelector(state => state.fichiers.bytesTotalDossier)
    const dechiffrageInitialComplete = useSelector(state => state.fichiers.dechiffrageInitialComplete)
    const parametresRecherche = useSelector(state => state.fichiers.parametresRecherche )
    const nombreFichiersTotal = useSelector(state => state.fichiers.nombreFichiersTotal )

    const afficherMedia = afficherVideo || afficherAudio


    if(hide) return ''

    let nombreFichiers = ''
    if(liste) {
        if(liste.length > 1) {
            nombreFichiers = (
                <div>
                    <div>
                        {dechiffrageInitialComplete?
                            '':
                            <i className="fa fa-spinner fa-spin" />
                        }
                        {' '}{nombreFichiersTotal} fichiers trouves
                    </div>
                    <div><FormatteurTaille value={bytesTotalDossier} /></div>
                </div>
            )
        }
    }

    return (
        <div>
            <Row className='fichiers-header-buttonbar'>
                <Col xs={12} lg={4}>
                    <h3>Resultats de recherche</h3>
                </Col>

                <Col xs={12} sm={3} md={4} lg={3}>
                    {afficherMedia?'':nombreFichiers}
                </Col>

                <Col xs={12} sm={9} md={8} lg={5} className="buttonbars">
                    {afficherMedia?'':
                        <div>
                            <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                        </div>
                    }
                </Col>
            </Row>            

            <Form onSubmit={onSearch}>
                <InputGroup>
                    <Form.Control
                        placeholder="Saisir les parametres de la recherche ..."
                        aria-label="Saisir les parametres de la recherche avec bouton de recherche"
                        value={parametresRecherche}
                        onChange={onSearchChange}
                    />
                    <Button variant="primary" onClick={onSearch}>Chercher</Button>
                </InputGroup>
            </Form>

            <br />
        </div>
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
        console.warn("TODO HandlerEvenements Enregistrer listeners collection ", cuuid)
        // if(cuuid) {
        //     connexion.enregistrerCallbackMajCollections({cuuids: [cuuid]}, evenementCollectionCb)
        //         .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
        //     connexion.enregistrerCallbackMajContenuCollection({cuuid}, evenementContenuCollectionCb)
        //         .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        // } else {
        //     // Favoris
        //     connexion.enregistrerCallbackMajContenuCollection({cuuid: userId}, evenementContenuCollectionCb)
        //         .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
        // }

        // // Cleanup listeners
        // return () => {
        //     // console.debug("HandlerEvenements Retirer listeners collection ", cuuid)
        //     if(cuuid) {
        //         connexion.retirerCallbackMajCollections({cuuids: [cuuid]}, evenementCollectionCb)
        //             .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
        //         connexion.retirerCallbackMajContenuCollection({cuuid}, evenementContenuCollectionCb)
        //             .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
        //     } else {
        //         connexion.retirerCallbackMajContenuCollection({cuuid: userId}, evenementContenuCollectionCb)
        //             .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
        //     }
        // }
    }, [connexion, etatPret, userId, cuuid, evenementCollectionCb, evenementContenuCollectionCb])

    return ''  // Aucun affichage
}

function Modals(props) {

    const {
        showCreerRepertoire, setShowCreerRepertoire,
        showPreview, tuuidSelectionne, showPreviewAction, setShowPreview,
        contextuel, setContextuel, preparationUploadEnCours,
        showInfoModal, setShowInfoModal, annulerPreparationCb,
        setCuuidTransfere,
        erreurCb,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    // const [ showInfoModal, setShowInfoModal ] = useState(false)
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
    const cuuidTransfereHandler = useCallback(e=>setCuuidTransfere(e.currentTarget.value), [setCuuidTransfere])

    const dispatch = useDispatch()
    const workers = useWorkers()

    const downloadAction = useCallback((params) => {
        let fichier = liste.filter(item=>item.tuuid === params.tuuid).pop()
        if(fichier && fichier.version_courante) {
            const videos = fichier.version_courante.video
            if(videos) {
                const infoVideo = Object.values(videos).filter(item=>item.fuuid_video === params.fuuid).pop()
                // console.debug("!!! DownloadAction params %O, fichier %O, infoVideo: %O", params, fichier, infoVideo)
                // Set le fuuid de video a downloader, params dechiffrage
                fichier = {
                    ...fichier, 
                    infoDechiffrage: infoVideo,
                    fuuidDownload: params.fuuid
                }
            }
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
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
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
                downloadAction={downloadAction}
                cuuidTransfereAction={cuuidTransfereHandler}
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
        </>
    )
}

function preparerColonnes(workers, userId) {

    const rowLoader = (item, idx) => mapDocumentComplet(workers, item, {idx, userId})

    const params = {
        ordreColonnes: ['nom', 'score', 'taille', 'mimetype', 'dateFichier' /*, 'boutonDetail'*/],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 12, md:12, lg: 6, formatteur: FormatteurNomFichier},
            'score': {'label': 'Score', formatteur: FormatteurNombre, xs: 3, md: 2, lg: 1},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, md: 2, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 6, md: 5, lg: 2},
            'dateFichier': {'label': 'Date', className: 'details', formatteur: FormatterColonneDate, xs: 12, md: 3, lg: 2},
        },
        tri: {colonne: 'score', ordre: -1},
        rowLoader,
    }
    return params
}

function FormatteurNomFichier(props) {
    const { value } = props
    const data = props.data || {}
    const partage = data.partage || false
    if(partage) {
        return <span className='partage'><i className='fa fa-share-alt'/> {value}</span>
    } else {
        return <span>{value}</span>
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
                        <Alert.Heading>Aucuns resultats</Alert.Heading>
                        <p>
                            Aucuns fichiers ne correspondent aux termes de la recherche.
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
