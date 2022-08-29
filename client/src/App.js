import React, { useState, useMemo, useCallback, Suspense, lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux'

import Container from 'react-bootstrap/Container'

import { LayoutMillegrilles, ModalErreur, TransfertModal } from '@dugrema/millegrilles.reactjs'

import ErrorBoundary from './ErrorBoundary'
import useWorkers, {useEtatConnexion, WorkerProvider, useUsager} from './WorkerContext'
import storeSetup from './redux/store'

import { setUserId } from './redux/fichiersSlice'
import { setUserId as setUserIdUpload, setUploads, supprimerParEtat, continuerUpload } from './redux/uploaderSlice'

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

const CONST_COMPLET_EXPIRE = 2 * 60 * 60 * 1000  // Auto-cleanup apres 2 heures (millisecs) de l'upload

const ETAT_PREPARATION = 1,
      ETAT_PRET = 2,
      ETAT_UPLOADING = 3,
      ETAT_COMPLETE = 4,
      ETAT_ECHEC = 5,
      ETAT_CONFIRME = 6,
      ETAT_UPLOAD_INCOMPLET = 7

function App() {
  
  return (
    <WorkerProvider attente={<Attente />}>
      <ErrorBoundary>
        <Suspense fallback={<Attente />}>
          <ProviderReduxLayer />
        </Suspense>
      </ErrorBoundary>
    </WorkerProvider>
  )

}
export default App

function ProviderReduxLayer() {

  const workers = useWorkers()
  const store = useMemo(()=>{
    if(!workers) return
    return storeSetup(workers)
  }, [workers])

  return (
    <ReduxProvider store={store}>
        <LayoutMain />
    </ReduxProvider>
  )
}

function LayoutMain() {

  const { i18n } = useTranslation()
  const workers = useWorkers()

  const etatConnexion = useEtatConnexion()
  const dispatch = useDispatch()

  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [page, setPage] = useState('')
  
  const [erreur, setErreur] = useState('')
  const erreurCb = useCallback((err, message)=>{
    console.error("Erreur %s : %O", message, err)
    setErreur({err, message})
  }, [setErreur])
  const handlerCloseErreur = useCallback(()=>setErreur(''), [setErreur])

  // Modal transfert et actions
  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])
  const handlerSupprimerUploads = useCallback( params => {
    const { correlation, tous } = params
    if(tous === true) {
      dispatch(supprimerParEtat(workers, ETAT_CONFIRME))
        .then(()=>dispatch(supprimerParEtat(workers, ETAT_COMPLETE)))
        .catch(err=>erreurCb(err, "Erreur supprimer uploads"))
    } else {
      throw new Error('not implemented')
    }
  }, [dispatch, workers])
  const handlerContinuerUploads = useCallback( params => {
    const { correlation, tous } = params
    if(tous === true) {
      dispatch(continuerUpload(workers))
        .catch(err=>erreurCb(err, "Erreur continuer uploads"))
    } else {
      throw new Error('not implemented')
    }
  }, [workers])

  const handlerSelect = useCallback(eventKey => {
    switch(eventKey) {
      default:
        setPage('')
    }
  }, [setPage])

  const menu = (
    <Menu 
        workers={workers}
        etatConnexion={etatConnexion}
        i18n={i18n} 
        manifest={manifest} 
        showTransfertModal={showTransfertModalOuvrir}
        onSelect={handlerSelect} />
  )

  return (
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
          supprimerUploads={handlerSupprimerUploads}
          continuerUploads={handlerContinuerUploads}
        />

      <InitialisationUpload />

    </LayoutMillegrilles>
  )
}

function Contenu(props) {

  const dispatch = useDispatch()

  // // Set userId dans redux
  // const usager = useUsager()
  // useEffect(()=>{ if(!usager) return; dispatch(setUserId(usager.extensions.userId)); }, [dispatch, usager])

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

  const { 
    showTransfertModal, showTransfertModalFermer, erreur, handlerCloseErreur, 
    supprimerUploads, continuerUploads,
  } = props

  const workers = useWorkers()
  const { t } = useTranslation()
  const uploads = useSelector(state=>state.uploader.liste)
  const progresUpload = useSelector(state=>state.uploader.progres)

  return (
    <div>
      <TransfertModal 
          workers={workers}
          show={showTransfertModal}
          fermer={showTransfertModalFermer} 
          uploads={uploads}
          progresUpload={progresUpload}
          downloads={''}
          progresDownload={''}
          supprimerUploads={supprimerUploads}
          continuerUploads={continuerUploads}
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

function InitialisationUpload(props) {

  const workers = useWorkers()
  const usager = useUsager()
  const dispatch = useDispatch()

  const { uploadFichiersDao } = workers

  const userId = useMemo(()=>{
      if(!usager || !usager.extensions) return
      return usager.extensions.userId
  }, [usager])

  useEffect(()=>{
    dispatch(setUserId(userId))
    dispatch(setUserIdUpload(userId))
  }, [userId])

  useEffect(()=>{
      if(!uploadFichiersDao || !userId) return
      console.debug("Initialiser uploader")
      uploadFichiersDao.chargerUploads(userId)
          .then(async uploads=>{
              console.debug("Uploads trouves : %O", uploads)
              // uploads.sort(trierListeUpload)
              // Reset etat uploads en cours (incomplets)

              const completExpire = new Date().getTime() - CONST_COMPLET_EXPIRE

              uploads = uploads.filter(upload=>{
                  const { correlation, etat } = upload
                  if([ETAT_COMPLETE, ETAT_CONFIRME].includes(etat)) {
                      // Cleanup
                      if(upload.derniereModification <= completExpire) {
                          // Complet et expire, on va retirer l'upload
                          console.debug("Cleanup upload complete ", upload)
                          uploadFichiersDao.supprimerFichier(correlation)
                              .catch(err=>console.error("Erreur supprimer fichier ", err))
                          return false
                      }
                  } else if(ETAT_PREPARATION === etat) {
                      // Cleanup
                      console.warn("Cleanup upload avec preparation incomplete ", upload)
                      uploadFichiersDao.supprimerFichier(correlation)
                          .catch(err=>console.error("Erreur supprimer fichier ", err))
                      return false
                  }
                  return true
              })

              for await (const upload of uploads) {
                  const { correlation, etat } = upload
                  if([ETAT_PRET, ETAT_UPLOADING].includes(etat)) {
                      upload.etat = ETAT_UPLOAD_INCOMPLET

                      const parts = await uploadFichiersDao.getPartsFichier(correlation)
                      const positionsCompletees = upload.positionsCompletees
                      const tailleCompletee = parts.reduce((acc, item)=>{
                          const position = item.position
                          if(positionsCompletees.includes(position)) acc += item.taille
                          return acc
                      }, 0)

                      upload.tailleCompletee = tailleCompletee
                      await uploadFichiersDao.updateFichierUpload(upload)
                  }
              }

              dispatch(setUploads(uploads))
          })
          .catch(err=>console.error("Erreur initialisation uploader ", err))
  }, [uploadFichiersDao, userId])    

  // Rien a afficher
  return ''
}