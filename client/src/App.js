import React, { useState, useMemo, useCallback, Suspense, lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

import { LayoutMillegrilles, ModalErreur, OuvertureSessionModal } from '@dugrema/millegrilles.reactjs'

import ErrorBoundary from './ErrorBoundary'
import useWorkers, {useCapabilities, useEtatConnexion, useEtatConnexionOpts, WorkerProvider, 
  useUsager, useOverrideAffichage, useSetOverrideAffichage, useStopUnload, useModalTransfertEnCours} from './WorkerContext'
import storeSetup from './redux/store'

import fichiersActions from './redux/fichiersSlice'
import { setUserId as setUserIdUpload, setUploads, supprimerParEtat, continuerUpload, annulerUpload } from './redux/uploaderSlice'
import { setUserId as setUserIdDownload, supprimerDownloadsParEtat, continuerDownload, arreterDownload, setDownloads } from './redux/downloaderSlice'
import { setUserId as setUserIdMediaJobs, } from './redux/mediaJobsSlice'
import { setUserId as setUserIdPartager } from './redux/partagerSlice'

import * as CONST_ETAT_TRANSFERT from './transferts/constantes'

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
import TransfertModal from './TransfertModal'

const NavigationCollections = lazy( () => import('./NavigationCollections') )
const NavigationRecents = lazy( () => import('./NavigationRecents') )
const NavigationCorbeille = lazy( () => import('./NavigationCorbeille') )
const NavigationRecherche = lazy( () => import('./NavigationRecherche') )
const MediaJobsModal = lazy( () => import('./MediaJobsModal') )
const Partager = lazy( () => import('./Partager') )
const Parametres = lazy( () => import('./Parametres') )

const CONST_UPLOAD_COMPLET_EXPIRE = 2 * 60 * 60 * 1000,  // Auto-cleanup apres 2 heures (millisecs) de l'upload,
      CONST_DOWNLOAD_COMPLET_EXPIRE = 48 * 60 * 60 * 1000  // Auto-cleanup apres 2 jours (millisecs) du download

// const ETAT_PREPARATION = 1,
//       ETAT_PRET = 2,
//       ETAT_UPLOADING = 3,
//       ETAT_COMPLETE = 4,
//       ETAT_ECHEC = 5,
//       ETAT_CONFIRME = 6,
//       ETAT_UPLOAD_INCOMPLET = 7

// const CONST_ETATS_DOWNLOAD = {
//   ETAT_PRET: 1,
//   ETAT_EN_COURS: 2,
//   ETAT_SUCCES: 3,
//   ETAT_ECHEC: 4
// }

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

  const usager = useUsager()
  const etatConnexion = useEtatConnexion()
  const etatConnexionOpts = useEtatConnexionOpts()
  const dispatch = useDispatch()
  const overrideAffichage = useOverrideAffichage()
  const setOverrideAffichage = useSetOverrideAffichage()

  const capabilities = useCapabilities()
  const estMobile = capabilities.device !== 'desktop'

  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [showMediaJobs, setShowMediaJobs] = useState(false)
  const [page, setPage] = useState('')
  const [hideMenu, setHideMenu] = useState(false)
  const [userIdPartageTransfere, setUserIdPartageTransfere] = useState('')
  const [cuuidTransfere, setCuuidTransfere] = useState('')
  
  const [erreur, setErreur] = useState('')
  const erreurCb = useCallback((err, message)=>{
    console.error("Erreur %s : %O", message, err)
    setErreur({err, message})
  }, [setErreur])
  const handlerCloseErreur = useCallback(()=>setErreur(''), [setErreur])

  const showMediaJobsOuvrir = useCallback(()=>{ setShowMediaJobs(true) }, [setShowMediaJobs])
  const showMediaJobsFermer = useCallback(()=>{ setShowMediaJobs(false) }, [setShowMediaJobs])

  const classNameTop = useMemo(()=>{
    if(hideMenu) return 'fullscreen'
    return ''
  }, [hideMenu])

  const fluid = useMemo(()=>{
    if(hideMenu) return true
    return 'md'
  }, [hideMenu])

  // Modal transfert et actions
  const setCuuidTransfereCb = useCallback(cuuid => {
    setCuuidTransfere(cuuid)
    setPage('')
  }, [setCuuidTransfere, setPage])
  const showTransfertModalOuvrir = useCallback(()=>{ setShowTransfertModal(true) }, [setShowTransfertModal])
  const showTransfertModalFermer = useCallback(()=>{ setShowTransfertModal(false) }, [setShowTransfertModal])
  const handlerSupprimerUploads = useCallback( params => supprimerUploads(workers, dispatch, params, erreurCb), [dispatch, workers, erreurCb])
  const handlerContinuerUploads = useCallback( params => {
    // console.debug("Continuer upload ", params)
    const { correlation } = params
    dispatch(continuerUpload(workers, {correlation}))
      .catch(err=>erreurCb(err, "Erreur continuer uploads"))
  }, [workers])
  const handlerSupprimerDownloads = useCallback( params => supprimerDownloads(workers, dispatch, params, erreurCb), [dispatch, workers, erreurCb])
  const handlerContinuerDownloads = useCallback( params => {
    console.debug("Continuer download ", params)
    let fuuid = params
    if(typeof(params) !== 'string') {
      fuuid = params.fuuid
    }

    workers.downloadFichiersDao.getDownload(fuuid)
      .then(info=>{
        console.debug("Download info a resumer : ", info)
        info.etat = 1
        info.complet = false
        dispatch(continuerDownload(info))
      })
      .catch(err=>console.error("Erreur continuer download : ", err))
  }, [workers])

  const toggleModeAffichage = useCallback(()=>{
    // console.debug("Toggle override affichage, etait : %s", overrideAffichage)
    let nouveauMode = 'desktop'
    if(overrideAffichage === 'desktop') {
      nouveauMode = 'mobile'
    } else if(estMobile !== true) {
      nouveauMode = 'mobile'
    }
    // console.debug("Force mode %s", nouveauMode)
    setOverrideAffichage(nouveauMode)
    localStorage.setItem('overrideAffichage', nouveauMode)
  }, [overrideAffichage, setOverrideAffichage, estMobile])

  const handlerSelect = useCallback(eventKey => {
    // console.debug("handlerSelect %O", eventKey)
    switch(eventKey) {
      case 'recherche': 
      case 'recents': 
      case 'corbeille': 
      case 'partager':
      case 'parametres':
        setPage(eventKey)
        break
      default:
        setPage('')
    }
  }, [setPage])

  const handlerOuvrirPartageUserId = useCallback(userId => {
    // console.debug("LayoutMain Ouvrir partage avec userId ", userId)
    setUserIdPartageTransfere(userId)
    if(userId) setPage('partager')
  }, [setPage, setUserIdPartageTransfere])

  // Charger un repertoire a partir de n'importe quelle page
  useEffect(()=>{
    if(!cuuidTransfere) return
    setPage('')  // Reset a page NavigationCollections
    console.debug("Afficher NavigationCollections pour cuuid ", cuuidTransfere)
  }, [cuuidTransfere, setPage])

  const menu = useMemo(()=>{
    if(hideMenu) return ''
    return (
      <Menu 
          workers={workers}
          etatConnexion={etatConnexion}
          i18n={i18n} 
          manifest={manifest} 
          showTransfertModal={showTransfertModalOuvrir}
          showMediaJobs={showMediaJobsOuvrir}
          onSelect={handlerSelect}
          toggleModeAffichage={toggleModeAffichage} />
    )
  }, [hideMenu, workers, etatConnexion, i18n, showTransfertModalOuvrir, showMediaJobsOuvrir, handlerSelect, toggleModeAffichage])

  // Afficher un avertissement pour quitter la page si un upload est en cours.
  const setStopUnload = useStopUnload()[1]
  const uploadEnCours = useSelector(state=>state.uploader.enCours)
  const downloadEnCours = useSelector(state=>state.downloader.enCours)
  useEffect(()=>{
    setStopUnload(uploadEnCours || downloadEnCours)
  }, [uploadEnCours, downloadEnCours, setStopUnload])

  return (
    <div className={classNameTop}>
      <LayoutMillegrilles menu={menu} fluid={fluid}>

        {hideMenu?'':
          <div className='top-spacer-menu'></div>
        }

        <div className='top-contenu'>
          <Suspense fallback={<Attente />}>
            <Contenu 
                page={page}
                hideMenu={hideMenu}
                setHideMenu={setHideMenu}
                userIdPartageTransfere={userIdPartageTransfere}
                ouvrirPartageUserId={handlerOuvrirPartageUserId}
                cuuidTransfere={cuuidTransfere}
                setCuuidTransfere={setCuuidTransfereCb}
                toggleModeAffichage={toggleModeAffichage}
                erreurCb={erreurCb}
              />
          </Suspense>
        </div>

        <Modals 
            showTransfertModal={showTransfertModal}
            showTransfertModalFermer={showTransfertModalFermer}
            erreur={erreur}
            handlerCloseErreur={handlerCloseErreur}
            supprimerUploads={handlerSupprimerUploads}
            continuerUploads={handlerContinuerUploads}
            supprimerDownloads={handlerSupprimerDownloads}
            continuerDownloads={handlerContinuerDownloads}
            showMediaJobs={showMediaJobs}
            showMediaJobsFermer={showMediaJobsFermer}
          />

        <InitialisationConfiguration />
        <InitialisationDownload />
        <InitialisationUpload />

        <OuvertureSessionModal 
              workers={workers}
              etatConnexion={etatConnexion} 
              etatConnexionOpts={etatConnexionOpts} 
              usager={usager}
            />

      </LayoutMillegrilles>
    </div>
  )
}

function Contenu(props) {

  let Page
  switch(props.page) {
    case 'recherche': Page = NavigationRecherche; break
    case 'recents': Page = NavigationRecents; break
    case 'corbeille': Page = NavigationCorbeille; break
    case 'partager': Page = Partager; break
    case 'parametres': Page = Parametres; break
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
    supprimerDownloads, continuerDownloads,
    showMediaJobs, showMediaJobsFermer,
  } = props

  const workers = useWorkers()
  const { t } = useTranslation()
  const uploads = useSelector(state=>state.uploader.liste)
  const progresUpload = useSelector(state=>state.uploader.progres)
  const downloads = useSelector(state=>state.downloader.liste)
  const progresDownload = useSelector(state=>state.downloader.progres)
  const [modalTransfertEnCours, setModalTransfertEnCours] = useModalTransfertEnCours()

  const fermerModalTransfertEnCours = useCallback(()=>setModalTransfertEnCours(false), [setModalTransfertEnCours])

  return (
    <div>
      <TransfertModal 
          workers={workers}
          show={showTransfertModal}
          fermer={showTransfertModalFermer} 
          uploads={uploads}
          progresUpload={progresUpload}
          downloads={downloads}
          progresDownload={progresDownload}
          supprimerUploads={supprimerUploads}
          continuerUploads={continuerUploads}
          supprimerDownloads={supprimerDownloads}
          continuerDownloads={continuerDownloads}
        />

      <ModalErreur 
          workers={workers}
          show={!!erreur} 
          err={erreur.err} 
          message={erreur.message} 
          titre={t('Erreur.titre')} 
          fermer={handlerCloseErreur} 
        />

      <MediaJobsModal
          show={showMediaJobs}
          fermer={showMediaJobsFermer}
        />

      <ModalTransfertEnCours
        show={!!modalTransfertEnCours}
        fermer={fermerModalTransfertEnCours} />
    </div>
  )
}

function Attente(_props) {
  return (
      <div>
          <p className="titleinit">Preparation de Collections</p>
          <p>Veuillez patienter durant le chargement de la page.</p>
          <ol>
              <li>Initialisation</li>
              <li>Chargement des composants dynamiques</li>
              <li>Connexion a la page</li>
          </ol>

          <p>
            <Button href="/millegrilles">Retour</Button>
          </p>
      </div>
  )
}

function InitialisationDownload(props) {

  const workers = useWorkers()
  const usager = useUsager()
  const dispatch = useDispatch()

  const { downloadFichiersDao } = workers

  const userId = useMemo(()=>{
    if(!usager || !usager.extensions) return
    return usager.extensions.userId
  }, [usager])

  useEffect(()=>{
    dispatch(setUserIdDownload(userId))
  }, [userId])

  useEffect(()=>{
    if(!downloadFichiersDao || !userId) return
    // console.debug("Initialiser uploader")
    downloadFichiersDao.chargerDownloads(userId)
        .then(async downloads=>{
            // console.debug("Download trouves : %O", downloads)

            const completExpire = new Date().getTime() - CONST_DOWNLOAD_COMPLET_EXPIRE

            downloads = downloads.filter(download=>{
                const { fuuid, etat } = download
                if([CONST_ETAT_TRANSFERT.ETAT_COMPLETE].includes(etat)) {
                    // Cleanup
                    if(download.derniereModification <= completExpire) {
                        // Complet et expire, on va retirer l'upload
                        downloadFichiersDao.supprimerFichier(fuuid)
                            .catch(err=>console.error("Erreur supprimer fichier ", err))
                        return false
                    }
                }
                return true
            })

            for await (const download of downloads) {
                const { etat } = download
                if([CONST_ETAT_TRANSFERT.ETAT_PRET, CONST_ETAT_TRANSFERT.ETAT_DOWNLOAD_ENCOURS].includes(etat)) {
                  download.etat = CONST_ETAT_TRANSFERT.ETAT_ECHEC
                    download.tailleCompletee = 0
                    await downloadFichiersDao.updateFichierDownload(download)
                }
            }

            dispatch(setDownloads(downloads))
        })
        .catch(err=>console.error("Erreur initialisation uploader ", err))
  }, [downloadFichiersDao, userId])      

  return ''
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
    dispatch(fichiersActions.setUserId(userId))
    dispatch(setUserIdMediaJobs(userId))
    dispatch(setUserIdUpload(userId))
    dispatch(setUserIdPartager(userId))
  }, [userId])

  useEffect(()=>{
      if(!uploadFichiersDao || !userId) return
      // console.debug("Initialiser uploader")
      uploadFichiersDao.chargerUploads(userId)
          .then(async uploads=>{
              // console.debug("Uploads trouves : %O", uploads)
              // uploads.sort(trierListeUpload)
              // Reset etat uploads en cours (incomplets)

              const completExpire = new Date().getTime() - CONST_UPLOAD_COMPLET_EXPIRE

              uploads = uploads.filter(upload=>{
                  const { correlation, etat } = upload
                  if([CONST_ETAT_TRANSFERT.ETAT_COMPLETE, CONST_ETAT_TRANSFERT.ETAT_CONFIRME].includes(etat)) {
                      // Cleanup
                      if(upload.derniereModification <= completExpire) {
                          // Complet et expire, on va retirer l'upload
                          // console.debug("Cleanup upload complete ", upload)
                          uploadFichiersDao.supprimerFichier(correlation)
                              .catch(err=>console.error("Erreur supprimer fichier ", err))
                          return false
                      }
                  }
                  return true
              })

              for await (const upload of uploads) {
                  const { correlation, etat } = upload
                  if([CONST_ETAT_TRANSFERT.ETAT_PRET, CONST_ETAT_TRANSFERT.ETAT_UPLOADING].includes(etat)) {
                      upload.etat = CONST_ETAT_TRANSFERT.ETAT_UPLOAD_INCOMPLET

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

function supprimerUploads(workers, dispatch, params, erreurCb) {
  // console.debug("!!! supprimerUploaders ", params)
  const { correlation, succes, echecs } = params
  if(correlation) {
    dispatch(annulerUpload(workers, correlation))
      .catch(err=>erreurCb(err, "Erreur supprimer upload"))
  }
  if(succes === true) {
    dispatch(supprimerParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_CONFIRME))
      .then(()=>dispatch(supprimerParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_COMPLETE)))
      .catch(err=>erreurCb(err, "Erreur supprimer uploads"))
  }
  if(echecs === true) {
    dispatch(supprimerParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_ECHEC))
      .then(()=>dispatch(supprimerParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_UPLOAD_INCOMPLET)))
      .catch(err=>erreurCb(err, "Erreur supprimer uploads"))
  }
}

function supprimerDownloads(workers, dispatch, params, erreurCb) {
  const { fuuid, succes, echecs } = params
  if(fuuid) {
    Promise.resolve(dispatch(arreterDownload(workers, fuuid)))
      .catch(err=>erreurCb(err, "Erreur supprimer download"))
  }
  if(succes === true) {
    Promise.resolve(dispatch(supprimerDownloadsParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_COMPLETE)))
      .catch(err=>erreurCb(err, "Erreur supprimer downloads"))
  }
  if(echecs === true) {
    Promise.resolve(dispatch(supprimerDownloadsParEtat(workers, CONST_ETAT_TRANSFERT.ETAT_ECHEC)))
      .catch(err=>erreurCb(err, "Erreur supprimer downloads"))
  }
}

function InitialisationConfiguration(props) {
  
  useEffect(()=>{
    const resolutionInitiale = window.localStorage.getItem('videoResolution')
    if(!resolutionInitiale) {
      console.info("Set resolution video par defaut a 0720")
      window.localStorage.setItem('videoResolution', '0720')
    }
  }, [])

  return ''
}

function ModalTransfertEnCours(props) {
  const { show, fermer } = props
  return (
      <Modal show={show} onHide={fermer}>
          <Modal.Header closeButton>Attention</Modal.Header>
          <Modal.Body>
            <p>Des transferts sont en cours.</p>
            <p>Veuillez attendre que les transferts soient completes ou allez les annuler dans le menu Transfert de fichiers.</p>
          </Modal.Body>
          <Modal.Footer><Button onClick={fermer}>Ok</Button></Modal.Footer>
      </Modal>
  )
}
