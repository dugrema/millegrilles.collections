import {useState, useEffect, useCallback, useMemo} from 'react'
import axios from 'axios'

import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import ProgressBar from 'react-bootstrap/ProgressBar'

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
    const [progresChargement, setProgresChargement] = useState(0)

    const selecteurs = useMemo(()=>videoLoader.getSelecteurs(), [videoLoader])

    // useEffect(()=>{
    //     if(selecteur || !selecteurs) return  // Deja initialise
    //     // Identifier un selecteur initial
    //     // const selecteurs = videoLoader.getSelecteurs()
    //     if(!selecteurs) {
    //         return setSelecteur('original')
    //     } else if(selecteurs.includes('faible')) {
    //         return setSelecteur('faible')
    //     } else if(selecteurs.includes('medium')) {
    //         return setSelecteur('medium')
    //     } else if(selecteurs.includes('haute')) {
    //         return setSelecteur('haute')
    //     } else if(selecteurs.includes('original')) {
    //         // Selectionner l'original, c'est le seul format disponible
    //         return setSelecteur('original')
    //     } else {
    //         console.error("Aucuns format video n'est disponible dans le selecteur")
    //     }
    // }, [selecteurs, selecteur, setSelecteur])

    const videoTimeUpdateHandler = useCallback(event=>{
        // console.debug("Video time update event : %O", event)
        const currentTime = event.target.currentTime
        setTimeStamp(currentTime)
    }, [setTimeStamp])

    const majChargement = useCallback(info=>{
        console.debug("Maj chargement ", info)
        if(info.status === 200) {
            // Complete
            setProgresChargement(100)
        } else if(info.status === 202) {
            const headers = info.headers
            console.debug("headers ", headers)

            const position = Number.parseInt(headers['x-file-position']),
                  taille = Number.parseInt(headers['x-file-size'])

            const progres =  Math.floor(100.0 * position / taille)
            console.debug("Progres ", progres)
            setProgresChargement(progres)
        }
    }, [setProgresChargement])

    useEffect(()=>{
        if(!fichier || !fichier.imageLoader) return // Metadata n'est pas encore genere
        const loaderImage = fichier.imageLoader

        // console.debug("Fichier video loader : ", loaderImage)

        let imageChargee = null
        loaderImage.load({setFirst: setPosterObj})
            .then(image=>{
                imageChargee = image
                console.debug("Image poster chargee : %O", image)
                setPosterObj(image)
            })
            .catch(err=>console.error("Erreur chargement poster : %O", err))

        return () => {
            console.debug("Revoking blob %O", imageChargee)
            loaderImage.unload().catch(err=>console.error("AfficherVideo erreur unload poster video ", err))
        }
    }, [fichier, setPosterObj])

    useEffect(()=>{
        if(!selecteur || !fichier.videoLoader) return setSrcVideo('')

        // Reset indicateurs
        setVideoChargePret(false)
        setErrVideo('')
        setProgresChargement(0)

        // fichier.videoLoader.load(selecteur, {genererToken: true})
        // fichier.videoLoader.load({selecteur})
        //     .then(async src => {
        //         try {
        //             // console.debug("HEAD src : ", src)
        //             const sourceHead = src[0].src
                    
        //             while(true) {
        //                 // S'assurer que le video est pret dans le back-end
        //                 const reponse = await axios({
        //                     method: 'HEAD',
        //                     url: sourceHead,
        //                     timeout: 20_000,
        //                 })
        //                 majChargement(reponse)
        //                 if(reponse.status !== 202) break
        //                 await new Promise(resolve=>setTimeout(resolve, 2000))
        //             }

        //             // console.debug("Reponse head ", reponse)
        //             setSrcVideo(src)
        //         } catch(err) {
        //             console.error("Erreur HEAD : ", err)
        //             setErrVideo('Erreur chargement video (preparation)')
        //         }
        //     })
        //     .catch(err=>{
        //         console.error("AfficherVideo erreur chargement video : %O", err)
        //         setErrVideo('Erreur chargement video (general)')
        //     })

        fichier.videoLoader.load({selecteur})
            .then(async src => {
                console.debug("videoLoader.load resultat : ", src)
                return attendreChargement(src, majChargement, setSrcVideo, setErrVideo)
            })
            .catch(err=>{
                console.error("AfficherVideo erreur chargement video : %O", err)
                setErrVideo('Erreur chargement video (general)')
            })
    }, [fichier, selecteur, setSrcVideo, setVideoChargePret, setProgresChargement, setErrVideo])

    const onProgress = useCallback(event => {
        // console.debug("onProgress ", event)
        // Le video n'est pas necessairement pret, mais onCanPlay n'est pas lance sur mobiles (iOS)
        setVideoChargePret(true)
    }, [setVideoChargePret])
    const onPlay = useCallback(param => console.debug("onPlay ", param), [])
    const onError = useCallback(event => {
        const target = event.target
        // console.debug("Erreur load video ", event)
        if(target && target.nodeName === 'SOURCE') {
            // Iterer les sources (automatique). Declarer erreur juste s'il n'y a pas de source suivante.
            if(!target.nextSibling) {
                setErrVideo('Erreur chargement video')
                setVideoChargePret(false)
            }
        }
    }, [setVideoChargePret, setErrVideo])
    const onWaiting = useCallback(param => console.debug("onWaiting ", param), [])
    const onCanPlay = useCallback(param => {
        // console.debug("onCanPlay ", param)
        setVideoChargePret(true)
        setErrVideo('')
    }, [setVideoChargePret, setErrVideo])
    const onAbort = useCallback(param => console.debug("onAbort ", param), [])
    const onEmptied = useCallback(param => console.debug("onEmptied ", param), [])

    return (
        <div>
            <Row>
                
                <Col>
                    <PlayerEtatPassthrough
                        posterObj={posterObj}
                        srcVideo={srcVideo}
                        selecteur={selecteur}
                        videoChargePret={videoChargePret}
                        errVideo={errVideo} >
                            <VideoViewer 
                                // videos={srcVideo} 
                                srcVideo={srcVideo}
                                poster={posterObj} 
                                height='100%' 
                                width='100%' 
                                // selecteurs={selecteurs}
                                // selecteur={selecteur} 
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
                    <ProgresChargement value={progresChargement} srcVideo={srcVideo} />
                </Col>
            </Row>
            <Row>
                <Col>
                    <PanneauInformation 
                        fichier={fichier}
                        nomFichier={nomFichier}
                        fermer={props.fermer}
                        showInfoModalOuvrir={showInfoModalOuvrir}
                        videos={videos}
                        support={support}
                        selecteurs={selecteurs}
                        selecteur={selecteur}
                        setSelecteur={setSelecteur}
                        />
                </Col>

            </Row>

        </div>
    )
}

export default AfficherVideo

async function attendreChargement(source, majChargement, setSrcVideo, setErrVideo) {
    try {
        const url = source.src
        while(true) {
            // S'assurer que le video est pret dans le back-end
            const reponse = await axios({
                method: 'HEAD',
                url,
                timeout: 20_000,
            })
            majChargement(reponse)
            if(reponse.status !== 202) break
            await new Promise(resolve=>setTimeout(resolve, 2000))
        }
        setSrcVideo(source)
    } catch(err) {
        console.error("Erreur HEAD : ", err)
        setErrVideo('Erreur chargement video (preparation)')
    }
}

function ProgresChargement(props) {

    const { value, srcVideo } = props

    const [show, setShow] = useState(true)

    const label = useMemo(()=>{
        if(isNaN(value)) return ''
        if(value === 100) {
            if(srcVideo) {
                return <div><i className="fa fa-spinner fa-spin"/>{' '}Preparation sur le serveur</div>
            } else {
                return 'Chargement complete'
            }
        }
        return <div><i className="fa fa-spinner fa-spin"/>Chargement en cours</div>
    }, [value, srcVideo])

    useEffect(()=>{
        if(value === null || value === '') setShow(false)
        else if(value === 100 && srcVideo) {
            setTimeout(()=>setShow(false), 1500)
        } else {
            setShow(true)
        }
    }, [value, setShow])

    if(!show) return ''

    return (
        <Row className='progres-chargement'>
            <Col xs={12} lg={5} className='label'>{label}</Col>
            <Col xs={10} lg={4}>
                <ProgressBar now={value} />
            </Col>
            <Col xs={2} lg={2}>{value}%</Col>
        </Row>
    )
}

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

    // Cas special pour video original sans poster (traitement media incomplet)
    if(srcVideo && !posterObj && selecteur === 'original') {
        return (
            <div className='video-window'>
                {props.children}
            </div>
        )
    }

    if(!posterObj || !srcVideo || delaiSelecteur !== selecteur) {

        let message = null
        // if(srcVideo) {
        //     message = <p><i className="fa fa-spinner fa-spin"/> ... Chargement en cours ...</p>
        // } else {
        //     message = <p><i className="fa fa-spinner fa-spin"/> ... Preparation du video sur le serveur ...</p>
        // }

        if(posterObj) {
            return (
                <div className='video-window'>
                    <img src={posterObj} width='100%' height='100%' />
                    {message}
                </div>
            )
        } else {
            return (
                <div>
                    {message}
                </div>
            )
        }
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
        <div className='video-window'>
            {props.children}
            {/* {(!errVideo && !videoChargePret)?
                <p>
                    <i className="fa fa-spinner fa-spin"/> ... Chargement en cours ...
                </p>
            :''} */}
        </div>
    )
}


function PanneauInformation(props) {

    const { fichier, nomFichier, fermer, showInfoModalOuvrir, videos, support, selecteurs, selecteur, setSelecteur } = props

    return (
        <div>
            <Row>
                <Col>
                    <Button variant="secondary" onClick={showInfoModalOuvrir}>Convertir</Button>
                </Col>

                <Col>
                    <SelecteurResolution 
                        listeVideos={videos} 
                        support={support}
                        selecteurs={selecteurs} 
                        selecteur={selecteur} 
                        setSelecteur={setSelecteur} 
                        videoLoader={fichier.videoLoader} />
                </Col>
            </Row>
        </div>
    )
}


function SelecteurResolution(props) {
    const { listeVideos, /*support,*/ selecteur, setSelecteur, /*videoLoader,*/ selecteurs } = props

    const [listeOptions, setListeOptions] = useState([])

    useEffect(()=>{
        if(selecteur || !selecteurs) return  // Deja initialise
        // Identifier un selecteur initial
        const selecteursKeys = Object.keys(selecteurs)

        if(!selecteursKeys) {
            // Aucunes options (probablement nouveau video) - utiliser original
            return setSelecteur('original')
        } else if(selecteursKeys.includes('fallback')) {
            // Selectionner le format fallback (la plus faible resolution)
            return setSelecteur('fallback')
        } else {
            console.error("Aucuns format video n'est disponible dans le selecteur")
        }
    }, [selecteurs, selecteur, setSelecteur])

    useEffect(()=>{
        // if(!listeVideos || !videoLoader) return
        if(!listeVideos || !selecteurs) return

        // const options = videoLoader.getSelecteurs()
        const options = Object.keys(selecteurs)
        options.sort(trierLabelsVideos)

        setListeOptions(options)

    }, [listeVideos, setListeOptions, selecteurs, /*, videoLoader*/])

    const changerSelecteur = useCallback(value=>setSelecteur(value), [setSelecteur])

    return (
        <>
            <span>Resolution</span>
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