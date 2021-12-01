import Navbar from 'react-bootstrap/Navbar'
import Nav from 'react-bootstrap/Nav'
import NavDropdown from 'react-bootstrap/NavDropdown'

import { IconeConnexion } from '@dugrema/millegrilles.reactjs'

function Menu(props) {
    return (
      <Navbar collapseOnSelect expand="md">
        <Nav.Item>
          <Nav.Link title="Exemple">
              Exemple
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link title="Upload">
              <i className="fa fa-upload" />
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link title="Download">
              <i className="fa fa-download" />
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link title="Portail">
              Portail
          </Nav.Link>
        </Nav.Item>
  
        <Navbar.Collapse id="responsive-navbar-menu"></Navbar.Collapse>

        <Nav><Nav.Item><IconeConnexion connecte={props.etatConnexion} /></Nav.Item></Nav>

        <DropDown {...props} />

      </Navbar>
    )
}

function DropDown(props) {

    const nomUsager = props.usager?props.usager.nomUsager:''
    const etat = props.etatConnexion?'Connecte':'Deconnecte'
  
    let linkUsager = <><i className="fa fa-user-circle-o"/> {nomUsager}</>
    if(!nomUsager) linkUsager = 'Parametres'

    return (
        <NavDropdown title={linkUsager} id="basic-nav-dropdown" drop="start" className="menu-item">
          <NavDropdown.Item>
            Changer Langue
          </NavDropdown.Item>
          <NavDropdown.Item>
            Compte
          </NavDropdown.Item>
          <NavDropdown.Item>
            Deconnecter
          </NavDropdown.Item>
        </NavDropdown>
    )

}
  
export default Menu
