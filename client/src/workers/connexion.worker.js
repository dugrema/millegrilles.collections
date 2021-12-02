import { expose } from 'comlink'
import { ConnexionClient } from '@dugrema/millegrilles.reactjs'

const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers'

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris', {}, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris'})
}

function getActivite(params) {
  return ConnexionClient.emitBlocking('getActivite', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'activiteRecente'})
}

function getContenuCollection(tuuidsDocuments) {
  const params = {tuuid_collection: tuuidsDocuments}
  return ConnexionClient.emitBlocking('getCollection', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'contenuCollection'})
}

// function getClesChiffrage() {
//   return connexionClient.emitBlocking('grosfichiers/getClesChiffrage')
// }

// function getFichiersActivite(params) {
//   return connexionClient.emitBlocking('grosfichiers/getActivite', params)
// }

// function getFichiersCorbeille(params) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/getCorbeille',
//     params,
//     {domaine: 'GrosFichiers', action: 'getCorbeille', attacherCertificat: true}
//   )
// }

// // function getCleFichier(requete) {
// //   return connexionClient.emitBlocking(
// //     'grosfichiers/getCleFichier',
// //     requete,
// //     {domaine: 'GrosFichiers', action: 'getCleFichier'}
// //   )
// // }

// function getCollections() {
//   return connexionClient.emitBlocking('grosfichiers/getCollections')
// }

// function getContenuCollection(tuuid_collection, sortParams) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/getContenuCollection',
//     {tuuid_collection, ...sortParams},
//     {domaine: 'GrosFichiers', action: 'contenuCollection', attacherCertificat: true}
//   )
// }

// function ajouterDocumentsDansCollection(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/ajouterDocumentsDansCollection',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'ajouterFichiersCollection', attacherCertificat: true}
//   )
// }

// function creerCollection(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/creerCollection',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'nouvelleCollection', attacherCertificat: true}
//   )
// }

// function toggleFavoris(tuuid, etatFavori) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/changerFavoris',
//     {favoris: {[tuuid]: etatFavori}},
//     {domaine: 'GrosFichiers', action: 'changerFavoris', attacherCertificat: true}
//   )
// }

// function supprimerDocuments(transaction) {
//   // return connexionClient.emitBlocking('grosfichiers/supprimerDocuments', {transaction})
//   return connexionClient.emitBlocking(
//     'grosfichiers/supprimerDocuments',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'supprimerDocuments', attacherCertificat: true}
//   )
// }

// function retirerDocumentsCollection(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/retirerDocuments',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'retirerDocumentsCollection', attacherCertificat: true}
//   )
// }

// function recupererDocuments(tuuidSelectionnes) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/recupererDocuments',
//     {tuuids: tuuidSelectionnes},
//     {domaine: 'GrosFichiers', action: 'recupererDocuments', attacherCertificat: true}
//   )
// }

// function renommerDocument(transaction) {
//   return connexionClient.emitBlocking('grosfichiers/renommerDocument', {transaction})
// }

// function decrireCollection(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/decrireCollection',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'decrireCollection', attacherCertificat: true}
//   )
// }

// function decrireFichier(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/decrireFichier',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'decrireFichier', attacherCertificat: true}
//   )
// }

// function transcoderVideo(commande) {
//   return connexionClient.emitBlocking(
//     'fichiers/transcoderVideo',
//     commande,
//     {domaine: 'fichiers', action: 'transcoderVideo', attacherCertificat: true}
//   )
// }

// function getConversionsMedia() {
//   return connexionClient.emitBlocking('grosfichiers/getConversionsMedia', {})
// }

// function demandePermissionDechiffragePublic(params) {
//   return connexionClient.emitBlocking('grosfichiers/demandePermissionDechiffragePublic', params)
// }

// async function getCleFichierProtege(fuuid) {
//   return connexionClient.emitBlocking(
//     'maitrecles/getCleFichierProtege',
//     { liste_hachage_bytes: [fuuid] },
//     { domaine: 'MaitreDesCles', action: 'dechiffrage', attacherCertificat: true }
//   )
// }

// async function rechercherIndex(requete) {
//   const domaine = 'GrosFichiers', action = 'rechercheIndex'
//   return connexionClient.emitBlocking(
//     'grosfichiers/rechercherIndex',
//     requete,
//     {domaine, action, attacherCertificat: true}
//   )
// }

// async function regenererPreviews(uuidFichiers) {
//   const commande = { uuid: uuidFichiers }
//   return connexionClient.emitBlocking(
//     'grosfichiers/regenererPreviews',
//     commande,
//     {domaine: 'GrosFichiers', action: 'completerPreviews', attacherCertificat: true}
//   )
// }

// async function indexerFichiers(commande) {
//   const domaine = 'GrosFichiers', action = 'indexerContenu'
//   return connexionClient.emitBlocking(
//     'grosfichiers/indexerFichiers',
//     commande,
//     {domaine, action, attacherCertificat: true}
//   )
// }

// async function enregistrerCallbackMajFichier(cb) {
//   connexionClient.socketOn('evenement.grosfichiers.majFichier', cb)
//   const resultat = await connexionClient.emitBlocking('grosfichiers/ecouterMajFichiers', {}, {noformat: true})
//   if(!resultat) {
//     throw new Error("Erreur enregistrerCallbackMajFichier")
//   }
//   // console.debug("Evenement majFichier enregistre")
// }

// async function enregistrerCallbackMajCollection(cb) {
//   connexionClient.socketOn('evenement.grosfichiers.majCollection', cb)
//   const resultat = await connexionClient.emitBlocking('grosfichiers/ecouterMajCollections', {}, {noformat: true})
//   if(!resultat) {
//     throw new Error("Erreur enregistrerCallbackMajFichier")
//   }
//   // console.debug("Evenement enregistrerCallbackMajCollection enregistre")
// }

// async function enregistrerCallbackTranscodageProgres(fuuid, cb) {
//   connexionClient.socketOn('evenement.fichiers.transcodageProgres', cb)
//   const resultat = await connexionClient.emitBlocking('grosfichiers/ecouterTranscodageProgres', {fuuid}, {noformat: true})
//   if(!resultat) {
//     throw new Error("Erreur enregistrerCallbackMajFichier")
//   }
//   // console.debug("Ecouter evenement enregistrerCallbackTranscodageProgres %s", fuuid)
// }

// async function supprimerCallbackTranscodageProgres(fuuid) {
//   connexionClient.socketOff('evenement.fichiers.transcodageProgres')
//   const resultat = await connexionClient.emitBlocking('grosfichiers/retirerTranscodageProgres', {fuuid}, {noformat: true})
//   if(!resultat) {
//     throw new Error("Erreur enregistrerCallbackMajFichier")
//   }
//   // console.debug("Retrait ecoute evenement enregistrerCallbackTranscodageProgres %s", fuuid)
// }

// comlinkExpose({
//   ...ConnexionClient,
//   connecter,  // Override de connexionClient.connecter
//   setCallbacks,

//   requeteDocuments, getClesChiffrage, getFichiersActivite, getFichiersCorbeille,
//   //getCleFichier,
//   getFavoris, getSites, getCollections, getContenuCollection,
//   ajouterDocumentsDansCollection, creerCollection, toggleFavoris, supprimerDocuments,
//   retirerDocumentsCollection, recupererDocuments, renommerDocument, decrireCollection,
//   decrireFichier, transcoderVideo, getConversionsMedia,
//   demandePermissionDechiffragePublic, getCleFichierProtege,
//   estActif, regenererPreviews, rechercherIndex, indexerFichiers,

//   enregistrerCallbackMajFichier, enregistrerCallbackMajCollection,
//   enregistrerCallbackTranscodageProgres, supprimerCallbackTranscodageProgres,
// })

// Exposer methodes du Worker
expose({
    ...ConnexionClient, 
    getFavoris, getActivite, getContenuCollection,
})
