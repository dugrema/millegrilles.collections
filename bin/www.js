#!/usr/bin/env node

const debug = require('debug')('www')
const app = require('../app.js')

// const debug = debugLib('www')
debug("Demarrer server6")

// Initialiser le serveur
app()
    .catch(err=>{
        console.error("serveur5.www Erreur execution app : %O", err)
    })
    .finally(()=>{
        debug("Fin initialisation serveur5.www")
    })
