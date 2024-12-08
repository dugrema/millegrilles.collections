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

import { merge, clearCompletes, clear, entretien } from './redux/mediaJobsSlice'

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

    // Charger jobs
    useEffect(()=>{
        if(!etatPret || !show) return

        const loadJobs = () => {
            // console.debug("Charger liste media jobs")
            workers.connexion.getMediaJobs()
                .then(reponse=>{
                    // console.debug("Reponse get media jobs ", reponse)
                    const jobs = reponse.jobs
                    dispatch(clear())
                    if(jobs && jobs.length > 0) dispatch(merge(jobs))
                })
                .catch(err=>console.error("Erreur chargement jobs media : ", err))
        }

        loadJobs()

        const intervalRefresh = setInterval(()=>{
            // Reload jobs videos
            loadJobs()
        }, 120_000)

        return () => {
            clearInterval(intervalRefresh)
        }
    }, [workers, dispatch, etatPret, show])

    // Enregistrer listeners
    useEffect(()=>{
        // console.debug("useEffect etatConnexion %s, etatAuthentifie %s", etatConnexion, etatAuthentifie)
        const {connexion} = workers
        if(etatPret) {
            // Creer intervalle de mise a jour
            const interval = setInterval(()=>dispatch(entretien()), 30_000)
        
            // Charger l'etat initial des jobs
            connexion.enregistrerCallbackTranscodageProgres({}, messageTranscodageHandler)
                .catch(err=>console.error("Erreur enregistrement evenements transcodage : %O", err))

            // Cleanup intervalle update et listeners
            return () => {
                // Cleanup timer
                clearInterval(interval)
                // Retirer listeners
                connexion.retirerCallbackTranscodageProgres({}, messageTranscodageHandler)
                .catch(err=>console.error("Erreur retrait evenements transcodage : %O", err))
            }
        }
    }, [workers, show, etatPret, messageTranscodageHandler])
  
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

    const { fuuid, titre, showNomFichier } = props

    let listeJobs = useSelector(state=>state.mediaJobs.liste)
    if(fuuid) listeJobs = listeJobs.filter(item=>{
        if([5, 'termine'].includes(item.etat)) return false
        return item.fuuid === fuuid
    })

    const showNomFichierEffectif = useMemo(()=>{
        if(showNomFichier !== undefined) return showNomFichier
        return true
    }, [showNomFichier])

    const jobs = listeJobs.map(item=>(
        <AfficherLigneFormatVideo 
            key={`${item.fuuid}/${item.cle_conversion}`} 
            showNomFichier={showNomFichierEffectif}
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
    const { fuuid, tuuid, cle_conversion, codec, job_id, etat, resolution } = job
    // console.debug("Job: ", job)

    const workers = useWorkers()

    let label = job.nom || tuuid || fuuid || job_id || 'N/D'
    // label = label.substring(0, 50)

    let progres = useMemo(()=>{
        // console.debug("AfficherLigneFormatVideo progres ", job)
        if(['dechiffrage'].includes(job.etat)) {
            return <ProgressBar striped animated now={100} label={`Dechiffrage`} />
        } else if(etat === 'probe') {
            return <ProgressBar striped animated now={100} label={`Analyse`} />
        } else if(etat === 'termine') {
            return <ProgressBar now={100} variant='success' label='Termine' />
        } else if (etat === 'transcodage') {
            if(!job.pct_progres && job.pct_progres !== 0) {
                return <ProgressBar striped animated now={100} label={`Traitement`} />
            } else if(job.pct_progres < 3) {
                return <ProgressBar striped animated now={100} label={`Traitement ${job.pct_progres}%`} />
            }
            return <ProgressBar striped animated now={job.pct_progres} label={`${job.pct_progres}%`} />
        } else if(!etat || etat === 1) {
            return <ProgressBar variant='dark' now={100} label='Pending' />
        } else if(etat === 2 && job.pct_progres === 100) {
            // Chargement de la DB sans reception termine
            return <ProgressBar now={100} variant='success' label='Termine' />
        } else if(etat === 2) {
            // Chargement de la DB sans reception etat transcodage
            return <ProgressBar striped now={100} label={`Rafraichissement`} />
        } else {
            return <ProgressBar variant='danger' now={100} label={`Erreur ${etat}`} />
        }
    }, [job])

    const version_courante = job.version_courante || {}
    const tailleFichier = version_courante.taille
    // const [_mimetype, codec, resolution] = cle_conversion.split(';')
    let jobId = job.job_id;
  
    const supprimerJobVideoHandler = useCallback(()=>{
        supprimerJobVideo(workers, fuuid, tuuid, jobId)
            .catch(err=>console.error("AfficherLigneFormatVideo Erreur supprimer job video : ", err))
    }, [workers, fuuid, tuuid, jobId])

    return (
      <Row>
        <Col xs={3} lg={1}>
            <Button variant="danger" onClick={supprimerJobVideoHandler}>X</Button>
        </Col>
        {showNomFichier?
            <Col xs={9} lg={5} className='modal-media-nomfichier'>{label}</Col>
            :''
        }
        {showNomFichier?
            <Col xs={4} lg={2}><FormatteurTaille value={tailleFichier} /></Col>
            :''
        }
        {codec?<Col xs={3} lg={1}>{codec}</Col>:<></>}
        {codec?<Col xs={3} lg={1}>{resolution}</Col>:<></>}
        <Col>{progres}</Col>
      </Row>
    )
  
}

export async function supprimerJobVideo(workers, fuuid, tuuid, jobId) {
    const { connexion } = workers
    const reponse = await connexion.supprimerJobVideo({fuuid, tuuid, job_id: jobId})
    console.debug("Reponse supprimer job video : ", reponse)
}
