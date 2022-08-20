import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

import Container from 'react-bootstrap/Container'

// import { LayoutApplication, HeaderApplication, FooterApplication, AlertTimeout, TransfertModal } from '@dugrema/millegrilles.reactjs'
import { LayoutMillegrilles, ModalErreur, TransfertModal } from '@dugrema/millegrilles.reactjs'

import { ouvrirDB } from './idbCollections'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'
import { setupWorkers, cleanupWorkers } from './workers/workerLoader'
import ErrorBoundary from './ErrorBoundary'

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

// import stylesCommuns from '@dugrema/millegrilles.reactjs/dist/index.css'
// import './App.css'

import Menu from './Menu'
import Accueil from './Accueil'
const Recents = lazy( () => import('./Recents') )
const Corbeille = lazy( () => import('./Corbeille') )
const Recherche = lazy( () => import('./Recherche') )

function App() {
  
  const { t, i18n } = useTranslation()

  const [workers, setWorkers] = useState('')
  const [usager, setUsager] = useState('')
  const [etatConnexion, setEtatConnexion] = useState(false)
  const [formatteurPret, setFormatteurPret] = useState(false)
  const [showTransfertModal, setShowTransfertModal] = useState(false)
  const [showReindexerModal, setShowReidexerModal] = useState(false)
  const [etatTransfert, setEtatTransfert] = useState('')
  const [page, setPage] = useState('')
  const [paramsRecherche, setParamsRecherche] = useState('')
  const [idmg, setIdmg] = useState('')

  // Message d'erreur global
  const [ erreur, setErreur ] = useState('')
  const erreurCb = useCallback((err, message)=>setErreur({err, message}), [setErreur])
  const handlerCloseErreur = useCallback(()=>setErreur(''), [setErreur])

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
          const {cle, iv, nonce, tag, header, format} = reponseCle.cles[fuuid]
          transfertFichiers.down_ajouterDownload(fuuid, {mimetype, filename, taille, passwordChiffre: cle, iv, nonce, tag, header, format, DEBUG: true})
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
      initDb(),
    ])
      .then(()=>{ console.debug("Chargement de l'application complete") })
      .catch(err=>{console.error("Erreur chargement application : %O", err)})
  }, [])

  useEffect(()=>{
    console.info("Initialiser web workers")
    const { workerInstances, workers } = setupWorkers()
    setWorkers(workers)
    return () => { console.info("Cleanup web workers"); cleanupWorkers(workerInstances) }
  }, [setWorkers])

  useEffect(()=>{
    setWorkersTraitementFichiers(workers)
    if(workers) {
      if(workers.connexion) {
        setErreur('')
        connecter(workers, setUsager, setEtatConnexion, setFormatteurPret)
          .then(infoConnexion=>{
            // const statusConnexion = JSON.stringify(infoConnexion)
            if(infoConnexion.ok === false) {
              console.error("Erreur de connexion : %O", infoConnexion)
              setErreur("Erreur de connexion au serveur : " + infoConnexion.err); 
            } else {
              console.debug("Info connexion : %O", infoConnexion)
              setIdmg(infoConnexion.idmg)
            }
          })
          .catch(err=>{
            setErreur('Erreur de connexion. Detail : ' + err); 
            console.debug("Erreur de connexion : %O", err)
          })
      } else {
        setErreur("Pas de worker de connexion")
      }
    } else {
      setErreur("Connexion non initialisee (workers)")
    }
  }, [workers, setUsager, setEtatConnexion, setFormatteurPret, setIdmg, setErreur])

  useEffect(()=>{
      if(etatAuthentifie) {
        // Preload certificat maitre des cles
        workers.connexion.getCertificatsMaitredescles().catch(err=>console.error("Erreur preload certificat maitre des cles : %O", err))
      }
  }, [workers, etatAuthentifie])
  
  useEffect(()=>{
    const upload = etatTransfert.upload || {}
    const {status, transaction} = upload
    if(etatAuthentifie && status === 5 && transaction) {
      emettreAjouterFichier(workers, transaction)
        .catch(err=>console.error("Erreur emission evenement ajouterFichier : %O", err))
    }
  }, [workers, etatAuthentifie, etatTransfert])

  const handlerSelect = useCallback(eventKey => {
    switch(eventKey) {
      default:
        setPage('')
    }
  }, [setPage])

  const menu = (
    <Menu 
        i18n={i18n} 
        etatConnexion={etatConnexion}
        idmg={idmg}
        workers={workers} 
        etatTransfert={etatTransfert} 
        manifest={manifest} 
        onSelect={handlerSelect} />
  )

  if(!workers) return <Attente />

  return (
    <LayoutMillegrilles menu={menu}>

      <Container className="contenu">

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

      <TransfertModal 
            show={showTransfertModal}
            fermer={showTransfertModalFermer} 
            workers={workers}
            setEtatTransfert={setEtatTransfert}
          />

      <ModalErreur 
          show={!!erreur} 
          err={erreur.err} 
          message={erreur.message} 
          titre={t('Erreur.titre')} 
          fermer={handlerCloseErreur} 
        />

    </LayoutMillegrilles>    
  )
  
  // return (
  //   <LayoutApplication>

  //     <HeaderApplication>
  //       <Menu 
  //         workers={workers} 
  //         usager={usager} 
  //         etatConnexion={etatConnexion} 
  //         showTransfertModal={showTransfertModalOuvrir}
  //         etatTransfert={etatTransfert}
  //         setPage={setPage}
  //         paramsRecherche={paramsRecherche}
  //         setParamsRecherche={setParamsRecherche}
  //         showReindexerModalOuvrir={showReindexerModalOuvrir}
  //       />
  //     </HeaderApplication>

  //     <Container>
  //       <AlertTimeout variant="danger" titre="Erreur" delay={30000} value={erreur} setValue={setErreur} />

  //       <Suspense fallback={<Attente />}>
  //         <Contenu 
  //           workers={workers} 
  //           usager={usager}
  //           etatConnexion={etatConnexion} 
  //           etatAuthentifie={etatAuthentifie}
  //           page={page}
  //           etatTransfert={etatTransfert}
  //           evenementCollection={evenementCollection}
  //           paramsRecherche={paramsRecherche}
  //           downloadAction={downloadAction}
  //           erreurCb={erreurCb}
  //         />
  //       </Suspense>
  //     </Container>

  //     <FooterApplication>
  //       <Footer workers={workers} idmg={idmg} />
  //     </FooterApplication>

  //     <TransfertModal 
  //       show={showTransfertModal}
  //       fermer={showTransfertModalFermer} 
  //       workers={workers}
  //       setEtatTransfert={setEtatTransfert}
  //     />

  //     <ReindexerModal
  //       show={delegue && showReindexerModal}
  //       fermer={showReindexerModalFermer}
  //       workers={workers}
  //     />

  //   </LayoutApplication>
  // )
}
export default App

// function Attente(props) {
//   return <p>Chargement en cours</p>
// }

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

  return <ErrorBoundary><Page {...props}/></ErrorBoundary>
}

// function Test(props) {
//   return 'test'
// }

// function Footer(props) {
//   return (
//     <div className={stylesCommuns.centre}>
//       <Row><Col>{props.idmg}</Col></Row>
//       <Row><Col>Collections de MilleGrilles</Col></Row>
//     </div>
//   )
// }

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
