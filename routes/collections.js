const debug = require('debug')('routes:collections')
const express = require('express')
const routeCollectionsFichiers = require('./collectionsFichiers.js')
const routeCollectionsStreams = require('./collectionsStreams.js')

// const debug = debugLib('collections');

function app(amqpdao, opts) {
    if(!opts) opts = {}
    const idmg = amqpdao.pki.idmg

    debug("IDMG: %s, AMQPDAO : %s", idmg, amqpdao !== undefined)

    let fichierUploadUrl = process.env['MG_CONSIGNATION_URL']
    if(fichierUploadUrl) {
        new URL(fichierUploadUrl)  // Validation du format
    } 
    // else {
    //     // Mettre url par defaut pour upload sur instance protegee (MQ_HOST, port 443)
    //     const hostMQ = process.env['MQ_HOST']
    //     const urlConsignation = new URL(`https://${hostMQ}/fichiers_transfert`)
    //     fichierUploadUrl = ''+urlConsignation
    // }

    const route = express.Router()
    route.use((req, res, next)=>{console.debug("Req path %s", req.url); next()})
    route.get('/collections/info.json', routeInfo)
    route.get('/collections/initSession', initSession)
    route.get('/collections/streams/*', routeCollectionsStreams(amqpdao, opts))
    route.use(routeCollectionsFichiers(amqpdao, fichierUploadUrl, opts))
    route.use((req, res, next)=>{console.debug("OUPS, default %s", req.url); next()})
    ajouterStaticRoute(route)

    debug("Route /collections de Collections est initialisee")

    // Retourner dictionnaire avec route pour server.js
    return route
}
  
function ajouterStaticRoute(route) {
    // Route utilisee pour transmettre fichiers react de la messagerie en production
    var folderStatic =
        process.env.MG_GROSFICHIERS_STATIC_RES ||
        process.env.MG_STATIC_RES ||
        'static'

    route.get('/collections(/*)?', cacheRes, express.static(folderStatic))
    debug("Route %s pour collections initialisee", folderStatic)
}

function routeInfo(req, res) {
    debug(req.headers)
    const idmgCompte = req.headers['idmg-compte']
    const nomUsager = req.headers['user-prive']
    const host = req.headers.host

    const reponse = {idmgCompte, nomUsager, hostname: host}
    return res.send(reponse)
}

function initSession(req, res) {
    return res.sendStatus(200)
}

function cacheRes(req, res, next) {
    const url = req.url
    debug("Cache res URL : %s", url)
    
    if(url.endsWith('.chunk.js') || url.endsWith('.chunk.css')) {

        // Pour les .chunk.js, on peut faire un cache indefini (immuable)
        res.append('Cache-Control', 'max-age=86400')
        res.append('Cache-Control', 'immutable')

    } else {

        // Pour les autres, faire un cachee limite (e.g. .worker.js, nom ne change pas)
        res.append('Cache-Control', 'max-age=60')

    }

    // res.append('Cache-Control', 'max-age=86400')
    res.append('Cache-Control', 'public')

    next()
}

module.exports = app
