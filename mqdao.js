import debugLib from 'debug'
const debug = debugLib('mqdao')

const L2Prive = '2.prive'

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

export function getPermissionCle(socket, params) {
    return transmettreRequete(socket, params, 'getPermission')
}

export function creerCollection(socket, params) {
    return transmettreCommande(socket, params, 'nouvelleCollection')
}

export function changerFavoris(socket, params) {
    return transmettreCommande(socket, params, 'changerFavoris')
}

export function retirerDocuments(socket, params) {
    return transmettreCommande(socket, params, 'retirerDocumentsCollection')
}

export function supprimerDocuments(socket, params) {
    return transmettreCommande(socket, params, 'supprimerDocuments')
}

export function decrireFichier(socket, params) {
    return transmettreCommande(socket, params, 'decrireFichier')
}

export function decrireCollection(socket, params) {
    return transmettreCommande(socket, params, 'decrireCollection')
}

async function transmettreRequete(socket, params, action, opts) {
    opts = opts || {}
    const domaine = opts.domaine || DOMAINE_GROSFICHIERS
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreRequete(
            domaine, 
            params, 
            {action, exchange: L2Prive, noformat: true, decoder: true}
        )
    } catch(err) {
        console.error("mqdao.transmettreRequete ERROR : %O", err)
        return {ok: false, err: ''+err}
    }
}

async function transmettreCommande(socket, params, action, opts) {
    opts = opts || {}
    const domaine = opts.domaine || DOMAINE_GROSFICHIERS
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreCommande(
            domaine, 
            params, 
            {action, exchange: L2Prive, noformat: true, decoder: true}
        )
    } catch(err) {
        console.error("mqdao.transmettreCommande ERROR : %O", err)
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
    const userId = socket.userId
    debug("ecouterMajFichiers userId : %s", socket.userId)
    const opts = {
        routingKeys: ROUTING_KEYS_FICHIERS,
        exchange: [L2Prive],
        userId,
    }
    socket.subscribe(opts, cb)
}

export async function ecouterMajCollections(socket, cb) {
    const userId = socket.userId
    debug("ecouterMajCollections userId : %s", socket.userId)
    const opts = {
        routingKeys: ROUTING_KEYS_COLLECTIONS,
        exchange: [L2Prive],
        userId,
    }
    socket.subscribe(opts, cb)
}

export async function ecouterTranscodageProgres(socket, params, cb) {
    const opts = {
        routingKeys: [`evenement.fichiers.${params.fuuid}.transcodageProgres`],
        exchange: [L2Prive],
    }
    socket.subscribe(opts, cb)
}

export async function retirerTranscodageProgres(socket, params, cb) {
    const routingKey = [`2.prive.evenement.fichiers.${params.fuuid}.transcodageProgres`]
    socket.unsubscribe({routingKeys})
    if(cb) cb(true)
}
