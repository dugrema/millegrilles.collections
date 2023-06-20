import { useState, useCallback, useMemo, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { ListeFichiers, FormatteurTaille, FormatterDate } from '@dugrema/millegrilles.reactjs'
import { formatterDateString } from '@dugrema/millegrilles.reactjs/src/formatterUtils'

import AfficherVideo from './AfficherVideo'
import AfficherAudio from './AfficherAudio'
import { mapDocumentComplet } from './mapperFichier'
import { onContextMenu } from './MenuContextuel'
import useWorkers, { useUsager } from './WorkerContext'

import fichiersActions from './redux/fichiersSlice'

const CONST_EXPIRATION_VISITE = 3 * 86_400_000

export function BarreInformation(props) {

    const { 
        afficherVideo, afficherAudio, naviguerCollection, modeView, setModeView, 
        setShowCreerRepertoire, setPreparationUploadEnCours,
        signalAnnuler,
    } = props

    const cuuidCourant = useSelector(state=>state.fichiers.cuuid)
    const liste = useSelector(state => state.fichiers.liste )
    const bytesTotalDossier = useSelector(state => state.fichiers.bytesTotalDossier)
    const dechiffrageInitialComplete = useSelector(state => state.fichiers.dechiffrageInitialComplete)

    const afficherMedia = afficherVideo || afficherAudio

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
                        {' '}{liste.length} fichiers
                    </div>
                    <div><FormatteurTaille value={bytesTotalDossier} /></div>
                </div>
            )
        }
    }

    return (
        <Row className='fichiers-header-buttonbar'>
            <Col xs={12} lg={5}>
                <SectionBreadcrumb naviguerCollection={naviguerCollection} fichier={afficherVideo||afficherAudio} />
            </Col>

            <Col xs={12} sm={3} md={4} lg={2}>
                {afficherMedia?'':nombreFichiers}
            </Col>

            <Col xs={12} sm={9} md={8} lg={5} className="buttonbars">
                {afficherMedia?'':
                    <div>
                        <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                        <BoutonsAction 
                            cuuid={cuuidCourant}
                            setShowCreerRepertoire={setShowCreerRepertoire}
                            setPreparationUploadEnCours={setPreparationUploadEnCours}
                            signalAnnuler={signalAnnuler}
                        />
                    </div>
                }
            </Col>
        </Row>            
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

    const { setShowCreerRepertoire, setPreparationUploadEnCours, signalAnnuler } = props

    return (
        <>
            <BoutonUpload setPreparationUploadEnCours={setPreparationUploadEnCours} signalAnnuler={signalAnnuler}>
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

    const { setPreparationUploadEnCours, signalAnnuler, resetAnnuler, setError, id: propsId } = props

    const refUpload = useRef()
    const workers = useWorkers()
    const usager = useUsager()
    const dispatch = useDispatch()
    const cuuid = useSelector(state=>state.fichiers.cuuid)

    const [className, setClassName] = useState('')

    const { traitementFichiers } = workers

    const handlerPreparationUploadEnCours = useCallback((e, infoSup)=>{
        // console.debug('handlerPreparationUploadEnCours %O, infoSup %O', e, infoSup)
        setPreparationUploadEnCours(e)
    }, [setPreparationUploadEnCours])

    const upload = useCallback( acceptedFiles => {
        // console.debug("Files : %O pour usager: %O, signalAnnuler: %O", acceptedFiles, usager, signalAnnuler)

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
            {userId, usager, cuuid, acceptedFiles},
            {signalAnnuler, setProgres: handlerPreparationUploadEnCours}
        )
            .then( () => {
                //console.debug("BoutonUpload traiterAcceptedFiles resultat ", uploads)
                //const batchIds = uploads.map(item=>item.batchId)
                //return dispatch(demarrerUploads(workers, batchIds))
            })
            .catch(err=>console.error("Erreur fichiers : %O", err))
            .finally( () => handlerPreparationUploadEnCours(false) )

    }, [handlerPreparationUploadEnCours, traitementFichiers, dispatch, usager, cuuid])

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

function SectionBreadcrumb(props) {

    const { naviguerCollection, fichier } = props

    const dispatch = useDispatch()
    const breadcrumb = useSelector((state) => state.fichiers.breadcrumb),
          liste = useSelector(state=>state.fichiers.liste)

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

    const bcFichier = useMemo(()=>{
        if(!fichier || !liste) return ''
        const infoFichier = liste.filter(item=>item.tuuid === fichier).pop()
        return (
            <span>&nbsp; / {infoFichier.nom}</span>
        )
    }, [fichier, liste])

    return (
        <Breadcrumb>
            
            <Breadcrumb.Item onClick={handlerSliceBreadcrumb}>Favoris</Breadcrumb.Item>
            
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

export function FormatterColonneDate(props) {
    const data = props.data || {}
    const { archive, upload, visites, folderId } = data

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
            if(visiteRecente === 0) {
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
        return <><FormatterDate value={props.value} />{' '}{symbolesEtat}</>
    }
}

export function AffichagePrincipal(props) {

    const {
        preparerColonnes,
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
    // const listeComplete = tailleAffichee?false:true
    const colonnes = useMemo(()=>preparerColonnes(), [preparerColonnes])

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
        onContextMenu(event, value, setContextuel)
    }, [setContextuel])

    const onOpenHandler = useCallback( item => {
        // const value = event.currentTarget.dataset.value
        window.getSelection().removeAllRanges()

        const value = item.tuuid,
              mimetype = item.mimetype || ''
        
        // const folderId = value.folderId || dataset.folderId
        // const fileId = value.fileId || dataset.fileId

        // if(folderId) {
        //     naviguerCollection(folderId)
        // } else if(fileId) {
            // console.debug("dbl click liste : %O, value : %O", liste, value)
            // const fileItem = liste.filter(item=>item.tuuid===value).pop()
            // const mimetype = fileItem.mimetype || ''
            if(mimetype.startsWith('video/')) setAfficherVideo(value)
            else if(mimetype.startsWith('audio/')) setAfficherAudio(value)
            else if(mimetype.startsWith('image/')) showPreviewAction(value)
            else if(mimetype === 'application/pdf') showPreviewAction(value)
            else if(mimetype) showInfoModalOuvrir()
            else naviguerCollection(value)
            
        // }

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

    if(afficherVideo) {
        return (
            <AfficherVideoView
                liste={liste}
                tuuid={afficherVideo}
                fermer={fermerAfficherVideo} 
                showInfoModalOuvrir={showInfoModalOuvrir} />
        )
    } else if(afficherAudio) {
        return (
            <AfficherAudioView
                liste={liste}
                tuuid={afficherAudio}
                fermer={fermerAfficherAudio} 
                showInfoModalOuvrir={showInfoModalOuvrir} />
        )
    }

    // Default - liste fichiers
    return (
        <ListeFichiers 
            modeView={modeView}
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

function AfficherAudioView(props) {

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
            <p>Erreur chargement de fichier audio</p>
            <p>Error loading audio file</p>
            <Button onClick={fermer}>Retour/Back</Button>
        </>
    )

    return (
        <AfficherAudio
            fichier={fichier}
            tuuidSelectionne={tuuid}
            fermer={fermer} 
            showInfoModalOuvrir={showInfoModalOuvrir} />
    )
}
