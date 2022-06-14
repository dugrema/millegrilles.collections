import { 
    supporteFormatWebp, supporteFormatWebm, supporteFileStream, isTouchEnabled,
} from '@dugrema/millegrilles.reactjs'

export async function detecterSupport(setSupport) {
    const webp = await supporteFormatWebp()
    const webm = supporteFormatWebm()
    const fileStream = await supporteFileStream()
    const touch = isTouchEnabled()

    const support = {webp, webm, fileStream, touch}
    console.info("Support du navigateur : %O", support)
    setSupport(support)
}

export async function uploaderFichiers(workers, cuuid, acceptedFiles, opts) {
    opts = opts || {}
    const { erreurCb } = opts

    try {
        console.debug("Uploader vers '%s' fichiers : %O", cuuid, acceptedFiles)

        const { transfertFichiers, connexion } = workers

        const params = {}
        if(cuuid) params.cuuid = cuuid

        // S'assurer d'avoir un certificat de maitre des cles
        const cert = await connexion.getCertificatsMaitredescles()
        // console.debug("Certificat maitre des cles : %O", cert)
        const { certificat } = cert

        if(certificat) {
            transfertFichiers.up_setCertificat(certificat)
            const infoUploads = await transfertFichiers.up_ajouterFichiersUpload(acceptedFiles, params)
            return infoUploads
        } else {
            if(erreurCb) erreurCb("Erreur durant la preparation d'upload du fichier - aucuns certificat serveur recu")
            else console.error("Erreur getCertificatsMaitredescles - aucun certificat recu")
        }
    } catch(err) {
        if(erreurCb) erreurCb(err, "Erreur durant la preparation d'upload du fichier")
        else console.error("Erreur durant la preparation d'upload du fichier : %O", err)
    }
    
}