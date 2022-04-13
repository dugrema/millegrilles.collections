import { useState, useEffect, useCallback, Suspense } from 'react'

import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import { LayoutApplication, HeaderApplication, FooterApplication, AlertTimeout } from '@dugrema/millegrilles.reactjs'
import { ouvrirDB } from './idbCollections'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'

import TransfertModal from './TransfertModal'
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

  const [evenementFichier, _setEvenementFichier] = useState('')
  // const [evenementCollection, setEvenementCollection] = useState('')
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

  const setEvenementFichier = useCallback(param=>{
    _setEvenementFichier(param)
    _setEvenementFichier('')
  }, [_setEvenementFichier])

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

      // const setEvenementFichierProxy = proxy(setEvenementFichier)

      if(etatAuthentifie) {
        // workers.connexion.enregistrerCallbackMajFichier({tuuid: 'abcd-1234'}, setEvenementFichierProxy)
        //   .catch(err=>{console.error("Erreur enregistrerCallbackMajFichier : %O", err)})
        // workers.connexion.enregistrerCallbackMajCollection(proxy(setEvenementCollection))
        //   .catch(err=>{console.error("Erreur enregistrerCallbackMajCollection : %O", err)})

        workers.chiffrage.getIdmgLocal().then(idmg=>{
          // console.debug("IDMG local chiffrage : %O", idmg)
          setIdmg(idmg)
        })

        return () => {
          // Cleanup
          // workers.connexion.retirerCallbackMajFichier(setEvenementFichierProxy)
          //  .catch(err=>{console.error("Erreur enregistrerCallbackMajFichier : %O", err)})
          // workers.connexion.retirerCallbackMajCollection(proxy(setEvenementCollection))
          //   .catch(err=>{console.error("Erreur enregistrerCallbackMajCollection : %O", err)})
        }
      }

  }, [workers, etatAuthentifie, setIdmg, setEvenementFichier])
  
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
            evenementCollection={evenementCollection}
            evenementFichier={evenementFichier}
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