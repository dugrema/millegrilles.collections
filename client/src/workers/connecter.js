import { proxy } from 'comlink'

const CONST_APP_URL = 'collections/socket.io'

export async function connecter(workers, setUsagerState, setEtatConnexion) {
    const { connexion } = workers
  
    console.debug("Set callbacks connexion worker")
    const location = new URL(window.location.href)
    location.pathname = CONST_APP_URL
    console.info("Connecter a %O", location.href)

    // Preparer callbacks
    const setUsagerCb = proxy( usager => setUsager(workers, usager, setUsagerState) )
    const setEtatConnexionCb = proxy(etat => {
        setEtatConnexion(etat)
    })
    await connexion.setCallbacks(setEtatConnexionCb, setUsagerCb)
    return connexion.connecter(location.href)
}

async function setUsager(workers, nomUsager, setUsagerState, opts) {
    opts = opts || {}
    console.debug("setUsager '%s'", nomUsager)
    const { getUsager, utiljs } = await import('@dugrema/millegrilles.reactjs')
    console.debug("utiljs : %O", utiljs)
    const { pki } = await import('@dugrema/node-forge')
    const { extraireExtensionsMillegrille } = utiljs.forgecommon
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
        await chiffrage.initialiserFormatteurMessage(certificatPem, usager.clePriveePem, {DEBUG: true})
        await connexion.initialiserFormatteurMessage(certificatPem, usager.clePriveePem, {DEBUG: false})
    
        const certForge = pki.certificateFromPem(fullchain[0])
        const extensions = extraireExtensionsMillegrille(certForge)

        setUsagerState({nomUsager, fullchain, extensions})
    } else {
        console.warn("Pas de certificat pour l'usager '%s'", usager)
    }

}
