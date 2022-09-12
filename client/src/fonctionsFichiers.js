// import { 
//     supporteFormatWebp, supporteFormatWebm, supporteFileStream, isTouchEnabled,
// } from '@dugrema/millegrilles.reactjs'

// export async function detecterSupport(setSupport) {
//     const webp = await supporteFormatWebp()
//     const webm = supporteFormatWebm()
//     const fileStream = await supporteFileStream()
//     const touch = isTouchEnabled()

//     const support = {webp, webm, fileStream, touch}
//     console.info("Support du navigateur : %O", support)
//     setSupport(support)
// }

export async function uploaderFichiers(workers, cuuid, acceptedFiles, opts) {
    opts = opts || {}
    const { erreurCb } = opts

    // Pre-validation des fichiers - certains navigateurs ne supportent pas des noms fichiers avec
    // characteres non ASCII (e.g. Brave sur Linux). Rapportent un nom de fichier vide ("").
    const fichiersOk = acceptedFiles.filter(item=>item.name)
    if(fichiersOk.length === 0) {
        if(erreurCb) erreurCb("Les noms des fichiers ne sont pas supportes par votre navigateur")
        else console.error("Erreur getCertificatsMaitredescles - aucun certificat recu")
        return
    } else if (fichiersOk.length < acceptedFiles.length) {
        const nomsFichiersOk = fichiersOk.map(item=>item.path).join(', ')
        if(erreurCb) erreurCb(`Les noms de certains fichiers ne sont pas supportes. Fichiers OK : ${nomsFichiersOk}`)
    }

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

            // Mapper fichiers
            const acceptedFilesMapped = fichiersOk.map(item=>{
                const data = {}
                data.name = item.name
                data.type = item.type
                data.size = item.size
                data.path = item.path
                data.lastModified = item.lastModified
                data.object = item
                return data
            })

            const infoUploads = await transfertFichiers.up_ajouterFichiersUpload(acceptedFilesMapped, params)
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

export async function majFichierMetadata(workers, tuuid, dataChiffre, data) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    const fichiers = await connexion.getDocuments([tuuid])
    const fichier = fichiers.fichiers.pop()
    
    console.debug("majFichierMetadata %O dataChiffre %O data %O", fichier, dataChiffre, data)

    const version_courante = fichier.version_courante
    const metadataChiffre = version_courante.metadata
    const ref_hachage_bytes = fichier.fuuid_v_courante

    // Recuperer cle
    const cles = await clesDao.getCles([ref_hachage_bytes])
    console.debug("Cles rechiffres : %O", cles)
    const cle = cles[ref_hachage_bytes],
          cleSecrete = cle.cleSecrete

    // Dechiffrer metadata
    const metaDechiffree = await chiffrageUtils.dechiffrerChampsChiffres(metadataChiffre, cle)
    console.debug("metadata dechiffre : %O", metaDechiffree)

    const metaMaj = {...metaDechiffree, ...dataChiffre}
    console.debug("Data mise a jour : %O", metaMaj)

    // Chiffrer metadata maj
    const champsChiffres = await chiffrageUtils.updateChampsChiffres(metaMaj, cleSecrete)
    console.debug("Metadata rechiffre : %O", champsChiffres)

    const reponse = await connexion.decrireFichier(tuuid, {metadata: champsChiffres, ...data})
    console.debug("Reponse maj metadata chiffre : %O", reponse)
}

export async function majCollectionMetadata(workers, tuuid, data) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    const fichiers = await connexion.getDocuments([tuuid])
    const fichier = fichiers.fichiers.pop()
    
    console.debug("majCollectionMetadata %O", fichier)

    const metadataChiffre = fichier.metadata
    const ref_hachage_bytes = metadataChiffre.ref_hachage_bytes

    // Recuperer cle
    const cles = await clesDao.getCles([ref_hachage_bytes])
    console.debug("Cles rechiffres : %O", cles)
    const cle = cles[ref_hachage_bytes],
          cleSecrete = cle.cleSecrete

    // Dechiffrer metadata
    const metaDechiffree = await chiffrageUtils.dechiffrerChampsChiffres(metadataChiffre, cle, {ref_hachage_bytes})
    console.debug("metadata dechiffre : %O", metaDechiffree)

    const metaMaj = {...metaDechiffree, ...data}
    console.debug("Data mise a jour : %O", metaMaj)

    // Chiffrer metadata maj
    const champsChiffres = await chiffrageUtils.updateChampsChiffres(metaMaj, cleSecrete, {ref_hachage_bytes})
    console.debug("Metadata rechiffre : %O", champsChiffres)

    const reponse = await connexion.decrireCollection(tuuid, {metadata: champsChiffres})
    console.debug("Reponse maj metadata chiffre : %O", reponse)
}
