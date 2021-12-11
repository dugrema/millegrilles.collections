import { proxy } from 'comlink'

const CONST_APP_URL = 'collections'

export async function connecter(workers, setUsagerState, setEtatConnexion) {
    const { connexion } = workers
  
    // console.debug("Set callbacks connexion worker")
    const location = new URL(window.location.href)
    location.pathname = CONST_APP_URL
    console.info("Connecter a %O", location.href)

    // Preparer callbacks
    const setUsagerCb = proxy( usager => setUsager(workers, usager, setUsagerState) )
    const setEtatConnexionCb = proxy(etat => {
        setEtatConnexion(etat)
    })
    await connexion.setCallbacks(setEtatConnexionCb, setUsagerCb)
    await connexion.connecter(location.href)
}

async function setUsager(workers, nomUsager, setUsagerState, opts) {
    opts = opts || {}
    // console.debug("setUsager '%s'", nomUsager)
    const { getUsager } = await import('@dugrema/millegrilles.reactjs')
    const usager = await getUsager(nomUsager)
    // console.debug("Usager info : %O", usager)
    
    if(usager && usager.certificat) {
        const { connexion, chiffrage, x509 } = workers
        const fullchain = usager.certificat
        const caPem = [...fullchain].pop()

        const certificatPem = fullchain.join('')

        // Initialiser le CertificateStore
        await chiffrage.initialiserCertificateStore(caPem, {isPEM: true, DEBUG: false})
        await x509.init(caPem)

        // Init cles privees
        await chiffrage.initialiserFormatteurMessage(certificatPem, usager.dechiffrer, usager.signer, {DEBUG: true})
        await connexion.initialiserFormatteurMessage(certificatPem, usager.signer, {DEBUG: false})
    
        setUsagerState({nomUsager})
    } else {
        console.warn("Pas de certificat pour l'usager '%s'", usager)
    }

}
