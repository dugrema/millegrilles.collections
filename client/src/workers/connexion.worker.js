import { expose } from 'comlink'
import * as ConnexionClient from '@dugrema/millegrilles.reactjs/src/connexionClient'
import { MESSAGE_KINDS } from '@dugrema/millegrilles.utiljs/src/constantes'

const DEBUG = false

const CONST_DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_FICHIERS = 'fichiers'

function getFavoris() {
  return ConnexionClient.emitBlocking('getFavoris', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'favoris', ajouterCertificat: true})
}

function getCorbeille() {
  return ConnexionClient.emitBlocking('getCorbeille', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getCorbeille', ajouterCertificat: true})
}

function getRecents(params) {
  return ConnexionClient.emitBlocking('getRecents', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'activiteRecente', ajouterCertificat: true})
}

async function getClesFichiers(fuuids, usager, opts) {
  opts = opts || {}

  const partage = opts.partage

  // const extensions = usager || {}
  // const delegationGlobale = extensions.delegationGlobale

  // if(!delegationGlobale) {
    // On doit demander une permission en premier
    const params = { fuuids, partage }
    return ConnexionClient.emitBlocking(
      'getPermissionCles', params, 
      {
        kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getClesFichiers', 
        timeout: 30_000, ajouterCertificat: true
      }
    )
  // } else {
  //   const params = {
  //     liste_hachage_bytes: fuuids,
  //     domaine: CONST_DOMAINE_GROSFICHIERS,
  //   }
  //   return ConnexionClient.emitBlocking('getClesFichiers', params, {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_MAITREDESCLES, action: 'dechiffrage', ajouterCertificat: true})
  // }
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

  const { contactId: contact_id } = opts
  let partage = opts.partage
  if(partage === undefined && contact_id) {
    partage = true
  }

  return ConnexionClient.emitBlocking(
    'getDocuments',
    {tuuids_documents: tuuids, partage, contact_id},
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
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: 'solrrelai', action: CONST_DOMAINE_FICHIERS, attacherCertificat: true}
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
  return ConnexionClient.emitBlocking('getBatchUpload', {}, {kind: MESSAGE_KINDS.KIND_REQUETE, timeout: 30_000})
}

async function submitBatchUpload(token) {
  const commande = { token }
  return ConnexionClient.emitBlocking(
    'submitBatchUpload',
    commande,
    {noformat: true, timeout: 60_000}
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

function getPartagesContact(opts) {
  opts = opts || {}
  const contact_id = opts.contactId
  const requete = {contact_id}
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getPartagesContact', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('getPartagesContact', requete, params)
}

function supprimerPartageUsager(contactId, tuuid) {
  const commande = { contact_id: contactId, tuuid }
  const params = {kind: MESSAGE_KINDS.KIND_COMMANDE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'supprimerPartageUsager', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('supprimerPartageUsager', commande, params)
}

function getInfoStatistiques(cuuid, contactId) {
  const requete = { cuuid, contact_id: contactId }
  const params = {
    kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getInfoStatistiques', 
    timeout: 45_000, ajouterCertificat: true
  }
  return ConnexionClient.emitBlocking('getInfoStatistiques', requete, params)
}

function getStructureRepertoire(cuuid, contactId) {
  const requete = { cuuid, contact_id: contactId }
  const params = {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getStructureRepertoire', ajouterCertificat: true}
  return ConnexionClient.emitBlocking('getStructureRepertoire', requete, params)
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

async function getSousRepertoires(cuuid) {
  const requete = { cuuid }
  return ConnexionClient.emitBlocking(
    'getSousRepertoires',
    requete,
    {kind: MESSAGE_KINDS.KIND_REQUETE, domaine: CONST_DOMAINE_GROSFICHIERS, action: 'getSousRepertoires', ajouterCertificat: true}
  )
}

// Listeners

function enregistrerCallbackMajCollection(cuuid, cb) { 
  return ConnexionClient.subscribe('enregistrerCallbackMajCollection', cb, {cuuid, DEBUG})
}

function retirerCallbackMajCollection(cuuid, cb) { 
  return ConnexionClient.unsubscribe('retirerCallbackMajCollection', cb, {cuuid, DEBUG}) 
}

function enregistrerCallbackMajContenuCollection(cuuid, cb, opts) { 
  opts = opts || {}
  return ConnexionClient.subscribe('enregistrerCallbackMajContenuCollection', cb, {...opts, cuuid, DEBUG})
}

function retirerCallbackMajContenuCollection(cuuid, cb, opts) { 
  opts = opts || {}
  return ConnexionClient.unsubscribe('retirerCallbackMajContenuCollection', cb, {...opts, cuuid, DEBUG}) 
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

    getInfoStatistiques, getStructureRepertoire, getSousRepertoires,

    // Event listeners prives
    enregistrerCallbackMajCollection, retirerCallbackMajCollection,
    enregistrerCallbackTranscodageProgres, retirerCallbackTranscodageProgres,
    enregistrerCallbackMajContenuCollection, retirerCallbackMajContenuCollection,

    // Commandes delegue
    indexerContenu,

})
