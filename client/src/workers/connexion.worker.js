import { expose } from 'comlink'
// import { ConnexionClient, saveCleDechiffree, getCleDechiffree } from '@dugrema/millegrilles.reactjs'
import * as ConnexionClient from '@dugrema/millegrilles.reactjs/src/connexionClient'


const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles'

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris', {}, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris', ajouterCertificat: true})
}

function getRecents(params) {
  return ConnexionClient.emitBlocking('getRecents', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'activiteRecente', ajouterCertificat: true})
}

function getContenuCollection(tuuidsDocuments) {
  const params = {tuuid_collection: tuuidsDocuments}
  return ConnexionClient.emitBlocking('getCollection', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'contenuCollection', ajouterCertificat: true})
}

async function getClesFichiers(fuuids, usager, opts) {
  opts = opts || {}

  if(opts.cache) console.warn("TODO - supporter cache cles dans idb")

  // Todo - tenter de charger 

  const extensions = usager || {}
  const delegationGlobale = extensions.delegationGlobale

  let permission = null
  if(!delegationGlobale) {
    // On doit demander une permission en premier
    const params = { fuuids }
    permission = await ConnexionClient.emitBlocking('getPermissionCle', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPermission', ajouterCertificat: true})
    console.debug("Permission recue : %O", permission)
  }

  const params = {
    liste_hachage_bytes: fuuids,
    permission,
  }
  return ConnexionClient.emitBlocking('getClesFichiers', params, {domaine: CONST_DOMAINE_MAITREDESCLES, action: 'dechiffrage', ajouterCertificat: true})
}

function creerCollection(nomCollection, opts) {
  opts = opts || {}
  const params = {nom: nomCollection}
  if(opts.cuuid) params.cuuid = opts.cuuid
  if(opts.favoris) params.favoris = true
  return ConnexionClient.emitBlocking(
    'creerCollection', 
    params, 
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'nouvelleCollection', ajouterCertificat: true}
  )
}

// function creerCollection(transaction) {
//   return connexionClient.emitBlocking(
//     'grosfichiers/creerCollection',
//     transaction,
//     {domaine: 'GrosFichiers', action: 'nouvelleCollection', attacherCertificat: true}
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

async function enregistrerCallbackMajFichier(cb) {
  ConnexionClient.socketOn('evenement.grosfichiers.majFichier', cb)
  const resultat = await ConnexionClient.emitBlocking('ecouterMajFichiers', {}, {noformat: true})
  if(!resultat) {
    throw new Error("Erreur enregistrerCallbackMajFichier")
  }
}

async function enregistrerCallbackMajCollection(cb) {
  ConnexionClient.socketOn('evenement.grosfichiers.majCollection', cb)
  const resultat = await ConnexionClient.emitBlocking('ecouterMajCollections', {}, {noformat: true})
  if(!resultat) {
    throw new Error("Erreur enregistrerCallbackMajFichier")
  }
}

async function enregistrerCallbackTranscodageProgres(fuuid, cb) {
  ConnexionClient.socketOn('evenement.fichiers.transcodageProgres', cb)
  const resultat = await ConnexionClient.emitBlocking('grosfichiers/ecouterTranscodageProgres', {fuuid}, {noformat: true})
  if(!resultat) {
    throw new Error("Erreur enregistrerCallbackMajFichier")
  }
}

async function supprimerCallbackTranscodageProgres(fuuid) {
  ConnexionClient.socketOff('evenement.fichiers.transcodageProgres')
  const resultat = await ConnexionClient.emitBlocking('grosfichiers/retirerTranscodageProgres', {fuuid}, {noformat: true})
  if(!resultat) {
    throw new Error("Erreur enregistrerCallbackMajFichier")
  }
}

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
    getClesFichiers,
    getFavoris, getRecents, getContenuCollection,
    creerCollection,

    // Event listeners
    enregistrerCallbackMajFichier, enregistrerCallbackMajCollection,
    enregistrerCallbackTranscodageProgres, supprimerCallbackTranscodageProgres,

})
