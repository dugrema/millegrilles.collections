import { useState, useEffect, useCallback, Suspense } from 'react'

import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import { LayoutApplication, HeaderApplication, FooterApplication, AlertTimeout, TransfertModal } from '@dugrema/millegrilles.reactjs'
import { ouvrirDB } from './idbCollections'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'

// import TransfertModal from './TransfertModal'
import { ReindexerModal } from './ModalOperations'

import stylesCommuns from '@dugrema/millegrilles.reactjs/dist/index.css'
import './App.css'

import Menu from './Menu'
import Accueil from './Accueil'
import Recents from './Recents'
import Corbeille from './Corbeille'
import Recherche from './Recherche'

function App() {
  
  const [workers, setWorkers] = useState('')
  const [usager, setUsager] = useState('')
  const [etatConnexion, setEtatConnexion] = useState(false)
  const [formatteurPret, setFormatteurPret] = useState(false)
  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [showReindexerModal, setShowReidexerModal] = useState(false)
  const [etatTransfert, setEtatTransfert] = useState('')
  const [page, setPage] = useState('Accueil')
  const [paramsRecherche, setParamsRecherche] = useState('')
  const [idmg, setIdmg] = useState('')

  // Message d'erreur global
  const [ erreur, setErreur ] = useState('')
  const erreurCb = useCallback((err, message)=>setErreur({err, message}), [setErreur])

  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])
  const showReindexerModalOuvrir = useCallback(()=>{ setShowReidexerModal(true) }, [setShowReidexerModal])
  const showReindexerModalFermer = useCallback(()=>{ setShowReidexerModal(false) }, [setShowReidexerModal])

  const evenementCollection = ''  // TODO - Fix evenements

  const delegue = true  // TODO - verifier si cert est delegue

  const { connexion, transfertFichiers } = workers
  const etatAuthentifie = usager && formatteurPret

  const downloadAction = useCallback( fichier => {
    //console.debug("Download fichier %O", fichier)
    const { fuuid, mimetype, nom: filename, taille } = fichier

    connexion.getClesFichiers([fuuid], usager)
      .then(reponseCle=>{
        // console.debug("REPONSE CLE pour download : %O", reponseCle)
        if(reponseCle.code === 1) {
          // Permis
          const {cle, iv, tag, format} = reponseCle.cles[fuuid]
          transfertFichiers.down_ajouterDownload(fuuid, {mimetype, filename, taille, passwordChiffre: cle, iv, tag, format})
              .catch(err=>{console.error("Erreur debut download : %O", err)})
          } else {
              console.warn("Cle refusee/erreur (code: %s) pour %s", reponseCle.code, fuuid)
          }
      })
      .catch(err=>{
        console.error("Erreur declenchement download fichier : %O", err)
      })

  }, [connexion, transfertFichiers, usager])

  // Chargement des proprietes et workers
  useEffect(()=>{
    Promise.all([
      importerWorkers(setWorkers),
      initDb(),
    ])
      .then(()=>{ console.debug("Chargement de l'application complete") })
      .catch(err=>{console.error("Erreur chargement application : %O", err)})
  }, [setWorkers])

  useEffect(()=>{
    setWorkersTraitementFichiers(workers)
    if(workers) {
      if(workers.connexion) {
        connecter(workers, setUsager, setEtatConnexion, setFormatteurPret)
          // .then(infoConnexion=>{console.debug("Info connexion : %O", infoConnexion)})
          .catch(err=>{console.debug("Erreur de connexion : %O", err)})
      }
    }
  }, [workers, setUsager, setEtatConnexion, setFormatteurPret])

  useEffect(()=>{
      if(etatAuthentifie) {
        workers.chiffrage.getIdmgLocal().then(idmg=>setIdmg(idmg))
        // Preload certificat maitre des cles
        workers.connexion.getCertificatsMaitredescles().catch(err=>console.error("Erreur preload certificat maitre des cles : %O", err))
      }
  }, [workers, etatAuthentifie, setIdmg])
  
  useEffect(()=>{
    const upload = etatTransfert.upload || {}
    const {status, transaction} = upload
    if(etatAuthentifie && status === 5 && transaction) {
      emettreAjouterFichier(workers, transaction)
        .catch(err=>console.error("Erreur emission evenement ajouterFichier : %O", err))
    }
  }, [workers, etatAuthentifie, etatTransfert])

  return (
    <LayoutApplication>
      
      <HeaderApplication>
        <Menu 
          workers={workers} 
          usager={usager} 
          etatConnexion={etatConnexion} 
          showTransfertModal={showTransfertModalOuvrir}
          etatTransfert={etatTransfert}
          setPage={setPage}
          paramsRecherche={paramsRecherche}
          setParamsRecherche={setParamsRecherche}
          showReindexerModalOuvrir={showReindexerModalOuvrir}
        />
      </HeaderApplication>

      <Container>
        <AlertTimeout variant="danger" titre="Erreur" delay={30000} value={erreur} setValue={setErreur} />

        <Suspense fallback={<Attente />}>
          <Contenu 
            workers={workers} 
            usager={usager}
            etatConnexion={etatConnexion} 
            etatAuthentifie={etatAuthentifie}
            page={page}
            etatTransfert={etatTransfert}
            evenementCollection={evenementCollection}
            paramsRecherche={paramsRecherche}
            downloadAction={downloadAction}
            erreurCb={erreurCb}
          />
        </Suspense>
      </Container>

      <FooterApplication>
        <Footer workers={workers} idmg={idmg} />
      </FooterApplication>

      <TransfertModal 
        show={showTransfertModal}
        fermer={showTransfertModalFermer} 
        workers={workers}
        setEtatTransfert={setEtatTransfert}
      />

      <ReindexerModal
        show={delegue && showReindexerModal}
        fermer={showReindexerModalFermer}
        workers={workers}
      />

    </LayoutApplication>
  )
}
export default App

function Attente(props) {
  return <p>Chargement en cours</p>
}

async function importerWorkers(setWorkers) {
  const { chargerWorkers } = await import('./workers/workerLoader')
  const workers = chargerWorkers()
  setWorkers(workers)
}

async function connecter(workers, setUsager, setEtatConnexion, setFormatteurPret) {
  const { connecter: connecterWorker } = await import('./workers/connecter')
  return connecterWorker(workers, setUsager, setEtatConnexion, setFormatteurPret)
}

function initDb() {
  return ouvrirDB({upgrade: true})
}

function Contenu(props) {
  if(!props.workers) return <Attente />

  let Page
  switch(props.page) {
    case 'Recents': Page = Recents; break
    case 'Corbeille': Page = Corbeille; break
    case 'Recherche': Page = Recherche; break
    default: Page = Accueil;
  }

  return <Page {...props} />
}

function Footer(props) {
  return (
    <div className={stylesCommuns.centre}>
      <Row><Col>{props.idmg}</Col></Row>
      <Row><Col>Collections de MilleGrilles</Col></Row>
    </div>
  )
}

async function emettreAjouterFichier(workers, transaction) {
  const { connexion } = workers
  
  const entete = transaction['en-tete']
  const tuuid = entete['uuid_transaction']

  const transactionNettoyee = {...transaction, tuuid}
  delete transactionNettoyee['_certificat']
  delete transactionNettoyee['_signature']
  delete transactionNettoyee['en-tete']

  try {
    await connexion.ajouterFichier(transactionNettoyee)
  } catch(err) {
    console.debug("Erreur emission evenement ajouterFichier : %O", err)
  }
}