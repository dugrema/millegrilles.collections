import axios from 'axios'
import {useState, useEffect, useMemo, useCallback} from 'react'
import { useSelector } from 'react-redux'

import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import ProgressBar from 'react-bootstrap/ProgressBar'

import MediaLoader from '@dugrema/millegrilles.reactjs/src/mediaLoader'
import useWorkers from './WorkerContext'

const HTTP_STATUS_ATTENTE = [202, 204]

function AfficherAudio(props) {

    // const { support, showInfoModalOuvrir } = props

    const fichier = useMemo(()=>props.fichier || {}, [props.fichier])
    const nomFichier = fichier.nom || ''
          //version_courante = fichier.version_courante || {}

    //const timeStamp = 0

    const audioTimeUpdateHandler = useCallback(param => {
//        console.debug("audio update ", param)
    }, [])

    return (
        <div>
            <Row>
                
                <Col md={12} lg={8}>
                    <AudioPlayer 
                        fichier={fichier}
                        onTimeUpdate={audioTimeUpdateHandler} />
                </Col>

                <Col>
                    <h3>{nomFichier}</h3>
                    
                    <Button onClick={props.fermer}>Retour</Button>

                </Col>

            </Row>

        </div>        
    )

}

export default AfficherAudio

export function AudioPlayer(props) {

    const { fichier } = props

    const contactId = useSelector(state=>state.fichiers.partageContactId)
    const workers = useWorkers()

    const [progresChargement, setProgresChargement] = useState(0)
    const [chargementPret, setChargementPret] = useState(false)
    const [errChargement, setErrChargement] = useState('')

    const [audioFile, setAudioFile] = useState('')

    const audioLoader = useMemo(()=>{
        const { connexion, traitementFichiers } = workers
        console.debug("audioLoader fichier: %O, contactId: %O", fichier, contactId)
        const version_courante = fichier.version_courante
        const {fuuid} = version_courante
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

        console.debug("Creer audioLoader avec fuuid %O, mimetype %O", fuuid, mimetype)
        
        const audioLoader = mediaLoader.audioLoader(fuuid, mimetype)
        return audioLoader
    }, [workers, fichier, contactId])

    const urlAudio = useMemo(()=>{
        if(audioFile) return audioFile.src
        return ''
    }, [audioFile])

    const mimetype = useMemo(()=>{
        if(audioFile) return audioFile.mimetype
        return ''
    }, [audioFile])

    const majChargement = useCallback(info=>{
        // console.debug("Maj chargement ", info)
        if(info.status === 200) {
            // Complete
            setProgresChargement(100)
        } else if(HTTP_STATUS_ATTENTE.includes(info.status)) {
            const headers = info.headers
            // console.debug("headers ", headers)

            const position = Number.parseInt(headers['x-file-position']),
                  taille = Number.parseInt(headers['x-file-size'])

            const progres =  Math.floor(100.0 * position / taille)
            // console.debug("Progres ", progres)
            setProgresChargement(progres)
        }
    }, [setProgresChargement])

    useEffect(()=>{
        // console.debug("AfficherAudio pret")
    }, [chargementPret])

    useEffect(()=>{
        // Reset indicateurs
        setAudioFile('')
        setErrChargement('')
        setProgresChargement(0)

        if(!fichier || !audioLoader) return 

        audioLoader.load()
            .then(async fichiers => {
                try {
                    const audioFile = fichiers.pop()

                    // console.debug("HEAD src : ", audioFile)
                    const sourceHead = audioFile.src
                    
                    while(true) {
                        // S'assurer que le video est pret dans le back-end
                        const reponse = await axios({
                            method: 'HEAD',
                            url: sourceHead,
                            timeout: 20_000,
                        })
                        majChargement(reponse)
                        if( ! HTTP_STATUS_ATTENTE.includes(reponse.status) ) break
                        await new Promise(resolve=>setTimeout(resolve, 2000))
                    }

                    // console.debug("Reponse head ", reponse)
                    setAudioFile(audioFile)
                } catch(err) {
                    console.error("Erreur HEAD : ", err)
                    setErrChargement('Erreur chargement video (preparation)')
                }
            })
            .catch(err=>{
                console.error("AfficherVideo erreur chargement video : %O", err)
                setErrChargement('Erreur chargement video (general)')
            })
    }, [fichier, audioLoader, setAudioFile, majChargement, setChargementPret, setProgresChargement, setErrChargement])

    return (
        <div>
            <Alert variant="danger" show={!!errChargement}>
                <Alert.Heading>Erreur chargement</Alert.Heading>
                <p>{''+errChargement}</p>
            </Alert>
            {urlAudio?
                <audio controls>
                    <source src={urlAudio} type={mimetype} />
                    Your browser does not support the audio element.
                </audio>
            :''}
            <ProgresChargement value={progresChargement} src={urlAudio} />
        </div>
    )
}

function ProgresChargement(props) {

    const { value, src } = props

    const [show, setShow] = useState(true)

    const label = useMemo(()=>{
        if(isNaN(value)) return ''
        if(value === 100) {
            if(src) {
                return <div><i className="fa fa-spinner fa-spin"/>{' '}Preparation sur le serveur</div>
            } else {
                return 'Chargement complete'
            }
        }
        return <div><i className="fa fa-spinner fa-spin"/>Chargement en cours</div>
    }, [value, src])

    useEffect(()=>{
        if(value === null || value === '') setShow(false)
        else if(value === 100 && src) {
            setTimeout(()=>setShow(false), 1500)
        } else {
            setShow(true)
        }
    }, [src, value, setShow])

    if(!show) return ''

    return (
        <Row>
            <Col xs={12} lg={5} className='label'>{label}</Col>
            <Col xs={10} lg={4}>
                <ProgressBar now={value} />
            </Col>
            <Col xs={2} lg={2}>{value}%</Col>
        </Row>
    )
}
