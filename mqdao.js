import debugLib from 'debug'
// import { getRandom } from '@dugrema/millegrilles.utiljs/src/random'
// import { hacher } from '@dugrema/millegrilles.nodejs/src/hachage'
import { signerTokenFichier, verifierTokenFichier } from '@dugrema/millegrilles.nodejs/src/jwt.js'
import readdirp from 'readdirp'
import fsPromises from 'fs/promises'

const debug = debugLib('mqdao')

const L2Prive = '2.prive'

const DOMAINE_GROSFICHIERS = 'GrosFichiers',
      CONST_DOMAINE_MAITREDESCLES = 'MaitreDesCles',
      CONST_DOMAINE_FICHIERS = 'fichiers',
      CONST_TIMEOUT_STREAMTOKEN = 6 * 60 * 60

let _certificatMaitreCles = null

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

export function getDocuments(socket, params) {
    return transmettreRequete(socket, params, 'documentsParTuuid')
}

export function getFavoris(socket, params) {
    return transmettreRequete(socket, params, 'favoris')
}

export function getCorbeille(socket, params) {
    return transmettreRequete(socket, params, 'getCorbeille')
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

export function getPermissionCles(socket, params) {
    return transmettreRequete(socket, params, 'getClesFichiers')
}

export function rechercheIndex(socket, params) {
    return transmettreRequete(socket, params, 'rechercheIndex')
}

export function completerPreviews(socket, params) {
  return transmettreCommande(socket, params, 'completerPreviews')
}

export function syncCollection(socket, params) {
  return transmettreRequete(socket, params, 'syncCollection')
}

export function syncRecents(socket, params) {
  return transmettreRequete(socket, params, 'syncRecents')
}

export function syncCorbeille(socket, params) {
  return transmettreRequete(socket, params, 'syncCorbeille')
}

export function requeteJobsVideo(socket, params) {
  return transmettreRequete(socket, params, 'requeteJobsVideo')
}

export async function creerCollection(socket, params) {
    const commandeMaitrecles = params['_commandeMaitrecles']
    delete params['_commandeMaitrecles']
    const partition = commandeMaitrecles['_partition']
    delete commandeMaitrecles['_partition']
    await transmettreCommande(socket, commandeMaitrecles, 'sauvegarderCle', {partition, domaine: CONST_DOMAINE_MAITREDESCLES})
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

export function recupererDocuments(socket, params) {
    return transmettreCommande(socket, params, 'recupererDocuments')
}

export function copierVersCollection(socket, params) {
    return transmettreCommande(socket, params, 'ajouterFichiersCollection')
}

export function deplacerFichiersCollection(socket, params) {
    return transmettreCommande(socket, params, 'deplacerFichiersCollection')
}

export function indexerContenu(socket, params) {
    return transmettreCommande(socket, params, 'indexerContenu')
}

export function transcoderVideo(socket, params) {
    return transmettreCommande(
        socket, params, 'transcoderVideo', 
        // {nowait: true}
    )
}

export function supprimerVideo(socket, params) {
  return transmettreCommande(socket, params, 'supprimerVideo')
}

export function ajouterFichier(socket, params) {
  return transmettreCommande(
      socket, params, 'commandeNouveauFichier', 
      {domaine: DOMAINE_GROSFICHIERS}
  )
}

export function supprimerJobVideo(socket, params) {
  return transmettreCommande(
      socket, params, 'supprimerJobVideo', 
      {domaine: DOMAINE_GROSFICHIERS}
  )
}

export async function getClesChiffrage(socket, params) {
  let certificatMaitreCles = _certificatMaitreCles
  if(!certificatMaitreCles) {
      debug("Requete pour certificat maitre des cles")

      try {
          certificatMaitreCles = await socket.amqpdao.transmettreRequete(
              CONST_DOMAINE_MAITREDESCLES, {}, 
              {action: 'certMaitreDesCles', decoder: true}
          )

          // TTL
          setTimeout(()=>{_certificatMaitreCles=null}, 120_000)
      } catch(err) {
          console.error("mqdao.transmettreRequete ERROR : %O", err)
          return {ok: false, err: ''+err}
      }
  
      // certificatMaitreCles = await transmettreRequete(socket, params, 'certMaitreDesCles', {domaine: CONST_DOMAINE_MAITREDESCLES})
      _certificatMaitreCles = certificatMaitreCles
  }
  return certificatMaitreCles
}

export async function submitBatchUpload(socket, params) {
  debug("submitBatchUpload params ", params)
  const mq = socket.amqpdao
  const { fichiersMiddleware, fichiersTransfertUpstream } = socket

  const infoToken = await verifierTokenFichier(mq.pki, params.token)
  debug("submitBatchUpload Token ", infoToken)

  const batchId = infoToken.payload.sub

  // Deplacer repertoire batch vers ready
  const source = fichiersMiddleware.getPathBatch(batchId)
  const pathReady = await fichiersTransfertUpstream.takeTransfertBatch(batchId, source)

  // Declencher upload
  await fichiersTransfertUpstream.ajouterFichierConsignation(batchId)

  // Charger toutes les transactions, soumettre immediatement (ok si echec / fichier disparu)
  const promiseReaddirp = readdirp(pathReady, {
    type: 'files',
    fileFilter: 'transactionContenu.json',
    depth: 2,
  })

  for await (const entry of promiseReaddirp) {
      debug("Entry path : %O", entry);
      try {
        const transaction = JSON.parse(await fsPromises.readFile(entry.fullPath))
        await transmettreCommande(socket, transaction, 'nouvelleVersion', {domaine: 'GrosFichiers'})
        debug("submitBatchUpload Transmission pre-emptive de la transaction GrosFichiers %s (OK)", entry.path)
      } catch(err) {
        debug("submitBatchUpload Erreur transmission pre-emptive de la transaction GrosFichiers pour %s : %O", entry.path, err)
      }
  }
  
  return {ok: true}
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
    const partition = opts.partition
    const nowait = opts.nowait
    try {
        verifierMessage(params, domaine, action)
        return await socket.amqpdao.transmettreCommande(
            domaine, 
            params, 
            {action, exchange, partition, noformat: true, decoder: true, nowait}
        )
    } catch(err) {
        console.error("mqdao.transmettreCommande ERROR : %O", err)
        return {ok: false, err: ''+err}
    }
}

/* Fonction de verification pour eviter abus de l'API */
export function verifierMessage(message, domaine, action) {
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

export function enregistrerCallbackMajFichier(socket, params, cb) {
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

export function retirerCallbackMajFichier(socket, params, cb) {
  const tuuids = params.tuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJFICHIER, 
    exchanges: ['2.prive'],
    roomParam: tuuids,
  }
  debug("retirerCallbackMajFichier sur %O", opts)
  socket.unsubscribe(opts, cb)
}

const mapperMajFichiersCollection = {
    exchanges: ['2.prive'],
    routingKeyTest: /^evenement\.grosfichiers\.majFichier$/,
    mapRoom: (message, _rk, _exchange) => {
      const cuuids = message.cuuids
      if(cuuids) {
        return cuuids.map(tuuid=>`2.prive/evenement.grosfichiers.majFichier/${tuuid}`)
      }
    }
}
  
export function enregistrerCallbackMajFichierCollection(socket, params, cb) {
    const cuuids = params.cuuids
    const opts = { 
      routingKeys: CONST_ROUTINGKEYS_MAJFICHIER,
      exchanges: ['2.prive'],
      roomParam: cuuids,
      mapper: mapperMajFichiersCollection,
    }
  
    debug("enregistrerCallbackMajFichierCollection : %O", opts)
    socket.subscribe(opts, cb)
}
  
export function retirerCallbackMajFichierCollection(socket, params, cb) {
    const cuuids = params.cuuids
    const opts = { 
      routingKeys: CONST_ROUTINGKEYS_MAJFICHIER, 
      exchanges: ['2.prive'],
      roomParam: cuuids,
    }
    debug("retirerCallbackMajFichierCollection sur %O", opts)
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

export function enregistrerCallbackMajCollections(socket, params, cb) {
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

export function retirerCallbackMajCollections(socket, params, cb) {
  const cuuids = params.cuuids
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJCOLLECTION, 
    exchanges: ['2.prive'],
    roomParam: cuuids,
  }
  debug("retirerCallbackMajFichier sur %O", opts)
  socket.unsubscribe(opts, cb)
}

const CONST_ROUTINGKEYS_MAJ_CONTENU_COLLECTION = ['evenement.grosfichiers._CUUID_.majContenuCollection']

export function enregistrerCallbackMajContenuCollection(socket, params, cb) {
  const cuuid = params.cuuid
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJ_CONTENU_COLLECTION.map(rk=>rk.replace('_CUUID_', cuuid)),
    exchanges: ['2.prive'],
  }

  debug("enregistrerCallbackMajContenuCollection : %O", opts)
  socket.subscribe(opts, cb)
}

export function retirerCallbackMajContenuCollection(socket, params, cb) {
  const cuuid = params.cuuid
  const opts = { 
    routingKeys: CONST_ROUTINGKEYS_MAJ_CONTENU_COLLECTION.map(rk=>rk.replace('_CUUID_', cuuid)),
    exchanges: ['2.prive'],
  }
  debug("retirerCallbackMajContenuCollection sur %O", opts)
  socket.unsubscribe(opts, cb)
}

const CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO = [
  // 'evenement.fichiers._FUUID_.transcodageProgres',
  'evenement.fichiers._USER_ID_.transcodageProgres',
  'evenement.GrosFichiers._USER_ID_.jobAjoutee',
  'evenement.GrosFichiers._USER_ID_.jobSupprimee',
]

export function enregistrerCallbackTranscodageVideo(socket, params, cb) {
  const { fuuid } = params
  const userId = socket.userId

  const routingKeys = CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO.map(item =>
    item.
      replace('_FUUID_', fuuid).
      replace('_USER_ID_', userId)
  )
  const opts = { 
    routingKeys,
    exchanges: ['2.prive'],
  }

  debug("enregistrerCallbackTranscodageVideo : %O", opts)
  socket.subscribe(opts, cb)
}

export function retirerCallbackTranscodageVideo(socket, params, cb) {
  const { fuuid } = params
  const userId = socket.userId

  const routingKeys = CONST_ROUTINGKEYS_TRANSCODAGE_VIDEO.map(item =>
    item.
      replace('_FUUID_', fuuid).
      replace('_USER_ID_', userId)
  )
  const opts = { 
    routingKeys,
    exchanges: ['2.prive'],
  }
  debug("retirerCallbackTranscodageVideo sur %O", opts)
  socket.unsubscribe(opts, cb)
}

export async function creerTokenStream(socket, params) {
  try {
    const fuuids = params.fuuids,
          fuuidVideo = params.fuuidVideo,
          mimetype = params.mimetype,
          dechiffrageVideo = params.dechiffrageVideo || {}

    debug("Fuuid a charger : %O", fuuids)

    // const userId = socket.userId
    // debug("Fuuid a charger pour usager %s : %O", userId, fuuids)

    // Note : la requete est signee par l'usager - meme advenant une erreur session, aucuns probleme.
    // if(!userId) {
    //     console.error("creerTokenStream: Erreur session, userId manquant dans session")
    //     return {ok: false, err: 'Session https invalide'}
    // }

    // const requete = { user_id: userId, fuuids }
    // const mq = socket.amqpdao
    // const resultat = await mq.transmettreRequete('GrosFichiers', params, {action: 'verifierAccesFuuids'})
    const resultat = await transmettreRequete(socket, params, 'verifierAccesFuuids')
    debug("creerTokenStream Resultat verification acces : %O", resultat)
    if(resultat.acces_tous === true) {
        debug("creerTokenStream Acces stream OK")
        // const randomBytes = getRandom(32)
        // const token = (await hacher(randomBytes, {hashingCode: 'blake2s-256', encoding: 'base58btc'})).slice(1)
        // for await (let fuuid of fuuids) {
        //   const cleStream = `streamtoken:${fuuid}:${token}`
        //   // Conserver token dans Redis
        //   const redisClient = socket.redisClient
        //   await redisClient.set(cleStream, 'ok', {NX: true, EX: CONST_TIMEOUT_STREAMTOKEN})
        // }
  
        const pki = socket.amqpdao.pki
        const { cle: clePriveePem, fingerprint } = pki
        const userId = socket.userId

        const jwts = {}
        for await (const fuuid of fuuids) {
          const jwt = await signerTokenFichier(fingerprint, clePriveePem, userId, fuuid, {mimetype})
          debug("JWT cree pour userId %s sur fuuid %s : %O", userId, fuuid, jwt)
          jwts[fuuid] = jwt

          if(fuuidVideo) {
            const jwt = await signerTokenFichier(fingerprint, clePriveePem, userId, fuuidVideo, {ref: fuuid, mimetype, ...dechiffrageVideo})
            debug("JWT cree pour userId %s sur video %s (fuuid %s) : %O", userId, fuuidVideo, fuuid, jwt)
            jwts[fuuidVideo] = jwt
          }
        }

        return {ok: true, jwts}
    } else {
        debug("creerTokenStream Acces stream refuse")
        return {ok: false, err: 'Acces refuse'}
    }
  } catch(err) {
      debug("creerTokenStream Erreur verification acces stream : %O", err)
      return {ok: false, err: ''+err}
  }


  // // Verifier l'autorisation d'acces au stream
  // const reponse = await transmettreRequete(socket, params, 'verifierPreuve', 
  //     {domaine: CONST_DOMAINE_MAITREDESCLES, partition: params.partition, noformat: true})

  // debug("Reponse preuve : %O", reponse)
  // if(reponse.verification && reponse.verification[fuuid] === true) {
  //     // Creer un token random pour le stream
  //     const randomBytes = getRandom(32)
  //     const token = (await hacher(randomBytes, {hashingCode: 'blake2s-256', encoding: 'base58btc'})).slice(1)
  //     const cleStream = `streamtoken:${fuuid}:${token}`
  //     const timeoutStream = 2 * 60 * 60

  //     // Conserver token dans Redis
  //     const redisClient = socket.redisClient
  //     await redisClient.set(cleStream, 'ok', {NX: true, EX: timeoutStream})

  //     return {token}
  // } else {
  //     return {ok: false, err: "Cle refusee ou inconnue"}
  // }
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

// module.exports = {
//     challenge, getDocuments, getFavoris, getCorbeille, getCollection, getRecents,
//     getClesFichiers, getPermissionCles, rechercheIndex, creerCollection, changerFavoris, 
//     retirerDocuments, supprimerDocuments, decrireFichier, decrireCollection, 
//     enregistrerCallbackMajFichier, retirerCallbackMajFichier,
//     enregistrerCallbackMajCollections, retirerCallbackMajCollections,
//     enregistrerCallbackTranscodageVideo, retirerCallbackTranscodageVideo,
//     enregistrerCallbackMajFichierCollection, retirerCallbackMajFichierCollection,
//     enregistrerCallbackMajContenuCollection, retirerCallbackMajContenuCollection,
//     ajouterFichier, creerTokenStream, getClesChiffrage, supprimerVideo, completerPreviews,

//     syncCollection, syncRecents, syncCorbeille,
//     requeteJobsVideo, supprimerJobVideo,

//     recupererDocuments, copierVersCollection, deplacerFichiersCollection, 
//     indexerContenu, transcoderVideo,
// }
