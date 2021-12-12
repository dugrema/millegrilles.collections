
const DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles'

const ROUTING_KEYS_FICHIERS = [
    'evenement.grosfichiers.majFichier',
]

const ROUTING_KEYS_COLLECTIONS = [
    'evenement.grosfichiers.majCollection',
]

// const EVENEMENTS_SUPPORTES = [
// ...ROUTING_KEYS_FICHIERS,
// ...ROUTING_KEYS_COLLECTIONS,
// ]
      
export function challenge(socket, params) {
    // Repondre avec un message signe
    const reponse = {
        reponse: params.challenge,
        message: 'Trust no one',
        nomUsager: socket.nomUsager,
        userId: socket.userId,
    }
    return socket.amqpdao.pki.formatterMessage(reponse, 'challenge', {ajouterCertificat: true})
}

export function getFavoris(socket, params) {
    return transmettreRequete(socket, params, 'favoris')
}

export function getCollection(socket, params) {
    return transmettreRequete(socket, params, 'contenuCollection')
}

export function getRecents(socket, params) {
    return transmettreRequete(socket, params, 'activiteRecente')
}

export function getClesFichiers(socket, params) {
    return transmettreRequete(socket, params, 'dechiffrage', {domaine: CONST_DOMAINE_MAITREDESCLES})
}

async function transmettreRequete(socket, params, action, opts) {
    opts = opts || {}
    const domaine = opts.domaine || DOMAINE_GROSFICHIERS
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreRequete(domaine, params, {action, noformat: true, decoder: true})
    } catch(err) {
        console.error("mqdao.transmettreRequete ERROR : %O", err)
        return {ok: false, err: ''+err}
    }
}

/* Fonction de verification pour eviter abus de l'API */
function verifierMessage(message, domaine, action) {
    const entete = message['en-tete'] || {},
          domaineRecu = entete.domaine,
          actionRecue = entete.action
    if(domaineRecu !== domaine) throw new Error(`Mismatch domaine (${domaineRecu} !== ${domaine})"`)
    if(actionRecue !== action) throw new Error(`Mismatch action (${actionRecue} !== ${action})"`)
}

export async function ecouterMajFichiers(socket, cb) {
    const opts = {
        routingKeys: ROUTING_KEYS_FICHIERS,
        exchange: ['3.protege'],
    }
    socket.subscribe(opts, cb)
}

export async function ecouterMajCollections(socket, cb) {
    const opts = {
        routingKeys: ROUTING_KEYS_COLLECTIONS,
        exchange: ['3.protege'],
    }
    socket.subscribe(opts, cb)
}

export async function ecouterTranscodageProgres(socket, params, cb) {
    const opts = {
        routingKeys: [`evenement.fichiers.${params.fuuid}.transcodageProgres`],
        exchange: ['3.protege'],
    }
    socket.subscribe(opts, cb)
}

export async function retirerTranscodageProgres(socket, params, cb) {
    const routingKey = [`3.protege.evenement.fichiers.${params.fuuid}.transcodageProgres`]
    socket.unsubscribe({routingKeys})
    if(cb) cb(true)
}
