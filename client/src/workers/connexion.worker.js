import { expose } from 'comlink'
// import * as ConnexionClient from '@dugrema/millegrilles.reactjs/src/connexionClient'
import connexionClient from '@dugrema/millegrilles.reactjs/src/connexionClientV2'
import { MESSAGE_KINDS } from '@dugrema/millegrilles.utiljs/src/constantes'

const DEBUG = false

const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers'

function getFavoris() {
  return connexionClient.emitWithAck('getFavoris', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris', ajouterCertificat: true})
}

function getCorbeille() {
  return connexionClient.emitWithAck('getCorbeille', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getCorbeille', ajouterCertificat: true})
}

function getInfoFilehost() {
  return connexionClient.emitWithAck(
    'getInfoFilehost', {}, 
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: 'collection', action: 'getInfoFilehost', ajouterCertificat: true}
  );
}

async function getClesFichiers(fuuids, usager, opts) {
  opts = opts || {}

  const partage = opts.partage

  const params = { fuuids, partage, version: 2 }
  return connexionClient.emitWithAck(
    'getPermissionCles', params, 
    {
      kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getClesFichiers', 
      timeout: 30_000, ajouterCertificat: true
    }
  )
}

async function getPermission(fuuids) {
  // On doit demander une permission en premier
  const params = { fuuids }
  const permission = await connexionClient.emitWithAck('getPermissionCle', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPermission', ajouterCertificat: true})
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

  return connexionClient.emitWithAck(
    'creerCollection', 
    params, 
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'nouvelleCollection', ajouterCertificat: true, attachements}
  )
}

async function creerFichier(fichier, commandeCle) {
  // const cle = await chiffrage.formatterMessage(
  //   transactionMaitredescles, 'MaitreDesCles', 
  //   // {kind: MESSAGE_KINDS.KIND_COMMANDE, partition: partitionMaitreDesCles, action: 'sauvegarderCle', DEBUG: false}
  //   {kind: MESSAGE_KINDS.KIND_COMMANDE, action: 'ajouterCleDomaines', DEBUG: false}
  // )

  // return connexionClient.emitWithAck(
  //   'creerCollection', 
  //   params, 
  //   {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterCleDomaines', noformat: true}
  // );
  // const transaction = await chiffrage.formatterMessage(
  //   fichier.transactionGrosfichiers, 'GrosFichiers', {kind: MESSAGE_KINDS.KIND_COMMANDE, action: 'nouvelleVersion'})
  return connexionClient.emitWithAck(
    'ajouterFichier', 
    fichier, 
    {
      kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'nouvelleVersion', ajouterCertificat: true, 
      attachements: {cle: commandeCle},
    }
  )
}

function toggleFavoris(etatFavoris) {
  // Format etatFavoris : {tuuid1: false, tuuid2: true, ...}
  return connexionClient.emitWithAck(
    'changerFavoris',
    {favoris: etatFavoris},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'changerFavoris', attacherCertificat: true}
  )
}

function supprimerDocuments(cuuid, tuuids, supprimePath) {
  return connexionClient.emitWithAck(
    'supprimerDocuments',
    {cuuid, tuuids, cuuids_path: supprimePath},
    {
      kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerDocuments', 
      timeout: 30_000, attacherCertificat: true,
    }
  )
}

function archiverDocuments(tuuids) {
  return connexionClient.emitWithAck(
    'archiverDocuments',
    {tuuids},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'archiverDocuments', attacherCertificat: true}
  )
}

function decrireFichier(tuuid, params) {
  return connexionClient.emitWithAck(
    'decrireFichier',
    {...params, tuuid},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireFichier', attacherCertificat: true}
  )
}

function decrireCollection(tuuid, params) {
  return connexionClient.emitWithAck(
    'decrireCollection',
    {...params, tuuid},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'decrireCollection', attacherCertificat: true}
  )
}

function getDocuments(tuuids, opts) {
  opts = opts || {}

  const { contactId: contact_id } = opts
  let partage = opts.partage
  if(partage === undefined && contact_id) {
    partage = true
  }

  return connexionClient.emitWithAck(
    'getDocuments',
    {tuuids_documents: tuuids, partage, contact_id},
    {
      kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'documentsParTuuid', 
      timeout: 60_000, attacherCertificat: true
    }
  )
}

function recupererDocuments(items) {
  // Format de items : {[cuuid]: [tuuid, ...]}
  return connexionClient.emitWithAck(
    'recupererDocumentsV2',
    {items},
    {
      kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'recupererDocumentsV2', 
      timeout: 30_000, attacherCertificat: true,
    }
  )
}

function copierVersCollection(cuuid, tuuids, opts) {
  opts = opts || {}
  const contactId = opts.contactId
  // console.debug("copierVersCollection cuuid %O, tuuids : %O, opts : %O", cuuid, tuuids, opts)
  return connexionClient.emitWithAck(
    'copierVersCollection',
    {cuuid, inclure_tuuids: tuuids, contact_id: contactId},
    {
      kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterFichiersCollection', 
      timeout: 45_000, attacherCertificat: true,
    }
  )
}

function deplacerFichiersCollection(cuuid_origine, cuuid_destination, tuuids) {
  return connexionClient.emitWithAck(
    'deplacerFichiersCollection',
    {cuuid_origine, cuuid_destination, inclure_tuuids: tuuids},
    {
      kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'deplacerFichiersCollection', 
      timeout: 45_000, attacherCertificat: true,
    }
  )
}

function rechercheIndex(mots_cles, from_idx, size) {
  from_idx = from_idx?from_idx:0
  size = size?size:200
  return connexionClient.emitWithAck(
    'rechercheIndex',
    {query: mots_cles, start: from_idx, limit: size, inclure_partages: true},
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: 'GrosFichiers', action: 'rechercheIndex', attacherCertificat: true, timeout: 20_000}
  )
}

function transcoderVideo(commande) {
  return connexionClient.emitWithAck(
    'transcoderVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'transcoderVideo', attacherCertificat: true}
  )
}

function ajouterFichier(commande) {
  return connexionClient.emitWithAck(
    'ajouterFichier',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'commandeNouveauFichier', attacherCertificat: true}
  )
}

function supprimerVideo(fuuidVideo) {
  const commande = {fuuid_video: fuuidVideo}
  return connexionClient.emitWithAck(
    'supprimerVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerVideo', attacherCertificat: true}
  )
}

function supprimerJobVideo(commande) {
  return connexionClient.emitWithAck(
    'supprimerJobVideo',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerJobVideo', attacherCertificat: true}
  )
}

function creerTokenStream(commande) {
  // const commande = {fuuids}
  return connexionClient.emitWithAck(
    'creerTokenStream', 
    commande, 
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getJwtStreaming', ajouterCertificat: true}
  )
}

function syncCollection(cuuid, opts) {
  opts = opts || {}
  const {skip, limit, contactId} = opts
  const requete = {skip, limit}
  if(contactId) requete.contact_id = contactId
  if(cuuid) requete.cuuid = cuuid
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCollection', ajouterCertificat: true}
  // console.debug("syncCollection %O, %O", requete, params)
  return connexionClient.emitWithAck('syncCollection', requete, params)
}

function syncRecents(debut, fin, opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {debut, fin, skip, limit}
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncRecents', ajouterCertificat: true}
  return connexionClient.emitWithAck('syncRecents', requete, params)
}

function syncCorbeille(opts) {
  opts = opts || {}
  const {skip, limit} = opts
  const requete = {skip, limit}
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'syncCorbeille', ajouterCertificat: true}
  return connexionClient.emitWithAck('syncCorbeille', requete, params)
}

function getMediaJobs(opts) {
  opts = opts || {}
  const requete = {...opts}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'requeteJobsVideo', ajouterCertificat: true}
  return connexionClient.emitWithAck('requeteJobsVideo', requete, params)
}

/** Retourne nouveau { token, batchId } */
// function getBatchUpload() {
//   return connexionClient.emitWithAck('getBatchUpload', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, timeout: 30_000, noverif: true})
// }

async function submitBatchUpload(token) {
  const commande = { token }
  return connexionClient.emitWithAck(
    'submitBatchUpload',
    commande,
    {noformat: true, timeout: 60_000}
  )
}

function chargerContacts() {
  const requete = {}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'chargerContacts', ajouterCertificat: true}
  return connexionClient.emitWithAck('chargerContacts', requete, params)
}

function ajouterContactLocal(nomUsager) {
  const commande = { nom_usager: nomUsager }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'ajouterContactLocal', ajouterCertificat: true}
  return connexionClient.emitWithAck('ajouterContactLocal', commande, params)
}

function supprimerContacts(contactIds) {
  const commande = { contact_ids: contactIds }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerContacts', ajouterCertificat: true}
  return connexionClient.emitWithAck('supprimerContacts', commande, params)
}

function partagerCollections(cuuids, contactIds) {
  const commande = { cuuids, contact_ids: contactIds }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'partagerCollections', ajouterCertificat: true}
  return connexionClient.emitWithAck('partagerCollections', commande, params)
}

function getPartagesUsager(contactId) {
  const requete = {contact_id: contactId}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPartagesUsager', ajouterCertificat: true}
  return connexionClient.emitWithAck('getPartagesUsager', requete, params)
}

function getPartagesContact(opts) {
  opts = opts || {}
  const contact_id = opts.contactId
  const requete = {contact_id}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPartagesContact', ajouterCertificat: true}
  return connexionClient.emitWithAck('getPartagesContact', requete, params)
}

function supprimerPartageUsager(contactId, tuuid) {
  const commande = { contact_id: contactId, tuuid }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerPartageUsager', ajouterCertificat: true}
  return connexionClient.emitWithAck('supprimerPartageUsager', commande, params)
}

function getInfoStatistiques(cuuid, contactId) {
  const requete = { cuuid, contact_id: contactId }
  const params = {
    kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getInfoStatistiques', 
    timeout: 45_000, ajouterCertificat: true
  }
  return connexionClient.emitWithAck('getInfoStatistiques', requete, params)
}

function getStructureRepertoire(cuuid, contactId) {
  const requete = { cuuid, contact_id: contactId }
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getStructureRepertoire', ajouterCertificat: true}
  return connexionClient.emitWithAck('getStructureRepertoire', requete, params)
}

// Fonctions delegues

function indexerContenu(reset) {
  return connexionClient.emitWithAck(
    'indexerContenu',
    {reset},
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'indexerContenu', attacherCertificat: true}
  )
}

async function regenererPreviews(fuuids) {
  const commande = { fuuids, reset: true }
  return connexionClient.emitWithAck(
    'completerPreviews',
    commande,
    {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: 'GrosFichiers', action: 'completerPreviews', attacherCertificat: true}
  )
}

async function getSousRepertoires(cuuid) {
  const requete = { cuuid }
  return connexionClient.emitWithAck(
    'getSousRepertoires',
    requete,
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getSousRepertoires', ajouterCertificat: true}
  )
}

// Listeners

function enregistrerCallbackMajCollection(cuuid, cb) { 
  return connexionClient.subscribe('enregistrerCallbackMajCollection', cb, {cuuid, DEBUG})
}

function retirerCallbackMajCollection(cuuid, cb) { 
  return connexionClient.unsubscribe('retirerCallbackMajCollection', cb, {cuuid, DEBUG}) 
}

function enregistrerCallbackMajContenuCollection(cuuid, cb, opts) { 
  opts = opts || {}
  return connexionClient.subscribe('enregistrerCallbackMajContenuCollection', cb, {...opts, cuuid, DEBUG})
}

function retirerCallbackMajContenuCollection(cuuid, cb, opts) { 
  opts = opts || {}
  return connexionClient.unsubscribe('retirerCallbackMajContenuCollection', cb, {...opts, cuuid, DEBUG}) 
}

function enregistrerCallbackTranscodageProgres(params, cb) { 
  // console.debug("enregistrerCallbackTranscodageProgres params : %O", params)
  return connexionClient.subscribe('enregistrerCallbackTranscodageVideo', cb, params) 
}

function retirerCallbackTranscodageProgres(params, cb) { 
  return connexionClient.unsubscribe('retirerCallbackTranscodageVideo', cb, params) 
}

// Exposer methodes du Worker
expose({
    ...connexionClient, 

    // Requetes et commandes privees
    getDocuments, getClesFichiers, getInfoFilehost,
    getFavoris, getCorbeille,
    creerCollection, toggleFavoris, 
    recupererDocuments, supprimerDocuments,
    decrireFichier, decrireCollection,
    copierVersCollection, deplacerFichiersCollection,
    rechercheIndex, transcoderVideo, getPermission,
    ajouterFichier, creerTokenStream, supprimerVideo,
    regenererPreviews,
    archiverDocuments,
    creerFichier,

    chargerContacts, ajouterContactLocal, supprimerContacts,
    partagerCollections, getPartagesUsager, supprimerPartageUsager, getPartagesContact,

    syncCollection, syncRecents, syncCorbeille,
    getMediaJobs, supprimerJobVideo,
    // getBatchUpload, 
    submitBatchUpload,

    getInfoStatistiques, getStructureRepertoire, getSousRepertoires,

    // Event listeners prives
    enregistrerCallbackMajCollection, retirerCallbackMajCollection,
    enregistrerCallbackTranscodageProgres, retirerCallbackTranscodageProgres,
    enregistrerCallbackMajContenuCollection, retirerCallbackMajContenuCollection,

    // Commandes delegue
    indexerContenu,

})
