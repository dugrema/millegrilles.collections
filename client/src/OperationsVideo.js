import { useCallback, useEffect, useState } from 'react'
import { proxy } from 'comlink'

import { FormatteurTaille, isTouchEnabled } from '@dugrema/millegrilles.reactjs'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import ProgressBar from 'react-bootstrap/ProgressBar'

const VIDEO_CODEC = [
  {label: 'H.264 (mp4)', value: "h264"},
  {label: 'VP9 (webm)', value: "vp9"},
]

const AUDIO_CODEC = [
  {label: 'AAC', value: "aac"},
  {label: 'Opus', value: "opus"},
]

const VIDEO_RESOLUTIONS = [
  {label: "240p", value: 240},
  {label: "320p", value: 320},
  {label: "360p", value: 360},
  {label: "480p", value: 480},
  {label: "720p", value: 720},
  {label: "1080p", value: 1080},
  {label: "1440p", value: 1440},
  {label: "2160p", value: 2160},
  {label: "4320p", value: 4320},
]

const BITRATES_VIDEO = [
  {label: "250 kbps", value: 250000},
  {label: "500 kbps", value: 500000},
  {label: "1 mbps", value: 1000000},
  {label: "1.5 mbps", value: 1500000},
  {label: "2.0 mbps", value: 2000000},
  {label: "3.0 mbps", value: 3000000},
  {label: "4.0 mbps", value: 4000000},
  {label: "8.0 mbps", value: 8000000},
]

const BITRATES_AUDIO = [
  {label: "64 kbps", value: 64000},
  {label: "128 kbps", value: 128000},
]

const evenementTranscodage = proxy(event=>{
  console.debug("Evenement transcodage : %O", event)
  if(_updateTranscodage) {
    const message = event.message || {}
    const resolution = message.height
    const mimetype = message.mimetype
    const bitrate = message.videoBitrate
  
    const cle = [mimetype, resolution, bitrate].join(';')
    const params = {
      passe: message.passe, 
      pctProgres: message.pctProgres,
      fuuid: message.fuuid,
      resolution,
      mimetype,
      bitrate
    }
    delete params['en-tete']
    delete params.signature
  
    _updateTranscodage(cle, params)
  }
})

// Utilise pour traiter messages workers (proxy callback)
var _updateTranscodage = null

export function ConversionVideo(props) {

    const { workers, support, downloadAction, etatConnexion, evenementFichier, usager } = props
    const { connexion } = workers

    const fichier = props.fichier || {}
    const versionCourante = fichier.version_courante || {}
    const mimetype = versionCourante.mimetype || ''
    const mimetypeBase = mimetype.split('/').shift()
    
    const [transcodage, setTranscodage] = useState({})

    _updateTranscodage = useCallback((key, params) => {
      const nouveauTranscodage = {...transcodage, [key]: params}
      console.debug("!!! Nouveau transcodage : %O", nouveauTranscodage)
      setTranscodage(nouveauTranscodage)
    }, [transcodage, setTranscodage])

    useEffect(()=>{
      console.debug("!!! ConversionVideo props : %O", fichier)
      if(fichier && connexion && etatConnexion) {
        const fuuid = fichier.fuuid_v_courante
        // const versionCourante = fichier.version_courante || {}
        if(fuuid && fichier.video) {
          console.debug("Ecouter transcodage %s", fuuid)
          connexion.enregistrerCallbackTranscodageProgres(fuuid, evenementTranscodage)
          return () => {
            console.debug("Arreter ecoute %s", fuuid)
            connexion.supprimerCallbackTranscodageProgres(fuuid)
          }
        }
      }
    }, [fichier, connexion, etatConnexion, evenementTranscodage])

    if(mimetypeBase !== 'video') return ''

    return (
        <>
            <h2>Conversion video</h2>
            <FormConversionVideo 
                workers={workers}
                fichier={fichier}
                updateTranscodage={_updateTranscodage}
                usager={usager}
            />

            <Videos 
              transcodage={transcodage}
              workers={workers}
              fichier={fichier}
              support={support}
              downloadAction={downloadAction}
            />
        </>
    )
}

function FormConversionVideo(props) {

    const { workers, fichier, updateTranscodage, usager } = props

    const [codecVideo, setCodecVideo] = useState('h264')
    const [codecAudio, setCodecAudio] = useState('aac')
    const [resolutionVideo, setResolutionVideo] = useState(240)
    const [bitrateVideo, setBitrateVideo] = useState(250000)
    const [bitrateAudio, setBitrateAudio] = useState(64000)
  
    if(!fichier) return ''
    const versionCourante = fichier.version_courante || {}
    if(!versionCourante.mimetype.startsWith('video/')) return ''
    const resolutionOriginal = Math.min([versionCourante.width, versionCourante.height].filter(item=>!isNaN(item)))

    const estPret = codecVideo && codecAudio && resolutionVideo && bitrateVideo && bitrateAudio
  
    const changerCodecVideo = event => { setCodecVideo(event.currentTarget.value) }
    const changerCodecAudio = event => { setCodecAudio(event.currentTarget.value) }
    const changerResolutionVideo = event => { setResolutionVideo(Number(event.currentTarget.value)) }
    const changerBitrateVideo = event => { setBitrateVideo(Number(event.currentTarget.value)) }
    const changerBitrateAudio = event => { setBitrateAudio(Number(event.currentTarget.value)) }
  
    const convertir = event => {
      convertirVideo(
        workers,
        fichier,
        {codecVideo, codecAudio, resolutionVideo, bitrateVideo, bitrateAudio},
        updateTranscodage,
        {usager}
      )
      .catch(err=>{console.error("Erreur debut transcodage video : %O", err)})
    }
  
    return (
      <>
        <Row>
          <Col xs={12} lg={6}>
            <Form>
              <SelectGroup formLabel={'Codec Video'} name={'codecVideo'} value={codecVideo} onChange={changerCodecVideo} options={VIDEO_CODEC} />
              <SelectGroup formLabel={'Resolution Video'} name={'resolutionVideo'} value={resolutionVideo} onChange={changerResolutionVideo} options={VIDEO_RESOLUTIONS} maxValue={resolutionOriginal} />
              <SelectGroup formLabel={'Bitrate Video'} name={'bitrateVideo'} value={bitrateVideo} onChange={changerBitrateVideo} options={BITRATES_VIDEO} />
              <SelectGroup formLabel={'Codec Audio'} name={'codecAudio'} value={codecAudio} onChange={changerCodecAudio} options={AUDIO_CODEC} />
              <SelectGroup formLabel={'Bitrate Audio'} name={'bitrateAudio'} value={bitrateAudio} onChange={changerBitrateAudio} options={BITRATES_AUDIO} />
      
              <Row>
                <Col>
                  <Button variant="secondary" disabled={!estPret} onClick={convertir}>Convertir</Button>
                </Col>
              </Row>
            </Form>
          </Col>

          <Col>
            <p>Notes :</p>
            <ul>
              <li>H.264 (mp4) devrait etre utilise avec le format audio AAC</li>
              <li>VP9 avec Opus donne une meilleure qualite mais n'est pas supporte par iOS (Apple)</li>
              <li>Une seule combinaison Codec Video/Resolution Video est supporee a la fois</li>
            </ul>
          </Col>

        </Row>

      </>
    )
}

function SelectGroup(props) {

  const { formLabel, name, onChange, value, options, maxValue } = props

  let optionsFiltrees = options
  if(maxValue) {
    optionsFiltrees = optionsFiltrees.filter(item=>item.value<=maxValue)
  }

  return (
    <Form.Group>
      <Row>
        <Col xs={12} lg={6}>
          <Form.Label>{formLabel}</Form.Label>
        </Col>
        <Col xs={12} lg={6}>
          <Form.Select name={name} onChange={onChange} value={value}>
            {optionsFiltrees.map(reso=>(
              <option key={reso.value} value={''+reso.value}>
                {reso.label}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>
    </Form.Group>
  )
}

async function convertirVideo(workers, fichier, params, setTranscodageVideo, opts) {
  opts = opts || {}
  console.debug("Convertir video %O (opts: %O)", params, opts)
  const { connexion } = workers

  const usager = opts.usager || {},
        extensions = usager || {},
        delegationGlobale = extensions.delegationGlobale

  const commande = {
      tuuid: fichier.tuuid,
      fuuid: fichier.fuuid_v_courante,
      ...params,
  }

  if(params.codecVideo === 'vp9') {
      commande.mimetype = 'video/webm'
  } else if(params.codecVideo === 'h264') {
      commande.mimetype = 'video/mp4'
  }

  // console.debug("Commande conversion : %O", commande)
  const cle = [commande.mimetype, params.resolutionVideo, params.bitrateVideo].join(';')
  setTranscodageVideo(
      cle,
      {
        mimetype: commande.mimetype,
        resolution: params.resolutionVideo,
        pctProgres: 0,
      }
  )

  if(delegationGlobale) {
    // Ajouter permission de dechiffrage
    commande.permission_duree = 30 * 60  // 30 minutes
    commande.permission_hachage_bytes = [fichier.fuuid_v_courante]
  }

  console.debug("Commande transcodage : %O", commande)

  const connexionWorker = workers.connexion
  connexionWorker.transcoderVideo(commande)
}

function Videos(props) {
  const { fichier, support, downloadAction, transcodage } = props
  const versionCourante = fichier.version_courante || {}
  const videos = versionCourante.video || {}

  if(!videos) return ''

  const videosTries = Object.values(videos).sort(sortVideos)

  console.debug("Videos tries : %O", videosTries)

  return (
    <>
      <h3>Formats disponibles</h3>
      {videosTries.map(video=>{
        return (
          <AfficherLigneFormatVideo 
            key={video.fuuid_video}
            fichier={fichier}
            video={video}
            playVideo={props.playVideo}
            support={support} 
            downloadAction={downloadAction}
          />
        )
      })}

      <TranscodageEnCours transcodage={transcodage} />
    </>
  )
}

function sortVideos(a, b) {
  const resoA = Math.min(a.height, a.width),
      resoB = Math.min(b.height, b.width),
      mimetypeA = a.mimetype, mimetypeB = b.mimetype

      if(resoA !== resoB) return resoB - resoA
      if(mimetypeA !== mimetypeB) {
      if(mimetypeA.endsWith('webm')) return -1
      if(mimetypeB.endsWith('webm')) return 1
    }

    return 0
}

function TranscodageEnCours(props) {

  console.debug("!! !! Transcodage en cours PROPPYS : %O", props)

  const { transcodage } = props

  if(!transcodage) return ''

  const transcodageFiltre = Object.values(transcodage).filter(item=>item.pctProgres!==100)
  transcodageFiltre.sort(triCleTranscodage)

  console.debug("Transcodage filtre : %O", transcodageFiltre)

  return (
    <>
      {transcodageFiltre.map((video, idx)=>(
        <Row key={idx}>
          <Col xs={12} md={3}>{video.mimetype.split('/').pop()}</Col>
          <Col xs={12} md={3}>{video.resolution}p</Col>
          <Col xs={10} md={5}>
            <ProgressBar now={video.pctProgres} />
          </Col>
          <Col xs={2} md={1}>
            {video.pctProgres}%
          </Col>
        </Row>
      ))}
    </>
  )
}

function triCleTranscodage(a,b) {
  const compMimetype = a.mimetype.localeCompare(b.mimetype)
  if(compMimetype !== 0) return compMimetype

  const compResolution = b.resolution - a.resolution
  if(compResolution !==0) return compResolution

  return b.bitrate - a.bitrate
}

function AfficherLigneFormatVideo(props) {
  const { fichier, video, support, downloadAction } = props

  // console.debug("!!!! AfficherLigneFormatVideo %O", props)

  const download = useCallback(event => {
    console.debug("Downloader fichier %O", props)

    const extension = video.mimetype.split('/').pop().toLowerCase()
    const resolutionListe = [video.height, video.width].filter(item=>!isNaN(item))
    const resolution = Math.min(...resolutionListe)
    // Retirer l'extension du fichier, remplacer par _resolution.ext_mimetype
    var nomFichier = fichier.nom
    nomFichier = nomFichier.split('.')
    nomFichier.pop() // Retirer l'extension, on va la remplacer par le mimetype
    nomFichier = nomFichier.join('.') + '_' + resolution + '.' + extension
  
    const infoDownload = { 
      fuuid: video.fuuid_video,
      mimetype: video.mimetype, 
      nom: nomFichier, 
      taille: video.taille_fichier,
    }
    // const fuuid = video.fuuid_video

    console.debug("Downloader %O", infoDownload)
    downloadAction(infoDownload)

  }, [fichier, video, downloadAction])

  let play = null,
      webmSupport = support.webm

  if(props.playVideo) {
    const estFallback = video.mimetype.endsWith('/mp4')
    if(estFallback || webmSupport) {
      play = event => {props.playVideo(video)}
    }
  }

  return (
    <Row>
      <Col>{video.mimetype.split('/').pop()}</Col>
      <Col>{video.width} x {video.height}</Col>
      <Col><FormatteurTaille value={video.taille_fichier} /></Col>
      <Col>
        <Button variant="secondary" onClick={download}>
          <i className="fa fa-download" />
        </Button>
        {play?
          <Button variant="secondary" onClick={play}>
            <i className="fa fa-play" />
          </Button>
          :''
        }
      </Col>
    </Row>
  )

}
  