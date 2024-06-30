import { useCallback, useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import Badge from 'react-bootstrap/Badge'
import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import NavDropdown from 'react-bootstrap/NavDropdown'

import { getIdmg } from '@dugrema/millegrilles.utiljs/src/idmg'
import { Menu as MenuMillegrilles, DropDownLanguage, ModalInfo } from '@dugrema/millegrilles.reactjs'
import { supprimerContenuIdb } from '@dugrema/millegrilles.reactjs/src/dbNettoyage'

import useWorkers, { useCapabilities, useUsager, useEtatPret} from './WorkerContext'

import * as CONST_ETAT_TRANSFERT from './transferts/constantes'

const CONST_COMPLET_EXPIRE = 2 * 60 * 60 * 1000  // Auto-cleanup apres 2 heures (millisecs) de l'upload
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

function Menu(props) {

  const { 
    i18n, etatConnexion, manifest, onSelect, etatTransfert, 
    showTransfertModal, showMediaJobs,
    toggleModeAffichage,
  } = props

  const capabilities = useCapabilities()
  const estMobile = capabilities.device !== 'desktop'
  const etatPret = useEtatPret()

  const { t } = useTranslation()
  const usager = useUsager()
  const workers = useWorkers()
  // console.debug("UseUsager usager ", usager)

  const [idmg, setIdmg] = useState('')

  useEffect(()=>{
    if(usager && usager.ca) {
      getIdmg(usager.ca)
        .then(setIdmg)
        .catch(err=>console.error("Erreur chargement IDMG", err))
    }
  }, [usager, setIdmg])

  const [showModalInfo, setShowModalInfo] = useState(false)
  const handlerCloseModalInfo = useCallback(()=>setShowModalInfo(false), [setShowModalInfo])

  const handlerChangerLangue = eventKey => {i18n.changeLanguage(eventKey)}

  const labelModeToggle = useMemo(()=>{
    if(estMobile) return 'menu.modeDesktop'
    return 'menu.modeMobile'
  }, [estMobile])

  const handlerSelect = useCallback(eventKey => {
    const nomUsager = usager.nomUsager

    switch(eventKey) {
      case 'information': setShowModalInfo(true); break
      case 'mediaJobs': showMediaJobs(); break
      case 'portail': window.location = '/millegrilles'; break
      case 'deconnecter': deconnecter(nomUsager); break
      case 'toggleModeAffichage': toggleModeAffichage(); break
      default:
        onSelect(eventKey)
    }
  }, [setShowModalInfo, showMediaJobs, toggleModeAffichage, onSelect, usager])

  const brand = (
    <Navbar.Brand>
        <Nav.Link title={t('titre')} onClick={()=>handlerSelect('')}>
            {t('titre')}
        </Nav.Link>
    </Navbar.Brand>
  )

  const transfert = (
    <Nav.Item>
      <Nav.Link title="Upload/Download" onClick={showTransfertModal}>
          <LabelTransfert etatTransfert={etatTransfert} />
      </Nav.Link>
  </Nav.Item>
  )

  return (
    <>
      <MenuMillegrilles 
        brand={brand} 
        transfer={transfert}
        labelMenu="Menu" 
        etatConnexion={etatConnexion} 
        onSelect={handlerSelect}
        expand="lg"
        className="sticky">

        <Nav.Link eventKey="recherche" title={t('menu.recherche')}>
          <i className="fa fa-search" /> {estMobile?' ' + t('menu.recherche'):''}
        </Nav.Link>

        <Nav.Link eventKey="corbeille" title={t('menu.corbeille')}>
          <i className="fa fa-trash-o" /> {estMobile?' ' + t('menu.corbeille'):''}
        </Nav.Link>

        <Nav.Link eventKey="mediaJobs" title={t('menu.mediaJobs')}>
          <i className="fa fa-film" /> {estMobile?' ' + t('menu.mediaJobs'):''}
        </Nav.Link>

        <Nav.Link eventKey="partager" title={t('menu.partager')}>
          <i className="fa fa-share-alt" /> {t('menu.partager')}
        </Nav.Link>

        <Nav.Link eventKey="information" title="Afficher l'information systeme">
            {t('menu.information')}
        </Nav.Link>

        <NavDropdown title='Configuration' id="basic-nav-dropdown" drop="down" onSelect={onSelect}>
          <NavDropdown.Item eventKey="parametres">Parametres</NavDropdown.Item>
        </NavDropdown>

        <DropDownLanguage title={t('menu.language')} onSelect={handlerChangerLangue}>
            <NavDropdown.Item eventKey="en-US">English</NavDropdown.Item>
            <NavDropdown.Item eventKey="fr-CA">Francais</NavDropdown.Item>
        </DropDownLanguage>

        <Nav.Link eventKey="portail" title={t('menu.portail')}>
            {t('menu.portail')}
        </Nav.Link>

        {/* <Nav.Link eventKey="toggleModeAffichage" title={t(labelModeToggle)}>
            {t(labelModeToggle)}
        </Nav.Link> */}

        <Nav.Link eventKey="deconnecter" title={t('menu.deconnecter')}>
            {t('menu.deconnecter')}
        </Nav.Link>

      </MenuMillegrilles>

      <ModalInfo 
          show={showModalInfo} 
          fermer={handlerCloseModalInfo} 
          manifest={manifest} 
          idmg={idmg} 
          usager={usager} />
    </>
  )
}

export default Menu

function LabelTransfert(props) {
  return (
    <div className="transfer-labels">
      <BadgeUpload />
      <BadgeDownload />
    </div>
  )
}

export function BadgeUpload(props) {
  const uploads = useSelector(state=>state.uploader.liste),
        progresUpload = useSelector(state=>state.uploader.progres)

  const uploadsResultat = useMemo(()=>{
    const valeur = {encours: 0, succes: 0, erreur: 0}
    if(!uploads) return valeur
    const resultat = uploads.reduce((acc, item)=>{
      let {encours, succes, erreur} = acc
      switch(item.etat) {
        case CONST_ETAT_TRANSFERT.ETAT_PRET:
        case CONST_ETAT_TRANSFERT.ETAT_UPLOADING:
          encours++
          break
        case CONST_ETAT_TRANSFERT.ETAT_COMPLETE:
        case CONST_ETAT_TRANSFERT.ETAT_CONFIRME:
          succes++
          break
        case CONST_ETAT_TRANSFERT.ETAT_ECHEC:
        case CONST_ETAT_TRANSFERT.ETAT_UPLOAD_INCOMPLET:
          erreur++
          break
        default:
      }
      return {encours, succes, erreur}
    }, valeur)
    return resultat
  }, [uploads])

  let variantUpload = 'secondary'
  if(uploadsResultat.erreur>0) variantUpload = 'danger'
  else if(uploadsResultat.succes>0) variantUpload = 'success'

  let labelUpload = useMemo(()=>{
    if(!isNaN(progresUpload)) {
      let valeur = progresUpload
      if(progresUpload === 100 && uploadsResultat.encours > 0) {
        valeur = 99  // Marquer 100% quand tous les uploads sont completes
      }
      return <span>{Math.floor(valeur)} %</span>
    }
    return <span>---</span>
  }, [uploadsResultat, progresUpload])

  return <BadgeTransfer className='fa fa-upload' variant={variantUpload} label={labelUpload} />
}

function BadgeDownload(props) {
  const downloads = useSelector(state=>state.downloader.liste),
        progresDownload = useSelector(state=>state.downloader.progres)

  const downloadsResultat = useMemo(()=>{
    const valeur = {encours: 0, succes: 0, erreur: 0}

    const resultat = downloads.reduce((nb, item)=>{
      let {encours, succes, erreur} = nb
      switch(item.etat) {
        case CONST_ETAT_TRANSFERT.ETAT_PRET:
        case CONST_ETAT_TRANSFERT.ETAT_DOWNLOAD_ENCOURS:
            encours++
          break
        case CONST_ETAT_TRANSFERT.ETAT_COMPLETE:
          succes++
          break
        case CONST_ETAT_TRANSFERT.ETAT_ECHEC:
          erreur++
          break
        default:
      }
      return {encours, succes, erreur}
    }, valeur)
    return resultat
  }, [downloads])

  let variantDownload = 'secondary'
  if(downloadsResultat.erreur>0) variantDownload = 'danger'
  else if(downloads.length>0) variantDownload = 'success'

  let labelDownload = <span>---</span>
  if(!isNaN(progresDownload)) labelDownload = <span>{Math.floor(progresDownload)} %</span>

  return <BadgeTransfer className='fa fa-download' variant={variantDownload} label={labelDownload} />
}

function BadgeTransfer(props) {
  const { className, variant, label } = props
  return (
    <span className='badge-transfert'>
      <i className={className} />
      <Badge pill bg={variant}>{label}</Badge>
    </span>
  )
}

async function deconnecter(nomUsager) {
  try {
    await supprimerContenuIdb({nomUsager})
  } catch (err) {
    console.error("deconnecter Erreur nettoyage IDB : ", err)
  } finally {
    window.location = '/auth/deconnecter_usager'
  }
}