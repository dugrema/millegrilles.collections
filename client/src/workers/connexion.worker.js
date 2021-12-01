import { expose } from 'comlink'
import { ConnexionClient } from '@dugrema/millegrilles.reactjs'

// // import {expose as comlinkExpose} from 'comlink'
// import multibase from 'multibase'
// import path from 'path'

// // import connexionClient from '@dugrema/millegrilles.common/lib/connexionClient'
// import { getRandomValues } from '@dugrema/millegrilles.utiljs'

// const URL_GROSFICHIERS = '/grosfichiers'
// // const URL_SOCKET = URL_GROSFICHIERS + '/socket.io'

// var // _callbackSiteMaj,
//     // _callbackSectionMaj,
//     _callbackSetEtatConnexion,
//     _callbackPreparerCles,
//     // _resolverWorker,
//     _x509Worker,
//     // _verifierSignature,   // web worker resolver (utilise pour valider signature messages)
//     // _siteConfig,
//     _urlCourant = '',
//     // _urlBase = '',
//     _connecte = false,
//     _protege = false

// function setCallbacks(setEtatConnexion, x509Worker, callbackPreparerCles) {
//   _callbackSetEtatConnexion = setEtatConnexion
//   _x509Worker = x509Worker
//   _callbackPreparerCles = callbackPreparerCles
//   // console.debug("setCallbacks connexionWorker : %O, %O", setEtatConnexion, x509Worker, callbackPreparerCles)
// }

// function estActif() {
//   return _urlCourant && _connecte && _protege
// }

// // function connecter(opts) {
// //   opts = opts || {}
// //   var url = opts.url
// //   if(!url) {
// //     // Utiliser le serveur local mais remplacer le pathname par URL_SOCKET
// //     const urlLocal = new URL(opts.location)
// //     urlLocal.pathname = URL_SOCKET
// //     urlLocal.hash = ''
// //     urlLocal.search = ''
// //     url = urlLocal.href
// //   }
// //   console.debug("Connecter socket.io sur url %s", url)
// //   return connexionClient.connecter(url, opts)
// // }

// function requeteDocuments(tuuidsDocuments) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/getDocumentsParTuuid',
//     {tuuids_documents: tuuidsDocuments},
//     {domaine: 'GrosFichiers', action: 'documentsParTuuid'}
//   )
// }

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

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris')
}

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
    getFavoris
})
