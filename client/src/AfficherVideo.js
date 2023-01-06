import {useState, useEffect, useCallback, useMemo} from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'

import { VideoViewer } from '@dugrema/millegrilles.reactjs'

import {trierLabelsVideos} from '@dugrema/millegrilles.reactjs/src/labelsRessources'

function AfficherVideo(props) {

    const { support, showInfoModalOuvrir } = props

    const fichier = useMemo(()=>props.fichier || {}, [props.fichier])
    const nomFichier = fichier.nom || '',
          version_courante = fichier.version_courante || {},
          videoLoader = fichier.videoLoader

    const videos = useMemo(()=>version_courante.video || {}, [version_courante.video])

    const [selecteur, setSelecteur] = useState('')
    const [srcVideo, setSrcVideo] = useState('')
    const [posterObj, setPosterObj] = useState('')
    // const [genererToken, setGenererToken] = useState(false)
    const [timeStamp, setTimeStamp] = useState(0)
    const [videoChargePret, setVideoChargePret] = useState(false)
    const [errVideo, setErrVideo] = useState('')

    useEffect(()=>{
        if(selecteur || !videoLoader) return  // Deja initialise
        // Identifier un selecteur initial
        const selecteurs = videoLoader.getSelecteurs()
        if(!selecteurs) {
            return setSelecteur('original')
        } else if(selecteurs.includes('faible')) {
            return setSelecteur('faible')
        } else if(selecteurs.includes('medium')) {
            return setSelecteur('medium')
        } else if(selecteurs.includes('haute')) {
            return setSelecteur('haute')
        } else if(selecteurs.includes('original')) {
            // Selectionner l'original, c'est le seul format disponible
            return setSelecteur('original')
        } else {
            console.error("Aucuns format video n'est disponible dans le selecteur")
        }
    }, [selecteur, videoLoader, setSelecteur])

    const videoTimeUpdateHandler = useCallback(event=>{
        // console.debug("Video time update event : %O", event)
        const currentTime = event.target.currentTime
        setTimeStamp(currentTime)
    }, [setTimeStamp])

    useEffect(()=>{
        if(!fichier || !fichier.imageLoader) return // Metadata n'est pas encore genere
        const loaderImage = fichier.imageLoader

        // console.debug("Fichier video loader : ", loaderImage)

        let imageChargee = null
        loaderImage.load()
            .then(image=>{
                imageChargee = image
                // console.debug("Image poster chargee : %O", image)
                setPosterObj(image)
            })
            .catch(err=>console.error("Erreur chargement poster : %O", err))
        
        return () => {
            // console.debug("Revoking blob %O", imageChargee)
            URL.revokeObjectURL(imageChargee)
        }
    }, [fichier, setPosterObj])

    useEffect(()=>{
        if(!selecteur || !fichier.videoLoader) return setSrcVideo('')

        // Reset indicateurs
        setVideoChargePret(false)
        setErrVideo('')

        fichier.videoLoader.load(selecteur, {genererToken: true})
            .then(src=>setSrcVideo(src))
            .catch(err=>console.error("AfficherVideo erreur chargement video : %O", err))
    }, [fichier, selecteur, setSrcVideo, setVideoChargePret, setErrVideo])

    const onProgress = useCallback(event => {
        console.debug("onProgress ", event)
        // Le video n'est pas necessairement pret, mais onCanPlay n'est pas lance sur mobiles (iOS)
        setVideoChargePret(true)
    }, [setVideoChargePret])
    const onPlay = useCallback(param => console.debug("onPlay ", param), [])
    const onError = useCallback(param => {
        console.debug("onError ", param)
        setErrVideo('Erreur chargement video')
        setVideoChargePret(false)
    }, [setVideoChargePret, setErrVideo])
    const onWaiting = useCallback(param => console.debug("onWaiting ", param), [])
    const onCanPlay = useCallback(param => {
        console.debug("onCanPlay ", param)
        setVideoChargePret(true)
        setErrVideo('')
    }, [setVideoChargePret, setErrVideo])
    const onAbort = useCallback(param => console.debug("onAbort ", param), [])
    const onEmptied = useCallback(param => console.debug("onEmptied ", param), [])

    return (
        <div>
            <Row>
                
                <Col md={12} lg={8}>
                    <PlayerEtatPassthrough
                        posterObj={posterObj}
                        srcVideo={srcVideo}
                        selecteur={selecteur}
                        videoChargePret={videoChargePret}
                        errVideo={errVideo} >
                            <VideoViewer videos={srcVideo} poster={posterObj} height='100%' width='100%' 
                                selecteur={selecteur} 
                                onTimeUpdate={videoTimeUpdateHandler} 
                                timeStamp={timeStamp} 
                                onProgress={onProgress}
                                onPlay={onPlay}
                                onError={onError}
                                onWaiting={onWaiting}
                                onCanPlay={onCanPlay}
                                onAbort={onAbort}
                                onEmptied={onEmptied}
                                />
                    </PlayerEtatPassthrough>
                </Col>

                <Col>
                    <PanneauInformation 
                        fichier={fichier}
                        nomFichier={nomFichier}
                        fermer={props.fermer}
                        showInfoModalOuvrir={showInfoModalOuvrir}
                        videos={videos}
                        support={support}
                        selecteur={selecteur}
                        setSelecteur={setSelecteur}
                        />
                </Col>

            </Row>

            {/* <AfficherLiensVideo srcVideo={srcVideo} show={!!genererToken} /> */}

        </div>
    )
}

export default AfficherVideo

function PlayerEtatPassthrough(props) {

    const {posterObj, srcVideo, selecteur, videoChargePret, errVideo} = props

    const [delaiSelecteur, setDelaiSelecteur] = useState(false)

    useEffect(()=>{
        // Fait un de-bump sur switch de stream
        if(selecteur) {
            const t = setTimeout(()=>setDelaiSelecteur(selecteur), 300)
            return () => clearTimeout(t)
        }
    }, [srcVideo, setDelaiSelecteur])

    if(!posterObj || !srcVideo || delaiSelecteur !== selecteur) {
        return (
            <div>
                <p>
                    <i className="fa fa-spinner fa-spin"/> ... Chargement en cours ...
                </p>
            </div>
        )
    }

    if(errVideo) {
        return (
            <Alert variant="danger">
                <Alert.Heading>Erreur</Alert.Heading>
                <p>Erreur durant le chargement du video.</p>
            </Alert>
        )
    }

    return (
        <div>
            {props.children}
            {(!errVideo && !videoChargePret)?
                <p>
                    <i className="fa fa-spinner fa-spin"/> ... Chargement en cours ...
                </p>
            :''}
        </div>
    )
}


function PanneauInformation(props) {

    const { fichier, nomFichier, fermer, showInfoModalOuvrir, videos, support, selecteur, setSelecteur } = props

    return (
        <div>
            <h3>{nomFichier}</h3>
                    
                <Button onClick={fermer}>Retour</Button>

                <h3>Operation</h3>
                <Row>
                    <Col>
                        <Button variant="secondary" onClick={showInfoModalOuvrir}>Convertir</Button>
                    </Col>
                </Row>

                <h3>Afficher</h3>

                <SelecteurResolution 
                    listeVideos={videos} 
                    support={support}
                    selecteur={selecteur} setSelecteur={setSelecteur} 
                    videoLoader={fichier.videoLoader} />
        </div>
    )
}


function SelecteurResolution(props) {
    const { listeVideos, /*support,*/ selecteur, setSelecteur, videoLoader } = props

    const [listeOptions, setListeOptions] = useState([])

    useEffect(()=>{
        if(!listeVideos || !videoLoader) return

        const options = videoLoader.getSelecteurs()
        options.sort(trierLabelsVideos)

        setListeOptions(options)

    }, [listeVideos, setListeOptions, videoLoader])

    const changerSelecteur = useCallback(value=>setSelecteur(value), [setSelecteur])

    return (
        <>
            <p>Selecteur</p>
            <DropdownButton title={selecteur} variant="secondary" onSelect={changerSelecteur}>
                {listeOptions.map(item=>{
                    if(item === selecteur) {
                        return <Dropdown.Item key={item} eventKey={item} active>{item}</Dropdown.Item>
                    } else {
                        return <Dropdown.Item key={item} eventKey={item}>{item}</Dropdown.Item>
                    }
                })}
            </DropdownButton>
        </>
    )
}

// function AfficherLiensVideo(props) {
//     const { show, srcVideo } = props

//     if(!show) return ''

//     // console.debug("VIDEOS : %O", srcVideo)

//     return (
//         <div>
//             <h3>Liens video</h3>
//             {srcVideo.map(item=>{
//                 return <LienVideo key={item.fuuid||item.label} video={item} /> 
//             })}
//         </div>
//     )
// }

// function LienVideo(props) {
//     const video = props.video
//     const nomVideo = video.codecVideo || video.mimetype || video.src
//     return (
//         <Row>
//             <Col>
//                 <a href={video.src} target="_top">{nomVideo}</a>
//             </Col>
//         </Row>
//     )
// }