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
    return transmettreRequete(socket, params, 'fichiers', {domaine: 'solrrelai'})
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

export async function creerCollection(socket, params, cle) {
    // const commandeMaitrecles = params['_commandeMaitrecles']
    // delete params['_commandeMaitrecles']
    // const partition = commandeMaitrecles['_partition']
    // delete commandeMaitrecles['_partition']
    // await transmettreCommande(socket, commandeMaitrecles, 'sauvegarderCle', {partition, domaine: CONST_DOMAINE_MAITREDESCLES})
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

export function archiverDocuments(socket, params) {
  return transmettreCommande(socket, params, 'archiverDocuments')
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

export function chargerContacts(socket, params) {
  return transmettreRequete(socket, params, 'chargerContacts')
}

export function ajouterContactLocal(socket, params) {
  return transmettreCommande(
      socket, params, 'ajouterContactLocal', 
      {domaine: DOMAINE_GROSFICHIERS}
  )
}

export function supprimerContacts(socket, params) {
  return transmettreCommande(
      socket, params, 'supprimerContacts', 
      {domaine: DOMAINE_GROSFICHIERS}
  )
}

export function partagerCollections(socket, params) {
  return transmettreCommande(
      socket, params, 'partagerCollections', 
      {domaine: DOMAINE_GROSFICHIERS}
  )
}

export function getPartagesUsager(socket, params) {
  return transmettreRequete(socket, params, 'getPartagesUsager')
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
    const routage = message.routage || {},
          domaineRecu = routage.domaine,
          actionRecue = routage.action
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
  'evenement.media._USER_ID_.transcodageProgres',
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

export async function creerTokenStream(socket, enveloppeParams) {
  try {
    debug("creerTokenStream : ", enveloppeParams)

    const contenu = JSON.parse(enveloppeParams.contenu)

    const fuuids = contenu.fuuids,
          fuuidStream = contenu.fuuidStream,
          mimetype = contenu.mimetype,
          dechiffrageVideo = contenu.dechiffrageVideo || {}

    debug("Fuuid a charger : %O", fuuids)

    const resultat = await transmettreRequete(socket, enveloppeParams, 'verifierAccesFuuids')
    debug("creerTokenStream Resultat verification acces : %O", resultat)
    if(resultat.acces_tous === true) {
        debug("creerTokenStream Acces stream OK")
 
        const pki = socket.amqpdao.pki
        const { cle: clePriveePem, fingerprint } = pki
        const userId = socket.userId

        const jwts = {}
        for await (const fuuid of fuuids) {
          const jwt = await signerTokenFichier(fingerprint, clePriveePem, userId, fuuid, {mimetype})
          debug("JWT cree pour userId %s sur fuuid %s : %O", userId, fuuid, jwt)
          jwts[fuuid] = jwt

          if(fuuidStream) {
            const jwt = await signerTokenFichier(fingerprint, clePriveePem, userId, fuuidStream, {ref: fuuid, mimetype, ...dechiffrageVideo})
            debug("JWT cree pour userId %s sur video %s (fuuid %s) : %O", userId, fuuidStream, fuuid, jwt)
            jwts[fuuidStream] = jwt
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

}

