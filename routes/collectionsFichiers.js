const debug = require('debug')('routes:collectionsFichiers')
const express = require('express')
const bodyParser = require('body-parser')

const backingStore = require('@dugrema/millegrilles.nodejs/src/fichiersTransfertBackingstore')

function init(amqpdao, opts) {
    opts = opts || {}

    const fichierUploadUrl = opts.consignationFichiersUrl || '/fichiers'

    backingStore.configurerThreadPutFichiersConsignation('/fichiers', amqpdao)

    const route = express.Router()

    route.use((req, res, next)=>{
        debug("REQ collectionsFichiers url : %s", req.url)
        next()
    })

    // Reception fichiers (PUT)
    const middlewareRecevoirFichier = backingStore.middlewareRecevoirFichier(opts)
    route.put('/collections/fichiers/:correlation/:position', middlewareRecevoirFichier)

    // Verification fichiers (POST)
    const middlewareReadyFichier = backingStore.middlewareReadyFichier(amqpdao, opts)
    route.post('/collections/fichiers/:correlation', bodyParser.json(), middlewareReadyFichier)

    // Cleanup
    const middlewareDeleteStaging = backingStore.middlewareDeleteStaging(opts)
    route.delete('/collections/fichiers/:correlation', middlewareDeleteStaging)

    debug("Route /collections/fichiers initialisee")
    
    return route
}

module.exports = init
