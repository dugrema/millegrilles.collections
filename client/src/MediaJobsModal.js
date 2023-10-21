import { useCallback, useEffect, useState, useMemo } from 'react'
import { proxy as comlinkProxy }  from 'comlink'
import { useDispatch, useSelector } from 'react-redux'

import useWorkers, {useEtatPret} from './WorkerContext'

import Modal from 'react-bootstrap/Modal'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ProgressBar from 'react-bootstrap/ProgressBar'

import { merge, clearCompletes, entretien } from './redux/mediaJobsSlice'

import { FormatteurTaille } from '@dugrema/millegrilles.reactjs'

function ModalInfoMediaJobs(props) {
    const { show, fermer } = props

    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()

    const messageTranscodageHandler = useMemo(()=>{
        return comlinkProxy(message=>traiterMessageTranscodage(dispatch, message))
    }, [dispatch])

    const clearCompletesHandler = useCallback(()=>dispatch(clearCompletes()), [clearCompletes])

    useEffect(()=>{
        if(!etatPret) return
        // console.debug("Initialiser liste media jobs")
        workers.connexion.getMediaJobs()
            .then(reponse=>{
                // console.debug("Reponse get media jobs ", reponse)
                const jobs = reponse.jobs
                if(jobs && jobs.length > 0) dispatch(merge(jobs))
            })
            .catch(err=>console.error("Erreur chargement jobs media : ", err))
    }, [workers, dispatch, etatPret])

    useEffect(()=>{
        // console.debug("useEffect etatConnexion %s, etatAuthentifie %s", etatConnexion, etatAuthentifie)
        const {connexion} = workers
        if(etatPret) {
          connexion.enregistrerCallbackTranscodageProgres({}, messageTranscodageHandler)
            .catch(err=>console.error("Erreur enregistrement evenements transcodage : %O", err))
          return () => {
            connexion.retirerCallbackTranscodageProgres({}, messageTranscodageHandler)
              .catch(err=>console.error("Erreur retrait evenements transcodage : %O", err))
          }
        }
      }, [workers, etatPret, messageTranscodageHandler])
  
    // Timer pour entretien des jobs
    useEffect(()=>{
        if(etatPret) {
            const interval = setInterval(()=>dispatch(entretien()), 30_000)
            return () => clearInterval(interval)  // Cleanup timer
        }
    }, [dispatch, etatPret])

    return (
        <Modal show={show} onHide={fermer} size="lg">
            <Modal.Header closeButton={true}>
                Media Jobs
            </Modal.Header>

            <Container>
                <Row>
                    <Col md={9}></Col>
                    <Col>
                        <Button onClick={clearCompletesHandler}>Clear completes</Button>
                    </Col>
                </Row>

                <p></p>

                <AfficherListeJobs />
            </Container>
        </Modal>
    )
}

export default ModalInfoMediaJobs

function traiterMessageTranscodage(dispatch, eventMessage) {
    // console.debug("Evenement transcodage ", eventMessage)

    const message = eventMessage.message

    if(message) {
        // Verifier si c'est un message de suppression
        const original = message['__original'] || {}
        const routage = original.routage || {}
        // const entete = message['en-tete']
        if(routage.action === 'jobSupprimee') message.supprime = true
        dispatch(merge(message))
    }
}

export function AfficherListeJobs(props) {

    const { fuuid, titre } = props

    let listeJobs = useSelector(state=>state.mediaJobs.liste)
    if(fuuid) listeJobs = listeJobs.filter(item=>{
        if([5, 'termine'].includes(item.etat)) return false
        return item.fuuid === fuuid
    })

    const jobs = listeJobs.map(item=>(
        <AfficherLigneFormatVideo 
            key={`${item.fuuid}/${item.cle_conversion}`} 
            showNomFichier={true}
            job={item} />
    ))

    if(jobs.length === 0) return ''

    return (
        <div>
            {titre?titre:''}
            {jobs}
        </div>
    )

}

export function AfficherLigneFormatVideo(props) {
    const { showNomFichier, job } = props
    const { fuuid, cle_conversion } = job

    const workers = useWorkers()

    let label = job.nom || job.tuuid || job.fuuid || 'N/D'
    // label = label.substring(0, 50)

    let etat = job.etat || ''

    let progres = null
    if(!isNaN(job.pct_progres) && job.pct_progres !== null) {
        progres = <ProgressBar now={job.pct_progres} label={`${job.pct_progres}%`} />
    } else if(job.etat === 1) {
        progres = 'Pending'
    } else {
        progres = job.etat
    }

    const version_courante = job.version_courante || {}
    const tailleFichier = version_courante.taille
    const [_mimetype, codec, resolution] = cle_conversion.split(';')
  
    const supprimerJobVideoHandler = useCallback(()=>{
        supprimerJobVideo(workers, fuuid, cle_conversion)
    }, [workers, fuuid, cle_conversion])

    return (
      <Row>
        <Col xs={3} lg={1}>
            <Button variant="danger" onClick={supprimerJobVideoHandler}>X</Button>
        </Col>
        {showNomFichier?
            <Col xs={12} lg={5}>{label}</Col>
            :''
        }
        <Col xs={3} lg={1}>{codec}</Col>
        <Col xs={3} lg={1}>{resolution}</Col>
        <Col xs={6} lg={2}><FormatteurTaille value={tailleFichier} /></Col>
        <Col>{progres}</Col>
      </Row>
    )
  
}

export async function supprimerJobVideo(workers, fuuid, cleConversion) {
    const { connexion } = workers
    const reponse = await connexion.supprimerJobVideo({fuuid, cle_conversion: cleConversion})
    console.debug("Reponse supprimer job video : ", reponse)
}
