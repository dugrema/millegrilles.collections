import {useState, useEffect, useCallback, useMemo} from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'

import Alert from 'react-bootstrap/Alert'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import ProgressBar from 'react-bootstrap/ProgressBar'

import MediaLoader from '@dugrema/millegrilles.reactjs/src/mediaLoader'
import { supporteFormatVideo } from '@dugrema/millegrilles.reactjs/src/detecterAppareils'

import VideoViewer from './VideoViewer'

import useWorkers, { useCapabilities } from './WorkerContext'

const HTTP_STATUS_ATTENTE = [202, 204]
const HTTP_STATUS_ABANDONNER = [401, 403, 404]

const RETRY_DELAY_HTTP_ERROR = 20_000

export function WrapperPlayer(props) {
    const { selecteur, abLoop, timeStamp, setTimeStamp, onLoad, fichier: fichierProps } = props

    const contactId = useSelector(state=>state.fichiers.partageContactId)

    const workers = useWorkers()

    const fichier = useMemo(()=>{
        // console.debug("Fichier modifie : ", fichierProps)
        return fichierProps || {}
    }, [fichierProps])

    const videoPortraitCss = useMemo(()=>{
        const { version_courante } = fichier || {}
        const { width, height } = version_courante
        // console.debug("WrapperPlayer Detect portrait/landscape pour video ", fichier)
        if(width && height) {
            if(width < height) return 'portrait'
        }
        return ''
    }, [fichier])

    const tuuid = fichier.tuuid

    const videoLoader = useMemo(()=>{
        const { connexion, traitementFichiers } = workers
        console.debug("videoLoader fichier: %O, contactId: %O", fichier, contactId)
        const version_courante = fichier.version_courante
        const {fuuid, video} = version_courante
        const creerTokenStreamInst = commande => {
            const commandeV2 = { fuuid }
            if(commande.fuuidStream && commande.fuuidStream !== fuuid) {
                // Remplacer le fuuid par fuuidStream - le fuuid devient la reference de dechiffrage
                commandeV2.fuuid = commande.fuuidStream
                commandeV2.fuuid_ref = fuuid
            }
            if(contactId) commandeV2.contact_id = contactId
            console.debug("creerTokenStreamInst Commande V2 %O, fichier %O", commandeV2, fichier)
    
            return connexion.creerTokenStream(commandeV2)
        }        
        const mediaLoader = new MediaLoader(traitementFichiers.getUrlFuuid, traitementFichiers.getCleSecrete, creerTokenStreamInst)        
        console.debug("Nouveau mediaLoad : ", mediaLoader)

        const mimetype = fichier.mimetype || version_courante.mimetype

        console.debug("Creer videoloader avec video : %O, fuuid %O, mimetype %O", video, fuuid, mimetype)

        const videoLoader = mediaLoader.videoLoader(video || {}, {fuuid, mimetype})
        return videoLoader
    }, [workers, fichier, contactId])

    const [selecteurCourant, setSelecteurCourant] = useState('')
    const [srcVideo, setSrcVideo] = useState('')
    const [posterObj, setPosterObj] = useState('')
    // const [genererToken, setGenererToken] = useState(false)
    const [jumpToTimeStamp, setJumpToTimeStamp] = useState(null)
    const [videoChargePret, setVideoChargePret] = useState(false)
    const [errVideo, setErrVideo] = useState('')
    const [progresChargement, setProgresChargement] = useState(0)
    const [abortController, setAbortController] = useState(new AbortController())

    const setErrVideoCb = useCallback(err=>{
        // console.trace("WrapperPlayer Erreur video ", err)
        setErrVideo(err)
        if(err) {
            if(err.progres !== undefined) {
                setProgresChargement(err.progres)
            }
            //setVideoChargePret(false)
        }
    }, [setErrVideo, setVideoChargePret, setProgresChargement])

    const videoTimeUpdateHandler = useCallback(event=>{
        // console.debug("Video time update event : %O", event)
        const currentTime = event.target.currentTime
        if(abLoop) {
            if(abLoop.b <= currentTime) {
                // console.debug("Loop to ", abLoop.a)
                setTimeStamp(abLoop.a)
                setJumpToTimeStamp(abLoop.a)
                setTimeout(()=>setJumpToTimeStamp(-1), 100)
            }
        }
        setTimeStamp(currentTime)
    }, [abLoop, setTimeStamp, setJumpToTimeStamp])

    const majChargement = useCallback(info=>{
        // console.debug("Maj chargement ", info)
        if(info.status === 200) {
            // Complete
            setProgresChargement(100)
        } else if(HTTP_STATUS_ATTENTE.includes(info.status)) {
            const headers = info.headers
            // console.debug("headers ", headers)
            setErrVideo('')

            const position = Number.parseInt(headers['x-file-position']),
                  taille = Number.parseInt(headers['x-file-size'])

            const progres =  Math.floor(100.0 * position / taille)
            // console.debug("Progres ", progres)
            setProgresChargement(progres)
        } else if(HTTP_STATUS_ABANDONNER.includes(info.status) ){
            setProgresChargement(-1)
        }
    }, [setProgresChargement, setErrVideo])

    useEffect(()=>{
        if(!fichier || !fichier.imageLoader) return // Metadata n'est pas encore genere
        const loaderImage = fichier.imageLoader

        // console.debug("Fichier video loader : ", loaderImage)

        let imageChargee = null
        loaderImage.load({setFirst: setPosterObj})
            .then(image=>{
                imageChargee = image
                // console.debug("Image poster chargee : %O", image)
                setPosterObj(image)
            })
            .catch(err=>{
                if(err.response) {
                    console.error("WrapperPlayer Erreur chargement poster (HTTP: %s)", err.response.status)
                } else {
                    console.error("WrapperPlayer Erreur chargement poster : %O", err)
                }
            })

        return () => {
            // console.debug("Revoking blob %O", imageChargee)
            loaderImage.unload().catch(err=>console.error("WrapperPlayer AfficherVideo erreur unload poster video ", err))
        }
    }, [fichier, setPosterObj])

    // Gerer l'annulation d'un download de video
    useEffect(()=>{
        // console.debug("Nouveau abortController ", abortController)
        return () => {
            // console.warn("Abort")
            abortController.abort()
        }
    }, [abortController])

    useEffect(()=>{
        if(!tuuid || !selecteurCourant) return
        // console.info("Annuler chargement video du fichier")
        setAbortController(new AbortController())
    }, [tuuid, selecteurCourant, setAbortController])

    // Debounce : eviter un reload si aucun changement
    useEffect(()=>{
        if(selecteur !== selecteurCourant) setSelecteurCourant(selecteur)
    }, [selecteur, selecteurCourant, setSelecteurCourant])

    useEffect(()=>{
        // console.debug("WrapperPlayer useEffect videoLoader %O, selecteurCourant %O, abortController check", videoLoader, selecteurCourant)
        if(!selecteurCourant || !videoLoader || abortController.aborted === true) return setSrcVideo('')

        // Reset indicateurs
        setVideoChargePret(false)
        setErrVideoCb('')
        setProgresChargement(0)

        // console.debug("AfficherVideo selecteur ", selecteur)

        videoLoader.load({selecteur})
            .then(async src => {
                // console.debug("WrapperPlayer videoLoader.load resultat : ", src)
                await attendreChargement(src, majChargement, setSrcVideo, setErrVideoCb, abortController.signal)
                // console.info("WrapperPlayer attendreChargement termine")
            })
            .catch(err=>{
                console.error("WrapperPlayer AfficherVideo erreur chargement video : %O", err)
                setErrVideoCb({err, message: 'Erreur chargement video (general)'})
                setVideoChargePret(true)
                setProgresChargement('')
            })
    }, [
        videoLoader, selecteurCourant, abortController, 
        setSrcVideo, setVideoChargePret, setProgresChargement, setErrVideoCb
    ])

    const onProgress = useCallback(event => {
        // console.debug("onProgress ", event)
        // Le video n'est pas necessairement pret, mais onCanPlay *n'est pas* lance sur mobiles (iOS)
        setVideoChargePret(true)
    }, [setVideoChargePret])
    const onPlay = useCallback(param => {
        // console.debug("onPlay ", param)
    }, [])
    const onError = useCallback(event => {
        const target = event.target
        console.debug("WrapperPlayer Erreur load video ", event)
        if(target && target.nodeName === 'SOURCE') {
            // Iterer les sources (automatique). Declarer erreur juste s'il n'y a pas de source suivante.
            if(!target.nextSibling) {
                setErrVideoCb({message: 'Erreur chargement video'})
                setVideoChargePret(false)
            }
        }
    }, [setVideoChargePret, setErrVideoCb])
    const onWaiting = useCallback(param => {
        // console.debug("onWaiting ", param)
        setVideoChargePret(false)
    }, [setVideoChargePret])
    const onCanPlay = useCallback(param => {
        // console.debug("onCanPlay ", param)
        setVideoChargePret(true)
        setErrVideo('')
    }, [setVideoChargePret, setErrVideo])
    const onAbort = useCallback(param => console.debug("onAbort ", param), [])
    const onEmptied = useCallback(param => console.debug("onEmptied ", param), [])

    useEffect(()=>{
        if(onLoad && srcVideo) onLoad(srcVideo.src)
    }, [onLoad, srcVideo])

    return (
        <div className={'player-wrapper ' + videoPortraitCss}>
            <ProgresChargement 
                value={progresChargement} 
                srcVideo={srcVideo} 
                videoChargePret={videoChargePret} 
                errVideo={errVideo} 
                />
            <PlayerEtatPassthrough
                posterObj={posterObj}
                srcVideo={srcVideo}
                selecteur={selecteur}
                videoChargePret={videoChargePret}
                errVideo={errVideo} 
                posterPresent={!!fichier.imageLoader}
                className={videoPortraitCss}>
                    <VideoViewer 
                        srcVideo={srcVideo}
                        poster={posterObj} 
                        // height='100%' 
                        width='100%' 
                        onTimeUpdate={videoTimeUpdateHandler} 
                        timeStamp={timeStamp} 
                        jumpToTimeStamp={jumpToTimeStamp}
                        onProgress={onProgress}
                        onPlay={onPlay}
                        onError={onError}
                        onWaiting={onWaiting}
                        onCanPlay={onCanPlay}
                        onAbort={onAbort}
                        onEmptied={onEmptied}
                        />
            </PlayerEtatPassthrough>
        </div>
    )
}

async function attendreChargement(source, majChargement, setSrcVideo, setErrVideo, abortSignal) {

    if(abortSignal.aborted) {
        // console.warn("attendreChargement Video aborted avant debut du chargement : ", abortSignal)
        return
    }

    try {
        const url = source.src
        let attenteCycle = 2_000
        while(!abortSignal.aborted) {
            attenteCycle = 2_000
            // S'assurer que le video est pret dans le back-end
            try {
                // console.debug("attendreChargement HEAD ", url)
                const reponse = await axios({
                    method: 'HEAD',
                    url,
                    timeout: 20_000,
                    signal: abortSignal
                })
                majChargement(reponse)
                if( ! HTTP_STATUS_ATTENTE.includes(reponse.status) ) {
                    if(reponse.status !== 200) {
                        setErrVideo({
                            status: reponse.status, 
                            message: `Erreur chargement video : video non disponible (code: ${reponse.status})`
                        })
                        return
                    }
                    break
                }
            } catch(err) {
                const reponse = err.response
                if(reponse) {
                    if([401, 403, 404].includes(reponse.status)) {
                        // Erreur irrecuperable
                        setErrVideo({
                            status: reponse.status, 
                            message: `Erreur chargement video : video non disponible (code: ${reponse.status})`
                        })
                        majChargement(reponse)
                        return
                    } else {
                        // Autre erreur, probablement recuperable. Marquer erreur et reessayer.
                        setErrVideo({
                            retry: RETRY_DELAY_HTTP_ERROR,
                            status: reponse.status, 
                            message: `Erreur chargement video (code: ${reponse.status})`
                        })
                        attenteCycle = RETRY_DELAY_HTTP_ERROR
                    }
                    majChargement(reponse)
                } else {
                    setErrVideo({err, message: `Erreur generique chargement video : ${''+err}`})
                    return
                }
            }
            await new Promise(resolve=>setTimeout(resolve, attenteCycle))
        }
        setSrcVideo(source)
    } catch(err) {
        console.error("Erreur HEAD : ", err)
        setErrVideo({err, message: 'Erreur chargement video (preparation)'})
    }
}

function ProgresChargement(props) {

    const { value, srcVideo, errVideo, videoChargePret } = props

    const [show, setShow] = useState(true)

    const label = useMemo(()=>{
        if(isNaN(value)) return ''
        if(videoChargePret) {
            return <div>Chargement complete</div>
        }
        if(value === 100) {
            if(!srcVideo) {
                return <div><i className="fa fa-spinner fa-spin"/>{' '}Preparation sur le serveur</div>
            } else if(!videoChargePret) {
                return <div><i className="fa fa-spinner fa-spin"/>{' '}Ouverture du video</div>
            }
        }
        return <div><i className="fa fa-spinner fa-spin"/>{' '}Chargement en cours :{' '}{value}%</div>
    }, [value, srcVideo, videoChargePret])

    useEffect(()=>{
        if(value === null || value === -1 || value === '') setShow(false)
        else if(value === 100 && srcVideo && videoChargePret) {
            setTimeout(()=>setShow(false), 1500)
        } else {
            setShow(true)
        }
    }, [value, setShow, videoChargePret])

    // if(!show) return ''

    return (
        <div className='progres-chargement'>
            <Alert show={!!show} variant='dark' className='progres-indicateur'>
                <Row>
                    <Col xs={12} className='label'>{label}</Col>
                    <Col xs={12}><ProgressBar now={value} striped animated /></Col>
                </Row>
            </Alert>
            <ErreurChargement errVideo={errVideo} />
        </div>
    )
}

function PlayerEtatPassthrough(props) {

    const {posterObj, srcVideo, selecteur, videoChargePret, posterPresent, errVideo, className} = props

    const classNameAdditionnel = className || ''

    const [delaiSelecteur, setDelaiSelecteur] = useState(false)

    // useEffect(()=>{
    //     console.debug("PlayerEtatPassthrough Erreur video : ", errVideo)
    // }, [errVideo])

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
            <div className={'video-window video-empty ' + classNameAdditionnel}>
                {props.children}
            </div>
        )
    }

    if((!posterObj && posterPresent !== false) || !srcVideo || delaiSelecteur !== selecteur) {

        let message = null

        if(posterObj) {
            return (
                <div className={'video-window ' + classNameAdditionnel}>
                    <img src={posterObj} width='100%' />
                    {message}
                </div>
            )
        } else {
            return (
                <div className={'video-window ' + classNameAdditionnel}>
                    {message}
                </div>

            )
        }
    }

    return (
        <div>
            <div className={'video-window ' + classNameAdditionnel}>
                {props.children}
            </div>
        </div>
    )
}

function ErreurChargement(props) {
    const {errVideo} = props
    return (
        <Alert show={!!errVideo} variant="danger">
            <Alert.Heading>Erreur</Alert.Heading>
            {errVideo.retry?
                <p>Delai dans le chargement du video.</p>
            :
                <p>Erreur durant le chargement du video.</p>
            }
            {errVideo.status?
                <p>Detail : HTTP {errVideo.status}</p>
            :''}
        </Alert>
    )
}

export function SelecteurResolution(props) {
    const { fichier, selecteur, setSelecteur } = props

    const capabilities = useCapabilities()

    const changerSelecteur = useCallback(value=>{
        // if(Number.parseInt(value)) window.localStorage.setItem('videoResolution', value)
        // console.debug("changerSelecteur : ", value)
        setSelecteur(value)
    }, [setSelecteur])

    const selecteurs = useMemo(()=>{
        if(!fichier || !fichier.version_courante) return
        const version_courante = fichier.version_courante
        const videos = version_courante.video || {}
        // if(!version_courante || !version_courante.video) return 
        const paramsOpts = {
            fuuid: version_courante.fuuid, mimetype: fichier.mimetype, 
            height: version_courante.height, width: version_courante.width,
            codec: version_courante.videoCodec,
            supportMedia: capabilities.video
        }
        const selecteurs = determinerSelecteursVideos(videos, paramsOpts)
        // console.debug("SelecteurResolution selecteurs ", selecteurs)
        return selecteurs
    }, [fichier, capabilities])

    // Identifier un selecteur initial pour declencher le chargement automatique
    useEffect(()=>{
        // console.debug("SelecteurResolution selecteur %O, selecteurs %O", selecteur, selecteurs)
        if(selecteur || !selecteurs) return  // Deja initialise
        const selecteursKeys = Object.keys(selecteurs)

        const defaultSelecteur = window.localStorage.getItem('videoResolution')

        if(!selecteurs.resolutions || Object.keys(selecteurs.resolutions).length === 0) {
            // Choisir fallback, sinon original
            // if(selecteurs.fallback) return setSelecteur('fallback')
            // return setSelecteur('original')
            return setSelecteur('')
        }

        if(defaultSelecteur && selecteurs.resolutions) {
            const resolutions = selecteurs.resolutions
            // Tenter de trouver une resolution qui correspond au selecteur
            if(resolutions[defaultSelecteur]) return setSelecteur(defaultSelecteur)

            // Hacky, trouver resolution la plus elevee disponible par rapport au selecteur
            const resolutionDefault = Number.parseInt(defaultSelecteur)
            const resolutionListe = Object.keys(resolutions).map(item=>Number.parseInt(item))
            resolutionListe.sort()
            resolutionListe.reverse()
            for(const resolutionInt of resolutionListe) {
                if(resolutionInt <= resolutionDefault) {
                    if(resolutionInt < 1000) {
                        return setSelecteur('0'+resolutionInt)
                    } else {
                        return setSelecteur(''+resolutionInt)
                    }
                }
            }

            // Fallback
            return setSelecteur('')
        } else {
            console.error("Aucuns format video n'est disponible dans le selecteur")
        }
    }, [selecteurs, selecteur, setSelecteur])

    return (
        <DropdownButton title={selecteur} variant="secondary" onSelect={changerSelecteur}>
            <SelecteurVideoContenu fichier={fichier} selecteurs={selecteurs} selecteur={selecteur} setSelecteur={changerSelecteur} />
        </DropdownButton>
    )
}

function SelecteurVideoContenu(props) {
    const { fichier, selecteurs, selecteur, setSelecteur } = props
    return <SelecteurVideoResolution {...props} />
}

function SelecteurVideoResolution(props) {
    const { selecteurs, selecteur } = props

    const listeOptions = useMemo(()=>{
        // if(!selecteurs) return [{key: 'original', label: 'Original'}]
        if(!selecteurs) return [{key: '', label: 'Aucun format disponible'}]

        // console.debug("SelecteurVideoResolution selecteurs", selecteurs)

        let originalSupporte = false

        const resolutions = selecteurs.resolutions
        const optionKeys = Object.keys(resolutions)
        optionKeys.sort()
        optionKeys.reverse()
        const options = optionKeys.map(key=>{ 
            const valeur = resolutions[key]
            const label = '' + Number.parseInt(key) + 'p'
            const original = valeur.reduce((acc, item)=>acc || item.original, false)
            if(original) originalSupporte = true
            return {key, label, original} 
        })
        // if(selecteurs.fallback) options.push({key: 'fallback', label: 'fallback'})
        if(selecteurs.original) {
            // Mettre un 'spacer' au debut pour indiquer qu'il n'y a pas de selection automatique
            options.unshift({key: '', label: 'Selectionner'})
            // Ajouter option a la fin - quand meme permettre de selectionner l'original si l'option
            // n'est pas disponible
            options.push({key: 'original', label: 'Original - non supporte'})
        } else if(originalSupporte) {
            // Ajouter l'original a la fin
            options.push({key: 'original', label: 'Original'})            
        }
        return options
    }, [selecteurs])

    return listeOptions.map(item=>{
        const key = item.original?'original':item.key
        const keyReact = item.original?key+'original':item.key
        if(item.key === selecteur) {
            return <Dropdown.Item key={keyReact} eventKey={key} active>{item.label}</Dropdown.Item>
        } else {
            return <Dropdown.Item key={keyReact} eventKey={key}>{item.label}</Dropdown.Item>
        }
    })
}

export function determinerSelecteursVideos(videos, original) {
    // console.debug("determinerSelecteursVideos %O, original %O", videos, original)

    // Information original (optionnel)
    const { fuuid, mimetype, height, width, codec, supportMedia } = original

    const bucketResolution = {}
    const bucketDetail = []
    const buckets = { resolutions: bucketResolution, detail: bucketDetail }

    if(fuuid && mimetype) {
        if(codec && height && width) {
            // Injecter le fichier original comme etat une resolution disponible
            videos = {...videos, original: {
                codec, fuuid, fuuid_video: fuuid, width, height, mimetype, quality: 1, original: true
            }}
        } else {
            buckets.original = [{fuuid, fuuid_video: fuuid, width, height, codec}]
        }
    }

    for(const key of Object.keys(videos)) {
        const video = videos[key]
        const { codec, fuuid_video, width, height, mimetype, quality, original } = video
        let resolution = video.resolution || Math.min(width, height)

        const infoVideo = {
            fuuid,
            fuuid_video,
            width,
            height,
            mimetype,
            resolution,
            codec,
            header: video.header,
            format: video.format,
            original,
        }
        // console.debug("InfoVideo %O (video elem %O)", infoVideo, key)

        // Ajouter key original pour selection individuelle
        // const cle = `${resolution};${mimetype};${codec};${quality}`
        bucketDetail.push(infoVideo)

        // if(codec === 'h264' && resolution <= 360) {
        //     buckets.fallback = infoVideo
        // }

        // Calculer bucket resolution
        let resolutionTag = null
        if(resolution >= 1080) resolutionTag = '1080'
        else if(resolution < 1080 && resolution >= 720) resolutionTag = '0720'
        else if(resolution < 720 && resolution >= 480) resolutionTag = '0480'
        else if(resolution < 480 && resolution >= 360) resolutionTag = '0360'
        else if(resolution < 360) resolutionTag = '0270'
        
        // Inserer label (selecteur) pour le tag
        if(resolutionTag) {
            let liste = bucketResolution[resolutionTag]
            if(!liste) {
                liste = []
                bucketResolution[resolutionTag] = liste
            }
            liste.push(infoVideo)
        }
    }

    // Cleanup des buckets de resolution si aucun codec n'est supporte
    const resolutions = buckets.resolutions
    const keysResolution = Object.keys(resolutions)
    for(const key of keysResolution) {
        const listeVideos = resolutions[key]
        let supporte = false
        for(const video of listeVideos) {
            if(supportMedia[video.codec]) {
                // Verification incluant le mimetype
                const verifMimetype = ['probably', 'maybe'].includes(supporteFormatVideo(video.mimetype))
                // console.debug("Resultat verif mimetype video : ", verifMimetype)
                supporte = verifMimetype
                break
            }
        }
        // Retirer cette resolution
        if(!supporte) delete resolutions[key]
    }

    return buckets
}