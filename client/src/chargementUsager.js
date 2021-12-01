import { proxy } from 'comlink'
import { getUsager } from '@dugrema/millegrilles.reactjs'

const CONST_APP_URL = 'collections'

export async function connecter(workers, setUsagerState) {
    const { connexion } = workers
  
    console.debug("Set callbacks connexion worker")
    // await connexion.setCallbacks(
    //   proxy(setEtatConnexion),
    //   null, // x509Worker,
    //   proxy(preparerWorkersAvecCles)
    // )

    // const location = window.location.href
    // console.info("Connexion a socket.io vers %s", location)

    // const infoIdmg = await connexion.connecter({location})
    // console.debug("Connexion socket.io completee, info idmg : %O", infoIdmg)

    const location = new URL(window.location.href)
    location.pathname = CONST_APP_URL
    console.debug("Connecter a %O", location)

    // Preparer callbacks
    const setUsagerCb = proxy( usager => setUsager(workers, usager, setUsagerState) )
    await connexion.setCallbacks(proxy(setEtatConnexion), workers.x509, setUsagerCb)

    const info = await connexion.connecter(location.href)
    console.debug("Connexion info : %O", info)
}

function setEtatConnexion(etat) {
  console.debug("Etat connexion : %O", etat)
}

async function setUsager(workers, nomUsager, setUsagerState) {
  console.debug("Usager : '%s'", nomUsager)
  const {getUsager} = await import('@dugrema/millegrilles.reactjs')
  const usager = await getUsager(nomUsager)
  
  if(usager && usager.certificat) {
      const { connexion, chiffrage, x509 } = workers
      const fullchain = usager.certificat
      const caPem = [...fullchain].pop()

      const certificatPem = fullchain.join('')

      // Initialiser le CertificateStore
      await chiffrage.initialiserCertificateStore(caPem, {isPEM: true, DEBUG: false})
      await x509.init(caPem)
      await chiffrage.initialiserFormatteurMessage(certificatPem, usager.signer, usager.dechiffrer, {DEBUG: false})
      await connexion.initialiserFormatteurMessage(certificatPem, usager.signer, {DEBUG: false})
  
  } else {
      console.warn("Pas de certificat pour l'usager '%s'", usager)
  }

}
