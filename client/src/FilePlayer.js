import { useMemo, useEffect, useState, useCallback } from 'react'

import Alert from 'react-bootstrap/Alert'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Ratio from 'react-bootstrap/Ratio'

import { useMediaQuery } from '@react-hooks-hub/use-media-query'

import { ModalViewer, useDetecterSupport } from '@dugrema/millegrilles.reactjs'
import {trouverLabelImage} from '@dugrema/millegrilles.reactjs/src/labelsRessources'
import {loadFichierChiffre, fileResourceLoader} from '@dugrema/millegrilles.reactjs/src/imageLoading'

import { mapDocumentComplet } from './mapperFichier'
import { estMimetypeVideo } from '@dugrema/millegrilles.utiljs/src/mimetypes'
import { InfoGenerique, InfoMedia } from './ModalOperations'
import useWorkers from './WorkerContext'
import { SelecteurResolution, WrapperPlayer } from './AfficherVideo'
import { AudioPlayer } from './AfficherAudio'

function PreviewFichiers(props) {
    const support = useDetecterSupport()

    const { workers, tuuidSelectionne, fichiers, showPreview, setShowPreview } = props

    const liste = useMemo(()=>{
        if(!showPreview || !fichiers || !tuuidSelectionne) return []  // Rien a faire
        const mapper = (item, idx) => mapDocumentComplet(workers, item, idx)
        const listeMappee = fichiers.map(mapper)
        return preparerPreviews(workers, tuuidSelectionne, listeMappee, support)
    },[workers, tuuidSelectionne, fichiers, showPreview, support])

    if(!showPreview) return ''

    if(support.touch) {
        // Mode mobile
        return (
            <AfficherMobile 
                fermer={ () => setShowPreview(false) } 
                fichiers={liste} 
                tuuidSelectionne={ tuuidSelectionne }
                />
        )
    }

    return (
        <AfficherDesktop 
            fermer={ () => setShowPreview(false) } 
            fichiers={liste} 
            tuuidSelectionne={ tuuidSelectionne }
        />
    )
}

export default PreviewFichiers

function preparerPreviews(workers, tuuidSelectionne, liste, support) {

    const optionsLoader = {supporteWebm: support.webm, supporteWebp: support.webp}

    const fichierSelectionne = liste.filter(item=>item.tuuid===tuuidSelectionne).pop()
    const versionCourante = fichierSelectionne.version_courante || {}
    const mimetypeSelectionne = versionCourante.mimetype || '',
          mimetypeBase = mimetypeSelectionne.split('/').shift()

    if(mimetypeBase === 'image') {
        // Mode carousel d'images
        return liste.filter(filtrerTypesPreview).map(item=>mapImage(workers, item, optionsLoader))
    } else {
        // Mode lecteur fichier / video player - 1 seul fichier
        return [mapFichier(fichierSelectionne, optionsLoader)]
    }
}

function mapFichier(item, optionsLoader) {
    optionsLoader = optionsLoader || {}
    return {
        ...item,
        tuuid: item.fileId,
        // loader: (typeRessource, opts) => resLoader(item, typeRessource, {...optionsLoader, ...opts})
    }
}

function mapImage(workers, item, optionsLoader) {

    const traitementFichiersWorker = workers.traitementFichiers

    const version_courante = item.version_courante || {}
    const images = version_courante.images || {}
    // console.debug("Trouver labels images : %O", images)
    const labelImage = trouverLabelImage(Object.keys(images), {supporteWebp: true})
    const image = images[labelImage]
    // console.debug("Label trouve : %s, image : %O", labelImage, image)
    const thumbnail = images.thumbnail || images.thumb

    let loader = ''
    if(image && image.hachage) {
        const imageFuuid = image.hachage,
              imageMimetype = image.mimetype
        loader = fileResourceLoader(traitementFichiersWorker.getFichierChiffre, imageFuuid, imageMimetype, {thumbnail})
    } else if(thumbnail && thumbnail.hachage && thumbnail.data_chiffre) {
        loader = loadFichierChiffre(traitementFichiersWorker.getFichierChiffre, thumbnail.hachage, thumbnail.mimetype, {dataChiffre: thumbnail.data_chiffre})
    } else {
        console.debug("Aucune information d'image pour %O", item)
        return null
    }

    return {
        ...item,
        tuuid: item.fileId,
        loader,
    }
}

function filtrerTypesPreview(item) {
    if(item && item.mimetype) {
        const mimetype = item.mimetype.toLowerCase(),
              mimetypeBase = mimetype.split('/').shift()
        
        // if(mimetype === 'application/pdf') return true
        if(mimetypeBase === 'image') return true
    }
    return false
}

function AfficherDesktop(props) {
    const { fermer, fichiers, tuuidSelectionne } = props

    const fichier = useMemo(()=>{
        const vals = fichiers.filter(item=>item && item.tuuid === tuuidSelectionne)
        let fichier = {}
        if(vals.length === 1) fichier = vals[0]
        return fichier
    }, [fichiers, tuuidSelectionne])

    return (
        <div>
            <Row className="player-contenu player-header">
                <Col xs={2}><Button variant="secondary" onClick={fermer}><i className="fa fa-arrow-left"/></Button></Col>                
                <Col>{fichier.nom}</Col>
            </Row>
            <PreviewMediaMobile fichier={fichier} />
        </div>
    )
}

function AfficherMobile(props) {
    const { fermer, fichiers, tuuidSelectionne } = props

    const fichier = useMemo(()=>{
        const vals = fichiers.filter(item=>item && item.tuuid === tuuidSelectionne)
        let fichier = {}
        if(vals.length === 1) fichier = vals[0]
        return fichier
    }, [fichiers, tuuidSelectionne])

    return (
        <div>
            <Row className="player-contenu mobile player-header">
                <Col xs={2}><Button variant="secondary" onClick={fermer}><i className="fa fa-arrow-left"/></Button></Col>                
                <Col>{fichier.nom}</Col>
            </Row>
            <PreviewMediaMobile fichier={fichier} />
        </div>
    )
}

function verifierEstDocument(mimetype) {
    if(mimetype === 'application/pdf') return true
    if(mimetype.startsWith('text/')) return true
    return false
}

function PreviewMediaMobile(props) {

    const { fichier } = props

    const [ estImage, estVideo, estAudio, estDocument ] = useMemo(()=>{
        const mimetype = fichier.mimetype
        let image = false, audio = false, estDocument = false
        const video = estMimetypeVideo(mimetype)
        if(mimetype.startsWith('image/')) image = true
        if(mimetype.startsWith('audio/')) audio = true
        estDocument = verifierEstDocument(mimetype)
        return [image, video, audio, estDocument]
    }, [fichier])

    if(!fichier) return ''
    if(estVideo) return PreviewVideoMobile(props)
    if(estImage) return PreviewImageMobile(props)
    if(estAudio) return PreviewAudioMobile(props)
    if(estDocument) return PreviewDocumentMobile(props)

    return PreviewFichierGeneriqueMobile(props)
}

function PreviewVideoMobile(props) {

    const { fichier } = props

    const videoLoader = fichier.videoLoader,
          version_courante = fichier.version_courante

    const support = useDetecterSupport()

    const { device, orientation } = useMediaQuery()

    const [selecteur, setSelecteur] = useState('')
    const [timeStamp, setTimeStamp] = useState(-1)
    const [abLoop, setAbLoop] = useState(null)

    const selecteurs = useMemo(()=>videoLoader.getSelecteurs(), [videoLoader])
    const videos = useMemo(()=>version_courante.video || {}, [version_courante])

    const cols = useMemo(()=>{
        if(orientation === 'landscape') return [{xs: 12, sm: 6}, {xs: 12, sm: 6}]
        else return [{xs: 12}, {}]
    }, [orientation])

    const setErrCb = useCallback(e => {
        console.error("Erreur chargement image : %O", e)
    }, [])

    return (
        <Row>
            <Col {...cols[0]} className={'player-media-container ' + orientation}>
                <Ratio aspectRatio='4x3'>
                    <div className={"player-media-image mobile " + orientation}>
                        <WrapperPlayer 
                            fichier={fichier}
                            selecteur={selecteur} abLoop={abLoop} 
                            timeStamp={timeStamp} setTimeStamp={setTimeStamp}
                            />
                    </div>
                </Ratio>
            </Col>
            <Col {...cols[1]}>
                <SelecteurResolution 
                    listeVideos={videos} 
                    support={support}
                    selecteurs={selecteurs} 
                    selecteur={selecteur} 
                    setSelecteur={setSelecteur} 
                    videoLoader={videoLoader} />
                <InformationFichier {...props} />                    
            </Col>
        </Row>

    )
}

function PreviewImageMobile(props) {

    const { fichier } = props

    const { device, orientation } = useMediaQuery()

    const [srcImage, setSrcImage] = useState('')
    const [complet, setComplet] = useState(false)
    const [srcLocal, setSrcLocal] = useState('')

    const cols = useMemo(()=>{
        if(orientation === 'landscape') return [{xs: 12, sm: 6}, {xs: 12, sm: 6}]
        else return [{xs: 12}, {}]
    }, [orientation])

    const [anime, imageLoader] = useMemo(()=>{
        if(!fichier) return [false, null]
        return [fichier.anime, fichier.imageLoader]
    }, [fichier])

    const setErrCb = useCallback(e => {
        console.error("Erreur chargement image : %O", e)
    }, [])

    const viewSrcClick = useCallback( event => {
        if(!srcImage) return setErrCb("Le document source n'est pas pret")

        console.debug("PreviewDocumentMobile %O", srcImage)
        const link = document.createElement('a')
        link.href = srcImage
        link.setAttribute('target', '_blank')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [srcImage, setErrCb])

    // Load / unload
    useEffect(()=>{
        if(!imageLoader) return

        imageLoader.load({setFirst: setSrcImage, erreurCb: setErrCb})
            .then(src=>{
                setSrcLocal(src)
                if(!anime) {
                    setSrcImage(src)
                }
            })
            .catch(err=>{
                console.error("Erreur load image : %O", err)
                setErrCb(err)
            })
            .finally(()=>setComplet(true))

        return () => {
            setSrcImage('')
            setComplet(false)
            imageLoader.unload()
                .catch(err=>console.warn("Erreur unload image : %O", err))
        }
    }, [anime, imageLoader, setSrcImage, setErrCb, setComplet])

    return (
        <Row>
            <Col {...cols[0]} className={'player-media-container ' + orientation}>
                <Ratio aspectRatio='4x3'>
                    <div className={"player-media-image mobile " + orientation}>
                        {srcImage?
                            <img src={srcImage} onClick={viewSrcClick} />
                            :''
                        }
                    </div>
                </Ratio>
            </Col>
            <Col {...cols[1]} className={'player-media-information ' + orientation}>
                <Button onClick={viewSrcClick} variant="primary" disabled={!srcLocal} className="player-media-ouvrir">
                    <i className='fa fa-file-image-o'/> Ouvrir
                </Button>
                <InformationFichier {...props} />
            </Col>
        </Row>
    )
}

function PreviewDocumentMobile(props) {
    // Preview d'un document qui peut etre ouvert par le navigateur (e.g. PDF)
    const { fichier, erreurCb } = props

    const { orientation } = useMediaQuery()

    const [srcImage, setSrcImage] = useState('')
    const [complet, setComplet] = useState(false)
    const [srcLocal, setSrcLocal] = useState('')

    const cols = useMemo(()=>{
        if(orientation === 'landscape') return [{xs: 12, sm: 6}, {xs: 12, sm: 6}]
        else return [{xs: 12}, {}]
    }, [orientation])

    const [loader, imageLoader] = useMemo(()=>{
        if(!fichier) return [null, null]
        const { loader, imageLoader } = fichier
        return [loader, imageLoader]
    }, [fichier])

    const setErrCb = useCallback(e => {
        console.error("PreviewDocumentMobile Erreur chargement document : %O", e)
    }, [])

    const viewSrcClick = useCallback( event => {
        if(!srcLocal) return setErrCb("Le document source n'est pas pret")

        console.debug("PreviewDocumentMobile %O", srcLocal)
        const link = document.createElement('a')
        link.href = srcLocal
        link.setAttribute('target', '_blank')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [srcLocal, setErrCb])

    // Load / unload
    useEffect(()=>{
        if(!loader) return  // Pas pret

        // Thumbnail / poster video
        if(imageLoader) {
            imageLoader.load(null, {setFirst: setSrcImage})
                .then(setSrcImage)
                .catch(err=>{
                    console.warn("Erreur chargement thumbnail : %O", err)
                })
        }

        // Loader fichier source (original)
        console.debug("Load src : ", loader)
        loader.load()
            .then(setSrcLocal)
            .catch(err=>{
                console.error("Erreur load fichier : %O", err)
                setErrCb(err)
            })
            .finally(()=>setComplet(true))

        return () => {
            setSrcImage('')
            setSrcLocal('')
            setComplet(false)
            if(imageLoader) imageLoader.unload().catch(err=>console.debug("Erreur unload thumbnail : %O", err))
            loader.unload().catch(err=>console.warn("Erreur unload fichier : %O", err))
        }
    }, [loader, imageLoader, setSrcImage, setErrCb, setComplet])

    return (
        <Row>
            <Col {...cols[0]} className={'player-media-container ' + orientation}>
                <Ratio aspectRatio='4x3'>
                    <div className={"player-media-document mobile " + orientation}>
                        {srcImage?
                            <img src={srcImage} onClick={viewSrcClick} />
                            :''
                        }
                    </div>
                </Ratio>
            </Col>
            <Col {...cols[1]} className={'player-media-information ' + orientation}>
                <Button onClick={viewSrcClick} variant="primary" disabled={!srcLocal} className="player-media-ouvrir">
                    <i className='fa fa-file-pdf-o'/> Ouvrir
                </Button>
                <InformationFichier {...props} />
            </Col>
        </Row>
    )    
}

function PreviewAudioMobile(props) {
    const { fichier, erreurCb } = props

    console.debug("PreviewDocumentMobile proppies ", props)

    const { orientation } = useMediaQuery()
    const cols = useMemo(()=>{
        if(orientation === 'landscape') return [{xs: 12, sm: 6}, {xs: 12, sm: 6}]
        else return [{xs: 12}, {}]
    }, [orientation])

    const setErrCb = useCallback(e => {
        console.error("PreviewDocumentMobile Erreur chargement document : %O", e)
    }, [])

    return (
        <Row>
            <Col {...cols[0]} className={'player-audio-container ' + orientation}>
                <AudioPlayer fichier={fichier} />
            </Col>
            <Col {...cols[1]} className={'player-media-information ' + orientation}>
                <InformationFichier {...props} />
            </Col>
        </Row>
    )
}

function PreviewFichierGeneriqueMobile(props) {
    return (
        <div>
            <InformationFichier {...props} />
        </div>
    )
}

function InformationFichier(props) {

    const { fichier, erreurCb } = props

    const workers = useWorkers()

    const [detail, setDetail] = useState(false)
    const toggleDetailHandler = useCallback(e=>setDetail(e.currentTarget.checked), [setDetail])

    if(!fichier) return ''

    return (
        <div>
            <InfoMedia workers={workers} fichier={fichier} erreurCb={erreurCb} />
            <InfoGenerique value={fichier} valueItem={fichier} detail={detail} />
            <Form.Check id="toggle-switch-detail" type="switch" checked={detail} onChange={toggleDetailHandler} label='Afficher detail' />
        </div>
    )
}