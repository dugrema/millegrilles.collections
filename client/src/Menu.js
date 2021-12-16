import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import Badge from 'react-bootstrap/Badge'
import NavDropdown from 'react-bootstrap/NavDropdown'

import { IconeConnexion } from '@dugrema/millegrilles.reactjs'

function Menu(props) {

    // console.debug("!!! Menu Proppys : %O", props)

    const { showTransfertModal, setPage } = props

    return (
      <Navbar collapseOnSelect expand="md">
        
        <Navbar.Brand>
          <Nav.Link onClick={()=>setPage('Accueil')} title="Accueil MilleGrilles Collections">
              Collections
          </Nav.Link>
        </Navbar.Brand>
       
        <Navbar.Collapse id="responsive-navbar-menu">

            <Nav.Item>
                <Nav.Link title="Recents" onClick={()=>setPage('Recents')}>
                    <i className="fa fa-clock-o" /> {' '} Recents
                </Nav.Link>
            </Nav.Item>

            <DropDownRequetes {...props} />

            <Nav.Item>
                <Nav.Link title="Upload/Download" onClick={showTransfertModal}>
                    <LabelTransfert {...props} />
                </Nav.Link>
            </Nav.Item>

            <DropDownUsager {...props} />

        </Navbar.Collapse>

        <Nav><Nav.Item><IconeConnexion connecte={props.etatConnexion} /></Nav.Item></Nav>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

      </Navbar>
    )
}

export default Menu

function DropDownRequetes(props) {

  const { setPage } = props

  return (
      <NavDropdown title="Requetes" id="basic-nav-dropdown-requetes" drop="down" className="menu-item">
        <NavDropdown.Item title="Corbeille" onClick={()=>setPage('Corbeille')}>
          <i className="fa fa-trash-o" /> {' '} Corbeille
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
          <NavDropdown.Item href="/fermer">
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
    <>

      <i className="fa fa-upload" />
      <Badge pill bg={variantUpload}>{pctUpload}%</Badge>

      {' '}

      <i className="fa fa-download" />
      <Badge pill bg={variantDownload}>{pctDownload}%</Badge>

    </>
  )
}