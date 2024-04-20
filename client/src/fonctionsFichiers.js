export async function getDocuments(workers, tuuids) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    // console.debug("getDocuments Charger documents ", tuuids)
    const reponseFichiers = await connexion.getDocuments(tuuids)
    // console.debug("getDocuments Resultat chargement fichiers : ", reponseFichiers)
    const fichiers = reponseFichiers.fichiers

    const ref_hachage_bytes = fichiers.map(item=>item.metadata.ref_hachage_bytes)
    // console.debug("getDocuments Charger cles documents : %O", ref_hachage_bytes)
    const cles = await clesDao.getCles(ref_hachage_bytes)

    const resultat = []
    for await (const fichier of fichiers) {
        // console.debug("getDocuments Recu fichier %O", fichier)

        // const version_courante = fichier.version_courante
        const metadataChiffre = fichier.metadata
        const ref_hachage_bytes = metadataChiffre.ref_hachage_bytes

        // Recuperer cle
        const cle = cles[ref_hachage_bytes]

        // Dechiffrer metadata
        const metaDechiffree = await chiffrageUtils.dechiffrerChampsChiffres(metadataChiffre, cle)
        // console.debug("metadata dechiffre : %O", metaDechiffree)

        const contenu = {...fichier, ...metaDechiffree}
        // console.debug("Contenu fichier dechiffre : %O", contenu)
        resultat.push(contenu)
    }

    return resultat
}

export async function majFichierMetadata(workers, tuuid, dataChiffre, data) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    const fichiers = await connexion.getDocuments([tuuid])
    const fichier = fichiers.fichiers.pop()
    
    // console.debug("majFichierMetadata %O dataChiffre %O data %O", fichier, dataChiffre, data)

    // const version_courante = fichier.version_courante
    const metadataChiffre = fichier.metadata
    const ref_hachage_bytes = fichier.fuuids_versions[0]
    const cle_id = metadataChiffre.cle_id || ref_hachage_bytes

    // Recuperer cle
    const cles = await clesDao.getCles([cle_id])
    // console.debug("Cles rechiffres : %O", cles)
    const cle = cles[cle_id],
          cleSecrete = cle.cleSecrete

    // Dechiffrer metadata
    const metaDechiffree = await chiffrageUtils.dechiffrerChampsV2(metadataChiffre, cleSecrete)
    // console.debug("metadata dechiffre : %O", metaDechiffree)

    const metaMaj = {...metaDechiffree, ...dataChiffre}
    // console.debug("Data mise a jour : %O", metaMaj)

    // Chiffrer metadata maj
    const champsChiffres = await chiffrageUtils.updateChampsChiffres(metaMaj, cleSecrete, cle_id)
    // console.debug("Metadata rechiffre : %O", champsChiffres)

    const reponse = await connexion.decrireFichier(tuuid, {metadata: champsChiffres, ...data})
    // console.debug("Reponse maj metadata chiffre : %O", reponse)
}

export async function majCollectionMetadata(workers, tuuid, data) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    const fichiers = await connexion.getDocuments([tuuid])
    const fichier = fichiers.fichiers.pop()
    
    // console.debug("majCollectionMetadata %O", fichier)

    const metadataChiffre = fichier.metadata
    const ref_hachage_bytes = metadataChiffre.ref_hachage_bytes
    const cle_id = metadataChiffre.cle_id || ref_hachage_bytes

    // Recuperer cle
    const cles = await clesDao.getCles([cle_id])
    // console.debug("Cles rechiffres : %O", cles)
    const cle = cles[cle_id],
          cleSecrete = cle.cleSecrete

    // Dechiffrer metadata
    const metaDechiffree = await chiffrageUtils.dechiffrerChampsV2(metadataChiffre, cleSecrete)
    // console.debug("metadata dechiffre : %O", metaDechiffree)

    const metaMaj = {...metaDechiffree, ...data}
    // console.debug("Data mise a jour : %O", metaMaj)

    // Chiffrer metadata maj
    const champsChiffres = await chiffrageUtils.updateChampsChiffres(metaMaj, cleSecrete, cle_id)
    // console.debug("Metadata rechiffre : %O", champsChiffres)

    const reponse = await connexion.decrireCollection(tuuid, {metadata: champsChiffres})
    // console.debug("Reponse maj metadata chiffre : %O", reponse)
}
