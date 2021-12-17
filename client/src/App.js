import { useState, useEffect, useCallback, Suspense } from 'react'
import { proxy } from 'comlink'

import Container from 'react-bootstrap/Container'

import { LayoutApplication, HeaderApplication, FooterApplication } from '@dugrema/millegrilles.reactjs'
import { ouvrirDB } from './idbCollections'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'

import TransfertModal from './TransfertModal'
import { ReindexerModal } from './ModalOperations'

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
  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [showReindexerModal, setShowReidexerModal] = useState(false)
  const [etatTransfert, setEtatTransfert] = useState('')
  const [page, setPage] = useState('Accueil')
  const [paramsRecherche, setParamsRecherche] = useState('')

  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])
  const showReindexerModalOuvrir = useCallback(()=>{ setShowReidexerModal(true) }, [setShowReidexerModal])
  const showReindexerModalFermer = useCallback(()=>{ setShowReidexerModal(false) }, [setShowReidexerModal])

  const [evenementFichier, setEvenementFichier] = useState('')
  const [evenementCollection, setEvenementCollection] = useState('')

  const delegue = true  // TODO - verifier si cert est delegue

  // Chargement des proprietes et workers
  useEffect(()=>{
    Promise.all([
      importerWorkers(setWorkers),
      initDb(),
    ])
      .then(()=>{ console.debug("Chargement de l'application complete") })
      .catch(err=>{console.error("Erreur chargement application : %O", err)})
  }, [])

  useEffect(()=>{
    setWorkersTraitementFichiers(workers)
    if(workers) {
      if(workers.connexion) {
        connecter(workers, setUsager, setEtatConnexion)
      }
    }
  }, [workers, setUsager, setEtatConnexion])

  useEffect(()=>{
      if(!etatConnexion) return 
      workers.connexion.enregistrerCallbackMajFichier(proxy(data=>{
        // console.debug("callbackMajFichier data: %O", data)
        setEvenementFichier(data)
      }))
        .catch(err=>{console.error("Erreur enregistrerCallbackMajFichier : %O", err)})
      workers.connexion.enregistrerCallbackMajCollection(proxy(data=>{
        // console.debug("callbackMajCollection data: %O", data)
        setEvenementCollection(data)
      }))
        .catch(err=>{console.error("Erreur enregistrerCallbackMajCollection : %O", err)})
  }, [etatConnexion])

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
        <Suspense fallback={<Attente />}>
          <Contenu 
            workers={workers} 
            usager={usager}
            etatConnexion={etatConnexion} 
            page={page}
            evenementCollection={evenementCollection}
            evenementFichier={evenementFichier}
            paramsRecherche={paramsRecherche}
          />
        </Suspense>
      </Container>

      <FooterApplication>
        <Footer workers={workers} />
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

async function connecter(workers, setUsager, setEtatConnexion) {
  const { connecter: connecterWorker } = await import('./workers/connecter')
  await connecterWorker(workers, setUsager, setEtatConnexion)
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
    <p>Footer</p>
  )
}