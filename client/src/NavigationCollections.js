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

import { 
    chargerTuuids, changerCollection, breadcrumbPush, breadcrumbSlice, selectionTuuids,
    // setUserId, afficherPlusrecents, afficherCorbeille,
    // ajouterFichierVolatil, supprimerFichier, restaurerFichier, rafraichirCollection,
} from './redux/fichiersSlice'

function NavigationCollections(props) {

    const { erreurCb } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )

    const [modeView, setModeView] = useState('')

    // Modals
    const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ showPreview, setShowPreview ] = useState(false)
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
        if(!cuuid) cuuid = ''
        try {
            if(cuuid) {
                dispatch(breadcrumbPush({tuuid: cuuid}))
            } else {
                dispatch(breadcrumbSlice())
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch breadcrumb : ", err)
        }
        try {
            dispatch(changerCollection(workers, cuuid))
                // .then(()=>console.debug("Succes changerCollection : ", cuuid))
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, erreurCb])

    // Declencher chargement initial des favoris
    useEffect(()=>{
        console.debug("Declencher chargement initial? etatPret %O, cuuidCourant %O", etatPret, cuuidCourant)
        if(!etatPret || !userId || cuuidCourant) return  // Rien a faire
        naviguerCollection('')
    }, [naviguerCollection, etatPret, cuuidCourant, userId])

    return (
        <>
            <h1>Collections</h1>

            <div>
                <Row className='fichiers-header-buttonbar'>
                    <Col xs={12} lg={7}>
                        <SectionBreadcrumb naviguerCollection={naviguerCollection} />
                    </Col>

                    <Col xs={12} lg={5} className="buttonbars">
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
                setContextuel={setContextuel} />
        </>
    )

}

export default NavigationCollections

// function NavigationFavoris(props) {

//     const { erreurCb } = props

//     // const workers = useWorkers()
//     // const liste = useSelector(state => state.fichiers.liste)
//     // const cuuidCourant = useSelector(state => state.fichiers.cuuid)

//     // const [ favoris, setFavoris ] = useState('')
//     const [ colonnes, setColonnes ] = useState('')
//     // const [ breadcrumb, setBreadcrumb ] = useState([])
//     // const [ cuuidCourant, setCuuidCourant ] = useState('')
//     // const [ liste, setListe ] = useState([])
//     const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
//     const [ selection, setSelection ] = useState('')
//     const [ tuuidSelectionne, setTuuidSelectionne ] = useState('')
//     const [ modeView, setModeView ] = useState('')
//     const [ showPreview, setShowPreview ] = useState(false)
//     //const [ support, setSupport ] = useState({})
//     const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
//     const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
//     const [ showCopierModal, setShowCopierModal ] = useState(false)
//     const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
//     const [ showInfoModal, setShowInfoModal ] = useState(false)
//     const [ showRenommerModal, setShowRenommerModal ] = useState(false)
//     // const [ isListeComplete, setListeComplete ] = useState(false)
//     // const [ chargementListeEnCours, setChargementListeEnCours ] = useState(true)
//     const [ afficherVideo, setAfficherVideo ] = useState(false)

//     // Event handling
//     // const [ evenementFichier, addEvenementFichier ] = useState('')        // Pipeline d'evenements fichier
//     // const [ evenementCollection, addEvenementCollection ] = useState('')  // Pipeline d'evenements de collection
//     // const [ evenementContenuCollection, addEvenementContenuCollection ] = useState('')
//     // const [ evenementContenuFavoris, addEvenementContenuFavoris ] = useState('')
//     // const evenementFichierCb = useMemo(()=>comlinkProxy(evenement=>addEvenementFichier(evenement)), [addEvenementFichier])
//     // const evenementCollectionCb = useMemo(()=>comlinkProxy(evenement=>addEvenementCollection(evenement)), [addEvenementCollection])
//     // const evenementContenuCollectionCb = useMemo(()=>comlinkProxy(evenement=>addEvenementContenuCollection(evenement)), [addEvenementContenuCollection])
//     // const evenementContenuFavorisCb = useMemo(()=>comlinkProxy(evenement=>addEvenementContenuFavoris(evenement)), [addEvenementContenuFavoris])
//     // useEffect(()=>evenementFichierCb(etatTransfert), [etatTransfert, evenementFichierCb])

//     // Extraire tri pour utiliser comme trigger pour useEffect
//     // const triColonnes = useMemo(()=>colonnes?colonnes.tri||{}:{}, [colonnes])

//     // Callbacks
//     // const showSupprimerModalOuvrir = useCallback(()=>{ setShowSupprimerModal(true) }, [setShowSupprimerModal])
//     // const showSupprimerModalFermer = useCallback(()=>{ setShowSupprimerModal(false) }, [setShowSupprimerModal])
//     // const showCopierModalOuvrir = useCallback(()=>{ setShowCopierModal(true) }, [setShowCopierModal])
//     // const showCopierModalFermer = useCallback(()=>{ setShowCopierModal(false) }, [setShowCopierModal])
//     // const showDeplacerModalOuvrir = useCallback(()=>{ setShowDeplacerModal(true) }, [setShowDeplacerModal])
//     // const showDeplacerModalFermer = useCallback(()=>{ setShowDeplacerModal(false) }, [setShowDeplacerModal])
//     // const showInfoModalOuvrir = useCallback(()=>{ setShowInfoModal(true) }, [setShowInfoModal])
//     // const showInfoModalFermer = useCallback(()=>{ setShowInfoModal(false) }, [setShowInfoModal])
//     // const showRenommerModalOuvrir = useCallback(()=>{ setShowRenommerModal(true) }, [setShowRenommerModal])
//     // const showRenommerModalFermer = useCallback(()=>{ setShowRenommerModal(false) }, [setShowRenommerModal])

//     // const showPreviewAction = useCallback( tuuid => {
//     //     setTuuidSelectionne(tuuid)
//     //     setShowPreview(true)
//     // }, [setShowPreview, setTuuidSelectionne])

//     // const onDoubleClick = useCallback((event, value)=>{
//     //     window.getSelection().removeAllRanges()
//     //     // console.debug("Ouvrir %O (liste courante: %O)", value, liste)
//     //     if(value.folderId) {
//     //         const folderItem = liste.filter(item=>item.folderId===value.folderId).pop()
//     //         setBreadcrumb([...breadcrumb, folderItem])
//     //         setCuuidCourant(value.folderId)
//     //     } else {
//     //         // Determiner le type de fichier
//     //         const fileItem = liste.filter(item=>item.fileId===value.fileId).pop()
//     //         const mimetype = fileItem.mimetype || ''
//     //         console.debug("Choisir tuuid %s (%s) : %O", value.fileId, mimetype, fileItem)
//     //         if(mimetype.startsWith('video/')) {
//     //             // Page Video
//     //             setAfficherVideo(value.fileId)
//     //         } else {
//     //             // Preview/carousel
//     //             showPreviewAction(value.fileId)
//     //         }
//     //     }
//     // }, [liste, setCuuidCourant, breadcrumb, setBreadcrumb, showPreviewAction])

//     // const onSelectionLignes = useCallback(selection=>{setSelection(selection)}, [setSelection])
//     // const onSelectionThumbs = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])

//     // const fermerContextuel = useCallback(()=>{
//     //     setContextuel(false)
//     // }, [setContextuel])

//     // const setBreadcrumbIdx = useCallback( idx => {
//     //     // Tronquer la breadcrumb pour revenir a un folder precedent
//     //     setAfficherVideo(false)
//     //     setShowInfoModal(false)

//     //     const breadcrumbTronquee = breadcrumb.filter((_, idxItem)=>idxItem<=idx)
//     //     setBreadcrumb(breadcrumbTronquee)

//     //     // Set nouveau cuuid courant
//     //     if(idx >= 0) setCuuidCourant(breadcrumbTronquee[idx].folderId)
//     //     else setCuuidCourant('')  // Racine des favoris
//     // }, [breadcrumb, setBreadcrumb, setCuuidCourant, setAfficherVideo, setShowInfoModal])

//     // Event pour bloquer onClick sur dropzone (panneau background)
//     // const onClickBack = useCallback(event=>{
//     //     event.stopPropagation()
//     //     event.preventDefault()
//     // }, [])

//     // Dropzone
//     // const onDrop = useCallback( acceptedFiles => {
//     //     if(!cuuidCourant) {
//     //         console.error("Cuuid non selectionne (favoris actif)")
//     //         return
//     //     }
//     //     uploaderFichiers(workers, cuuidCourant, acceptedFiles, {erreurCb})
//     // }, [workers, cuuidCourant, erreurCb])
//     // const dzHook = useDropzone({onDrop})
//     // const {getRootProps, getInputProps, open: openDropzone} = dzHook
//     // Fin Dropzone

//     // const uploaderFichiersAction = useCallback(event=>{
//     //     event.stopPropagation()
//     //     event.preventDefault()
//     //     openDropzone()
//     // }, [openDropzone])

//     // const suivantCb = useCallback( opts => {
//     //     opts = opts || {}
//     //     const limit = opts.limit || 50,
//     //           deuxiemeBatch = opts.deuxiemeBatch || false
//     //     if(!cuuidCourant) {
//     //         // Favoris - on n'a pas de suivant pour favoris
//     //     } else if(etatConnexion) {
//     //         chargerCollection(workers, cuuidCourant, usager, {listeCourante: liste, limit, tri: triColonnes})
//     //             .then(resultat=>{
//     //                 console.debug("Resultat 1 : %O", resultat)
//     //                 setListe(resultat.data)
//     //                 setListeComplete(resultat.estComplet?true:false)
//     //                 // if(deuxiemeBatch || !resultat.estComplet) {
//     //                 //     return chargerCollection(
//     //                 //         workers, cuuidCourant, usager, {listeCourante: liste, limit: deuxiemeBatch, tri: triColonnes})
//     //                 // }
//     //             })
//     //             // .then(resultat => {
//     //             //     if(resultat) {  // Deuxieme batch est optionnelle
//     //             //         console.debug("Resultat 2 : %O", resultat)
//     //             //         setListe(resultat.data)
//     //             //         setListeComplete(resultat.estComplet)
//     //             //     }
//     //             // })
//     //             .catch(erreurCb)
//     //     }
//     // }, [workers, liste, cuuidCourant, etatConnexion, usager, triColonnes, setListe, setListeComplete, erreurCb])

//     // const enteteOnClickCb = useCallback(colonne=>{
//     //     // console.debug("Click entete nom colonne : %s", colonne)
//     //     const triCourant = {...colonnes.tri}
//     //     const colonnesCourant = {...colonnes}
//     //     const colonneCourante = triCourant.colonne
//     //     let ordre = triCourant.ordre || 1
//     //     if(colonne === colonneCourante) {
//     //         // Toggle direction
//     //         ordre = ordre * -1
//     //     } else {
//     //         ordre = 1
//     //     }
//     //     colonnesCourant.tri = {colonne, ordre}
//     //     // console.debug("Sort key maj : %O", colonnesCourant)
//     //     setColonnes(colonnesCourant)
//     // }, [colonnes, setColonnes])
    
//     // Preparer format des colonnes
//     useEffect(()=>{ setColonnes(preparerColonnes()) }, [setColonnes])

//     // Chargement initial des favoris
//     // useEffect(()=>{ 
//     //     if(etatConnexion && etatAuthentifie) {
//     //         chargerFavoris(workers, setFavoris) 
//     //             .finally(()=>setChargementListeEnCours(false))
//     //     }
//     // }, [workers, etatConnexion, etatAuthentifie, setFavoris])

//     // Preparer donnees a afficher dans la liste
//     // useEffect(()=>{
//     //     if(!favoris || !etatConnexion) return  // Rien a faire
//     //     if(!cuuidCourant) {
//     //         // Utiliser liste de favoris
//     //         setListe( preprarerDonnees(favoris, workers, {tri: triColonnes}) )
//     //     } else {
//     //         setChargementListeEnCours(true)
//     //             if(etatConnexion) {
//     //                 chargerCollection(workers, cuuidCourant, usager, {tri: triColonnes})
//     //                 .then(resultat=>{
//     //                     setListe(resultat.data)
//     //                     setListeComplete(resultat.estComplet)
//     //                 })
//     //                 .catch(erreurCb)
//     //                 .finally(()=>{setChargementListeEnCours(false)})
//     //             }
//     //     }
//     // }, [workers, usager, etatConnexion, favoris, triColonnes, setListe, cuuidCourant, setListeComplete, setChargementListeEnCours, erreurCb])
    
//     // Detect support divers de l'appareil/navigateur
//     //useEffect(()=>{detecterSupport(setSupport)}, [setSupport])

//     // useEffect(()=>{
//     //     if(!evenementFichierCb) return
//     //     if(cuuidCourant && etatConnexion && etatAuthentifie) {
//     //         enregistrerEvenementsFichiersCollection(workers, cuuidCourant, evenementFichierCb)
//     //             .catch(err=>console.warn("Erreur enregistrement listeners majFichier : %O", err))
//     //         return () => {
//     //             retirerEvenementsFichiersCollection(workers, cuuidCourant, evenementFichierCb)
//     //                 .catch(err=>console.debug("Erreur retrait listeners majFichier : %O", err))
//     //         }
//     //     }
//     // }, [workers, cuuidCourant, etatConnexion, etatAuthentifie, evenementFichierCb])

//     // useEffect(()=>{
//     //     if(evenementFichier) {
//     //         if(evenementFichier.upload) {
//     //             mapperUploadFichier(workers, evenementFichier.upload, liste, cuuidCourant, setListe)
//     //         } else {
//     //             if(cuuidCourant) {
//     //                 mapperEvenementFichier(workers, evenementFichier, liste, cuuidCourant, setListe)
//     //             } else { // Favoris
//     //                 mapperEvenementFichier(workers, evenementFichier, favoris, cuuidCourant, setFavoris)
//     //             }
//     //         }
//     //         addEvenementFichier('')  // Vider liste evenements
//     //     }
//     // }, [workers, liste, favoris, evenementFichier, cuuidCourant, setListe, setFavoris, addEvenementFichier])

//     // useEffect(()=>{
//     //     const {connexion} = workers
//     //     if(!evenementCollectionCb) return
//     //     if(liste && etatConnexion && etatAuthentifie) {
//     //         const cuuids = liste.filter(item=>item.folderId).map(item=>item.folderId)
//     //         if(cuuidCourant) cuuids.push(cuuidCourant)  // Folder courant
//     //         // console.debug("enregistrerCallbackMajCollections %O", cuuids)
//     //         connexion.enregistrerCallbackMajCollections({cuuids}, evenementCollectionCb)
//     //             .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
//     //         return () => {
//     //             connexion.retirerCallbackMajCollections({cuuids}, evenementCollectionCb)
//     //                 .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
//     //         }
//     //     }
//     // }, [workers, evenementCollectionCb, cuuidCourant, liste, etatConnexion, etatAuthentifie])

//     // useEffect(()=>{
//     //     if(evenementCollection) {
//     //         console.debug("Evenement collection : %O", evenementCollection)
//     //         if(cuuidCourant) {
//     //             mapperEvenementCollection(evenementCollection, liste, setListe)
//     //         } else {
//     //             mapperEvenementCollection(evenementCollection, favoris, setFavoris, {favoris: true})
//     //         }
//     //         addEvenementCollection('')  // Vider liste evenements
//     //     }
//     // }, [cuuidCourant, favoris, liste, setFavoris, setListe, evenementCollection, addEvenementCollection])

//     // useEffect(()=>{
//     //     const {connexion} = workers
//     //     if(!evenementContenuCollectionCb) return
//     //     if(cuuidCourant && etatConnexion && etatAuthentifie) {
//     //         connexion.enregistrerCallbackMajContenuCollection({cuuid: cuuidCourant}, evenementContenuCollectionCb)
//     //             .catch(err=>console.warn("Erreur enregistrement listeners maj contenu collection : %O", err))
//     //         return () => {
//     //             connexion.retirerCallbackMajContenuCollection({cuuid: cuuidCourant}, evenementContenuCollectionCb)
//     //                 .catch(err=>console.warn("Erreur retirer listeners maj contenu collection : %O", err))
//     //         }
//     //     }

//     // }, [workers, etatConnexion, etatAuthentifie, cuuidCourant, evenementContenuCollectionCb])

//     // useEffect(()=>{
//     //     const {connexion} = workers
//     //     if(!evenementContenuFavorisCb) return
//     //     if(etatConnexion && etatAuthentifie) {
//     //         connexion.enregistrerCallbackMajContenuCollection({cuuid: userId}, evenementContenuFavorisCb)
//     //             .catch(err=>console.warn("Erreur enregistrement listeners maj contenu favoris : %O", err))
//     //         return () => {
//     //             connexion.retirerCallbackMajContenuCollection({cuuid: userId}, evenementContenuFavorisCb)
//     //                 .catch(err=>console.warn("Erreur retirer listeners maj contenu favoris : %O", err))
//     //         }
//     //     }

//     // }, [workers, etatConnexion, etatAuthentifie, userId, evenementContenuFavorisCb])

//     // useEffect(()=>{
//     //     if(evenementContenuCollection) {
//     //         // console.debug("Recu evenementContenuCollection : %O", evenementContenuCollection)
//     //         mapperEvenementContenuCollection(workers, evenementContenuCollection, liste, setListe, addEvenementFichier)
//     //         addEvenementContenuCollection('')
//     //     }
//     // }, [workers, evenementContenuCollection, addEvenementContenuCollection, liste, setListe, addEvenementFichier])

//     // useEffect(()=>{
//     //     if(evenementContenuFavoris) {
//     //         // console.debug("Recu evenementContenuFavoris : %O", evenementContenuFavoris)
//     //         mapperEvenementContenuCollection(workers, evenementContenuFavoris, favoris, setFavoris, addEvenementFichier, {favoris: true})
//     //         addEvenementContenuFavoris('')
//     //     }
//     // }, [workers, evenementContenuFavoris, favoris, setFavoris, addEvenementContenuFavoris, addEvenementFichier])

//     return (
//         // <div {...getRootProps({onClick: onClickBack})}>
//         //     <input {...getInputProps()} />
//         <div>
//             <Row className='fichiers-header-buttonbar'>
//                 <Col xs={12} lg={7}>
//                     {/* <SectionBreadcrumb value={breadcrumb} setIdx={setBreadcrumbIdx} /> */}
//                 </Col>

//                 <Col xs={12} lg={5} className="buttonbars">
//                     {/* <BoutonsFormat modeView={modeView} setModeView={setModeView} />
//                     <BoutonsUpload 
//                         cuuid={cuuidCourant}
//                         uploaderFichiersAction={uploaderFichiersAction} 
//                         setShowCreerRepertoire={setShowCreerRepertoire}
//                     /> */}
//                 </Col>
//             </Row>

//             <Suspense fallback={<p>Loading ...</p>}>
//                 <AffichagePrincipal 
//                     modeView={modeView}
//                     colonnes={colonnes}
//                     // liste={liste} 
//                     // onDoubleClick={onDoubleClick}
//                     onContextMenu={onContextMenu}
//                     setContextuel={setContextuel}
//                     // onSelectionLignes={onSelectionLignes}
//                     // onClickEntete={enteteOnClickCb}
//                     // cuuidCourant={cuuidCourant}
//                     // isListeComplete={isListeComplete}
//                     // suivantCb={suivantCb}
//                     tuuidSelectionne={tuuidSelectionne}
//                     afficherVideo={afficherVideo}
//                     setAfficherVideo={setAfficherVideo}
//                     // support={support}
//                     // showInfoModalOuvrir={showInfoModalOuvrir}
//                 />
//             </Suspense>

//             {/* <InformationListe 
//                 favoris={favoris}
//                 liste={liste} 
//                 cuuid={cuuidCourant} 
//                 chargementListeEnCours={chargementListeEnCours} />

//             <MenuContextuelFavoris 
//                 workers={props.workers}
//                 contextuel={contextuel} 
//                 fermerContextuel={fermerContextuel}
//                 fichiers={liste}
//                 tuuidSelectionne={tuuidSelectionne}
//                 selection={selection}
//                 showPreview={showPreviewAction}
//                 usager={usager}
//                 showSupprimerModalOuvrir={showSupprimerModalOuvrir}
//                 showCopierModalOuvrir={showCopierModalOuvrir}
//                 showDeplacerModalOuvrir={showDeplacerModalOuvrir}
//                 showInfoModalOuvrir={showInfoModalOuvrir}
//                 showRenommerModalOuvrir={showRenommerModalOuvrir}
//                 cuuid={cuuidCourant}
//                 downloadAction={downloadAction}
//                 etatConnexion={etatConnexion}
//                 etatAuthentifie={etatAuthentifie}
//             />

//             <PreviewFichiers 
//                 workers={workers}
//                 showPreview={showPreview} 
//                 setShowPreview={setShowPreview}
//                 tuuidSelectionne={tuuidSelectionne}
//                 fichiers={liste}
//                 support={support}
//             />

//             <ModalCreerRepertoire 
//                 show={showCreerRepertoire} 
//                 cuuid={cuuidCourant}
//                 fermer={()=>{setShowCreerRepertoire(false)}} 
//                 workers={workers}
//             />

//             <SupprimerModal
//                 show={showSupprimerModal}
//                 fermer={showSupprimerModalFermer}
//                 fichiers={liste}
//                 selection={selection}
//                 workers={workers}
//             />

//             <CopierModal 
//                 show={showCopierModal} 
//                 fermer={showCopierModalFermer}
//                 favoris={favoris}
//                 selection={selection}
//                 workers={workers}
//             />

//             <DeplacerModal 
//                 show={showDeplacerModal} 
//                 fermer={showDeplacerModalFermer}
//                 favoris={favoris}
//                 cuuid={cuuidCourant}
//                 selection={selection}
//                 workers={workers}
//             />

//             <InfoModal 
//                 show={showInfoModal} 
//                 fermer={showInfoModalFermer}
//                 fichiers={liste}
//                 selection={selection}
//                 workers={workers}
//                 support={support}
//                 downloadAction={downloadAction}
//                 etatConnexion={etatConnexion}
//                 etatAuthentifie={etatAuthentifie}
//                 usager={usager}
//             />

//             <RenommerModal
//                 show={showRenommerModal} 
//                 fermer={showRenommerModalFermer}
//                 fichiers={liste}
//                 selection={selection}
//                 workers={workers}
//             /> */}

//         </div>
//     )
// }

function AffichagePrincipal(props) {

    const {
        modeView, 
        tuuidSelectionne, 
        naviguerCollection,
        showPreviewAction,
        setContextuel, 
        enteteOnClickCb,
        afficherVideo, setAfficherVideo, showInfoModalOuvrir
    } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const liste = useSelector(state => state.fichiers.liste)

    // const mapperDocument = useMemo(()=>{
    //     return (item, idx) => mapDocumentComplet(workers, item, idx)
    // }, [workers])

    // const liste = useMemo(()=>{
    //     if(!listeBrute) return []
    //     return listeBrute.map(mapperDocument)
    // }, [workers, listeBrute])

    // console.debug("Liste fichiers : %O", liste)
    // const cuuidCourant = useSelector(state => state.fichiers.cuuid)

    const colonnes = useMemo(()=>preparerColonnes(workers), [workers])

    const onSelectionLignes = useCallback(selection=>{
        // console.debug("Selection lignes : ", selection)
        // setSelection(selection)
        dispatch(selectionTuuids(selection))
    }, [dispatch])
    // const onSelectionThumbs = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])
    const fermerAfficherVideo = useCallback(()=>setAfficherVideo(false), [setAfficherVideo])
    const onContextMenuClick = useCallback((event, value)=>{
        // console.debug("onContextMenuClick event %O, value %O", event, value)
        onContextMenu(event, value, setContextuel)
    }, [setContextuel])

    const onDoubleClick = useCallback( (event, value) => {
        // console.debug("Double click event %O : value %O", event, value)
        const dataset = event.currentTarget.dataset
        // console.debug("Dataset : ", dataset)
        window.getSelection().removeAllRanges()
        
        const folderId = value.folderId || dataset.folderId
        const fileId = value.fileId || dataset.fileId

        if(folderId) naviguerCollection(folderId)
        else if(fileId) showPreviewAction(fileId)

    }, [naviguerCollection, showPreviewAction])

    if(afficherVideo) {
        // console.debug("AffichagePrincipal PROPPIES : %O", props)
        const fileItem = liste.filter(item=>item.fileId===afficherVideo).pop()
        return (
            <AfficherVideo
                fichier={fileItem}
                tuuidSelectionne={tuuidSelectionne}
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
        console.debug("HandlerEvenements listener collection connexion %O, etatPret %O, userId %O, cuuid %O", connexion, etatPret, userId, cuuid)
        if(!connexion || !etatPret) return  // Pas de connexion, rien a faire

        // Enregistrer listeners
        console.debug("HandlerEvenements Enregistrer listeners collection ", cuuid)
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
            console.debug("HandlerEvenements Retirer listeners collection ", cuuid)
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
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    // const [ showCopierModal, setShowCopierModal ] = useState(false)
    // const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])
    const showSupprimerModalOuvrir = useCallback(()=>setShowSupprimerModal(true), [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>setShowSupprimerModal(false), [setShowSupprimerModal])
    const showRenommerModalOuvrir = useCallback(()=>setShowRenommerModal(true), [setShowRenommerModal])
    const showRenommerModalFermer = useCallback(()=>setShowRenommerModal(false), [setShowRenommerModal])
    const showInfoModalOuvrir = useCallback(()=>setShowInfoModal(true), [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>setShowInfoModal(false), [setShowInfoModal])

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
                // showCopierModalOuvrir={showCopierModalOuvrir}
                // showDeplacerModalOuvrir={showDeplacerModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
                cuuid={cuuid}
                // downloadAction={downloadAction}
                etatConnexion={etatPret}
                etatAuthentifie={etatPret}
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

            {/* <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                favoris={favoris}
                selection={selection}
                workers={workers}
            /> */}

            {/* <DeplacerModal 
                show={showDeplacerModal} 
                fermer={showDeplacerModalFermer}
                favoris={favoris}
                cuuid={cuuidCourant}
                selection={selection}
                workers={workers}
            /> */}

            <InfoModal 
                show={showInfoModal} 
                fermer={showInfoModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
                // downloadAction={downloadAction}
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
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)

    const { connexion } = workers

    const [ nomCollection, setNomCollection ] = useState('')

    const changerNomCollection = useCallback(event=>{
        const value = event.currentTarget.value
        setNomCollection(value)
    }, [setNomCollection])

    const creerCollection = useCallback(event=>{
        event.preventDefault()
        event.stopPropagation()

        const opts = {}
        if(cuuidCourant) opts.cuuid = cuuidCourant
        else opts.favoris = true

        connexion.creerCollection(nomCollection, opts)
            .then(()=>{
                setNomCollection('')  // Reset
                fermer()
            })
            .catch(err=>{
                console.error("Erreur creation collection : %O", err)
            })
    }, [connexion, nomCollection, cuuidCourant, setNomCollection, fermer])

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
            dispatch(breadcrumbSlice(level))
            try {
                naviguerCollection(tuuid)
                    .catch(err=>console.error("SectionBreadcrumb Erreur navigation ", err))
            } catch(err) {
                console.error("handlerSliceBreadcrumb Erreur naviguerCollection %s: ", tuuid, err)
            }
        } else {
            try {
                naviguerCollection()
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
            {/* <Button 
                variant="secondary" 
                className="individuel"
                onClick={uploaderFichiersAction}
                disabled={!cuuid}
            >
                <i className="fa fa-plus"/> Fichier
            </Button> */}
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

    const upload = useCallback( acceptedFiles => {
        console.debug("Files : %O pour usager: %O", acceptedFiles, usager)
        
        setPreparationUploadEnCours(0)  // Debut preparation

        // new Promise(resolve=>{
        //     setTimeout(resolve, 1000)
        // })
        // .then(()=>{
            traitementFichiers.traiterAcceptedFiles(dispatch, usager, cuuid, acceptedFiles, {setProgres: setPreparationUploadEnCours})
                .then(uploads=>{
                    // const correlationIds = uploads.map(item=>item.correlation)
                    // return dispatch(demarrerUploads(workers, correlationIds))
                })
                .catch(err=>console.error("Erreur fichiers : %O", err))
                .finally( () => setPreparationUploadEnCours(false) )
        // })
    }, [setPreparationUploadEnCours, traitementFichiers, dispatch, usager, cuuid])

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

// function trierNom(a, b) {
//     const nomA = a.nom?a.nom:'',
//           nomB = b.nom?b.nom:''
//     if(nomA === nomB) return 0
//     if(!nomA) return 1
//     if(!nomB) return -1
//     return nomA.localeCompare(nomB)
// }

// function trierTaille(a, b) {
//     const nomA = a.nom?a.nom:'',
//           nomB = b.nom?b.nom:''
//     const tailleA = a.taille?a.taille:0,
//           tailleB = b.taille?b.taille:0
//     if(tailleA !== tailleB) {
//         return tailleA - tailleB
//     }
//     if(nomA === nomB) return 0
//     if(!nomA) return 1
//     if(!nomB) return -1
//     return nomA.localeCompare(nomB)
// }

// function trierDateAjout(a, b) {
//     const nomA = a.nom?a.nom:'',
//           nomB = b.nom?b.nom:''
//     const dateAjoutA = a.dateAjout?a.dateAjout:0,
//           dateAjoutB = b.dateAjout?b.dateAjout:0
//     if(dateAjoutA !== dateAjoutB) {
//         return dateAjoutA - dateAjoutB
//     }
//     if(nomA === nomB) return 0
//     if(!nomA) return 1
//     if(!nomB) return -1
//     return nomA.localeCompare(nomB)
// }

// function trierMimetype(a, b) {
//     const nomA = a.nom?a.nom:'',
//           nomB = b.nom?b.nom:''
//     const mimetypeA = a.mimetype?a.mimetype:'',
//           mimetypeB = b.mimetype?b.mimetype:''
//     if(mimetypeA !== mimetypeB) {
//         if(!mimetypeA) return 1
//         if(!mimetypeB) return -1
//         return mimetypeA.localeCompare(mimetypeB)
//     }
//     if(nomA === nomB) return 0
//     if(!nomA) return 1
//     if(!nomB) return -1
//     return nomA.localeCompare(nomB)
// }

// function preprarerDonnees(liste, workers, opts) {
//     opts = opts || {}
//     const tri = opts.tri || {}

//     const listeMappee = liste.map(item=>mapper(item, workers))

//     let triFunction = null
//     switch(tri.colonne) {
//         case 'nom': triFunction = trierNom; break
//         case 'taille': triFunction = trierTaille; break
//         case 'mimetype': triFunction = trierMimetype; break
//         case 'dateAjout': triFunction = trierDateAjout; break
//         default: triFunction = null
//     }

//     if(triFunction) {
//         listeMappee.sort(triFunction)
//         if(tri.ordre < 0) {
//             listeMappee.reverse()
//         }
//     }

//     return listeMappee
// }

function MenuContextuel(props) {

    const { contextuel, selection } = props

    const workers = useWorkers()
    const fichiers = useSelector(state => state.fichiers.liste)

    if(!contextuel.show) return ''

    if(selection && fichiers) {
        console.debug("Selection : ", selection)
        if( selection.length > 1 ) {
            return <MenuContextuelMultiselect {...props} workers={workers} />
        } else if( selection.length === 1 ) {
            const fichierTuuid = selection[0]
            const fichier = fichiers.filter(item=>item.tuuid===fichierTuuid).pop()
            if(fichier) {
                if(fichier.mimetype && fichier.mimetype !== 'Repertoire') {
                    return <MenuContextuelFichier {...props} workers={workers} fichier={fichier} />
                } else {
                    return <MenuContextuelRepertoire {...props} workers={workers} repertoire={fichier} />
                }
            }
        }
    }

    return ''
}


// async function chargerFavoris(workers, setFavoris) {
//     // console.debug("Charger favoris")
//     const { connexion } = workers
//     try {
//         const messageFavoris = await connexion.getFavoris()
//         const favoris = messageFavoris.favoris || {}
//         // console.debug("Favoris recus : %O", favoris)
//         setFavoris(favoris)
//     } catch(err) {
//         console.error("Erreur chargement favoris : %O", err)
//     }
// }

// async function chargerCollection(workers, cuuid, usager, opts) {
//     opts = opts || {}
//     const { listeCourante, tri } = opts
//     const limit = opts.limit || 20

//     let sort_keys = null
//     if(tri) {
//         let nomColonne
//         switch(tri.colonne) {
//             case 'nom': nomColonne = 'nom'; break
//             case 'taille': nomColonne = 'version_courante.taille'; break
//             case 'mimetype': nomColonne = 'mimetype'; break
//             case 'dateAjout': nomColonne = '_mg-creation'; break
//             default: nomColonne = null
//         }

//         if(nomColonne) {
//             sort_keys = [{colonne: nomColonne, ordre: tri.ordre}]
//         }
//     }

//     let skip = 0
//     if(listeCourante) {
//         skip = listeCourante.length
//     }

//     // console.debug("Charger collection %s (offset: %s)", cuuid, skip)
//     const { connexion, chiffrage } = workers
//     const reponse = await connexion.getContenuCollection(cuuid, {skip, limit, sort_keys})
//     // console.debug("Reponse contenu collection : %O", reponse)
//     const { documents } = reponse

//     // Precharger les cles des images thumbnails, small et posters
//     const fuuidsImages = documents.map(item=>{
//         const { version_courante } = item
//         if(version_courante && version_courante.images) {
//             const fuuidsImages = Object.keys(version_courante.images)
//                 .filter(item=>['thumb', 'thumbnail', 'poster', 'small'].includes(item))
//                 .map(item=>version_courante.images[item].hachage)
//                 .reduce((arr, item)=>{arr.push(item); return arr}, [])
//             return fuuidsImages
//         }
//         return []
//     }).reduce((arr, item)=>{
//         return [...arr, ...item]
//     }, [])
//     // console.debug("Fuuids images : %O", fuuidsImages)

//     // Verifier les cles qui sont deja connues
//     let fuuidsInconnus = []
//     for await (const fuuid of fuuidsImages) {
//         const cleFichier = await usagerDao.getCleDechiffree(fuuid)
//         if(!cleFichier) fuuidsInconnus.push(fuuid)
//     }

//     if(fuuidsInconnus.length > 0) {
//         // console.debug("Get cles manquantes pour fuuids %O", fuuidsInconnus)
//         connexion.getClesFichiers(fuuidsInconnus, usager)
//             .then(async reponse=>{
//                 // console.debug("Reponse dechiffrage cles : %O", reponse)

//                 for await (const fuuid of Object.keys(reponse.cles)) {
//                     const cleFichier = reponse.cles[fuuid]
//                     // console.debug("Dechiffrer cle %O", cleFichier)
//                     const cleSecrete = await chiffrage.dechiffrerCleSecrete(cleFichier.cle)
//                     cleFichier.cleSecrete = cleSecrete
//                     // console.debug("Cle secrete fichier %O", cleFichier)
//                     usagerDao.saveCleDechiffree(fuuid, cleSecrete, cleFichier)
//                         .catch(err=>{
//                             console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
//                         })
//                 }
            
//             })
//             .catch(err=>{console.error("Erreur chargement cles fichiers %O : %O", fuuidsInconnus, err)})
//     } else {
//         // console.debug("Toutes les cles sont deja chargees")
//     }

//     let liste = listeCourante || [],
//         estComplet = false
//     if(documents) {
//         const nouveauxFichiers = preprarerDonnees(documents, workers)
//         if(nouveauxFichiers.length === 0) {
//             // Aucuns fichiers ajoutes, on a la liste au complet
//             estComplet = true
//         }
//         // console.debug("chargerCollection donnees recues : %O", nouveauxFichiers)
//         // setListe( data )
//         liste = [...liste, ...nouveauxFichiers]  // Concatener
//     }

//     return {data: liste, estComplet}
// }

// async function enregistrerEvenementsFichiersCollection(workers, cuuid, callback) {
//     const { connexion } = workers
//     try {
//         // const tuuids = liste.filter(item=>item.fileId).map(item=>item.fileId)
//         await connexion.enregistrerCallbackMajFichierCollection({cuuids: [cuuid]}, callback)
//     } catch (err) {
//         console.error("Erreur enregistrerCallbackMajFichier : %O", err)
//     }
// }

// async function retirerEvenementsFichiersCollection(workers, cuuid, callback) {
//     const { connexion } = workers
//     try {
//         // const tuuids = liste.filter(item=>item.fileId).map(item=>item.fileId)
//         await connexion.retirerCallbackMajFichierCollection({cuuids: [cuuid]}, callback)
//     } catch (err) {
//         console.error("Erreur retirerEvenementsFichiers : %O", err)
//     }
// }

// function mapperEvenementFichier(workers, evenementFichier, liste, cuuidCourant, setListe) {
//     const message = evenementFichier.message
//     const tuuid = message.tuuid
//     const tuuidsInclus = {}
//     const listeMaj = liste
//         .filter(item=>{
//             // Detecter retrait/supprime
//             const tuuidItem = item.fileId
//             if(tuuidItem === tuuid) {
//                 if(message.supprime === true) return false  // Fichier supprime
//                 if(cuuidCourant) {
//                     if(!message.cuuids.includes(cuuidCourant)) return false  // Fichier retire de la collection
//                 } else { // Favoris
//                     if(message.favoris !== true) return false
//                 }
//                 if(tuuidsInclus[tuuidItem]) return false // Duplicata
//             }
//             tuuidsInclus[tuuidItem] = true
//             return true  // Conserver le fichier
//         })
//         .map(item=>{
//             const tuuidItem = item.fileId
//             if(tuuidItem === tuuid) {
//                 return mapper(message, workers)
//             }
//             return item
//         })

//     if(!tuuidsInclus[tuuid] && evenementFichier.nouveau) {
//         listeMaj.push(mapper(message, workers))
//     }

//     setListe(listeMaj)
// }

// function mapperUploadFichier(workers, evenement, liste, cuuidCourant, setListe) {
//     // Determiner type evenement upload
//     const { complete } = evenement || {}
//     const uploadEnCours = evenement.uploadEnCours || {}
//     const uploadsPending = evenement.uploadsPending || []

//     let trouve = false

//     const fichierUpload = mapperUpload(uploadEnCours, evenement)

//     // Upload en cours, mettre a jour le fichier dans la liste avec progres
//     liste = liste.map(item=>{
//         const itemId = item.fileId || item.folderId
//         if(itemId !== fichierUpload.correlation) return item

//         trouve = true
//         const upload = { position: uploadEnCours.position, status: uploadEnCours.status }
//         item = {...item, ...fichierUpload, upload}
//         return item
//     })

//     if(complete) {
//         // Evenement complete (succes, erreur), retirer la correlation d'upload
//         trouve = true  // S'assurer de ne pas ajouter le fichier
//         liste = liste.filter(item=>{
//             const itemId = item.fileId || item.folderId
//             return itemId !== complete
//         })
//     }

//     if(cuuidCourant === fichierUpload.cuuid) {
//         if(fichierUpload.correlation && !trouve) {
//             // Mapper le fichier, ajouter a la liste
//             const fichierMappe = mapper(fichierUpload, workers)
//             liste.push(fichierMappe)
//         }
//     }

//     const uploadsPendingCorrelation = []
//     uploadsPending.forEach(itemPending=>{
//         uploadsPendingCorrelation.push(itemPending.correlation)
//         const fichierPending = mapperUpload(itemPending)
//         if(fichierPending.cuuid === cuuidCourant) {
//             let trouvePending = false
//             // S'assurer que le fichier est affiche
//             liste = liste.map(item=>{
//                 const itemId = item.fileId || item.folderId
//                 if(itemId !== fichierPending.correlation) return item
//                 trouvePending = true
//                 item = {...item, ...fichierPending}
//                 return item
//             })
//             if(!trouvePending) {
//                 const fichierPendingMappe = mapper(fichierPending, workers)
//                 liste.push(fichierPendingMappe)
//             }
//         }
//     })

//     // Retirer toutes les anciens pending
//     liste = liste.filter(item=>{
//         if(item.status === 1) return uploadsPendingCorrelation.includes(item.fileId||item.folderId)
//         return true
//     })

//     setListe(liste)
// }

// function mapperUpload(uploadFichier, evenement) {
//     evenement = evenement || {}
//     const correlation = evenement.encours || uploadFichier.correlation
//     const status = evenement.status || uploadFichier.status
//     const position = evenement.loadedBytes || uploadFichier.position
//     const { size, transaction } = uploadFichier || {}
//     const { cuuid, mimetype, nom, dateFichier } = transaction || {}
//     return { tuuid: correlation, status, position, size, transaction, correlation, mimetype, nom, cuuid, dateFichier }
// }

// function mapperEvenementCollection(evenementCollection, liste, setListe, opts) {
//     opts = opts || {}
//     const favoris = opts.favoris || false

//     const message = evenementCollection.message
//     const cuuid = message.tuuid
//     const { nom, securite } = message
//     let listeMaj = liste.map(item=>{
//         if(item.tuuid === cuuid) return {...item, nom, securite}
//         return item
//     })
//     if(favoris && message.favoris !== true) {
//         listeMaj = liste.filter(item=>item.tuuid !== cuuid)
//     }
//     setListe(listeMaj)
// }

// async function mapperEvenementContenuCollection(workers, evenementContenuCollection, liste, setListe, addEvenementFichier, opts) {
//     opts = opts || {}

//     const message = evenementContenuCollection.message
//     const retires = message.retires || []
//     const listeMaj = liste
//         .filter(item=>{
//             // Detecter retrait/supprime
//             const tuuidItem = item.fileId || item.folderId
//             if(retires.includes(tuuidItem)) {
//                 return false  // Retirer l'item
//             }
//             return true  // Conserver item
//         })

//     // Maj liste (retraits)
//     setListe(listeMaj)

//     // Determiner si on a des ajouts. Traitement va etre async, on utilise le meme
//     // mecanisme d'ajout que pour les evenements d'ajout de fichiers / collections.
//     let tuuids = []
//     if(message.fichiers_ajoutes) tuuids = [...tuuids, ...message.fichiers_ajoutes]
//     if(message.collections_ajoutees) tuuids = [...tuuids, ...message.collections_ajoutees]
//     const { connexion } = workers
//     if(tuuids.length > 0) {
//         const reponseDocuments = await connexion.getDocuments(tuuids)
//         const fichiers = reponseDocuments.fichiers
//         if(fichiers) {
//             fichiers.forEach(doc=>{
//                 addEvenementFichier({nouveau: true, message: doc})
//             })
//         }
//     }
// }

function PreparationModal(props) {
    const { show, progres } = props

    return (
        <Modal show={show}>
            <Modal.Header>Preparation de fichiers</Modal.Header>
            <Modal.Body>
                {show?
                    <p>Preparation en cours ... ({progres} %)</p>    
                    :
                    <p>Pret</p>
                }
            </Modal.Body>
        </Modal>
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
    console.debug("traiterCollectionEvenement ", evenement)
}

async function traiterContenuCollectionEvenement(workers, dispatch, evenement) {
    console.debug("traiterContenuCollectionEvenement ", evenement)

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
        console.debug("traiterCollectionEvenement Refresh tuuids ", tuuids)
        return dispatch(chargerTuuids(workers, tuuids))
    }

}
