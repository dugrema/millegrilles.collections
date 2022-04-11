// Gestion evenements socket.io pour /millegrilles
const debug = require('debug')('appSocketIo')
const mqdao = require('./mqdao.js')

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
      { eventName: 'decrireFichier', callback: (params, cb) => traiter(socket, mqdao.decrireFichier, {params, cb}) },
      { eventName: 'decrireCollection', callback: (params, cb) => traiter(socket, mqdao.decrireCollection, {params, cb}) },
      { eventName: 'recupererDocuments', callback: (params, cb) => traiter(socket, mqdao.recupererDocuments, {params, cb}) },
      { eventName: 'copierVersCollection', callback: (params, cb) => traiter(socket, mqdao.copierVersCollection, {params, cb}) },
      { eventName: 'deplacerFichiersCollection', callback: (params, cb) => traiter(socket, mqdao.deplacerFichiersCollection, {params, cb}) },
      { eventName: 'rechercheIndex', callback: (params, cb) => traiter(socket, mqdao.rechercheIndex, {params, cb}) },
      { eventName: 'transcoderVideo', callback: (params, cb) => traiter(socket, mqdao.transcoderVideo, {params, cb}) },

      // Evenements
      // {eventName: 'ecouterMajFichiers', callback: (_, cb) => {mqdao.ecouterMajFichiers(socket, cb)}},
      // {eventName: 'ecouterMajCollections', callback: (_, cb) => {mqdao.ecouterMajCollections(socket, cb)}},
      // {eventName: 'ecouterTranscodageProgres', callback: (params, cb) => {mqdao.ecouterTranscodageProgres(socket, params, cb)}},
      // {eventName: 'retirerTranscodageProgres', callback: (params, cb) => {mqdao.retirerTranscodageProgres(socket, params, cb)}},

    ],
    listenersProteges: [
      // PROTEGE
      {eventName: 'enregistrerCallbackMajFichier', callback: (params, cb) => {ecouterEvenementsActivationFingerprint(socket, params, cb)}},
      {eventName: 'retirerCallbackMajFichier', callback: (params, cb) => {retirerEvenementsActivationFingerprint(socket, params, cb)}},
      { eventName: 'indexerContenu', callback: (params, cb) => traiter(socket, mqdao.indexerContenu, {params, cb}) },
    ]
  }

}

async function traiter(socket, methode, {params, cb}) {
  const reponse = await methode(socket, params)
  if(cb) cb(reponse)
}

const CONST_ROUTINGKEYS_MAJFICHIER = ['evenement.grosfichiers.majFichier']

const mapperActivationFingerprint = {
  exchanges: ['2.prive'],
  routingKeyTest: /^evenement\.grosfichiers\.majFichier$/,
  mapRoom: (message, _rk, _exchange) => {
    const tuuid = message.tuuid
    if(tuuid) {
      return `2.prive/evenement.grosfichiers.majFichier/${tuuid}`
    }
  }
}

function ecouterEvenementsActivationFingerprint(socket, params, cb) {
  const tuuid = params.tuuid
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJFICHIER,
    exchanges: ['2.prive'],
    roomParam: tuuid,
    mapper: mapperActivationFingerprint,
  }

  debug("ecouterEvenementsActivationFingerprint : %O", opts)
  socket.subscribe(opts, cb)
}

function retirerEvenementsActivationFingerprint(socket, params, cb) {
  const tuuid = params.tuuid
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJFICHIER, 
    exchanges: ['2.prive'],
    roomParam: tuuid,
  }
  debug("retirerEvenementsActivationFingerprint sur %O", opts)
  socket.unsubscribe(opts, cb)
}

module.exports = { configurerEvenements }
