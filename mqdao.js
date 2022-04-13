const debug = require('debug')('mqdao')

const L2Prive = '2.prive'

const DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles',
      CONST_DOMAINE_FICHIERS = 'fichiers'

function challenge(socket, params) {
    // Repondre avec un message signe
    const reponse = {
        reponse: params.challenge,
        message: 'Trust no one',
        nomUsager: socket.nomUsager,
        userId: socket.userId,
    }
    return socket.amqpdao.pki.formatterMessage(reponse, 'challenge', {ajouterCertificat: true})
}

function getDocuments(socket, params) {
    return transmettreRequete(socket, params, 'documentsParTuuid')
}

function getFavoris(socket, params) {
    return transmettreRequete(socket, params, 'favoris')
}

function getCorbeille(socket, params) {
    return transmettreRequete(socket, params, 'getCorbeille')
}

function getCollection(socket, params) {
    return transmettreRequete(socket, params, 'contenuCollection')
}

function getRecents(socket, params) {
    return transmettreRequete(socket, params, 'activiteRecente')
}

function getClesFichiers(socket, params) {
    return transmettreRequete(socket, params, 'dechiffrage', {domaine: CONST_DOMAINE_MAITREDESCLES})
}

function getPermissionCles(socket, params) {
    return transmettreRequete(socket, params, 'getClesFichiers')
}

function rechercheIndex(socket, params) {
    return transmettreRequete(socket, params, 'rechercheIndex')
}

function creerCollection(socket, params) {
    return transmettreCommande(socket, params, 'nouvelleCollection')
}

function changerFavoris(socket, params) {
    return transmettreCommande(socket, params, 'changerFavoris')
}

function retirerDocuments(socket, params) {
    return transmettreCommande(socket, params, 'retirerDocumentsCollection')
}

function supprimerDocuments(socket, params) {
    return transmettreCommande(socket, params, 'supprimerDocuments')
}

function decrireFichier(socket, params) {
    return transmettreCommande(socket, params, 'decrireFichier')
}

function decrireCollection(socket, params) {
    return transmettreCommande(socket, params, 'decrireCollection')
}

function recupererDocuments(socket, params) {
    return transmettreCommande(socket, params, 'recupererDocuments')
}

function copierVersCollection(socket, params) {
    return transmettreCommande(socket, params, 'ajouterFichiersCollection')
}

function deplacerFichiersCollection(socket, params) {
    return transmettreCommande(socket, params, 'deplacerFichiersCollection')
}

function indexerContenu(socket, params) {
    return transmettreCommande(socket, params, 'indexerContenu')
}

function transcoderVideo(socket, params) {
    return transmettreCommande(
        socket, params, 'transcoderVideo', 
        {domaine: CONST_DOMAINE_FICHIERS, nowait: true}
    )
}

async function transmettreRequete(socket, params, action, opts) {
    opts = opts || {}
    const domaine = opts.domaine || DOMAINE_GROSFICHIERS
    const exchange = opts.exchange || L2Prive
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreRequete(
            domaine, 
            params, 
            {action, exchange, noformat: true, decoder: true}
        )
    } catch(err) {
        console.error("mqdao.transmettreRequete ERROR : %O", err)
        return {ok: false, err: ''+err}
    }
}

async function transmettreCommande(socket, params, action, opts) {
    opts = opts || {}
    const domaine = opts.domaine || DOMAINE_GROSFICHIERS
    const exchange = opts.exchange || L2Prive
    const nowait = opts.nowait
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreCommande(
            domaine, 
            params, 
            {action, exchange, noformat: true, decoder: true, nowait}
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

// Listeners

const CONST_ROUTINGKEYS_MAJFICHIER = ['evenement.grosfichiers.majFichier']

const mapperMajFichiers = {
  exchanges: ['2.prive'],
  routingKeyTest: /^evenement\.grosfichiers\.majFichier$/,
  mapRoom: (message, _rk, _exchange) => {
    const tuuid = message.tuuid
    if(tuuid) {
      return `2.prive/evenement.grosfichiers.majFichier/${tuuid}`
    }
  }
}

function enregistrerCallbackMajFichier(socket, params, cb) {
  const tuuids = params.tuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJFICHIER,
    exchanges: ['2.prive'],
    roomParam: tuuids,
    mapper: mapperMajFichiers,
  }

  debug("enregistrerCallbackMajFichier : %O", opts)
  socket.subscribe(opts, cb)
}

function retirerCallbackMajFichier(socket, params, cb) {
  const tuuids = params.tuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJFICHIER, 
    exchanges: ['2.prive'],
    roomParam: tuuids,
  }
  debug("retirerCallbackMajFichier sur %O", opts)
  socket.unsubscribe(opts, cb)
}

const CONST_ROUTINGKEYS_MAJCOLLECTION = ['evenement.grosfichiers.majCollection']

const mapperMajCollection = {
  exchanges: ['2.prive'],
  routingKeyTest: /^evenement\.grosfichiers\.majCollection$/,
  mapRoom: (message, _rk, _exchange) => {
    const cuuid = message.tuuid
    if(cuuid) {
      return `2.prive/evenement.grosfichiers.majCollection/${cuuid}`
    }
  }
}

function enregistrerCallbackMajCollections(socket, params, cb) {
  const cuuids = params.cuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJCOLLECTION,
    exchanges: ['2.prive'],
    roomParam: cuuids,
    mapper: mapperMajCollection,
  }

  debug("enregistrerCallbackMajFichier : %O", opts)
  socket.subscribe(opts, cb)
}

function retirerCallbackMajCollections(socket, params, cb) {
  const cuuids = params.cuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJCOLLECTION, 
    exchanges: ['2.prive'],
    roomParam: cuuids,
  }
  debug("retirerCallbackMajFichier sur %O", opts)
  socket.unsubscribe(opts, cb)
}


const CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO = ['evenement.fichiers._FUUID_.transcodageProgres']

function enregistrerCallbackTranscodageVideo(socket, params, cb) {
  const { fuuid } = params
  const routingKeys = CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO.map(item=>item.replace('_FUUID_', fuuid))
  const opts = { 
    routingKeys,
    exchanges: ['2.prive'],
  }

  debug("enregistrerCallbackTranscodageVideo : %O", opts)
  socket.subscribe(opts, cb)
}

function retirerCallbackTranscodageVideo(socket, params, cb) {
    const { fuuid } = params
    const routingKeys = CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO.map(item=>item.replace('_FUUID_', fuuid))
  const opts = { 
    routingKeys,
    exchanges: ['2.prive'],
  }
  debug("retirerCallbackTranscodageVideo sur %O", opts)
  socket.unsubscribe(opts, cb)
}

// async function ecouterTranscodageProgres(socket, params, cb) {
//     const opts = {
//         routingKeys: [`evenement.fichiers.${params.fuuid}.transcodageProgres`],
//         exchange: [L2Prive],
//     }
//     socket.subscribe(opts, cb)
// }

// async function retirerTranscodageProgres(socket, params, cb) {
//     const routingKeys = [`2.prive/evenement.fichiers.${params.fuuid}.transcodageProgres`]
//     socket.unsubscribe({routingKeys})
//     if(cb) cb(true)
// }

module.exports = {
    challenge, getDocuments, getFavoris, getCorbeille, getCollection, getRecents,
    getClesFichiers, getPermissionCles, rechercheIndex, creerCollection, changerFavoris, 
    retirerDocuments, supprimerDocuments, decrireFichier, decrireCollection, 
    enregistrerCallbackMajFichier, retirerCallbackMajFichier,
    enregistrerCallbackMajCollections, retirerCallbackMajCollections,
    enregistrerCallbackTranscodageVideo, retirerCallbackTranscodageVideo,

    recupererDocuments, copierVersCollection, deplacerFichiersCollection, 
    indexerContenu, transcoderVideo,
}
