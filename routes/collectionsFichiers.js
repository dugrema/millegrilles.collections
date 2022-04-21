const debug = require('debug')('routes:collectionsFichiers')
const express = require('express')
const bodyParser = require('body-parser')

const backingStore = require('@dugrema/millegrilles.nodejs/src/fichiersTransfertBackingstore')

function init(amqpdao, fichierUploadUrl, opts) {
    opts = opts || {}

    debug("collectionsFichiers url upload consignation : %s", fichierUploadUrl)

    backingStore.configurerThreadPutFichiersConsignation(fichierUploadUrl, amqpdao)

    const route = express.Router()

    // route.use((req, res, next)=>{
    //     debug("REQ collectionsFichiers url : %s", req.url)
    //     next()
    // })

    // Download (GET)
    route.get('/collections/fichiers/verifier', verifierAutorisationFichier)

    // Reception fichiers (PUT)
    const middlewareRecevoirFichier = backingStore.middlewareRecevoirFichier(opts)
    route.put('/collections/upload/:correlation/:position', middlewareRecevoirFichier)

    // Verification fichiers (POST)
    const middlewareReadyFichier = backingStore.middlewareReadyFichier(amqpdao, opts)
    route.post('/collections/upload/:correlation', bodyParser.json(), middlewareReadyFichier)

    // Cleanup
    const middlewareDeleteStaging = backingStore.middlewareDeleteStaging(opts)
    route.delete('/collections/upload/:correlation', middlewareDeleteStaging)

    debug("Route /collections/upload initialisee")
    
    return route
}

function verifierAutorisationFichier(req, res) {
    // TODO : valider acces de l'usager au fichier
    // console.debug("REQ Params, sec : %O", req)
    return res.sendStatus(200)
}

module.exports = init
