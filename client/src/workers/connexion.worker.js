import { expose } from 'comlink'
import { ConnexionClient } from '@dugrema/millegrilles.reactjs'
// Exposer methodes du Worker
expose(ConnexionClient)


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

// async function connecter(opts) {
//   opts = opts || {}

//   let urlApp = null
//   if(opts.url) {
//     urlApp = new URL(opts.url)
//   } else {
//     if(!urlApp) {
//       urlApp = new URL(opts.location)
//       urlApp.pathname = URL_GROSFICHIERS
//     }
//   }
//   // console.debug("url choisi : %O", urlApp)

//   if(urlApp === _urlCourant) return
//   // _urlCourant = null  // Reset url courant

//   const urlSocketio = new URL(urlApp.href)
//   urlSocketio.pathname = path.join(urlSocketio.pathname, 'socket.io')

//   // console.debug("Socket.IO connecter avec url %s", urlSocketio.href)
//   // return connexionClient.connecter(url, opts)

//   // const urlInfo = new URL(url)
//   const hostname = 'https://' + urlSocketio.host
//   const pathSocketio = urlSocketio.pathname

//   // console.debug("Connecter socket.io a url host: %s, path: %s", hostname, pathSocketio)
//   const connexion = connexionClient.connecter(urlSocketio.href, opts)

//   connexionClient.socketOn('connect', _=>{
//     // console.debug("socket.io connecte a %O", urlSocketio)
//     _connecte = true
//     _urlCourant = urlApp
//     onConnect()
//       .then(protege=>{
//         _protege = protege
//         if(_callbackSetEtatConnexion) _callbackSetEtatConnexion(protege)
//       })
//   })
//   connexionClient.socketOn('reconnect', _=>{
//     // console.debug("Reconnecte")
//     _connecte = true
//     onConnect()
//       .then(protege=>{
//         _protege = protege
//         if(_callbackSetEtatConnexion) _callbackSetEtatConnexion(protege)
//       })
//   })
//   connexionClient.socketOn('disconnect', _=>{
//     // console.debug("Disconnect socket.io")
//     _connecte = false
//     _protege = false
//     if(_callbackSetEtatConnexion) _callbackSetEtatConnexion(false)
//   })
//   connexionClient.socketOn('connect_error', err=>{
//     // console.debug("Erreur socket.io : %O", err)
//     _connecte = false
//     _protege = false
//     if(_callbackSetEtatConnexion) _callbackSetEtatConnexion(false)
//   })

//   return connexion
// }

// async function onConnect() {

//   // S'assurer que la connexion est faite avec le bon site
//   const randomBytes = new Uint8Array(64)
//   await getRandomValues(randomBytes)
//   const challenge = String.fromCharCode.apply(null, multibase.encode('base64', randomBytes))
//   const reponse = await new Promise(async (resolve, reject)=>{
//     // console.debug("Emission challenge connexion Socket.io : %O", challenge)
//     const timeout = setTimeout(_=>{
//       reject('Timeout')
//     }, 15000)
//     const reponse = await connexionClient.emitBlocking('challenge', {challenge, noformat: true})
//     // console.debug("Reponse challenge connexion Socket.io : %O", reponse)
//     clearTimeout(timeout)

//     if(reponse.reponse === challenge) {
//       resolve(reponse)
//     } else{
//       reject('Challenge mismatch')
//     }
//   })

//   // Initialiser les cles, stores, etc pour tous les workers avec
//   // le nom de l'usager. Le certificat doit exister et etre valide pour la
//   // millegrille a laquelle on se connecte.
//   const nomUsager = reponse.nomUsager
//   await _callbackPreparerCles(nomUsager)

//   // Valider la reponse signee
//   // const signatureValide = await _verifierSignature(reponse)
//   const signatureValide = await _x509Worker.verifierMessage(reponse)
//   if(!signatureValide) {
//     throw new Error("Signature de la reponse invalide, serveur non fiable")
//   }

//   // console.debug("Signature du serveur est valide")
//   // On vient de confirmer que le serveur a un certificat valide qui correspond
//   // a la MilleGrille. L'authentification du client se fait automatiquement
//   // avec le certificat (mode prive ou protege).

//   // Faire l'upgrade protege
//   const resultatProtege = await connexionClient.upgradeProteger()
//   // console.debug("Resultat upgrade protege : %O", resultatProtege)

//   // Emettre l'evenement qui va faire enregistrer les evenements de mise a jour
//   // pour le mapping, siteconfig et sections
//   connexionClient.emit('ecouterMaj')

//   return resultatProtege
// }

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

// function getFavoris() {
//   return connexionClient.emitBlocking('grosfichiers/getFavoris')
// }

// function getSites() {
//   return connexionClient.emitBlocking('grosfichiers/getSites')
// }

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
