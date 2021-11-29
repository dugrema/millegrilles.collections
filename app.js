import debugLib from 'debug'
import express from 'express'

import { server5 } from '@dugrema/millegrilles.nodejs'
import utiljs from '@dugrema/millegrilles.utiljs'

import socketApp from './appSocketIo.js'
import routeCollections from './routes/collections.js'

// const { GrosFichiersDao } = require('../models/grosFichiersDao')

const debug = debugLib('millegrilles:app')
const { extraireExtensionsMillegrille } = utiljs.forgecommon

export default async params => {
    debug("Server app params %O", params)
    const app = express()
    const {server, socketIo, amqpdao: amqpdaoInst} = await server5(
        app,
        socketApp.configurerEvenements,
        {pathApp: '/collections', verifierAutorisation}
    )

    const routeGrosfichiers = express.Router()
    app.use('/collections', routeGrosfichiers)

  //   const grosFichiersDao = new GrosFichiersDao(amqpdaoInst)
  //   socketIo.use((socket, next)=>{
  //     socket.grosFichiersDao = grosFichiersDao
  //     next()
  //   })
  
  //   // Inserer les routes apres l'initialisation, permet d'avoir le middleware
  //   // attache avant (app.use comme le logging morgan, injection amqpdao, etc.)
  //   routeGrosfichiers.use((req, res, next)=>{
  //     req.grosFichiersDao = grosFichiersDao
  //     next()
  //   })
  
    routeGrosfichiers.use(routeCollections(amqpdaoInst))
}

function verifierAutorisation(socket, securite, certificatForge) {
    debug("Verifier autorisation cert %O", certificatForge)
    if(securite === '3.protege') {
        const extensions = extraireExtensionsMillegrille(certificatForge)
        debug("www.verifierAutorisation extensions %O", extensions)

        // Deleguation globale donne tous les acces
        if(['proprietaire', 'delegue'].includes(extensions.delegationGlobale)) {
        debug("Usager proprietaire, acces 3.protege OK")
        return true
        }

        // Delegation au domaine coupdoeil
        if(extensions.delegationsDomaines.includes('coupdoeil')) {
        debug("Usager delegue domaine coupdoeil, acces 3.protege OK")
        return true
        }

        debug("Usager acces 3.protege refuse")
    }
    return false
}

