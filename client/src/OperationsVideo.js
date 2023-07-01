import { useCallback, useEffect, useState, useMemo } from 'react'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { AfficherListeJobs } from './MediaJobsModal'

const VIDEO_CODEC = [
  {label: 'HEVC (mp4)', value: "hevc"},
  {label: 'VP9 (webm)', value: "vp9"},
  {label: 'H.264 (mp4)', value: "h264"},
]

const AUDIO_CODEC = [
  {label: 'Opus', value: "libopus"},
  {label: 'EAC3', value: "eac3"},
  {label: 'AAC', value: "aac"},
]

const VIDEO_RESOLUTIONS = [
  {label: "270p", value: 270},
  {label: "360p", value: 360},
  {label: "480p", value: 480},
  {label: "720p", value: 720},
  {label: "1080p", value: 1080},
]

const QUALITY_VIDEO = [
  {label: "Tres Faible (37)", value: 37},
  {label: "Faible (34)", value: 34},
  {label: "Moyen (32)", value: 32},
  {label: "Moyen (31)", value: 31},
  {label: "Moyen (30)", value: 30},
  {label: "Eleve (28)", value: 28},
  {label: "Tres eleve (26)", value: 26},
  {label: "Tres eleve (24)", value: 24},
  {label: "Tres eleve (23)", value: 23},
  {label: "Tres eleve (22)", value: 22},
]

const BITRATES_AUDIO = [
  {label: "64 kbps", value: 64000},
  {label: "128 kbps", value: 128000},
]

const PROFILS_VIDEO = {
  'vp9': {
    '270': {
      qualityVideo: 37,
      codecAudio: 'libopus',
      bitrateAudio: 64000,
      preset: 'fast',
    },
    '360': {
      qualityVideo: 37,
      codecAudio: 'libopus',
      bitrateAudio: 64000,
      preset: 'medium',
    },
    '480': {
      qualityVideo: 34,
      codecAudio: 'libopus',
      bitrateAudio: 128000,
      preset: 'medium',
    },
    '720': {
      qualityVideo: 32,
      codecAudio: 'libopus',
      bitrateAudio: 128000,
      preset: 'medium',
    },
    '1080': {
      qualityVideo: 31,
      codecAudio: 'libopus',
      bitrateAudio: 128000,
      preset: 'slow',
    },
    'default': {
      qualityVideo: 31,
      codecAudio: 'libopus',
      bitrateAudio: 128000,
      preset: 'slow',
    },
  },
  'hevc': {
    '270': {
      qualityVideo: 32,
      codecAudio: 'eac3',
      bitrateAudio: 64000,
      preset: 'fast',
    },
    '360': {
      qualityVideo: 28,
      codecAudio: 'eac3',
      bitrateAudio: 64000,
      preset: 'medium',
    },
    '480': {
      qualityVideo: 26,
      codecAudio: 'eac3',
      bitrateAudio: 128000,
      preset: 'slow',
    },
    '720': {
      qualityVideo: 26,
      codecAudio: 'eac3',
      bitrateAudio: 128000,
      preset: 'slow',
    },
    '1080': {
      qualityVideo: 23,
      codecAudio: 'eac3',
      bitrateAudio: 128000,
      preset: 'slow',
    },
    'default': {
      qualityVideo: 23,
      codecAudio: 'eac3',
      bitrateAudio: 128000,
      preset: 'slow',
    },
  },
  'h264': {
    '270': {
      qualityVideo: 28,
      codecAudio: 'aac',
      bitrateAudio: 64000,
      preset: 'fast',
      fallback: true,
    },
    '480': {
      qualityVideo: 26,
      codecAudio: 'aac',
      bitrateAudio: 128000,
      preset: 'medium',
    },
    'default': {
      qualityVideo: 26,
      codecAudio: 'aac',
      bitrateAudio: 128000,
      preset: 'medium',
    }
  }
}

// function parseEvenementTranscodage(evenement) {
//   const message = evenement.message || {}
//   const codec = evenement.codec || {}
//   const resolution = message.height
//   const mimetype = message.mimetype
//   const bitrate_quality = message.quality || message.videoBitrate

//   const cle = [mimetype, codec, resolution, bitrate_quality].join(';')
//   const params = {
//     passe: message.passe, 
//     pctProgres: message.pctProgres,
//     fuuid: message.fuuid,
//     resolution,
//     mimetype,
//     codec,
//     bitrate: message.videoBitrate,
//     quality: message.quality,
//   }
//   delete params['en-tete']
//   delete params.signature

//   return [cle, params]
// }

export function ConversionVideo(props) {

    const { workers, support, downloadAction, usager } = props

    const fichier = useMemo(()=>props.fichier || {}, [props.fichier])
    const versionCourante = fichier.version_courante || {}
    const mimetype = versionCourante.mimetype || ''
    const mimetypeBase = mimetype.split('/').shift()
    
    const erreurCb = (err, message) => {
      console.error("ConversionVideo Erreur %s : %O", message, err)
    }

    if(mimetypeBase !== 'video') return ''

    return (
        <>
            <h2>Conversion video</h2>
            <FormConversionVideo 
                workers={workers}
                fichier={fichier}
                usager={usager}
                erreurCb={erreurCb}
            />

            <Videos 
              workers={workers}
              fichier={fichier}
              support={support}
              downloadAction={downloadAction}
            />
        </>
    )
}

function FormConversionVideo(props) {

    const { workers, fichier, setTranscodage, usager, erreurCb } = props

    const [codecVideo, setCodecVideo] = useState('vp9')
    const [codecAudio, setCodecAudio] = useState('libopus')
    const [resolutionVideo, setResolutionVideo] = useState(360)
    const [qualityVideo, setQualityVideo] = useState(37)
    const [bitrateAudio, setBitrateAudio] = useState(128000)
    const [preset, setPreset] = useState('medium')

    const profilDefault = useMemo(()=>{
      const profilCodec = PROFILS_VIDEO[codecVideo]
      if(profilCodec) {
        const profilResolution = profilCodec[resolutionVideo]
        if(profilResolution) return profilResolution
        return profilCodec.default
      }
      return PROFILS_VIDEO['h264']['270']  // Par defaut, profil h264 en 270p
    }, [codecVideo, resolutionVideo])

    useEffect(()=>{
      if(profilDefault) {
        setCodecAudio(profilDefault.codecAudio)
        setBitrateAudio(profilDefault.bitrateAudio)
        setQualityVideo(profilDefault.qualityVideo)
        setPreset(profilDefault.preset)
      }
    }, [profilDefault, setCodecAudio, setBitrateAudio, setQualityVideo])

    const changerCodecVideo = useCallback(event => { 
      const codec = event.currentTarget.value
      setCodecVideo(codec)
      // if(codec === 'vp9') setCodecAudio('opus')
      // else if(codec === 'hevc') setCodecAudio('eac3')
      // else setCodecAudio('aac')
    }, [setCodecVideo])

    const versionCourante = (fichier?fichier.version_courante:{}) || {}
    // console.debug("Version courante : %O", versionCourante)
    const dimensionsFichier = [versionCourante.width, versionCourante.height].filter(item=>!isNaN(item))
    const resolutionOriginal = Math.min(...dimensionsFichier)
    const maxValueFilterResolution = useCallback(option=>option.value <= resolutionOriginal, [resolutionOriginal])

    if(!fichier) return ''
    if(!versionCourante.mimetype.startsWith('video/')) return ''

    const estPret = codecVideo && codecAudio && resolutionVideo && qualityVideo && bitrateAudio
  
    const changerResolutionVideo = event => { setResolutionVideo(Number(event.currentTarget.value)) }
    const changerQualityVideo = event => { setQualityVideo(Number(event.currentTarget.value)) }
    const changerBitrateAudio = event => { setBitrateAudio(Number(event.currentTarget.value)) }
  
    const convertir = event => {
      convertirVideo(
        workers,
        fichier,
        {codecVideo, codecAudio, resolutionVideo, qualityVideo, bitrateAudio, preset},
        erreurCb,
        {usager}
      )
      .then(setTranscodage)
      .catch(err=>erreurCb(err, "Erreur de preparation pour le transcodage du video"))
    }
  
    return (
      <>
        <Row>
          <Col xs={12} lg={6}>
            <Form>
              <SelectGroup formLabel={'Codec Video'} name={'codecVideo'} value={codecVideo} onChange={changerCodecVideo} options={VIDEO_CODEC} />
              <SelectGroup 
                formLabel={'Resolution Video'} 
                name={'resolutionVideo'} 
                value={resolutionVideo} 
                onChange={changerResolutionVideo} 
                options={VIDEO_RESOLUTIONS} 
                maxValueFilter={maxValueFilterResolution} 
                maxValue={resolutionOriginal} />
              <SelectGroup formLabel={'Qualite Video'} name={'qualityVideo'} value={qualityVideo} onChange={changerQualityVideo} options={QUALITY_VIDEO} />
              <SelectGroup formLabel={'Codec Audio'} name={'codecAudio'} value={codecAudio} options={AUDIO_CODEC} disabled/>
              <SelectGroup formLabel={'Bitrate Audio'} name={'bitrateAudio'} value={bitrateAudio} onChange={changerBitrateAudio} options={BITRATES_AUDIO} />
              <Row>
                <p>Preset : {preset}</p>
              </Row>
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
              <li>VP9 avec Opus donne une meilleure qualite mais n'est pas supporte par iOS (Apple)</li>
            </ul>
          </Col>

        </Row>

      </>
    )
}

function SelectGroup(props) {

  const { formLabel, name, onChange, value, options, maxValue, maxValueFilter, disabled } = props

  // console.debug("SelectGroup options: %O, maxValue: %O", options, maxValueFilter)

  let optionsFiltrees = options
  if(maxValueFilter) {
    optionsFiltrees = options.filter(item=>maxValueFilter(item))
  }

  if(maxValue) {
    optionsFiltrees.push({label: 'Originale', value: maxValue})
  }

  return (
    <Form.Group>
      <Row>
        <Col xs={12} lg={6}>
          <Form.Label>{formLabel}</Form.Label>
        </Col>
        <Col xs={12} lg={6}>
          <Form.Select name={name} onChange={onChange} value={value} disabled={disabled}>
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

async function convertirVideo(workers, fichier, params, erreurCb, opts) {
  opts = opts || {}
  // console.debug("Convertir video %O (opts: %O)", params, opts)
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
  } else if(['h264', 'hevc'].includes(params.codecVideo)) {
      commande.mimetype = 'video/mp4'
  }

  // console.debug("Commande conversion : %O", commande)
  const cle = [commande.mimetype, params.resolutionVideo, params.bitrateVideo].join(';')
  const infoTranscodage = (
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

  // console.debug("Commande transcodage : %O", commande)
  connexion.transcoderVideo(commande)
    .then(reponse=>{
      console.debug("convertirVideo Reponse commande transcodage : %O", reponse)
    })
    .catch(err=>erreurCb(err, 'Erreur demarrage du transcodage de video'))

  return infoTranscodage
}

function Videos(props) {
  const { workers, fichier, support, downloadAction } = props
  const versionCourante = fichier.version_courante || {}
  const videos = versionCourante.video || {}

  const supprimerVideo = useCallback(fuuidVideo=>{
    // console.debug("Supprimer video : %s", fuuidVideo)
    workers.connexion.supprimerVideo(fuuidVideo)
  }, [workers])

  if(!videos) return ''

  const videosTries = Object.values(videos).sort(sortVideos)

  // console.debug("Videos tries : %O", videosTries)

  return (
    <>
      <h3>Formats disponibles</h3>
      <Row>
        <Col xs={1}>Format</Col>
        <Col xs={1}>Codec</Col>
        <Col xs={2}>Qualite</Col>
        <Col xs={3}>Resolution</Col>
        <Col xs={2}>Taille</Col>
      </Row>
      {videosTries.map(video=>{
        return (
          <AfficherLigneFormatVideo 
            key={video.fuuid_video}
            fichier={fichier}
            video={video}
            playVideo={props.playVideo}
            support={support} 
            downloadAction={downloadAction}
            supprimerVideo={supprimerVideo}
          />
        )
      })}

      <AfficherListeJobs fuuid={fichier.fuuid_v_courante} />
    </>
  )
}

function sortVideos(a, b) {
  const resoA = Math.min(a.height, a.width),
      resoB = Math.min(b.height, b.width),
      qualityA = a.quality, qualityB = b.quality,
      // mimetypeA = a.mimetype, mimetypeB = b.mimetype,
      codecA = a.codec, codecB = b.codec

      if(resoA !== resoB) return resoB - resoA
      // if(mimetypeA !== mimetypeB) {
      // if(mimetypeA.endsWith('webm')) return -1
      // if(mimetypeB.endsWith('webm')) return 1
      if(codecA !== codecB) {
        if(codecA === 'vp9') return -1
        if(codecB === 'vp9') return 1
        if(codecA === 'hevc') return -1
        if(codecB === 'hevc') return 1
      }
      if(qualityA !== qualityB) {
        return qualityB - qualityA
      }

    // }

    return 0
}

// function TranscodageEnCours(props) {

//   const { transcodage } = props

//   if(!transcodage) return ''

//   const transcodageFiltre = Object.values(transcodage).filter(item=>item.pctProgres!==100)
//   transcodageFiltre.sort(triCleTranscodage)

//   // console.debug("Transcodage filtre : %O", transcodageFiltre)

//   return (
//     <>
//       {transcodageFiltre.filter(item=>item&&item.mimetype).map((video, idx)=>{
//         const mimetype = video.mimetype || ''
//       return (
//         <Row key={idx}>
//           <Col xs={12} md={3}>{mimetype.split('/').pop()}</Col>
//           <Col xs={12} md={3}>{video.resolution}p</Col>
//           <Col xs={10} md={5}>
//             <ProgressBar now={video.pctProgres} />
//           </Col>
//           <Col xs={2} md={1}>
//             {video.pctProgres}%
//           </Col>
//         </Row>
//       )})}
//     </>
//   )
// }

function triCleTranscodage(a,b) {
  if(a===b) return 0
  if(!a) return 1
  if(!b) return -1
  const mimetypeA = a.mimetype,
        mimetypeB = b.mimetype
  if(mimetypeA === mimetypeB) return 0
  if(!mimetypeA) return 1
  if(!mimetypeB) return -1
  const compMimetype = mimetypeA.localeCompare(mimetypeB)
  if(compMimetype !== 0) return compMimetype

  const compResolution = b.resolution - a.resolution
  if(compResolution !==0) return compResolution

  return b.bitrate - a.bitrate
}

function AfficherLigneFormatVideo(props) {
  const { fichier, video, /*support,*/ downloadAction, supprimerVideo } = props

  const download = useCallback(event => {
    // console.debug("Downloader fichier %O", fichier)

    const extension = video.mimetype.split('/').pop().toLowerCase()
    const resolutionListe = [video.height, video.width].filter(item=>!isNaN(item))
    const resolution = Math.min(...resolutionListe)
    // Retirer l'extension du fichier, remplacer par _resolution.ext_mimetype
    var nomFichier = fichier.nom
    nomFichier = nomFichier.split('.')
    nomFichier.pop() // Retirer l'extension, on va la remplacer par le mimetype
    nomFichier = nomFichier.join('.') + '_' + resolution + '.' + extension
  
    const infoDownload = { 
      tuuid: fichier.tuuid,
      fuuid: video.fuuid_video,
      mimetype: video.mimetype, 
      codec: video.codec,
      nom: nomFichier, 
      taille: video.taille_fichier,
    }
    // const fuuid = video.fuuid_video

    // console.debug("Downloader %O", infoDownload)
    downloadAction(infoDownload)

  }, [fichier, video, downloadAction])

  const supprimerVideoCb = useCallback(()=>supprimerVideo(video.fuuid_video), [video, supprimerVideo])

  const packageFormat = video.mimetype.split('/')[1]
  const bitrate_quality = video.quality || video.bitrate
  const codec = video.codec

  return (
    <Row>
      <Col xs={1}>{packageFormat}</Col>
      <Col xs={1}>{codec}</Col>
      <Col xs={2}>{bitrate_quality}</Col>
      <Col xs={3}>{video.width} x {video.height}</Col>
      <Col xs={2}><FormatteurTaille value={video.taille_fichier} /></Col>
      <Col>
        <Button variant="secondary" onClick={download}>
          <i className="fa fa-download" />
        </Button>
        <Button variant="danger" onClick={supprimerVideoCb}>
          <i className="fa fa-trash" />
        </Button>
      </Col>
    </Row>
  )

}
  