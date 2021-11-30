import { proxy } from 'comlink'
import { getUsager } from '@dugrema/millegrilles.reactjs'

export async function chargerUsager(workers, setUsager) {
    // Recuperer le profil usager a partir de la connexion (session active)
    const connexion = workers.connexion
    const informationSession = await connexion.getInformationMillegrille()
    console.debug("Information session courante : %O", informationSession)

    // Ouvrir la DB, faire upgrade si necessaire
    // const usager = getUsager(nomUsager, {upgrade: true})
}

export async function connecter(workers, setUsager) {
    const { connexion } = workers
  
    console.debug("Set callbacks connexion worker")
  await connexion.setCallbacks(
    proxy(setEtatConnexion),
    null, // x509Worker,
    proxy(preparerWorkersAvecCles)
  )

  const location = window.location.href
  console.info("Connexion a socket.io vers %s", location)

  const infoIdmg = await connexion.connecter({location})
  console.debug("Connexion socket.io completee, info idmg : %O", infoIdmg)
}

function setEtatConnexion(etat) {
    console.debug("ETAT CONNEXION : %O", etat)
}

function preparerWorkersAvecCles(info) {
    console.debug("Preparer workers avec cles : %O", info)
}