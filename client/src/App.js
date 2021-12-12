import { useState, useEffect, useCallback, Suspense } from 'react'
import { proxy } from 'comlink'

import Container from 'react-bootstrap/Container'

import { LayoutApplication, HeaderApplication, FooterApplication } from '@dugrema/millegrilles.reactjs'
import { ouvrirDB } from './idbCollections'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'

import TransfertModal from './TransfertModal'

import './App.css'

import Menu from './Menu'
import Accueil from './Accueil'
import Recents from './Recents'
import Corbeille from './Corbeille'

function App() {
  
  const [workers, setWorkers] = useState('')
  const [usager, setUsager] = useState('')
  const [etatConnexion, setEtatConnexion] = useState(false)
  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [etatTransfert, setEtatTransfert] = useState('')
  const [page, setPage] = useState('Accueil')

  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])

  const transfertFichiers = workers?workers.transfertFichiers:null

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
        console.debug("callbackMajFichier data: %O", data)
      }))
        .catch(err=>{console.error("Erreur enregistrerCallbackMajFichier : %O", err)})
      workers.connexion.enregistrerCallbackMajCollection(proxy(data=>{
        console.debug("callbackMajCollection data: %O", data)
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
        />
      </HeaderApplication>

      <Container>
        <Suspense fallback={<Attente />}>
          <Contenu 
            workers={workers} 
            usager={usager}
            etatConnexion={etatConnexion} 
            page={page}
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
    default: Page = Accueil;
  }

  return <Page {...props} />
}

function Footer(props) {
  return (
    <p>Footer</p>
  )
}