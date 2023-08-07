// Gestion evenements socket.io pour /millegrilles
import * as mqdao from './mqdao.js'
import { signerTokenFichier } from '@dugrema/millegrilles.nodejs/src/jwt.js'
import { v4 as uuidv4 } from 'uuid'

// const debug = debugLib('appSocketIo')

function configurerEvenements(socket) {

  return {
    listenersPublics: [
      { eventName: 'challenge', callback: (params, cb) => traiter(socket, mqdao.challenge, {params, cb}) },
    ],
    listenersPrives: [
      { eventName: 'getDocuments', callback: (params, cb) => traiter(socket, mqdao.getDocuments, {params, cb}) },
      { eventName: 'getFavoris', callback: (params, cb) => traiter(socket, mqdao.getFavoris, {params, cb}) },
      { eventName: 'getCorbeille', callback: (params, cb) => traiter(socket, mqdao.getCorbeille, {params, cb}) },
      { eventName: 'getCollection', callback: (params, cb) => traiter(socket, mqdao.getCollection, {params, cb}) },
      { eventName: 'getRecents', callback: (params, cb) => traiter(socket, mqdao.getRecents, {params, cb}) },
      { eventName: 'getClesFichiers', callback: (params, cb) => traiter(socket, mqdao.getClesFichiers, {params, cb}) },
      { eventName: 'creerCollection', callback: (params, cb) => traiter(socket, mqdao.creerCollection, {params, cb}) },
      { eventName: 'getPermissionCles', callback: (params, cb) => traiter(socket, mqdao.getPermissionCles, {params, cb}) },
      { eventName: 'changerFavoris', callback: (params, cb) => traiter(socket, mqdao.changerFavoris, {params, cb}) },
      { eventName: 'retirerDocuments', callback: (params, cb) => traiter(socket, mqdao.retirerDocuments, {params, cb}) },
      { eventName: 'supprimerDocuments', callback: (params, cb) => traiter(socket, mqdao.supprimerDocuments, {params, cb}) },
      { eventName: 'archiverDocuments', callback: (params, cb) => traiter(socket, mqdao.archiverDocuments, {params, cb}) },
      { eventName: 'decrireFichier', callback: (params, cb) => traiter(socket, mqdao.decrireFichier, {params, cb}) },
      { eventName: 'decrireCollection', callback: (params, cb) => traiter(socket, mqdao.decrireCollection, {params, cb}) },
      { eventName: 'recupererDocuments', callback: (params, cb) => traiter(socket, mqdao.recupererDocuments, {params, cb}) },
      { eventName: 'copierVersCollection', callback: (params, cb) => traiter(socket, mqdao.copierVersCollection, {params, cb}) },
      { eventName: 'deplacerFichiersCollection', callback: (params, cb) => traiter(socket, mqdao.deplacerFichiersCollection, {params, cb}) },
      { eventName: 'rechercheIndex', callback: (params, cb) => traiter(socket, mqdao.rechercheIndex, {params, cb}) },
      { eventName: 'transcoderVideo', callback: (params, cb) => traiter(socket, mqdao.transcoderVideo, {params, cb}) },
      { eventName: 'ajouterFichier', callback: (params, cb) => traiter(socket, mqdao.ajouterFichier, {params, cb}) },
      { eventName: 'supprimerVideo', callback: (params, cb) => traiter(socket, mqdao.supprimerVideo, {params, cb}) },
      { eventName: 'creerTokenStream', callback: (params, cb) => traiter(socket, mqdao.creerTokenStream, {params, cb}) },
      { eventName: 'syncCollection', callback: (params, cb) => traiter(socket, mqdao.syncCollection, {params, cb}) },
      { eventName: 'syncRecents', callback: (params, cb) => traiter(socket, mqdao.syncRecents, {params, cb}) },
      { eventName: 'syncCorbeille', callback: (params, cb) => traiter(socket, mqdao.syncCorbeille, {params, cb}) },
      { eventName: 'completerPreviews', callback: (params, cb) => traiter(socket, mqdao.completerPreviews, {params, cb}) },
      { eventName: 'requeteJobsVideo', callback: (params, cb) => traiter(socket, mqdao.requeteJobsVideo, {params, cb}) },
      { eventName: 'supprimerJobVideo', callback: (params, cb) => traiter(socket, mqdao.supprimerJobVideo, {params, cb}) },
      { eventName: 'getBatchUpload', callback: (params, cb) => traiter(socket, getBatchUpload, {params, cb}) },
      { eventName: 'submitBatchUpload', callback: (params, cb) => traiter(socket, mqdao.submitBatchUpload, {params, cb}) },
      { eventName: 'chargerContacts', callback: (params, cb) => traiter(socket, mqdao.chargerContacts, {params, cb}) },
      { eventName: 'ajouterContactLocal', callback: (params, cb) => traiter(socket, mqdao.ajouterContactLocal, {params, cb}) },
      { eventName: 'supprimerContacts', callback: (params, cb) => traiter(socket, mqdao.supprimerContacts, {params, cb}) },
      { eventName: 'partagerCollections', callback: (params, cb) => traiter(socket, mqdao.partagerCollections, {params, cb}) },
      { eventName: 'getPartagesUsager', callback: (params, cb) => traiter(socket, mqdao.getPartagesUsager, {params, cb}) },
      { eventName: 'getPartagesContact', callback: (params, cb) => traiter(socket, mqdao.getPartagesContact, {params, cb}) },
      { eventName: 'supprimerPartageUsager', callback: (params, cb) => traiter(socket, mqdao.supprimerPartageUsager, {params, cb}) },
      
      // Evenements
      // {eventName: 'ecouterMajFichiers', callback: (_, cb) => {mqdao.ecouterMajFichiers(socket, cb)}},
      // {eventName: 'ecouterMajCollections', callback: (_, cb) => {mqdao.ecouterMajCollections(socket, cb)}},
      // {eventName: 'ecouterTranscodageProgres', callback: (params, cb) => {mqdao.ecouterTranscodageProgres(socket, params, cb)}},
      // {eventName: 'retirerTranscodageProgres', callback: (params, cb) => {mqdao.retirerTranscodageProgres(socket, params, cb)}},

    ],
    listenersProteges: [
      // PROTEGE
      {eventName: 'enregistrerCallbackMajFichier', callback: (params, cb) => mqdao.enregistrerCallbackMajFichier(socket, params, cb)},
      {eventName: 'retirerCallbackMajFichier', callback: (params, cb) => mqdao.retirerCallbackMajFichier(socket, params, cb)},
      {eventName: 'enregistrerCallbackMajFichierCollection', callback: (params, cb) => mqdao.enregistrerCallbackMajFichierCollection(socket, params, cb)},
      {eventName: 'retirerCallbackMajFichierCollection', callback: (params, cb) => mqdao.retirerCallbackMajFichierCollection(socket, params, cb)},
      {eventName: 'enregistrerCallbackMajCollections', callback: (params, cb) => mqdao.enregistrerCallbackMajCollections(socket, params, cb)},
      {eventName: 'retirerCallbackMajCollections', callback: (params, cb) => mqdao.retirerCallbackMajCollections(socket, params, cb)},
      {eventName: 'enregistrerCallbackMajContenuCollection', callback: (params, cb) => mqdao.enregistrerCallbackMajContenuCollection(socket, params, cb)},
      {eventName: 'retirerCallbackMajContenuCollection', callback: (params, cb) => mqdao.retirerCallbackMajContenuCollection(socket, params, cb)},
      {eventName: 'enregistrerCallbackTranscodageVideo', callback: (params, cb) => mqdao.enregistrerCallbackTranscodageVideo(socket, params, cb)},
      {eventName: 'retirerCallbackTranscodageVideo', callback: (params, cb) => mqdao.retirerCallbackTranscodageVideo(socket, params, cb)},
      {eventName: 'indexerContenu', callback: (params, cb) => traiter(socket, mqdao.indexerContenu, {params, cb})},
    ]
  }

}

export default configurerEvenements

async function traiter(socket, methode, {params, cb}) {
  try {
    const reponse = await methode(socket, params)
    if(cb) cb(reponse)
  } catch(err) {
    console.error(new Date() + " ERROR appSocketIo traiter() ", err)
    if(cb) cb({ok: true, err})
  }
}

async function getBatchUpload(socket, opts) {
  opts = opts || {}
  const mq = socket.amqpdao
  const userId = socket.userId
  const optsExp = {expiration: '7d', ...opts}
  const uuid_transaction = ''+uuidv4()
  const { cle: clePriveePem, fingerprint } = mq.pki
  const token = await signerTokenFichier(fingerprint, clePriveePem, userId, uuid_transaction, optsExp)
  return { token, batchId: uuid_transaction }
}

// const CONST_ROUTINGKEYS_MAJFICHIER = ['evenement.grosfichiers.majFichier']

// const mapperMajFichiers = {
//   exchanges: ['2.prive'],
//   routingKeyTest: /^evenement\.grosfichiers\.majFichier$/,
//   mapRoom: (message, _rk, _exchange) => {
//     const tuuid = message.tuuid
//     if(tuuid) {
//       return `2.prive/evenement.grosfichiers.majFichier/${tuuid}`
//     }
//   }
// }

// function enregistrerCallbackMajFichier(socket, params, cb) {
//   const tuuids = params.tuuids
//   const opts = { 
//     routingKeys: CONST_ROUTINGKEYS_MAJFICHIER,
//     exchanges: ['2.prive'],
//     roomParam: tuuids,
//     mapper: mapperMajFichiers,
//   }

//   debug("enregistrerCallbackMajFichier : %O", opts)
//   socket.subscribe(opts, cb)
// }

// function retirerCallbackMajFichier(socket, params, cb) {
//   const tuuids = params.tuuids
//   const opts = { 
//     routingKeys: CONST_ROUTINGKEYS_MAJFICHIER, 
//     exchanges: ['2.prive'],
//     roomParam: tuuids,
//   }
//   debug("retirerCallbackMajFichier sur %O", opts)
//   socket.unsubscribe(opts, cb)
// }

// const CONST_ROUTINGKEYS_MAJCOLLECTION = ['evenement.grosfichiers.majCollection']

// const mapperMajCollection = {
//   exchanges: ['2.prive'],
//   routingKeyTest: /^evenement\.grosfichiers\.majCollection$/,
//   mapRoom: (message, _rk, _exchange) => {
//     const cuuid = message.cuuid
//     if(cuuid) {
//       return `2.prive/evenement.grosfichiers.majCollection/${cuuid}`
//     }
//   }
// }

// function enregistrerCallbackMajCollections(socket, params, cb) {
//   const cuuids = params.cuuids
//   const opts = { 
//     routingKeys: CONST_ROUTINGKEYS_MAJCOLLECTION,
//     exchanges: ['2.prive'],
//     roomParam: cuuids,
//     mapper: mapperMajCollection,
//   }

//   debug("enregistrerCallbackMajFichier : %O", opts)
//   socket.subscribe(opts, cb)
// }

// function retirerCallbackMajCollections(socket, params, cb) {
//   const cuuids = params.cuuids
//   const opts = { 
//     routingKeys: CONST_ROUTINGKEYS_MAJCOLLECTION, 
//     exchanges: ['2.prive'],
//     roomParam: cuuids,
//   }
//   debug("retirerCallbackMajFichier sur %O", opts)
//   socket.unsubscribe(opts, cb)
// }

// module.exports = { configurerEvenements }
