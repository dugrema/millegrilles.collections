// Gestion evenements socket.io pour /millegrilles
import debugLib from 'debug'
import * as mqdao from './mqdao.js'

const debug = debugLib('appSocketIo')

const routingKeysPrive = [
  'appSocketio.nodejs',  // Juste pour trouver facilement sur exchange - debug
]

const ROUTING_KEYS_FICHIERS = [
  'evenement.grosfichiers.majFichier',
]

const ROUTING_KEYS_COLLECTIONS = [
  'evenement.grosfichiers.majCollection',
]

const EVENEMENTS_SUPPORTES = [
  ...ROUTING_KEYS_FICHIERS,
  ...ROUTING_KEYS_COLLECTIONS,
]

export function configurerEvenements(socket) {

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
      { eventName: 'getPermissionCle', callback: (params, cb) => traiter(socket, mqdao.getPermissionCle, {params, cb}) },
      { eventName: 'changerFavoris', callback: (params, cb) => traiter(socket, mqdao.changerFavoris, {params, cb}) },
      { eventName: 'retirerDocuments', callback: (params, cb) => traiter(socket, mqdao.retirerDocuments, {params, cb}) },
      { eventName: 'supprimerDocuments', callback: (params, cb) => traiter(socket, mqdao.supprimerDocuments, {params, cb}) },
      { eventName: 'decrireFichier', callback: (params, cb) => traiter(socket, mqdao.decrireFichier, {params, cb}) },
      { eventName: 'decrireCollection', callback: (params, cb) => traiter(socket, mqdao.decrireCollection, {params, cb}) },
      { eventName: 'recupererDocuments', callback: (params, cb) => traiter(socket, mqdao.recupererDocuments, {params, cb}) },
      { eventName: 'copierVersCollection', callback: (params, cb) => traiter(socket, mqdao.copierVersCollection, {params, cb}) },
      { eventName: 'deplacerFichiersCollection', callback: (params, cb) => traiter(socket, mqdao.deplacerFichiersCollection, {params, cb}) },
      { eventName: 'rechercheIndex', callback: (params, cb) => traiter(socket, mqdao.rechercheIndex, {params, cb}) },

      // Evenements
      {eventName: 'ecouterMajFichiers', callback: (_, cb) => {mqdao.ecouterMajFichiers(socket, cb)}},
      {eventName: 'ecouterMajCollections', callback: (_, cb) => {mqdao.ecouterMajCollections(socket, cb)}},
      {eventName: 'ecouterTranscodageProgres', callback: (params, cb) => {mqdao.ecouterTranscodageProgres(socket, params, cb)}},
      {eventName: 'retirerTranscodageProgres', callback: (params, cb) => {mqdao.retirerTranscodageProgres(socket, params, cb)}},
    ],
    listenersProteges: [
      // PROTEGE
      { eventName: 'indexerContenu', callback: (params, cb) => traiter(socket, mqdao.indexerContenu, {params, cb}) },
    ]
  }

}

async function traiter(socket, methode, {params, cb}) {
  const reponse = await methode(socket, params)
  if(cb) cb(reponse)
}