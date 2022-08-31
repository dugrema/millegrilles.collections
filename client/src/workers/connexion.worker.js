import { expose } from 'comlink'
import * as ConnexionClient from '@dugrema/millegrilles.reactjs/src/connexionClient'

const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles'
      /* , CONST_DOMAINE_FICHIERS = 'fichiers' */

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris', {}, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris', ajouterCertificat: true})
}

function getCorbeille() {
  return ConnexionClient.emitBlocking('getCorbeille', {}, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getCorbeille', ajouterCertificat: true})
}

function getRecents(params) {
  return ConnexionClient.emitBlocking('getRecents', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'activiteRecente', ajouterCertificat: true})
}

function getContenuCollection(tuuidsDocuments, opts) {
  opts = opts || {}
  const params = {...opts, tuuid_collection: tuuidsDocuments}
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
    console.debug("!!! Get cles fichiers (!delegation globale)", params)
    const reponse = await ConnexionClient.emitBlocking('getPermissionCles', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getClesFichiers', ajouterCertificat: true})
    console.debug("!!! reponse get cles fichiers ", reponse)
    return reponse
  } else {
    const params = {
      liste_hachage_bytes: fuuids,
      permission,
    }
    console.debug("!!! Get cles fichiers ", params)
    const reponse = await ConnexionClient.emitBlocking('getClesFichiers', params, {domaine: CONST_DOMAINE_MAITREDESCLES, action: 'dechiffrage', ajouterCertificat: true})
    console.debug("!!! reponse get cles fichiers ", reponse)
    return reponse
  }
}

async function getPermission(fuuids) {
  // On doit demander une permission en premier
  const params = { fuuids }
  const permission = await ConnexionClient.emitBlocking('getPermissionCle', params, {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPermission', ajouterCertificat: true})
  // console.debug("Permission recue : %O", permission)

  return permission
}

async function creerCollection(metadataChiffre, commandeMaitrecles, opts) {
  opts = opts || {}
  const params = {
    metadata: metadataChiffre,
  }
  if(opts.cuuid) params.cuuid = opts.cuuid
  if(opts.favoris) params.favoris = true

  params['_commandeMaitrecles'] = commandeMaitrecles

  return ConnexionClient.emitBlocking(
    'creerCollection', 
    params, 
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'nouvelleCollection', ajouterCertificat: true}
  )
}

function toggleFavoris(etatFavoris) {
  // Format etatFavoris : {tuuid1: false, tuuid2: true, ...}
  return ConnexionClient.emitBlocking(
    'changerFavoris',
    {favoris: etatFavoris},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'changerFavoris', attacherCertificat: true}
  )
}

// function retirerDocumentsCollection(cuuid, tuuids) {
//   return ConnexionClient.emitBlocking(
//     'retirerDocuments',
//     {cuuid, retirer_tuuids: tuuids},
//     {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'retirerDocumentsCollection', attacherCertificat: true}
//   )
// }

function supprimerDocuments(cuuid, tuuids) {
  return ConnexionClient.emitBlocking(
    'supprimerDocuments',
    {cuuid, tuuids},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerDocuments', attacherCertificat: true}
  )
}

function decrireFichier(tuuid, params) {
  return ConnexionClient.emitBlocking(
    'decrireFichier',
    {...params, tuuid},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireFichier', attacherCertificat: true}
  )
}

function decrireCollection(tuuid, params) {
  return ConnexionClient.emitBlocking(
    'decrireCollection',
    {...params, tuuid},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireCollection', attacherCertificat: true}
  )
}

function getDocuments(tuuids) {
  return ConnexionClient.emitBlocking(
    'getDocuments',
    {tuuids_documents: tuuids},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'documentsParTuuid', attacherCertificat: true}
  )
}

function recupererDocuments(tuuids) {
  return ConnexionClient.emitBlocking(
    'recupererDocuments',
    {tuuids},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'recupererDocuments', attacherCertificat: true}
  )
}

function copierVersCollection(cuuid, tuuids) {
  return ConnexionClient.emitBlocking(
    'copierVersCollection',
    {cuuid, inclure_tuuids: tuuids},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterFichiersCollection', attacherCertificat: true}
  )
}

function deplacerFichiersCollection(cuuid_origine, cuuid_destination, tuuids) {
  return ConnexionClient.emitBlocking(
    'deplacerFichiersCollection',
    {cuuid_origine, cuuid_destination, inclure_tuuids: tuuids},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'deplacerFichiersCollection', attacherCertificat: true}
  )
}

function rechercheIndex(mots_cles, from_idx, size) {
  from_idx = from_idx?from_idx:0
  size = size?size:50
  return ConnexionClient.emitBlocking(
    'rechercheIndex',
    {mots_cles, from_idx, size},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'rechercheIndex', attacherCertificat: true}
  )
}

function transcoderVideo(commande) {
  return ConnexionClient.emitBlocking(
    'transcoderVideo',
    commande,
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'transcoderVideo', attacherCertificat: true}
  )
}

function ajouterFichier(commande) {
  return ConnexionClient.emitBlocking(
    'ajouterFichier',
    commande,
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'commandeNouveauFichier', attacherCertificat: true}
  )
}

function supprimerVideo(fuuidVideo) {
  const commande = {fuuid_video: fuuidVideo}
  return ConnexionClient.emitBlocking(
    'supprimerVideo',
    commande,
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerVideo', attacherCertificat: true}
  )
}

function creerTokenStream(fuuids) {
  const commande = {fuuids}
  return ConnexionClient.emitBlocking(
    'creerTokenStream', 
    commande, 
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'verifierAccesFuuids', ajouterCertificat: true}
  )
}

function syncCollection(cuuid, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {skip, limit}
  if(cuuid) requete.cuuid = cuuid
  const params = {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCollection', ajouterCertificat: true}
  // console.debug("syncCollection %O, %O", requete, params)
  return ConnexionClient.emitBlocking('syncCollection', requete, params)
}

function syncRecents(debut, fin, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {debut, fin, skip, limit}
  const params = {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncRecents', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('syncRecents', requete, params)
}

function syncCorbeille(debut, fin, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {debut, fin, skip, limit}
  const params = {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCorbeille', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('syncCorbeille', requete, params)
}


// Fonctions delegues

function indexerContenu(reset) {
  return ConnexionClient.emitBlocking(
    'indexerContenu',
    {reset},
    {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'indexerContenu', attacherCertificat: true}
  )
}

// async function regenererPreviews(uuidFichiers) {
//   const commande = { uuid: uuidFichiers }
//   return connexionClient.emitBlocking(
//     'grosfichiers/regenererPreviews',
//     commande,
//     {domaine: 'GrosFichiers', action: 'completerPreviews', attacherCertificat: true}
//   )
// }

// Listeners

function enregistrerCallbackMajFichier(params, cb) { 
  return ConnexionClient.subscribe('enregistrerCallbackMajFichier', cb, params)
}

function retirerCallbackMajFichier(params, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackMajFichier', cb, params) 
}

function enregistrerCallbackMajFichierCollection(params, cb) { 
  return ConnexionClient.subscribe('enregistrerCallbackMajFichierCollection', cb, params)
}

function retirerCallbackMajFichierCollection(params, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackMajFichierCollection', cb, params) 
}

function enregistrerCallbackMajCollections(params, cb) { 
  return ConnexionClient.subscribe('enregistrerCallbackMajCollections', cb, params) 
}

function retirerCallbackMajCollections(params, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackMajCollections', cb, params) 
}

function enregistrerCallbackMajContenuCollection(params, cb) { 
  return ConnexionClient.subscribe('enregistrerCallbackMajContenuCollection', cb, params)
}

function retirerCallbackMajContenuCollection(params, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackMajContenuCollection', cb, params) 
}

function enregistrerCallbackTranscodageProgres(params, cb) { 
  // console.debug("enregistrerCallbackTranscodageProgres params : %O", params)
  return ConnexionClient.subscribe('enregistrerCallbackTranscodageVideo', cb, params) 
}

function retirerCallbackTranscodageProgres(params, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackTranscodageVideo', cb, params) 
}

// Exposer methodes du Worker
expose({
    ...ConnexionClient, 

    // Requetes et commandes privees
    getDocuments, getClesFichiers,
    getFavoris, getCorbeille, getRecents, getContenuCollection,
    creerCollection, toggleFavoris, 
    recupererDocuments, supprimerDocuments,
    decrireFichier, decrireCollection,
    copierVersCollection, deplacerFichiersCollection,
    rechercheIndex, transcoderVideo, getPermission,
    ajouterFichier, creerTokenStream, supprimerVideo,

    syncCollection, syncRecents, syncCorbeille,

    // Event listeners prives
    enregistrerCallbackMajFichier, retirerCallbackMajFichier,
    enregistrerCallbackMajCollections, retirerCallbackMajCollections,
    enregistrerCallbackTranscodageProgres, retirerCallbackTranscodageProgres,
    enregistrerCallbackMajFichierCollection, retirerCallbackMajFichierCollection,
    enregistrerCallbackMajContenuCollection, retirerCallbackMajContenuCollection,

    // Commandes delegue
    indexerContenu,

})
