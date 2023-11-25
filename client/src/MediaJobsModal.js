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

    // Charger jobs
    useEffect(()=>{
        if(!etatPret || !show) return
        // console.debug("Initialiser liste media jobs")
        workers.connexion.getMediaJobs()
            .then(reponse=>{
                // console.debug("Reponse get media jobs ", reponse)
                const jobs = reponse.jobs
                if(jobs && jobs.length > 0) dispatch(merge(jobs))
            })
            .catch(err=>console.error("Erreur chargement jobs media : ", err))
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
    const { fuuid, cle_conversion } = job

    const workers = useWorkers()

    let label = job.nom || job.tuuid || job.fuuid || 'N/D'
    // label = label.substring(0, 50)

    let progres = useMemo(()=>{
        if(!isNaN(job.pct_progres) && job.pct_progres !== null) {
            if(job.pct_progres < 3) {
                return <ProgressBar striped animated now={100} label='Traitement en cours' />
            } else if(job.pct_progres === 100) {
                return <ProgressBar now={100} variant='success' label='Termine' />
            } else {
                return <ProgressBar striped animated now={job.pct_progres} label={`${job.pct_progres}%`} />
            }
        } else if(!job.etat || [1, 'transcodage'].includes(job.etat)) {
            return <ProgressBar striped now={100} label='Pending' />
        } else {
            return <ProgressBar variant='danger' now={100} label={`Erreur ${job.etat}`} />
        }
    }, [job])

    const version_courante = job.version_courante || {}
    const tailleFichier = version_courante.taille
    const [_mimetype, codec, resolution] = cle_conversion.split(';')
  
    const supprimerJobVideoHandler = useCallback(()=>{
        supprimerJobVideo(workers, fuuid, cle_conversion)
            .catch(err=>console.error("AfficherLigneFormatVideo Erreur supprimer job video : ", err))
    }, [workers, fuuid, cle_conversion])

    return (
      <Row>
        <Col xs={3} lg={1}>
            <Button variant="danger" onClick={supprimerJobVideoHandler}>X</Button>
        </Col>
        {showNomFichier?
            <Col xs={9} lg={5}>{label}</Col>
            :''
        }
        <Col xs={3} lg={1}>{codec}</Col>
        <Col xs={3} lg={1}>{resolution}</Col>
        {showNomFichier?
            <Col xs={6} lg={2}><FormatteurTaille value={tailleFichier} /></Col>
            :''
        }
        <Col>{progres}</Col>
      </Row>
    )
  
}

export async function supprimerJobVideo(workers, fuuid, cleConversion) {
    const { connexion } = workers
    const reponse = await connexion.supprimerJobVideo({fuuid, cle_conversion: cleConversion})
    console.debug("Reponse supprimer job video : ", reponse)
}
