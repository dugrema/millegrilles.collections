import debugLib from 'debug'
import express from 'express'
import server6 from '@dugrema/millegrilles.nodejs/src/server6.js'
import { extraireExtensionsMillegrille } from  '@dugrema/millegrilles.utiljs/src/forgecommon.js'
import FichiersMiddleware from '@dugrema/millegrilles.nodejs/src/fichiersMiddleware.js'
import FichiersTransfertUpstream from '@dugrema/millegrilles.nodejs/src/fichiersTransfertUpstream.js'
import configurerEvenements from './appSocketIo.js'
import routeCollections from './routes/collections.js'
import * as mqdao from './mqdao.js'

const debug = debugLib('app')

// const express = require('express')

// const server6 = require('@dugrema/millegrilles.nodejs/src/server6')
// const { extraireExtensionsMillegrille } = require('@dugrema/millegrilles.utiljs/src/forgecommon')

// const { configurerEvenements } = require('./appSocketIo.js')
// const routeCollections = require('./routes/collections.js')
// const mqdao = require('./mqdao.js')

async function app(params) {
    debug("Server app params %O", params)
    const app = express()

    const {server, socketIo, amqpdao: amqpdaoInst, urlHost } = await server6(
        app,
        configurerEvenements,
        {pathApp: '/collections', verifierAutorisation, verifierAuthentification, exchange: '2.prive'}
    )

    const fichiersMiddleware = new FichiersMiddleware(amqpdaoInst)
    const fichiersTransfertUpstream = new FichiersTransfertUpstream(amqpdaoInst)

    socketIo.use((socket, next)=>{
      socket.mqdao = mqdao
      socket.fichiersMiddleware = fichiersMiddleware
      socket.fichiersTransfertUpstream = fichiersTransfertUpstream
      next()
    })

    // Inserer les routes apres l'initialisation, permet d'avoir le middleware
    // attache avant (app.use comme le logging morgan, injection amqpdao, etc.)
    const route = express.Router()
    app.all('/collections(/*)?', route)

    const opts = {
        urlHost,
    }

    route.use((req, _res, next)=>{ 
        req.mqdao = mqdao
        req.fichiersMiddleware = fichiersMiddleware
        req.fichiersTransfertUpstream = fichiersTransfertUpstream
        next() 
    })

    route.use(routeCollections(amqpdaoInst, fichiersMiddleware, opts))

    return server
}

export default app

function verifierAutorisation(socket, securite, certificatForge) {

    let prive = false, protege = false

    const extensions = extraireExtensionsMillegrille(certificatForge)
    // debug("www.verifierAutorisation extensions %O", extensions)

    if(['proprietaire', 'delegue'].includes(extensions.delegationGlobale)) {
        // Deleguation globale donne tous les acces
        debug("Usager proprietaire, acces 3.protege OK")
        prive = true
        protege = true
    } else if(extensions.delegationsDomaines.includes('collections')) {
        // Delegation au domaine coupdoeil
        debug("Usager delegue domaine coupdoeil, acces 3.protege OK")
        prive = true
        protege = true
    } else if(securite === '2.prive') {
        const roles = extensions.roles || []
        if(roles.includes('compte_prive')) {
            debug("Usager prive, acces 2.prive OK")
            prive = true
        }
    }
    
    return {prive, protege}
}

function verifierAuthentification(req, res, next) {
    if(req.url.startsWith('/collections/streams')) {
        // Bypass pour streams, verification via tokens
        return next()
    }
    
    const session = req.session
    if( ! (session.nomUsager && session.userId) ) {
      debug("verifierAuthentification Acces refuse (nomUsager et userId null)")
      debug("Nom usager/userId ne sont pas inclus dans les req.headers : %O", req.headers)
      res.append('Access-Control-Allow-Origin', '*')  // S'assurer que le message est recu cross-origin
      return res.sendStatus(403)
    }
    next()
}
  
// module.exports = app
