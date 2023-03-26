// const debug = require('debug')('routes:collectionsFichiers')
// const express = require('express')
// const bodyParser = require('body-parser')

// const backingStore = require('@dugrema/millegrilles.nodejs/src/fichiersTransfertBackingstore')

// function init(amqpdao, fichierUploadUrl, opts) {
//     opts = opts || {}

//     debug("collectionsFichiers url upload consignation : %s", fichierUploadUrl)

//     backingStore.configurerThreadPutFichiersConsignation(amqpdao, {url: fichierUploadUrl})

//     const route = express.Router()

//     // route.use((req, res, next)=>{
//     //     debug("REQ collectionsFichiers url : %s", req.url)
//     //     next()
//     // })

//     // Download (GET)
//     route.get('/collections/fichiers/verifier', verifierAutorisationFichier)

//     // Reception fichiers (PUT)
//     const middlewareRecevoirFichier = backingStore.middlewareRecevoirFichier(opts)
//     route.put('/collections/upload/:correlation/:position', middlewareRecevoirFichier)

//     // Verification fichiers (POST)
//     const middlewareReadyFichier = backingStore.middlewareReadyFichier(amqpdao, opts)
//     route.post('/collections/upload/:correlation', bodyParser.json(), middlewareReadyFichier)

//     // Cleanup
//     const middlewareDeleteStaging = backingStore.middlewareDeleteStaging(opts)
//     route.delete('/collections/upload/:correlation', middlewareDeleteStaging)

//     debug("Route /collections/upload initialisee")
    
//     return route
// }

// function verifierAutorisationFichier(req, res) {
//     debug("verifierAutorisationFichier Headers %O", req.headers)
//     //debug("verifierAutorisationFichier Session %O", req.session)

//     const uriVideo = req.headers['x-original-uri']
//     const reFuuid = /\/collections\/fichiers\/([A-Za-z0-9]+)(\/.*)?/
//     const matches = reFuuid.exec(uriVideo)
//     debug("Matches : %O", matches)

//     if(!matches || matches.length < 1) {
//         debug("verifierAutorisationFichier Mauvais url : %s", req.url)
//         return res.sendStatus(400)
//     }

//     const fuuid = matches[1]
//     const userId = req.session.userId
//     debug("Fuuid a charger pour usager %s : %s", userId, fuuid)

//     const mq = req.amqpdao
//     const requete = { user_id: userId, fuuids: [fuuid] }
//     mq.transmettreRequete('GrosFichiers', requete, {action: 'verifierAccesFuuids', exchange: '2.prive', attacherCertificat: true})
//         .then(resultat=>{
//             if(resultat.acces_tous === true) {
//                 debug("verifierAutorisationFichier Acces stream OK")
//                 return res.sendStatus(200)
//             } else {
//                 debug("verifierAutorisationFichier Acces stream refuse")
//                 return res.sendStatus(403)
//             }
//         })
//         .catch(err=>{
//             debug("verifierAutorisationFichier Erreur verification acces stream : %O", err)
//             return res.sendStatus(500)
//         })
// }

// async function verifierAutorisationFichier(req, res) {
//     try {
//         // debug("verifierAutorisationFichier Headers %O", req.headers)

//         // Les fichiers sont chiffres. On fait juste verifier si l'usager a une session.
//         const session = req.session
//         if( ! (session.nomUsager && session.userId) ) {
//             debug("Nom usager/userId ne sont pas inclus dans les req.headers : %O", req.headers)
//             res.append('Access-Control-Allow-Origin', '*')  // S'assurer que le message est recu cross-origin
//             return res.sendStatus(403)
//         } else {
//             // L'usager a une session active, on le laisse telecharger le fichier chiffre.
//             // La cle doit etre fournie via le mecanisme habituel.
//             return res.sendStatus(200)
//         }

//     } catch(err) {
//         console.error("ERROR verifierAutorisationFichier : %O", err)
//         return res.sendStatus(500)
//     }
// }

// ***************************************8

import debugLib from 'debug'
import express from 'express'
import { v4 as uuidv4 } from 'uuid'

import { signerTokenApplication, verifierTokenApplication } from '@dugrema/millegrilles.nodejs/src/jwt.js'
// import FichiersMiddleware from '@dugrema/millegrilles.nodejs/src/fichiersMiddleware.js'
// import FichiersTransfertUpstream from '@dugrema/millegrilles.nodejs/src/fichiersTransfertUpstream.js'

const debug = debugLib('routes:collectionsFichiers')

/** Path /collections/fichiers */
function routesFichiers(mq, fichiersMiddleware) {
    // const fichiersMiddleware = new FichiersMiddleware(mq)
    // const fichiersTransfertUpstream = new FichiersTransfertUpstream(mq)

    const router = express.Router()
    
    // router.use((req, res, next)=>{
    //   req.fichiersMiddleware = fichiersMiddleware
    //   req.fichiersTransfert = fichiersTransfertUpstream
    //   next()
    // })

    // Download (GET)
    router.get('/verifier', verifierAutorisationFichier)

    // router.get('/token', getToken)
    // router.post('/submit', express.json(), verifierToken, submitForm)
    
    // Routes pour upload de fichiers
    router.use('/upload', verifierToken, routerUpload(fichiersMiddleware))
    
    return router
}

export default routesFichiers

/** Router /collections/fichiers/upload */
function routerUpload(fichiersMiddleware) {
    const router = express.Router()
  
    router.put('/:correlation/:position', fichiersMiddleware.middlewareRecevoirFichier())
    router.post('/:correlation', express.json(), fichiersMiddleware.middlewareReadyFichier())
  
    const deleteHandler = fichiersMiddleware.middlewareDeleteStaging()
    router.delete('/:correlation', deleteHandler)
    router.delete(deleteHandler)
  
    return router
}
  
async function verifierAutorisationFichier(req, res) {
    try {
        // debug("verifierAutorisationFichier Headers %O", req.headers)

        // Les fichiers sont chiffres. On fait juste verifier si l'usager a une session.
        const session = req.session
        if( ! (session.nomUsager && session.userId) ) {
            debug("Nom usager/userId ne sont pas inclus dans les req.headers : %O", req.headers)
            res.append('Access-Control-Allow-Origin', '*')  // S'assurer que le message est recu cross-origin
            return res.sendStatus(403)
        } else {
            // L'usager a une session active, on le laisse telecharger le fichier chiffre.
            // La cle doit etre fournie via le mecanisme habituel.
            return res.sendStatus(200)
        }

    } catch(err) {
        console.error("ERROR verifierAutorisationFichier : %O", err)
        return res.sendStatus(500)
    }
}

/** Generateur de token - permet de s'assurer un source fiable (back-end) pour uuid_transaction. */
async function getToken(req, res) {
    const queryParams = req.query
    const application_id = queryParams.application_id
  
    if(!application_id) {
      debug("getToken ERREUR application_id manquant")
      return res.sendStatus(400)  // Manque application_id
    }
  
    const opts = {expiration: '1d'}
    const uuid_transaction = ''+uuidv4()
    const { cle: clePriveePem, fingerprint } = req.amqpdao.pki
    const token = await signerTokenApplication(fingerprint, clePriveePem, application_id, uuid_transaction, opts)
  
    return res.status(200).send({uuid_transaction, token})
}
  
export async function verifierToken(req, res, next) {
    const mq = req.amqpdao
    const body = req.body || {}
    const token = body.token || req.headers['x-token-jwt']
    if(!token) {
      debug("verifierToken ERREUR token manquant")
      return res.status(400).send({ok: false, err: 'Token manquant'})
    }
    try {
        var tokenInfo = await verifierTokenApplication(mq.pki, token)
        debug("verifierToken info ", tokenInfo)
        req.jwtsrc = token
        req.token = tokenInfo
        req.batchId = tokenInfo.payload.sub
        next()
    } catch(err) {
        console.error(new Date() + " ERROR landingFichiers Erreur token : ", err)
        return res.sendStatus(401)
    }
}

async function submitForm(req, res) {
    const mq = req.amqpdao,
          fichiersMiddleware = req.fichiersMiddleware,
          fichiersTransfert = req.fichiersTransfert
    const redisClient = req.redisClient  //amqpdaoInst.pki.redisClient
    const body = req.body
    debug("Submit form req :\n", body)

    // Verifier le token JWT
    const { message } = body
  
    if(!message) {
      debug("submitForm ERREUR message manquant")
      return res.status(400).send({ok: false, err: 'Message missing'})
    }
  
    try {
      const tokenInfo = req.token
      if(!tokenInfo) {
        debug("submitForm ERREUR token manquant")
        return res.status(401).send({ok: false, err: "Missing token"})
      }
      debug("Token Info : ", tokenInfo)
      const { extensions, payload } = tokenInfo
      if( ! extensions.roles.includes('collections') ) return res.status(403).send({ok: false, err: 'Invalid cert role'})
  
      const { application_id, sub: uuid_transaction, exp: expirationToken } = payload
      debug("Application Id : %s, uuid_transaction : %s", application_id, uuid_transaction)
  
      // S'assurer que le token n'a pas deja ete utilise avec redis
      const cleRedisSubmit = `collections:submit:${uuid_transaction}`
      const tokenDejaUtilise = await redisClient.get(cleRedisSubmit)
      if(tokenDejaUtilise) {
        debug("submitForm ERREUR Token deja utilise")
        return res.status(400).send({ok: false, err: 'Token deja utilise'})
      }

      throw new Error('fix me')

      // Creer transaction
      const transaction = await formatterTransactionMessagerie(mq, infoApplication, uuid_transaction, message)
      console.debug("Transaction ", transaction)

      // Preparer batch fichiers
      if(message.fuuids) {
        const pathSource = fichiersMiddleware.getPathBatch(uuid_transaction)
        await fichiersTransfert.takeTransfertBatch(uuid_transaction, pathSource)
      }

      // Soumettre la cle, transaction
      const reponse = await mq.transmettreCommande('Messagerie', transaction, {action: 'recevoir', ajouterCertificat: true})
      debug("Reponse recevoir : ", reponse)

      // Ajouter cle dans redis pour bloquer reutilisation du token
      const ttl = expirationToken - Math.round(new Date().getTime()/1000) + 1
      redisClient.set(cleRedisSubmit, '1', {NX: true, EX: ttl})
        .catch(err=>console.error(new Date() + " ERROR submitForm Erreur sauvegarde cle redis submit " + cleRedisSubmit + " : " + err))
  
      // Declencher le transfert de fichiers
      fichiersTransfert.ajouterFichierConsignation(uuid_transaction)

      return res.status(201).send({ok: true, uuid_transaction})
    } catch(err) {
      console.error(new Date() + ' ERROR submitForm ', err)
      return res.sendStatus(500)
    }
  
}

// module.exports = init
