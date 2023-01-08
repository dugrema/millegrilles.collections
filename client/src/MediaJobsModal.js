import { useCallback, useEffect, useState, useMemo } from 'react'
import { proxy as comlinkProxy }  from 'comlink'
import { useDispatch, useSelector } from 'react-redux'

import useWorkers, {useEtatPret} from './WorkerContext'

import Modal from 'react-bootstrap/Modal'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { merge, clearCompletes } from './redux/mediaJobsSlice'

function ModalInfoMediaJobs(props) {
    const { show, fermer } = props

    const dispatch = useDispatch()
    const workers = useWorkers()
    const etatPret = useEtatPret()

    const listeJobs = useSelector(state=>state.mediaJobs.liste)

    const messageTranscodageHandler = useMemo(()=>{
        return comlinkProxy(message=>traiterMessageTranscodage(dispatch, message))
    }, [dispatch])

    const clearCompletesHandler = useCallback(()=>dispatch(clearCompletes()), [clearCompletes])

    useEffect(()=>{
        if(!etatPret) return
        console.debug("Initialiser liste media jobs")
        workers.connexion.getMediaJobs()
            .then(reponse=>{
                console.debug("Reponse get media jobs ", reponse)
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
                <AfficherListeJobs
                    listeJobs={listeJobs} />
            </Container>
        </Modal>
    )
}

export default ModalInfoMediaJobs

function traiterMessageTranscodage(dispatch, eventMessage) {
    console.debug("Evenement transcodage ", eventMessage)
    const message = eventMessage.message
    dispatch(merge(message))
}

function AfficherListeJobs(props) {

    const { listeJobs } = props

    return listeJobs.map(item=>{
        let progres = 'N/D'
        if(!isNaN(item.pct_progres) && item.pct_progres !== null) {
            progres = item.pct_progres + '%'
        }

        let label = item.nom || item.tuuid || item.fuuid || 'N/D'
        label = label.substring(0, 50)

        let etat = item.etat || ''

        return (
            <Row key={`${item.fuuid}/${item.cle_conversion}`}>
                <Col lg={8}>{label}</Col>
                <Col lg={3}>{etat}</Col>
                <Col>{progres}</Col>
            </Row>
        )
    })
}