import { useState, useEffect, Suspense } from 'react'
import Container from 'react-bootstrap/Container'
import { LayoutApplication, HeaderApplication, FooterApplication } from '@dugrema/millegrilles.reactjs'

import './App.css'

function App() {
  
  const [workers, setWorkers] = useState('')
  const [usager, setUsager] = useState('')

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
      connecter(workers, setUsager)
    }
  }, [workers, setUsager])

  return (
    <LayoutApplication>
      
      <HeaderApplication>
        <Menu workers={workers} />
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

async function connecter(workers, setUsager) {
  const { connecter: connecterWorker } = await import('./chargementUsager')
  await connecterWorker(workers, setUsager)
}

function Contenu(props) {

  if(!props.workers) return <Attente />

  return (
    <h1>Collections</h1>
  )
}

function Menu(props) {
  return (
    <nav>Menu</nav>
  )
}

function Footer(props) {
  return (
    <p>Footer</p>
  )
}