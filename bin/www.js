#!/usr/bin/env node

const debug = require('debug')('www')
const express = require('express')
const socketApp = require('./appSocketIo')
// const amqpdao = require('./amqpdao')
// const server4 = require('@dugrema/millegrilles.common/lib/server4')
// const { extraireExtensionsMillegrille } = require('@dugrema/millegrilles.common/lib/forgecommon')
// const {initialiser: initialiserGrosFichiers} = require('../routes/grosfichiers')
// const { GrosFichiersDao } = require('../models/grosFichiersDao')

async function init() {

  // Initialiser server et routes
  const app = express()
//   const {server, socketIo, amqpdao: amqpdaoInst} = await server4(
//     app, socketApp.configurerEvenements, {pathApp: '/grosfichiers', verifierAutorisation})

//   const grosFichiersDao = new GrosFichiersDao(amqpdaoInst)
//   socketIo.use((socket, next)=>{
//     socket.grosFichiersDao = grosFichiersDao
//     next()
//   })

//   const routeGrosfichiers = express.Router()
//   app.use('/grosfichiers', routeGrosfichiers)

//   // Inserer les routes apres l'initialisation, permet d'avoir le middleware
//   // attache avant (app.use comme le logging morgan, injection amqpdao, etc.)
//   routeGrosfichiers.use((req, res, next)=>{
//     req.grosFichiersDao = grosFichiersDao
//     next()
//   })

//   routeGrosfichiers.use(initialiserGrosFichiers(amqpdaoInst))
}

// function verifierAutorisation(socket, securite, certificatForge) {
//   debug("Verifier autorisation cert %O", certificatForge)
//   if(securite === '3.protege') {
//     const extensions = extraireExtensionsMillegrille(certificatForge)
//     debug("www.verifierAutorisation extensions %O", extensions)

//     // Deleguation globale donne tous les acces
//     if(['proprietaire', 'delegue'].includes(extensions.delegationGlobale)) {
//       debug("Usager proprietaire, acces 3.protege OK")
//       return true
//     }

//     // Delegation au domaine coupdoeil
//     if(extensions.delegationsDomaines.includes('coupdoeil')) {
//       debug("Usager delegue domaine coupdoeil, acces 3.protege OK")
//       return true
//     }

//     debug("Usager acces 3.protege refuse")
//   }
//   return false
// }

init()
