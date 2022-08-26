import React, { useState, useMemo, useCallback, Suspense, lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Provider as ReduxProvider, useDispatch } from 'react-redux'

import Container from 'react-bootstrap/Container'

import { LayoutMillegrilles, ModalErreur, TransfertModal } from '@dugrema/millegrilles.reactjs'

import ErrorBoundary from './ErrorBoundary'
import useWorkers, {useEtatConnexion, WorkerProvider, useUsager} from './WorkerContext'
import storeSetup from './redux/store'

import { setUserId } from './redux/fichiersSlice'

import './i18n'

// Importer JS global
import 'react-bootstrap/dist/react-bootstrap.min.js'

// Importer cascade CSS global
import 'bootstrap/dist/css/bootstrap.min.css'
import 'font-awesome/css/font-awesome.min.css'
import '@dugrema/millegrilles.reactjs/dist/index.css'

import manifest from './manifest.build'

import './index.scss'
import './App.css'

import Menu from './Menu'
const NavigationCollections = lazy( () => import('./NavigationCollections') )
const NavigationRecents = lazy( () => import('./NavigationRecents') )
const NavigationCorbeille = lazy( () => import('./NavigationCorbeille') )

function App() {
  
  return (
    <WorkerProvider attente={<Attente />}>
      <ErrorBoundary>
        <Suspense fallback={<Attente />}>
          <Layout />
        </Suspense>
      </ErrorBoundary>
    </WorkerProvider>
  )

}
export default App

function Layout(_props) {

  const { i18n } = useTranslation()

  const workers = useWorkers()
  const etatConnexion = useEtatConnexion()

  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [page, setPage] = useState('')
  
  const [erreur, setErreur] = useState('')
  const erreurCb = useCallback((err, message)=>{
    console.error("Erreur %s : %O", message, err)
    setErreur({err, message})
  }, [setErreur])
  const handlerCloseErreur = useCallback(()=>setErreur(''), [setErreur])

  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])
  
  const handlerSelect = useCallback(eventKey => {
    switch(eventKey) {
      default:
        setPage('')
    }
  }, [setPage])

  const store = useMemo(()=>{
    if(!workers) return
    return storeSetup(workers)
  }, [workers])

  const menu = (
    <Menu 
        workers={workers}
        etatConnexion={etatConnexion}
        i18n={i18n} 
        manifest={manifest} 
        onSelect={handlerSelect} />
  )

  return (
    <ReduxProvider store={store}>
      <LayoutMillegrilles menu={menu}>

        <Container className="contenu">
          <Suspense fallback={<Attente />}>
            <Contenu 
                page={page}
                erreurCb={erreurCb}
              />
          </Suspense>
        </Container>

        <Modals 
            showTransfertModal={showTransfertModal}
            showTransfertModalFermer={showTransfertModalFermer}
            erreur={erreur}
            handlerCloseErreur={handlerCloseErreur}
          />

      </LayoutMillegrilles>
    </ReduxProvider>
  )
}

function Contenu(props) {

  const dispatch = useDispatch()

  // Set userId dans redux
  const usager = useUsager()
  useEffect(()=>{ if(!usager) return; dispatch(setUserId(usager.extensions.userId)); }, [dispatch, usager])

  let Page
  switch(props.page) {
    case 'Recents': Page = NavigationRecents; break
    case 'Corbeille': Page = NavigationCorbeille; break
    default: Page = NavigationCollections
  }

  return (
      <ErrorBoundary erreurCb={props.erreurCb}>
          <Page {...props}/>
      </ErrorBoundary>
  )
}

function Modals(props) {

  const { showTransfertModal, showTransfertModalFermer, erreur, handlerCloseErreur } = props

  const workers = useWorkers()
  const { t } = useTranslation()

  return (
    <div>
      <TransfertModal 
          workers={workers}
          show={showTransfertModal}
          fermer={showTransfertModalFermer} 
          setEtatTransfert={etat=>{console.warn("Etat transfert fix me : ", etat)}}
        />

      <ModalErreur 
          workers={workers}
          show={!!erreur} 
          err={erreur.err} 
          message={erreur.message} 
          titre={t('Erreur.titre')} 
          fermer={handlerCloseErreur} 
        />
    </div>
  )
}

function Attente(_props) {
  return (
      <div>
          <p className="titleinit">Preparation de Coup D'Oeil</p>
          <p>Veuillez patienter durant le chargement de la page.</p>
          <ol>
              <li>Initialisation</li>
              <li>Chargement des composants dynamiques</li>
              <li>Connexion a la page</li>
          </ol>
      </div>
  )
}
