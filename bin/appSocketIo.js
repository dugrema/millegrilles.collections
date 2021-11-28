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

export default function configurerEvenements(socket) {
  const configurationEvenements = {
    listenersPublics: [
    ],
    listenersPrives: [
    ],
    listenersProteges: [
    ]
  }

  return configurationEvenements
}
