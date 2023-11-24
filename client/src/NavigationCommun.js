import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Alert from 'react-bootstrap/Alert'
import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Fade from 'react-bootstrap/Fade'

import { ListeFichiers, FormatteurTaille, FormatterDate, ImageCarousel } from '@dugrema/millegrilles.reactjs'
import { formatterDateString } from '@dugrema/millegrilles.reactjs/src/formatterUtils'

import AfficherVideo from './AfficherVideo'
import AfficherAudio from './AfficherAudio'
import { estMimetypeMedia, mapDocumentComplet } from './mapperFichier'
import { estMimetypeVideo } from '@dugrema/millegrilles.utiljs/src/mimetypes.js'
import { onContextMenu } from './MenuContextuel'
import useWorkers, { useCapabilities, useUsager } from './WorkerContext'

import fichiersActions from './redux/fichiersSlice'
import { FormCheck } from 'react-bootstrap'
import { getDocuments } from './fonctionsFichiers'

const CONST_EXPIRATION_VISITE = 3 * 86_400_000

export function BarreInformation(props) {
    const { hide } = props
    const capabilities = useCapabilities()

    if(capabilities.device === 'desktop') {
        return <BarreInformationDesktop {...props} />
    }

    return <BarreInformationMobile {...props}/>
}

export function BarreInformationDesktop(props) {

    const { 
        hide, hideMenu, afficherVideo, afficherAudio, naviguerCollection, modeView, setModeView, 
        setShowCreerRepertoire, setPreparationUploadEnCours,
        signalAnnuler, setShowInfoModal, setShowUploadBatch, setShowPartagerModal,
    } = props

    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const liste = useSelector(state => state.fichiers.liste )
    const bytesTotalDossier = useSelector(state => state.fichiers.bytesTotalDossier)
    const dechiffrageInitialComplete = useSelector(state => state.fichiers.dechiffrageInitialComplete)

    const afficherMedia = afficherVideo || afficherAudio

    const [nombreFichiers, nombreRepertoires] = useMemo(()=>{
        let nombreFichiers = 0, nombreRepertoires = 0
        if(liste) {
            liste.forEach(item=>{
                if(item.type_node === 'Fichier') nombreFichiers++
                else nombreRepertoires++
            })
        }
        return [nombreFichiers, nombreRepertoires]
    }, [liste])

    const showInformationRepertoireHandler = useCallback(()=>{
        console.debug("Show information repertoire ", cuuidCourant)
        if(cuuidCourant === '') setShowInfoModal(1)
        else setShowInfoModal(cuuidCourant)
    }, [cuuidCourant, setShowInfoModal])

    if(afficherMedia || (hideMenu && modeView === 'carousel')) return ''

    let nombreFichiersRendered = ''
    if(liste) {
        if(nombreFichiers || nombreRepertoires) {
            nombreFichiersRendered = (
                <Row className='fichiers-header-inforep'>
                    <Col xs={2} md={1}>
                        {dechiffrageInitialComplete?
                            '':
                            <i className="fa fa-spinner fa-spin" />
                        }
                    </Col>
                    <Col>
                        <Row>
                            {nombreRepertoires?
                                <Col xs={12}>{nombreRepertoires} repertoires</Col>
                                :''
                            }
                        </Row>
                        <Row>
                            {nombreFichiers?
                                <Col xs={6}>{nombreFichiers} fichiers</Col>
                                :''
                            }
                            {bytesTotalDossier?
                                <Col xs={6}><FormatteurTaille value={bytesTotalDossier} /></Col>
                                :''
                            }
                        </Row>
                    </Col>
                </Row>
            )
        }
    }

    return (
        <Row className='fichiers-header-buttonbar'>
            <Row>
                <Col xs={12}>
                    <SectionBreadcrumb naviguerCollection={naviguerCollection} fichier={afficherVideo||afficherAudio} />
                </Col>
            </Row>
            {hide?'':
                <Row>
                    <Col xs={12} md={8} className="buttonbars fichiers-headers-boutons">
                        <Button variant="secondary" onClick={showInformationRepertoireHandler} disabled={!setShowInfoModal}>
                            <i className="fa fa-info"/>
                        </Button>
                        <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                        <BoutonsAction 
                            cuuid={cuuidCourant}
                            setShowCreerRepertoire={setShowCreerRepertoire}
                            setPreparationUploadEnCours={setPreparationUploadEnCours}
                            signalAnnuler={signalAnnuler}
                            setShowUploadBatch={setShowUploadBatch}
                        />
                    </Col>
                    <Col xs={12} md={4}>
                        {nombreFichiersRendered}
                    </Col>
                </Row>            
            }
        </Row>
    )
}

export function BarreInformationMobile(props) {

    const { 
        hide,
        afficherVideo, afficherAudio, naviguerCollection, modeView, setModeView, 
        setShowCreerRepertoire, setPreparationUploadEnCours,
        signalAnnuler, setShowInfoModal, downloadRepertoire,
        showSupprimerModal, setShowSupprimerModal,
        showCopierModal, setShowCopierModal,
        showDeplacerModal, setShowDeplacerModal,
        setShowRenommerModal, setShowPartagerModal,
        modeSelection, setModeSelection,
    } = props

    const dispatch = useDispatch()
    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const liste = useSelector(state => state.fichiers.liste )
    const bytesTotalDossier = useSelector(state => state.fichiers.bytesTotalDossier)
    const dechiffrageInitialComplete = useSelector(state => state.fichiers.dechiffrageInitialComplete)
    const breadcrumb = useSelector((state) => state.fichiers.breadcrumb)

    const afficherMedia = afficherVideo || afficherAudio

    const [nombreFichiers, nombreRepertoires] = useMemo(()=>{
        let nombreFichiers = 0, nombreRepertoires = 0
        if(liste) {
            liste.forEach(item=>{
                if(item.type_node === 'Fichier') nombreFichiers++
                else nombreRepertoires++
            })
        }
        return [nombreFichiers, nombreRepertoires]
    }, [liste])

    const nomRepertoireCourant = useMemo(()=>{
        const dernierItem = breadcrumb[breadcrumb.length - 1]
        if(dernierItem) {
            const label = dernierItem.label
            if(label !== cuuidCourant) return label
            return ''
        }
        return '/'
    }, [breadcrumb, cuuidCourant])

    const showInformationRepertoireHandler = useCallback(()=>{
        console.debug("Show information repertoire ", cuuidCourant)
        if(cuuidCourant === '') setShowInfoModal(1)
        else setShowInfoModal(cuuidCourant)
    }, [cuuidCourant, setShowInfoModal])

    const naviguerCollectionUpHandler = useCallback(()=>{
        console.debug("naviguerCollectionUpHandler Breadcrumb %O", breadcrumb)
        let level = breadcrumb.length
        const toLevel = level - 2
        console.debug("naviguerCollectionUpHandler to level %d, %d", level, toLevel)
        dispatch(fichiersActions.breadcrumbSlice(toLevel))
        if(toLevel < 0) {
            Promise.resolve(naviguerCollection())
                .catch(err=>console.error("naviguerCollectionUpHandler Erreur navigation vers favoris", err))
        } else {
            const item = breadcrumb[toLevel]
            console.debug("Naviguer vers tuuid : %O", item)
            Promise.resolve(naviguerCollection(item.tuuid))
                .catch(err=>console.error("naviguerCollectionUpHandler Erreur navigation vers favoris", err))
        }
    }, [dispatch, breadcrumb])

    const onChangeModeSelection = useCallback( e => {
        const checked = e.currentTarget.checked || false
        setModeSelection(checked)
    }, [setModeSelection])

    useEffect(()=>{
        return () => setModeSelection(false)  // Re-initialiser a false
    }, [setModeSelection])

    if(afficherMedia || hide || modeView === 'carousel') return ''

    return (
        <Row className='fichiers-header-buttonbar-mobile'>
            <Row>
                <Col xs={2}>
                    <Button variant="secondary" className="fixed" disabled={!cuuidCourant} onClick={naviguerCollectionUpHandler}>
                        <i className="fa fa-level-up"/>
                    </Button>
                </Col>
                <Col xs={7} className='nom-repertoire'>
                    <Fade in={!!nomRepertoireCourant} appear={true}>
                        <span>{nomRepertoireCourant}</span>
                    </Fade>
                </Col>
                <Col xs={3}>
                    <span>
                        <FormCheck 
                            id="switch-mode-selection" 
                            type="switch" 
                            label="Editer" 
                            checked={modeSelection} 
                            onChange={onChangeModeSelection} />
                    </span>
                </Col>
            </Row>
            <Row>
                <Col xs={12}>
                    <BoutonsNavigation 
                        modeView={modeView}
                        modeSelection={modeSelection}
                        setModeView={setModeView}
                        cuuid={cuuidCourant} 
                        showInformationRepertoireHandler={showInformationRepertoireHandler}
                        setShowInfoModal={setShowInfoModal} 
                        setShowSupprimerModal={setShowSupprimerModal}
                        setShowCopierModal={setShowCopierModal}
                        setShowDeplacerModal={setShowDeplacerModal}
                        setShowRenommerModal={setShowRenommerModal}
                        setShowCreerRepertoire={setShowCreerRepertoire} 
                        setPreparationUploadEnCours={setPreparationUploadEnCours}
                        setShowPartagerModal={setShowPartagerModal}
                        signalAnnuler={signalAnnuler} />
                </Col>
            </Row>
        </Row>
    )
}

function BoutonsNavigation(props) {

    const {
        modeView, setModeView, modeSelection,
        cuuid, showInformationRepertoireHandler,
        setShowCreerRepertoire, setPreparationUploadEnCours, 
        setShowInfoModal,
        setShowSupprimerModal,
        setShowCopierModal,
        setShowDeplacerModal,
        setShowRenommerModal,
        setShowPartagerModal,
        signalAnnuler, setShowUploadBatch,
    } = props

    const showCopierHandler = useCallback(()=>setShowCopierModal(true), [setShowCopierModal])
    const showDeplacerHandler = useCallback(()=>setShowDeplacerModal(true), [setShowDeplacerModal])
    const showSupprimerHandler = useCallback(()=>setShowSupprimerModal(true), [setShowSupprimerModal])
    const showRenommerHandler = useCallback(()=>setShowRenommerModal(true), [setShowRenommerModal])
    const showPartagerHandler = useCallback(()=>setShowPartagerModal(true), [setShowPartagerModal])

    const selection = useSelector(state => state.fichiers.selection)

    const [selectionPresente, selectionUn] = useMemo(()=>{
        if(!selection) return [false, 0]
        return [selection.length > 0, selection.length === 1]
    }, [selection])

    if(modeSelection === true) {
        return (
            <div>
                <Button variant="secondary" className="fixed-lg" disabled={!selectionPresente} onClick={showCopierHandler}>
                    <i className="fa fa-copy"/>
                </Button>
                <Button variant="secondary" className="fixed-lg" disabled={!selectionPresente} onClick={showDeplacerHandler}>
                    <i className="fa fa-cut"/>
                </Button>
                <Button variant="secondary" className="fixed-lg" disabled={!selectionPresente} onClick={showSupprimerHandler}>
                    <i className="fa fa-trash-o"/>
                </Button>
                <Button variant="secondary" className="fixed-lg" disabled={!selectionPresente} onClick={showPartagerHandler}>
                    <i className="fa fa-share-alt"/>
                </Button>
                <Button variant="secondary" className="smalltext" disabled={!selectionUn} onClick={showRenommerHandler}>
                    Renommer
                </Button>
            </div>
        )
    }


    return (
        <div>
            <Button variant="secondary" onClick={showInformationRepertoireHandler} disabled={!setShowInfoModal} className="fixed">
                <i className="fa fa-info"/>
            </Button>
            {' '}
            <BoutonsFormat modeView={modeView} setModeView={setModeView} />
            <BoutonsAction 
                cuuid={cuuid}
                setShowCreerRepertoire={setShowCreerRepertoire}
                setPreparationUploadEnCours={setPreparationUploadEnCours}
                signalAnnuler={signalAnnuler}
                setShowUploadBatch={setShowUploadBatch}
            />
        </div>
    )
}

export function BoutonsFormat(props) {
    const { modeView, setModeView } = props

    const setModeListe = useCallback(()=>{ setModeView('liste') }, [setModeView])
    const setModeThumbnails = useCallback(()=>{ setModeView('thumbnails') }, [setModeView])
    const setModeCarousel = useCallback(()=>{ setModeView('carousel') }, [setModeView])

    let variantListe = 'outline-secondary', variantThumbnail = 'outline-secondary', variantCarousel = 'outline-secondary'
    if( !modeView || modeView === 'liste' ) variantListe = 'secondary'
    else if( modeView === 'thumbnails' ) variantThumbnail = 'secondary'
    else if( modeView === 'carousel' ) variantCarousel = 'secondary'

    return (
        <ButtonGroup>
            <Button variant={variantListe} onClick={setModeListe} className="fixed"><i className="fa fa-list" /></Button>
            <Button variant={variantThumbnail} onClick={setModeThumbnails} className="fixed"><i className="fa fa-th-large" /></Button>
            <Button variant={variantCarousel} onClick={setModeCarousel} className="fixed"><i className="fa fa-file-picture-o" /></Button>
        </ButtonGroup>
    )
}

export function BoutonsAction(props) {

    const { setShowCreerRepertoire, setPreparationUploadEnCours, signalAnnuler, setShowUploadBatch } = props

    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)

    const onUploadBatch = useCallback(()=>setShowUploadBatch(true), [setShowUploadBatch])

    return (
        <>
            <BoutonUpload setPreparationUploadEnCours={setPreparationUploadEnCours} signalAnnuler={signalAnnuler}>
                <div className="d-none d-sm-block"><i className="fa fa-plus"/> Fichier</div>
                <div className="fixed d-block d-sm-none"><i className="fa fa-plus"/></div>
            </BoutonUpload>
            &nbsp;
            <Button 
                variant="secondary" 
                className="individuel"
                onClick={setShowCreerRepertoire}
            >
                <div className="d-none d-sm-block"><i className="fa fa-folder"/> Collection</div>
                <div className="fixed d-block d-sm-none"><i className="fa fa-folder"/></div>
            </Button>
            &nbsp;
            {setShowUploadBatch?
                <Button disabled={!cuuidCourant} variant='secondary' className='d-none d-sm-inline-block' onClick={onUploadBatch}>
                    <i className="fa fa-plus"/> ZIP
                </Button>
            :''}
        </>
    )
}

function BoutonUpload(props) {

    const { setPreparationUploadEnCours, signalAnnuler, resetAnnuler, setError, id: propsId } = props

    const refUpload = useRef()
    const workers = useWorkers()
    const usager = useUsager()
    const dispatch = useDispatch()
    const cuuid = useSelector(state=>state.fichiers.cuuid)
    const breadcrumb = useSelector(state=>state.fichiers.breadcrumb)

    const [className, setClassName] = useState('')

    const { traitementFichiers } = workers

    const handlerPreparationUploadEnCours = useCallback((e, infoSup)=>{
        // console.debug('handlerPreparationUploadEnCours %O, infoSup %O', e, infoSup)
        setPreparationUploadEnCours(e)
    }, [setPreparationUploadEnCours])

    const upload = useCallback( acceptedFiles => {
        // console.debug("Files : %O pour usager: %O, signalAnnuler: %O", acceptedFiles, usager, signalAnnuler)
        const breadcrumbPath = breadcrumb.map(item=>item.label).join('/')
        console.debug("BoutonUpload.uploader breadcrumb %O, path %s", breadcrumb, breadcrumbPath)

        for(const file of acceptedFiles) {
            if(!file.type && file.size === 0) {
                if(setError) {
                    setError("Repertoires non supportes pour upload")
                } else {
                    console.error("Repertoires non supportes pour upload")
                }
                return
            }
        }

        handlerPreparationUploadEnCours(0)  // Debut preparation

        const userId = usager.extensions.userId

        traitementFichiers.traiterAcceptedFiles(
            dispatch, 
            {userId, usager, cuuid, acceptedFiles, breadcrumbPath},
            {signalAnnuler, setProgres: handlerPreparationUploadEnCours}
        )
            .then( () => {
                //console.debug("BoutonUpload traiterAcceptedFiles resultat ", uploads)
                //const batchIds = uploads.map(item=>item.batchId)
                //return dispatch(demarrerUploads(workers, batchIds))
            })
            .catch(err=>console.error("Erreur fichiers : %O", err))
            .finally( () => handlerPreparationUploadEnCours(false) )

    }, [handlerPreparationUploadEnCours, traitementFichiers, dispatch, usager, cuuid, breadcrumb])

    const fileChange = useCallback(event => {
        event.preventDefault()
        setClassName('')

        const acceptedFiles = event.currentTarget.files
        upload(acceptedFiles)
    }, [setClassName, upload])

    const onButtonDrop = useCallback(event => {
        event.preventDefault()
        setClassName('')

        const acceptedFiles = event.dataTransfer.files
        if(acceptedFiles && acceptedFiles.length > 0) {
            // console.debug("Drop - OK ", event)
            upload(acceptedFiles)
        } else {
            console.warn("Drop - aucuns fichiers recus ", event)
        }
    }, [setClassName, upload])

    const handlerOnDragover = useCallback(event => {
        event.preventDefault()
        //setClassName('dropping')
        //event.dataTransfer.dropEffect = "move"
        setClassName('dropping')
        event.dataTransfer.dropEffect = 'copyMove'
    }, [])

    const handlerOnDragEnter = useCallback(event => {
        event.preventDefault()
        // setClassName('dropping')
        // event.dropEffect = 'copyMove'
    }, [setClassName])

    const handlerOnDragLeave = useCallback(event => { event.preventDefault(); setClassName(''); }, [setClassName])

    const handlerOnClick = useCallback(event => {
        refUpload.current.click()
    }, [])

    return (
        <div className={'upload ' + className}>
            <Button 
                id={propsId || 'bouton_upload'}
                variant="secondary" 
                className="individuel"
                onClick={handlerOnClick}
                disabled={!cuuid}
                onDrop={onButtonDrop}
                onDragOver={handlerOnDragover} 
                onDragLeave={handlerOnDragLeave}
                onDragEnter={handlerOnDragEnter}
            >
                {props.children}
            </Button>
            <input
                id='file_upload'
                type='file' 
                ref={refUpload}
                multiple='multiple'
                onChange={fileChange}
              />
        </div>
    )
}

export function SectionBreadcrumb(props) {

    const { naviguerCollection, fichier, prependItems } = props

    const dispatch = useDispatch()
    const breadcrumb = useSelector((state) => state.fichiers.breadcrumb),
          liste = useSelector(state=>state.fichiers.liste)

    const itemsRoot = useMemo(()=>{
        if(!prependItems) return [{label: 'Favoris'}]
        return prependItems
    }, [prependItems])
    
    const handlerSliceBreadcrumb = useCallback(event => {
        event.preventDefault()
        event.stopPropagation()

        const value = event.currentTarget.dataset.idx
        console.debug("handlerSliceBreadcrumb retour a idx %s, liste : %O", value, breadcrumb)

        let tuuid = ''
        if(value) {
            let level = Number.parseInt(value)

            if(fichier && level > breadcrumb.length-2) {
                // console.debug("Navigation de retour de fichier/video : %O", fichier)
                try {
                    Promise.resolve(naviguerCollection(null, {retourFichier: true}))
                        .catch(err=>console.error("SectionBreadcrumb Erreur navigation ", err))
                } catch(err) {
                    console.error("handlerSliceBreadcrumb Erreur naviguerCollection %s: ", tuuid, err)
                }
                return
            }

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
    }, [dispatch, breadcrumb, naviguerCollection, fichier])

    const bcFichier = useMemo(()=>{
        if(!fichier || !liste) return ''
        const infoFichier = liste.filter(item=>item.tuuid === fichier).pop()
        if(!infoFichier) {
            console.debug("breadcrumb Information manquante (infoFichier %O est null, liste : %O", fichier, liste)
            return ''
        }
        return (
            <span>&nbsp; / {infoFichier.nom}</span>
        )
    }, [fichier, liste])

    return (
        <Breadcrumb>
            
            {itemsRoot.map((item, idxItem)=>{
                const key = item.label || ''+idxItem
                const onClick = item.onClick || handlerSliceBreadcrumb
                return <Breadcrumb.Item key={key} onClick={onClick}>{item.label}</Breadcrumb.Item>
            })}
            
            {breadcrumb.map((item, idxItem)=>{
                // Dernier
                if(!fichier && idxItem === breadcrumb.length - 1) {
                    return <span key={idxItem}>&nbsp; / {item.label}</span>
                }
                
                // Parents
                return (
                    <Breadcrumb.Item key={idxItem} onClick={handlerSliceBreadcrumb} data-idx={''+idxItem}>
                        {item.label}
                    </Breadcrumb.Item>
                )
            })}

            {bcFichier}

        </Breadcrumb>
    )

}

export function PathFichier(props) {

    const { pathCuuids } = props

    const workers = useWorkers()

    const [repertoires, setRepertoires] = useState('N/D')

    useEffect(()=>{
        if(!pathCuuids || pathCuuids.length === 0) return

        // console.debug("PathFichier Charger path cuuids ", pathCuuids)
        workers.collectionsDao.getParTuuids(pathCuuids)
            .then(async repertoires => {
                // console.debug("Repertoires charges localement : ", repertoires)
                const dictRepertoires = repertoires.reduce((acc, item)=>{
                    if(item) {
                        acc[item.tuuid] = item
                    }
                    return acc
                }, {})
                // Trouver repertoires manquants
                const cuuidsManquants = []
                for(const cuuid of pathCuuids) {
                    if(!dictRepertoires[cuuid]) cuuidsManquants.push(cuuid)
                }
                // Charger repertoires manquants
                if(cuuidsManquants.length > 0) {
                    const resultat = await getDocuments(workers, cuuidsManquants)
                    for(const rep of resultat) {
                        dictRepertoires[rep.tuuid] = rep
                    }
                }

                // console.debug("PathFichier Dict repertoires ", dictRepertoires)
                const nomPath = []
                for(const cuuid of pathCuuids) {
                    const rep = dictRepertoires[cuuid]
                    if(!rep) {
                        console.warn("PathFichier Repertoire %s inconnu", cuuid)
                        nomPath.push(cuuid)
                    }
                    else nomPath.push(rep.nom)
                }
                nomPath.reverse()

                const repertoiresString = 'Favoris/' + nomPath.join('/')
                setRepertoires(repertoiresString)
            })
            .catch(err=>console.error("PathFichier Erreur chargement tuuids ", err))
    }, [workers, pathCuuids])

    return (
        <span>{repertoires}</span>
    )

}

export function FormatterColonneDate(props) {
    const data = props.data || {}
    const { archive, upload, folderId, version_courante } = data

    const visites = version_courante?version_courante.visites:null

    let symbolesEtat = []
    if(archive) symbolesEtat.push(<i key='archive' className='fa fa-snowflake-o' title='Archive'/>)
    if(!folderId) {
        if(visites) {
            // Tenter de detecter au moins 1 serveur avec le fichier visite recemment
            const expire = Math.floor((new Date().getTime() - CONST_EXPIRATION_VISITE) / 1000)
            let visiteRecente = Object.values(visites).reduce((acc, item)=>{
                if(item > acc) return item
                return acc
            }, 0)
            if(visites.length === 0) {
                // Le fichier est nouveau (jamais sauvegarde)
                symbolesEtat.push(<i key='absent' className="fa fa-spinner fa-spin" title='Fichier en traitement' />)
            } else if(visiteRecente === 0) {
                symbolesEtat.push(<i key='absent' className="fa fa-question-circle error" title='Fichier absent' />)
            } else if(visiteRecente < expire) {
                const dateVisite = new Date(visiteRecente*1000)
                const dateFormattee = formatterDateString({date: dateVisite})
                symbolesEtat.push(<i key='date' className="fa fa-question-circle warning" title={'Derniere visite : ' + dateFormattee} />)
            }
        } else {
            symbolesEtat.push(<i key='question' className="fa fa-question-circle-o" />)
        }
    }

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
        return <span><FormatterDate value={props.value} />{' '}{symbolesEtat}</span>
    }
}

export function AffichagePrincipal(props) {

    const {
        hide,
        hideMenu, setHideMenu,
        preparerColonnes,
        modeView, setModeView,
        naviguerCollection,
        showPreviewAction,
        afficherVideo, setAfficherVideo,
        afficherAudio, setAfficherAudio,
        setContextuel, 
        showInfoModalOuvrir,
        scrollValue, onScroll,
        modeSelection,
        erreurCb,
    } = props

    const capabilities = useCapabilities()

    const dispatch = useDispatch()
    const tailleAffichee = useSelector(state => state.fichiers.maxNombreAffiches)
    const liste = useSelector(state => state.fichiers.liste)
    const sortKeys = useSelector(state => state.fichiers.sortKeys)
    const selection = useSelector(state => state.fichiers.selection)
    const colonnes = useMemo(()=>preparerColonnes(), [preparerColonnes])

    const isMobile = capabilities.mobile

    const classnameContenu = useMemo(()=>{
        if(isMobile) return 'fichiers-contenu-mobile'
        return 'fichiers-contenu'
    }, [isMobile])

    const [listeAffichee, listeComplete] = useMemo(()=>{
        if(!liste) return ''                // Liste vide
        if(!tailleAffichee) return [liste, true]    // Liste complete
        const listeFiltree = liste.filter((item, idx)=>idx<tailleAffichee)  // Filtre
        const listeComplete = listeFiltree === liste.length
        // console.debug("Liste, %O, Liste filtree %O, liste est complete? %s", liste, listeFiltree, listeComplete)
        return [listeFiltree, listeComplete]
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
    const fermerAfficherVideo = useCallback(()=>setAfficherVideo(false), [setAfficherVideo])
    const fermerAfficherAudio = useCallback(()=>setAfficherAudio(false), [setAfficherAudio])
    const onContextMenuClick = useCallback((event, value)=>{
        if(isMobile) return  // Le menu contextuel est desactive en mode mobile
        onContextMenu(event, value, setContextuel)
    }, [setContextuel, isMobile])
    const fermerCarousel = useCallback(()=>setModeView('liste'), ['setModeview'])

    const onOpenHandler = useCallback( item => {
        window.getSelection().removeAllRanges()

        const value = item.tuuid,
              mimetype = item.mimetype || '',
              typeNode = item.type_node

        if(['Collection', 'Repertoire'].includes(typeNode)) {
            return naviguerCollection(value)
        }
        
        showPreviewAction(value)
        // if(isMobile) showPreviewAction(value)  // Utiliser un ecran de navigation pour mobile
        // else if(estMimetypeVideo(mimetype)) setAfficherVideo(value)
        // else if(mimetype.startsWith('audio/')) setAfficherAudio(value)
        // else if(mimetype.startsWith('image/')) showPreviewAction(value)
        // else if(mimetype === 'application/pdf') showPreviewAction(value)
        // else showInfoModalOuvrir()

    }, [naviguerCollection, showPreviewAction, liste])

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

    if(hide) return ''  // Cacher la page

    // if(afficherVideo) {
    //     return (
    //         <AfficherVideoView
    //             liste={liste}
    //             tuuid={afficherVideo}
    //             fermer={fermerAfficherVideo} 
    //             showInfoModalOuvrir={showInfoModalOuvrir} 
    //             erreurCb={erreurCb} />
    //     )
    // } else if(afficherAudio) {
    //     return (
    //         <AfficherAudioView
    //             liste={liste}
    //             tuuid={afficherAudio}
    //             fermer={fermerAfficherAudio} 
    //             showInfoModalOuvrir={showInfoModalOuvrir} 
    //             erreurCb={erreurCb} />
    //     )
    // }

    if(modeView === 'carousel') {
        return <AfficherCarousel fichiers={liste} fermer={fermerCarousel} hideMenu={hideMenu} setHideMenu={setHideMenu} />
    }

    // Default - liste fichiers
    return (
        <div className={classnameContenu}>
            <ListeFichiers 
                capabilities={capabilities}
                estMobile={isMobile}
                modeView={modeView}
                modeSelection={modeSelection}
                colonnes={colonnesEffectives}
                rows={listeAffichee} 
                isListeComplete={listeComplete}
                selection={selection}
                onOpen={onOpenHandler}
                onContextMenu={onContextMenuClick}
                onSelect={onSelectionLignes}
                onClickEntete={enteteOnClickCb}
                suivantCb={suivantCb}
                scrollValue={scrollValue}
                onScroll={onScroll}
            />

            {isMobile?
                <Row>
                    <Col xs={12} lg={5}>
                        <SectionBreadcrumb naviguerCollection={naviguerCollection} fichier={afficherVideo||afficherAudio} />
                    </Col>
                </Row>    
            :''}
        </div>
    )
}

export function InformationListe(_props) {

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


function AfficherCarousel(props) {
    const { fichiers, fermer, hideMenu, setHideMenu } = props

    const workers = useWorkers()
    const dispatch = useDispatch()
    const selection = useSelector(state=>state.fichiers.selection)
    const capabilities = useCapabilities()

    const [item, setItem] = useState('')
    const [images, setImages] = useState('')
    const [loaded, setLoaded] = useState(false)

    // const { images, item, onSelect, onClick, setDownloadSrc, showButtons, DEBUG } = props

    const onClick = useCallback(()=>{
        if(capabilities.mobile) {
            fermer()
        } else {
            // Toggle afficher menu
            // console.debug("Toggle afficher menu (courant %O)", hideMenu)
            setHideMenu(!hideMenu)
        }
    }, [fermer, capabilities, hideMenu, setHideMenu])

    const onSelectCb = useCallback(idx=>{
        const fichier = images[idx]
        setItem(fichier)
        dispatch(fichiersActions.selectionTuuids([fichier.tuuid]))
    }, [dispatch, images])

    const setDownloadSrc = useCallback(()=>{}, [])

    useEffect(()=>{
        return () => {
            setLoaded(false)  // Unlock
            setImages('')
            setItem('')
        }
    }, [setLoaded])

    useEffect(()=>{
        // console.debug("AfficherCarousel selection %O, images %O, item %O", selection, images, item)
        if(!images) return
        if(item || item === false) return  // Locked

        let tuuidSelectionne = ''
        // console.debug("AfficherCarousel selection ", selection)
        if(selection && selection.length === 1) {
            tuuidSelectionne = selection[0]
        }

        // Calculer l'index de l'item a afficher dans le carousel
        for(var idx=0; idx<images.length; idx++) {
            const image = images[idx]
            if(image && image.tuuid === tuuidSelectionne) {
                console.debug("AfficherCarousel image selectionnee ", image)
                setItem(image)
                return
            }
        }

        // No match, prendre la premiere image si disponible
        if(images && images.length > 0) {
            const image = images[0]
            // console.debug("AfficherCarousel default premiere image ", image)
            setItem(image)
            return
        }
        
        // Aucunes images
        setItem(false)
    }, [item, images, selection, setItem])
    
    // Load et lock les images (pour eviter flicker si maj externe)
    useEffect(()=>{
        if(loaded) return  // Locked
        if(!fichiers) return setImages('')
        const images = fichiers.filter(item=>{
            const mimetype = item.mimetype || ''
            if(mimetype.startsWith('image/')) return true
        }).map(item=>mapDocumentComplet(workers, item))

        // console.debug("AfficherCarousel Images : %O", images)
        setImages(images)
        setLoaded(true)
    }, [workers, fichiers, setImages, loaded, setLoaded])

    if(images.length === 0) {
        return (
            <div>
                <p>Aucunes images.</p>
                <Button onClick={fermer}>Fermer</Button>
            </div>
        )
    }

    return (
        <div>
            <ImageCarousel 
                images={images} 
                item={item} 
                onClick={onClick}
                onSelect={onSelectCb} 
                setDownloadSrc={setDownloadSrc} />
        </div>
    )
}
