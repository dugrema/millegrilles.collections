import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { proxy as comlinkProxy } from 'comlink'

import Alert from 'react-bootstrap/Alert'
import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { ListeFichiers, FormatteurTaille, FormatterDate } from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { mapDocumentComplet } from './mapperFichier'
import { MenuContextuelCorbeille, onContextMenu } from './MenuContextuel'
import useWorkers, { useEtatPret, useUsager } from './WorkerContext'

import fichiersActions, {thunks as fichiersThunks} from './redux/fichiersSlice'

function NavigationCorbeille(props) {

    const { erreurCb } = props
    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const userId = useSelector(state=>state.fichiers.userId)
    const selection = useSelector(state => state.fichiers.selection )
    const liste = useSelector(state => state.fichiers.liste )

    const [modeView, setModeView] = useState('')
    const [scrollValue, setScrollValue] = useState(0)

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
            if(cuuid) {
                dispatch(fichiersThunks.changerCollection(workers, cuuid))
                    .catch(err=>erreurCb(err, 'Erreur changer collection'))
            } else {
                // Set tri par date modification desc
                dispatch(fichiersThunks.afficherCorbeille(workers, {}))
                    .catch(err=>erreurCb(err, 'Erreur changer collection'))
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, erreurCb, setAfficherVideo])

    const onScrollHandler = useCallback( pos => setScrollValue(pos), [setScrollValue])

    // Declencher chargement initial des favoris
    useEffect(()=>{
        if(!etatPret || !userId) return  // Rien a faire
        console.debug("!!! useEffect naviguerCollection etatPret %O, userId %O, cuuidCourant %O", etatPret, userId)
        naviguerCollection('')
    }, [naviguerCollection, etatPret, userId])

    let nombreFichiers = ''
    if(liste) {
        if(liste.length > 1) {
            nombreFichiers = <span>{liste.length} fichiers</span>
        }
    }

    return (
        <>
            <h1>Corbeille</h1>

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
                    </Col>
                </Row>

                <Suspense fallback={<p>Loading ...</p>}>
                    <AffichagePrincipal 
                        modeView={modeView}
                        naviguerCollection={naviguerCollection}
                        showPreviewAction={showPreviewAction}
                        setContextuel={setContextuel}
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
                        scrollValue={scrollValue}
                        onScroll={onScrollHandler}
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
                naviguerCollection={naviguerCollection}
                erreurCb={erreurCb} />
        </>
    )

}

export default NavigationCorbeille

function AffichagePrincipal(props) {

    const {
        modeView, 
        naviguerCollection,
        showPreviewAction,
        afficherVideo, setAfficherVideo,
        afficherAudio, setAfficherAudio,
        setContextuel, 
        showInfoModalOuvrir,
        scrollValue, onScroll,
    } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const tailleAffichee = useSelector(state => state.fichiers.maxNombreAffiches)
    const liste = useSelector(state => state.fichiers.liste)
    const sortKeys = useSelector(state => state.fichiers.sortKeys)
    const selection = useSelector(state => state.fichiers.selection)
    const listeComplete = tailleAffichee?false:true
    const colonnes = useMemo(()=>preparerColonnes(workers), [workers])

    const listeAffichee = useMemo(()=>{
        if(!liste) return ''                // Liste vide
        if(!tailleAffichee) return liste    // Liste complete
        // console.debug("Liste fichiers corbeille : ", liste)
        return liste.filter((item, idx)=>idx<tailleAffichee)  // Filtre
    }, [liste, tailleAffichee])

    const colonnesEffectives = useMemo(()=>{
        const tri = {
            colonne: sortKeys.key,
            ordre: sortKeys.ordre,
        }
        //console.debug("tri pour colonnes effectives : ", tri)
        return {...colonnes, tri}
    }, [colonnes, sortKeys])

    const onSelectionLignes = useCallback(selection=>{
        dispatch(fichiersActions.selectionTuuids(selection))
    }, [dispatch])
    const onContextMenuClick = useCallback((event, value)=>{
        onContextMenu(event, value, setContextuel)
    }, [setContextuel])

    const enteteOnClickCb = useCallback(colonne=>{
        // console.debug("Entete onclick ", colonne)
        // Verifier si on toggle l'ordre
        const key = colonne
        let ordre = 1
        if(key === sortKeys.key) ordre = sortKeys.ordre * -1
        // console.debug("Trier liste : ", liste)
        dispatch(fichiersActions.setSortKeys({key, ordre}))
    }, [dispatch, sortKeys, liste])

    const suivantCb = useCallback(params => {
        // console.debug("SuivantCb ", params)
        dispatch(fichiersActions.incrementerNombreAffiches())
    }, [dispatch])    

    const onOpenHandler = useCallback(item=>{
        console.debug("Open ", item)
    }, [])

    // Default - liste fichiers
    return (
        <ListeFichiers 
            modeView={modeView}
            colonnes={colonnesEffectives}
            rows={listeAffichee} 
            selection={selection}
            onOpen={onOpenHandler}
            onContextMenu={onContextMenuClick}
            onSelect={onSelectionLignes}
            onClickEntete={enteteOnClickCb}
            suivantCb={listeComplete?'':suivantCb}
            scrollValue={scrollValue}
            onScroll={onScroll}
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
        showPreview, tuuidSelectionne, showPreviewAction, setShowPreview,
        contextuel, setContextuel, erreurCb, naviguerCollection,
    } = props
    
    const usager = useUsager()
    const etatPret = useEtatPret()
    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )

    const fermerContextuel = useCallback(()=>setContextuel({show: false, x: 0, y: 0}), [setContextuel])

    const workers = useWorkers()

    return (
        <>
            <InformationListe />

            <MenuContextuel
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                fichiers={liste}
                naviguerCollection={naviguerCollection}
                tuuidSelectionne={tuuidSelectionne}
                selection={selection}
                showPreview={showPreviewAction}
                usager={usager}
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

        </>
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
            
            <Breadcrumb.Item onClick={handlerSliceBreadcrumb}>Fichiers supprimes</Breadcrumb.Item>
            
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

function preparerColonnes(workers) {

    const rowLoader = async (item, idx) => {
        const collectionsDao = workers.collectionsDao

        // Tenter de mapper le path
        const docMappe = mapDocumentComplet(workers, item, idx)
        let supprimePath = ''
        // if(item.supprime_cuuids_path) {
        //     const tuuids = await collectionsDao.getParTuuids(item.supprime_cuuids_path)
        //     const tuuidsMappes = {}
        //     tuuids.forEach(item=>{
        //         tuuidsMappes[item.tuuid] = item
        //     })
        //     const tuuidsOrdre = item.supprime_cuuids_path.map(cuuid=>{
        //         return tuuidsMappes[cuuid].nom || cuuid
        //     })
            
        //     console.debug("!!! tuuids ", tuuids)
        //     supprimePath = '/'+tuuidsOrdre.join('/')
        // }

        let recupererPaths = []

        // Creer path pour un fichier supprime
        // if(item.map_path_cuuids) {
        //     // Fichier
        //     for await (const cuuidSupprime of item.cuuids_supprimes) {
        //         const pathComplet = item.map_path_cuuids[cuuidSupprime]
        //         const tuuids = await collectionsDao.getParTuuids(pathComplet)
        //         const tuuidsMappes = {}
        //         tuuids.forEach(item=>{
        //             tuuidsMappes[item.tuuid] = item
        //         })
        //         const tuuidsOrdre = pathComplet.map(cuuid=>{
        //             return tuuidsMappes[cuuid].nom || cuuid
        //         })
        //         tuuidsOrdre.reverse()
        //         // recupererPaths[cuuidSupprime] = '/'+tuuidsOrdre.join('/')
        //         recupererPaths.push({cuuid: cuuidSupprime, path: '/'+tuuidsOrdre.join('/')})
        //         // supprimePath = '/'+tuuidsOrdre.join('/')
        //         // break
        //     }

        // } 

        // Creer path pour un repertoire supprime
        if(['Repertoire', 'Fichier'].includes(item.type_node)) {
            // Repertoire
            const pathComplet = item.path_cuuids
            const tuuids = await collectionsDao.getParTuuids(pathComplet)
            const tuuidsMappes = {}
            tuuids.filter(item=>item).forEach(item=>{
                tuuidsMappes[item.tuuid] = item
            })
            const tuuidsOrdre = pathComplet.map(cuuid=>{
                const tuuidMappeVal = tuuidsMappes[cuuid] || {}
                return tuuidMappeVal.nom || cuuid
            })
            tuuidsOrdre.reverse()
            const cuuid = item.path_cuuids?item.path_cuuids[0]:null
            recupererPaths.push({cuuid, path: '/'+tuuidsOrdre.join('/')})
        } else if(item.type_node === 'Collection') {
            recupererPaths.push({cuuid: item.tuuid, path: '/'})
        }

        // docMappe.supprimePath = supprimePath
        docMappe.recupererPaths = recupererPaths
        return docMappe
    }

    const params = {
        ordreColonnes: ['nom', 'taille', 'supprimePath', /*'dateAjout'*/],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 5},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'supprimePath': {'label': 'Repertoire', className: 'details', formatteur: FormatterPathSupprimer, xs: 9, lg: 6},
            // 'dateAjout': {'label': 'Date modification', className: 'details', formatteur: FormatterColonneDate, xs: 5, lg: 2},
        },
        tri: {colonne: 'dateAjout', ordre: -1},
        rowLoader,
    }
    return params
}

function FormatterPathSupprimer(props) {
    const data = props.data || {}

    // const recupererPaths = data.recupererPaths

    const workers = useWorkers()

    const restorerCb = useCallback(e=>{
        const { value } = e.currentTarget
        // console.debug("Restorer tuuid %s sous cuuid %s", data.tuuid, value)
        let items = {}
        if(value === data.tuuid) {
            // C'est une collection
            items[value] = null  // Va recuperer toute la collection
        } else {
            items[value] = [data.tuuid]
        }
        workers.connexion.recupererDocuments(items)
            .then(r=>{
                console.debug("Resultat recupererDocuments : ", r)
            })
            .catch(err=>console.error("Erreur restoration fichiers : ", err))
    }, [workers, data])

    const liste = useMemo(()=>{
        if(!data.recupererPaths) return ''
        return data.recupererPaths.map((item, idx)=>{
            return (
                <Row key={idx}>
                    <Col xs={8} lg={9}>{item.path}</Col>
                    <Col xs={4} lg={3}><Button variant="dark" value={item.cuuid} onClick={restorerCb}>Recuperer</Button></Col>
                </Row>
            )
        })
    }, [data, restorerCb])

    if(!data.recupererPaths) return ''

    return (
        <div>
            {liste}
        </div>
    )
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

    const { contextuel, selection, naviguerCollection, erreurCb } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const fichiers = useSelector(state => state.fichiers.liste)
    
    const recyclerAction = useCallback(tuuids => {
        Promise.resolve().then(async ()=>{
            for await (const tuuid of tuuids) {
                await dispatch(fichiersThunks.restaurerFichier(workers, tuuid))
            }
            // naviguerCollection('')  // Reload ecran
        })
    }, [workers, dispatch, fichiers, naviguerCollection])

    if(!contextuel.show) return ''

    if(selection && fichiers) {
        // console.debug("Selection : ", selection)
        return <MenuContextuelCorbeille {...props} workers={workers} onRecuperer={recyclerAction} />
        // if( selection.length > 1 ) {
        //     return <MenuContextuelMultiselect {...props} workers={workers} />
        // } else if( selection.length === 1 ) {
        //     const fichierTuuid = selection[0]
        //     const fichier = fichiers.filter(item=>item.tuuid===fichierTuuid).pop()
        //     if(fichier) {
        //         if(fichier.mimetype && fichier.mimetype !== 'Repertoire') {
        //             return <MenuContextuelCorbeille {...props} workers={workers} fichier={fichier} downloadAction={downloadAction} />
        //         } else {
        //             return <MenuContextuelRepertoire {...props} workers={workers} repertoire={fichier} downloadAction={downloadAction} />
        //         }
        //     }
        // }
    }

    return ''
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
                        <Alert.Heading>Aucuns fichiers</Alert.Heading>
                        <p>
                            Il n'y a aucun fichier supprime.
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
