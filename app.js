const debug = require('debug')('app')
const express = require('express')

const server6 = require('@dugrema/millegrilles.nodejs/src/server6')
const { extraireExtensionsMillegrille } = require('@dugrema/millegrilles.utiljs/src/forgecommon')

const { configurerEvenements } = require('./appSocketIo.js')
const routeCollections = require('./routes/collections.js')
const mqdao = require('./mqdao.js')

async function app(params) {
    debug("Server app params %O", params)
    const app = express()

    const {server, socketIo, amqpdao: amqpdaoInst, urlHost } = await server6(
        app,
        configurerEvenements,
        {pathApp: '/collections', verifierAutorisation, exchange: '2.prive'}
    )

    socketIo.use((socket, next)=>{
      socket.mqdao = mqdao
      next()
    })

    // Inserer les routes apres l'initialisation, permet d'avoir le middleware
    // attache avant (app.use comme le logging morgan, injection amqpdao, etc.)
    const route = express.Router()
    app.all('/collections(/*)?', route)

    const opts = {
        urlHost,
    }

    route.use((req, _res, next)=>{ req.mqdao = mqdao; next(); })
    route.use(routeCollections(amqpdaoInst, opts))

    return server
}

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

module.exports = app
