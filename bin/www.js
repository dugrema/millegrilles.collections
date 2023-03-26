#!/usr/bin/env node
import debugLib from 'debug'
import app from '../app.js'

const debug = debugLib('www')

// const debug = debugLib('www')
debug("Demarrer server6")

// Initialiser le serveur
app()
    .catch(err=>{
        console.error("serveur5.www Erreur execution app : %O", err)
        process.exit()
    })
    .finally(()=>{
        debug("Fin initialisation serveur5.www")
    })
