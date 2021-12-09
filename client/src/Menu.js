import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import Badge from 'react-bootstrap/Badge'
import NavDropdown from 'react-bootstrap/NavDropdown'

import { IconeConnexion } from '@dugrema/millegrilles.reactjs'

function Menu(props) {

    const { showTransfertModal } = props

    return (
      <Navbar collapseOnSelect expand="md">
        
        <Navbar.Brand>
          <Nav.Link title="Accueil MilleGrilles Collections">
              Collections
          </Nav.Link>
        </Navbar.Brand>
       
        <Navbar.Collapse id="responsive-navbar-menu">

            <Nav.Item>
                <Nav.Link title="Recents">
                    <i className="fa fa-clock-o" /> {' '} Recents
                </Nav.Link>
            </Nav.Item>

            <Nav.Item>
                <Nav.Link title="Corbeille">
                    <i className="fa fa-trash-o" /> {' '} Corbeille
                </Nav.Link>
            </Nav.Item>

            <Nav.Item>
                <Nav.Link title="Upload/Download" onClick={showTransfertModal}>
                    <LabelTransfert {...props} />
                </Nav.Link>
            </Nav.Item>

            <DropDown {...props} />

        </Navbar.Collapse>

        <Nav><Nav.Item><IconeConnexion connecte={props.etatConnexion} /></Nav.Item></Nav>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

      </Navbar>
    )
}

export default Menu

function DropDown(props) {

    const nomUsager = props.usager?props.usager.nomUsager:''
  
    let linkUsager = <><i className="fa fa-user-circle-o"/> {nomUsager}</>
    if(!nomUsager) linkUsager = 'Parametres'

    return (
        <NavDropdown title={linkUsager} id="basic-nav-dropdown" drop="down" className="menu-item">
          <NavDropdown.Item>
            <i className="fa fa-language" /> {' '} Changer Langue
          </NavDropdown.Item>
          <NavDropdown.Item>
            <i className="fa fa-home" /> {' '} Portail
          </NavDropdown.Item>
          <NavDropdown.Item>
            <i className="fa fa-close" /> {' '} Deconnecter
          </NavDropdown.Item>
        </NavDropdown>
    )

}

function LabelTransfert(props) {

  const { workers } = props

  return (
    <>

      <i className="fa fa-upload" />
      <Badge pill bg="primary">100%</Badge>

      {' '}

      <i className="fa fa-download" />
      <Badge pill bg="success">100%</Badge>

    </>
  )
}