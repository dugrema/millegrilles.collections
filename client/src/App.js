import { useState, useEffect, Suspense } from 'react'
import Container from 'react-bootstrap/Container'
import { LayoutApplication, HeaderApplication, FooterApplication } from '@dugrema/millegrilles.reactjs'

import './App.css'

function App() {
  
  const [workers, setWorkers] = useState('')
  const [usager, setUsager] = useState('')
  const [etatConnexion, setEtatConnexion] = useState(false)

  // Chargement des proprietes et workers
  useEffect(()=>{
    Promise.all([
      importerWorkers(setWorkers),
    ])
      .then(()=>{ console.debug("Chargement de l'application complete") })
      .catch(err=>{console.error("Erreur chargement application : %O", err)})
  }, [])

  useEffect(()=>{
    if(workers && workers.connexion) {
      connecter(workers, setUsager, setEtatConnexion)
    }
  }, [workers, setUsager, setEtatConnexion])

  return (
    <LayoutApplication>
      
      <HeaderApplication>
        <Menu workers={workers} usager={usager} etatConnexion={etatConnexion} />
      </HeaderApplication>

      <Container>
        <Suspense fallback={<Attente />}>
          <Contenu workers={workers} />
        </Suspense>
      </Container>

      <FooterApplication>
        <Footer />
      </FooterApplication>

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

function Contenu(props) {

  if(!props.workers) return <Attente />

  return (
    <h1>Collections</h1>
  )
}

function Menu(props) {
  const nomUsager = props.usager?props.usager.nomUsager:''
  const etat = props.etatConnexion?'Connecte':'Deconnecte'
  return (
    <nav>Menu usager {nomUsager}, connecte : {etat}</nav>
  )
}

function Footer(props) {
  return (
    <p>Footer</p>
  )
}