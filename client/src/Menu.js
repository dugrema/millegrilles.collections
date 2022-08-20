import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import NavDropdown from 'react-bootstrap/NavDropdown'
import Form from 'react-bootstrap/Form'
import FormControl from 'react-bootstrap/FormControl'

// import { IconeConnexion } from '@dugrema/millegrilles.reactjs'
import { Menu as MenuMillegrilles, DropDownLanguage, ModalInfo } from '@dugrema/millegrilles.reactjs'

function Menu(props) {

  const { i18n, etatConnexion, idmg, setSectionAfficher, manifest, onSelect } = props
 
  const { t } = useTranslation()
  const [showModalInfo, setShowModalInfo] = useState(false)
  const handlerCloseModalInfo = useCallback(()=>setShowModalInfo(false), [setShowModalInfo])

  const handlerChangerLangue = eventKey => {i18n.changeLanguage(eventKey)}
  const brand = (
      <Navbar.Brand>
          <Nav.Link title={t('titre')}>
              {t('titre')}
          </Nav.Link>
      </Navbar.Brand>
  )

  const handlerSelect = eventKey => {
    switch(eventKey) {
      case 'information': setShowModalInfo(true); break
      case 'portail': window.location = '/millegrilles'; break
      case 'deconnecter': window.location = '/millegrilles/authentification/fermer'; break
      default:
        onSelect(eventKey)
    }
  }

  return (
    <>
      <MenuMillegrilles brand={brand} labelMenu="Menu" etatConnexion={etatConnexion} onSelect={handlerSelect}>

        <Nav.Link eventKey="collections" title={t('menu.collections')}>
          {t('menu.collections')}
        </Nav.Link>

        <Nav.Link eventKey="recents">
          <i className="fa fa-clock-o" /> {' '} {t('menu.recents')}
        </Nav.Link>

        <Nav.Link eventKey="corbeille" title="Corbeille">
          <i className="fa fa-trash-o" /> {' '} {t('menu.corbeille')}
        </Nav.Link>

        <Nav.Link eventKey="information" title="Afficher l'information systeme">
            {t('menu.information')}
        </Nav.Link>

        <DropDownLanguage title={t('menu.language')} onSelect={handlerChangerLangue}>
            <NavDropdown.Item eventKey="en-US">English</NavDropdown.Item>
            <NavDropdown.Item eventKey="fr-CA">Francais</NavDropdown.Item>
        </DropDownLanguage>

        <Nav.Link eventKey="portail" title={t('menu.portail')}>
            {t('menu.portail')}
        </Nav.Link>

        <Nav.Link eventKey="deconnecter" title={t('menu.deconnecter')}>
            {t('menu.deconnecter')}
        </Nav.Link>

      </MenuMillegrilles>

      <ModalInfo 
          show={showModalInfo} 
          fermer={handlerCloseModalInfo} 
          manifest={manifest} 
          idmg={idmg} />
    </>
  )
}

export default Menu

// function Menu(props) {

//     const { 
//       setPage, paramsRecherche, setParamsRecherche,
//       showTransfertModal,  
//     } = props

//     return (
//       <Navbar collapseOnSelect expand="md">
        
//         <Navbar.Brand>
//           <Nav.Link onClick={()=>setPage('Accueil')} title="Accueil MilleGrilles Collections">
//               Collections
//           </Nav.Link>
//         </Navbar.Brand>

//         <Navbar.Collapse id="responsive-navbar-menu">

//             <Nav.Item>
//                 <Nav.Link title="Recents" onClick={()=>setPage('Recents')}>
//                     <i className="fa fa-clock-o" /> {' '} Recents
//                 </Nav.Link>
//             </Nav.Item>

//             <DropDownRequetes {...props} />

//             <Search 
//               paramsRecherche={paramsRecherche}
//               setParamsRecherche={setParamsRecherche}
//               setPage={setPage}
//             />

//             <DropDownUsager {...props} />

//         </Navbar.Collapse>

//         <Nav><Nav.Item><IconeConnexion connecte={props.etatConnexion} /></Nav.Item></Nav>

//         <Navbar.Toggle aria-controls="basic-navbar-nav" />

//       </Navbar>
//     )
// }

// export default Menu

// function Search(props) {

//   const { setParamsRecherche, setPage } = props

//   const [ paramsStr, setParamsStr ] = useState('')

//   const changerParams = useCallback( event => {
//     const value = event.currentTarget.value
//     setParamsStr(value)
//   }, [setParamsStr])

//   const chercherAction = useCallback( event => {
//     event.stopPropagation()
//     event.preventDefault()

//     if(paramsStr) {
//       setParamsRecherche(paramsStr)
//       setPage("Recherche")
//     }

//   }, [paramsStr, setPage, setParamsRecherche])

//   return (
//     <Form className="d-flex" onSubmit={chercherAction}>
//       <FormControl
//         type="search"
//         placeholder="Search"
//         className="me-2"
//         aria-label="Search"
//         value={paramsStr}
//         onChange={changerParams}
//       />
//       <Button variant="outline-secondary" disabled={!paramsStr} onClick={chercherAction}>Recherche</Button>
//     </Form>
//   )
// }

function DropDownRequetes(props) {

  const { setPage, showReindexerModalOuvrir } = props

  return (
      <NavDropdown title="Requetes" id="basic-nav-dropdown-requetes" drop="down" className="menu-item">
        <NavDropdown.Item title="Corbeille" onClick={()=>setPage('Corbeille')}>
          <i className="fa fa-trash-o" /> {' '} Corbeille
        </NavDropdown.Item>
        <NavDropdown.Item title="Reindexer" onClick={showReindexerModalOuvrir}>
          <i className="fa fa-repeat" /> {' '} Reindexer
        </NavDropdown.Item>
      </NavDropdown>
  )

}

function DropDownUsager(props) {

    const nomUsager = props.usager?props.usager.nomUsager:''
  
    let linkUsager = <><i className="fa fa-user-circle-o"/> {nomUsager}</>
    if(!nomUsager) linkUsager = 'Parametres'

    return (
        <NavDropdown title={linkUsager} id="basic-nav-dropdown" drop="down" className="menu-item">
          <NavDropdown.Item>
            <i className="fa fa-language" /> {' '} Changer Langue
          </NavDropdown.Item>
          <NavDropdown.Item href="/millegrilles">
            <i className="fa fa-home" /> {' '} Portail
          </NavDropdown.Item>
          <NavDropdown.Item href="/millegrilles/authentification/fermer">
            <i className="fa fa-close" /> {' '} Deconnecter
          </NavDropdown.Item>
        </NavDropdown>
    )

}

function LabelTransfert(props) {
  const { etatTransfert } = props
  const download = etatTransfert.download || {}
  const downloads = download.downloads || []
  const pctDownload = download.pct || 100
  const upload = etatTransfert.upload || {}
  const uploadsCompletes = upload.uploadsCompletes || []
  const pctUpload = upload.pctTotal || 100

  const downloadsResultat = downloads.reduce((nb, item)=>{
    let {encours, succes, erreur} = nb
    if(item.status===3) succes++
    if(item.status===4) erreur++
    return {encours, succes, erreur}
  }, {encours: 0, succes: 0, erreur: 0})

  let variantDownload = 'primary'
  if(downloadsResultat.erreur>0) variantDownload = 'danger'
  else if(downloadsResultat.succes>0) variantDownload = 'success'

  const uploadsResultat = uploadsCompletes.reduce((nb, item)=>{
    let {encours, succes, erreur} = nb
    if(item.status===3) succes++
    if(item.status===4) erreur++
    return {encours, succes, erreur}
  }, {encours: 0, succes: 0, erreur: 0})
  if(upload.uploadEnCours) {
    uploadsResultat.encours = 1
  }

  let variantUpload = 'primary'
  if(uploadsResultat.erreur>0) variantUpload = 'danger'
  else if(uploadsResultat.succes>0) variantUpload = 'success'

  return (
    <div className="transfer-labels">

      <div>
        <i className="fa fa-upload" />
        {' '}
        <Badge pill bg={variantUpload}>{pctUpload}%</Badge>
      </div>

      {' '}

      <div>
        <i className="fa fa-download" />
        {' '}
        <Badge pill bg={variantDownload}>{pctDownload}%</Badge>
      </div>

    </div>
  )
}