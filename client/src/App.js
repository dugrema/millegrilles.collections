import { Container } from 'react-bootstrap'
import { LayoutApplication, HeaderApplication, FooterApplication } from '@dugrema/millegrilles.reactjs'

import './App.css'

function App() {
  console.debug("App rendered")
  return (
    <LayoutApplication>
      
      <HeaderApplication>
        <nav>Menu</nav>
      </HeaderApplication>

      <Container>
        <h1>Contenu</h1>
      </Container>

      <FooterApplication>
        <p>Footer</p>
      </FooterApplication>

    </LayoutApplication>
  )
}

export default App
