import { expose } from 'comlink'
import * as ConnexionClient from '@dugrema/millegrilles.reactjs/src/connexionClient'
import { MESSAGE_KINDS } from '@dugrema/millegrilles.utiljs/src/constantes'


const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles'
      /* , CONST_DOMAINE_FICHIERS = 'fichiers' */

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris', ajouterCertificat: true})
}

function getCorbeille() {
  return ConnexionClient.emitBlocking('getCorbeille', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getCorbeille', ajouterCertificat: true})
}

function getRecents(params) {
  return ConnexionClient.emitBlocking('getRecents', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'activiteRecente', ajouterCertificat: true})
}

// function getContenuCollection(tuuidsDocuments, opts) {
//   opts = opts || {}
//   const params = {...opts, tuuid_collection: tuuidsDocuments}
//   return ConnexionClient.emitBlocking('getCollection', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'contenuCollection', ajouterCertificat: true})
// }

async function getClesFichiers(fuuids, usager, opts) {
  opts = opts || {}

  const partage = opts.partage

  const extensions = usager || {}
  const delegationGlobale = extensions.delegationGlobale

  if(!delegationGlobale) {
    // On doit demander une permission en premier
    const params = { fuuids, partage }
    return ConnexionClient.emitBlocking('getPermissionCles', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getClesFichiers', ajouterCertificat: true})
  } else {
    const params = {
      liste_hachage_bytes: fuuids,
      domaine: CONST_DOMAINE_GROSFICHIERS,
    }
    return ConnexionClient.emitBlocking('getClesFichiers', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_MAITREDESCLES, action: 'dechiffrage', ajouterCertificat: true})
  }
}

async function getPermission(fuuids) {
  // On doit demander une permission en premier
  const params = { fuuids }
  const permission = await ConnexionClient.emitBlocking('getPermissionCle', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPermission', ajouterCertificat: true})
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

  // params['_commandeMaitrecles'] = commandeMaitrecles
  const attachements = {cle: commandeMaitrecles}

  return ConnexionClient.emitBlocking(
    'creerCollection', 
    params, 
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'nouvelleCollection', ajouterCertificat: true, attachements}
  )
}

function toggleFavoris(etatFavoris) {
  // Format etatFavoris : {tuuid1: false, tuuid2: true, ...}
  return ConnexionClient.emitBlocking(
    'changerFavoris',
    {favoris: etatFavoris},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'changerFavoris', attacherCertificat: true}
  )
}

// function retirerDocumentsCollection(cuuid, tuuids) {
//   return ConnexionClient.emitBlocking(
//     'retirerDocuments',
//     {cuuid, retirer_tuuids: tuuids},
//     {domaine: CONST_DOMAINE_GROSFICHIERS, action: 'retirerDocumentsCollection', attacherCertificat: true}
//   )
// }

function supprimerDocuments(cuuid, tuuids, supprimePath) {
  return ConnexionClient.emitBlocking(
    'supprimerDocuments',
    {cuuid, tuuids, cuuids_path: supprimePath},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerDocuments', attacherCertificat: true}
  )
}

function archiverDocuments(tuuids) {
  return ConnexionClient.emitBlocking(
    'archiverDocuments',
    {tuuids},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'archiverDocuments', attacherCertificat: true}
  )
}

function decrireFichier(tuuid, params) {
  return ConnexionClient.emitBlocking(
    'decrireFichier',
    {...params, tuuid},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireFichier', attacherCertificat: true}
  )
}

function decrireCollection(tuuid, params) {
  return ConnexionClient.emitBlocking(
    'decrireCollection',
    {...params, tuuid},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireCollection', attacherCertificat: true}
  )
}

function getDocuments(tuuids, opts) {
  opts = opts || {}

  const { partage } = opts

  return ConnexionClient.emitBlocking(
    'getDocuments',
    {tuuids_documents: tuuids, partage},
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'documentsParTuuid', attacherCertificat: true}
  )
}

function recupererDocuments(items) {
  // Format de items : {[cuuid]: [tuuid, ...]}
  return ConnexionClient.emitBlocking(
    'recupererDocumentsV2',
    {items},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'recupererDocumentsV2', attacherCertificat: true}
  )
}

function copierVersCollection(cuuid, tuuids) {
  return ConnexionClient.emitBlocking(
    'copierVersCollection',
    {cuuid, inclure_tuuids: tuuids},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterFichiersCollection', attacherCertificat: true}
  )
}

function deplacerFichiersCollection(cuuid_origine, cuuid_destination, tuuids) {
  return ConnexionClient.emitBlocking(
    'deplacerFichiersCollection',
    {cuuid_origine, cuuid_destination, inclure_tuuids: tuuids},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'deplacerFichiersCollection', attacherCertificat: true}
  )
}

function rechercheIndex(mots_cles, from_idx, size) {
  from_idx = from_idx?from_idx:0
  size = size?size:200
  return ConnexionClient.emitBlocking(
    'rechercheIndex',
    {query: mots_cles, start: from_idx, limit: size},
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: 'solrrelai', action: 'fichiers', attacherCertificat: true}
  )
}

function transcoderVideo(commande) {
  return ConnexionClient.emitBlocking(
    'transcoderVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'transcoderVideo', attacherCertificat: true}
  )
}

function ajouterFichier(commande) {
  return ConnexionClient.emitBlocking(
    'ajouterFichier',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'commandeNouveauFichier', attacherCertificat: true}
  )
}

function supprimerVideo(fuuidVideo) {
  const commande = {fuuid_video: fuuidVideo}
  return ConnexionClient.emitBlocking(
    'supprimerVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerVideo', attacherCertificat: true}
  )
}

function supprimerJobVideo(commande) {
  return ConnexionClient.emitBlocking(
    'supprimerJobVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerJobVideo', attacherCertificat: true}
  )
}

function creerTokenStream(commande) {
  // const commande = {fuuids}
  return ConnexionClient.emitBlocking(
    'creerTokenStream', 
    commande, 
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'verifierAccesFuuids', ajouterCertificat: true}
  )
}

function syncCollection(cuuid, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {skip, limit}
  if(cuuid) requete.cuuid = cuuid
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCollection', ajouterCertificat: true}
  // console.debug("syncCollection %O, %O", requete, params)
  return ConnexionClient.emitBlocking('syncCollection', requete, params)
}

function syncRecents(debut, fin, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {debut, fin, skip, limit}
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncRecents', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('syncRecents', requete, params)
}

function syncCorbeille(debut, fin, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {debut, fin, skip, limit}
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCorbeille', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('syncCorbeille', requete, params)
}

function getMediaJobs(opts) {
  opts = opts || {}
  const requete = {...opts}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'requeteJobsVideo', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('requeteJobsVideo', requete, params)
}

/** Retourne nouveau { token, batchId } */
function getBatchUpload() {
  // console.debug("getBatchUpload")
  return ConnexionClient.emitBlocking('getBatchUpload', {}, {noformat: true})
}

async function submitBatchUpload(token) {
  const commande = { token }
  return ConnexionClient.emitBlocking(
    'submitBatchUpload',
    commande,
    {noformat: true}
  )
}

function chargerContacts() {
  const requete = {}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'chargerContacts', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('chargerContacts', requete, params)
}

function ajouterContactLocal(nomUsager) {
  const commande = { nom_usager: nomUsager }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterContactLocal', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('ajouterContactLocal', commande, params)
}

function supprimerContacts(contactIds) {
  const commande = { contact_ids: contactIds }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerContacts', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('supprimerContacts', commande, params)
}

function partagerCollections(cuuids, contactIds) {
  const commande = { cuuids, contact_ids: contactIds }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'partagerCollections', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('partagerCollections', commande, params)
}

function getPartagesUsager(contactId) {
  const requete = {contact_id: contactId}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPartagesUsager', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('getPartagesUsager', requete, params)
}

function getPartagesContact(contactId) {
  const requete = {contact_id: contactId}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPartagesContact', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('getPartagesContact', requete, params)
}

function supprimerPartageUsager(contactId, tuuid) {
  const commande = { contact_id: contactId, tuuid }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerPartageUsager', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('supprimerPartageUsager', commande, params)
}

function getInfoStatistiques(cuuid) {
  const requete = { cuuid }
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getInfoStatistiques', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('getInfoStatistiques', requete, params)
}

// Fonctions delegues

function indexerContenu(reset) {
  return ConnexionClient.emitBlocking(
    'indexerContenu',
    {reset},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'indexerContenu', attacherCertificat: true}
  )
}

async function regenererPreviews(fuuids) {
  const commande = { fuuids, reset: true }
  return ConnexionClient.emitBlocking(
    'completerPreviews',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: 'GrosFichiers', action: 'completerPreviews', attacherCertificat: true}
  )
}

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
    getFavoris, getCorbeille, getRecents, 
    // getContenuCollection,
    creerCollection, toggleFavoris, 
    recupererDocuments, supprimerDocuments,
    decrireFichier, decrireCollection,
    copierVersCollection, deplacerFichiersCollection,
    rechercheIndex, transcoderVideo, getPermission,
    ajouterFichier, creerTokenStream, supprimerVideo,
    regenererPreviews,
    archiverDocuments,

    chargerContacts, ajouterContactLocal, supprimerContacts,
    partagerCollections, getPartagesUsager, supprimerPartageUsager, getPartagesContact,

    syncCollection, syncRecents, syncCorbeille,
    getMediaJobs, supprimerJobVideo,
    getBatchUpload, submitBatchUpload,

    getInfoStatistiques,

    // Event listeners prives
    enregistrerCallbackMajFichier, retirerCallbackMajFichier,
    enregistrerCallbackMajCollections, retirerCallbackMajCollections,
    enregistrerCallbackTranscodageProgres, retirerCallbackTranscodageProgres,
    enregistrerCallbackMajFichierCollection, retirerCallbackMajFichierCollection,
    enregistrerCallbackMajContenuCollection, retirerCallbackMajContenuCollection,

    // Commandes delegue
    indexerContenu,

})
