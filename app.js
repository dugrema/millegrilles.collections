import debugLib from 'debug'
import express from 'express'

import { server5 } from '@dugrema/millegrilles.nodejs'
import utiljs from '@dugrema/millegrilles.utiljs'

import { configurerEvenements } from './appSocketIo.js'
import routeCollections from './routes/collections.js'
import * as mqdao from './mqdao.js'

const debug = debugLib('millegrilles:app')
const { extraireExtensionsMillegrille } = utiljs.forgecommon

export default async function app(params) {
    debug("Server app params %O", params)
    const app = express()
    const {server, socketIo, amqpdao: amqpdaoInst} = await server5(
        app,
        configurerEvenements,
        {pathApp: '/collections', verifierAutorisation}
    )

    socketIo.use((socket, next)=>{
      socket.mqdao = mqdao
      next()
    })

    // Inserer les routes apres l'initialisation, permet d'avoir le middleware
    // attache avant (app.use comme le logging morgan, injection amqpdao, etc.)
    const route = express.Router()
    app.use('/collections', route)
    route.use((req, res, next)=>{
      req.mqdao = mqdao
      next()
    })
    route.use(routeCollections(amqpdaoInst))

    return server
}

function verifierAutorisation(socket, securite, certificatForge) {

    if(securite === '3.protege') {
        const extensions = extraireExtensionsMillegrille(certificatForge)
        debug("www.verifierAutorisation extensions %O", extensions)

        // Deleguation globale donne tous les acces
        if(['proprietaire', 'delegue'].includes(extensions.delegationGlobale)) {
            debug("Usager proprietaire, acces 3.protege OK")
            return true
        }

        // Delegation au domaine coupdoeil
        if(extensions.delegationsDomaines.includes('collections')) {
            debug("Usager delegue domaine coupdoeil, acces 3.protege OK")
            return true
        }

        debug("Usager acces 3.protege refuse")
    }
    
    return false
}

