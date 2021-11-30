// Gestion evenements socket.io pour /millegrilles
import debugLib from 'debug'
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
  const configurationEvenements = {
    listenersPublics: [
      {eventName: 'challenge', callback: (params, cb) => {challenge(socket, params, cb)}},
    ],
    listenersPrives: [
    ],
    listenersProteges: [
    ]
  }

  return configurationEvenements
}

async function challenge(socket, params, cb) {
  // Repondre avec un message signe
  const reponse = {
    reponse: params.challenge,
    message: 'Trust no one',
    nomUsager: socket.nomUsager,
    userId: socket.userId,
  }
  const reponseSignee = await socket.amqpdao.pki.formatterMessage(reponse, 'challenge', {ajouterCertificat: true})
  console.debug("!!!! Challenge reponse : %O", reponseSignee)
  cb(reponseSignee)
}
