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

// function verifierAutorisationFichier(req, res) {
//     debug("verifierAutorisationFichier Headers %O", req.headers)
//     //debug("verifierAutorisationFichier Session %O", req.session)

//     const uriVideo = req.headers['x-original-uri']
//     const reFuuid = /\/collections\/fichiers\/([A-Za-z0-9]+)(\/.*)?/
//     const matches = reFuuid.exec(uriVideo)
//     debug("Matches : %O", matches)

//     if(!matches || matches.length < 1) {
//         debug("verifierAutorisationFichier Mauvais url : %s", req.url)
//         return res.sendStatus(400)
//     }

//     const fuuid = matches[1]
//     const userId = req.session.userId
//     debug("Fuuid a charger pour usager %s : %s", userId, fuuid)

//     const mq = req.amqpdao
//     const requete = { user_id: userId, fuuids: [fuuid] }
//     mq.transmettreRequete('GrosFichiers', requete, {action: 'verifierAccesFuuids', exchange: '2.prive', attacherCertificat: true})
//         .then(resultat=>{
//             if(resultat.acces_tous === true) {
//                 debug("verifierAutorisationFichier Acces stream OK")
//                 return res.sendStatus(200)
//             } else {
//                 debug("verifierAutorisationFichier Acces stream refuse")
//                 return res.sendStatus(403)
//             }
//         })
//         .catch(err=>{
//             debug("verifierAutorisationFichier Erreur verification acces stream : %O", err)
//             return res.sendStatus(500)
//         })
// }

async function verifierAutorisationFichier(req, res) {
    try {
        // debug("verifierAutorisationFichier Headers %O", req.headers)

        // Les fichiers sont chiffres. On fait juste verifier si l'usager a une session.
        const session = req.session
        if( ! (session.nomUsager && session.userId) ) {
            debug("Nom usager/userId ne sont pas inclus dans les req.headers : %O", req.headers)
            res.append('Access-Control-Allow-Origin', '*')  // S'assurer que le message est recu cross-origin
            return res.sendStatus(403)
        } else {
            // L'usager a une session active, on le laisse telecharger le fichier chiffre.
            // La cle doit etre fournie via le mecanisme habituel.
            return res.sendStatus(200)
        }

    } catch(err) {
        console.error("ERROR verifierAutorisationFichier : %O", err)
        return res.sendStatus(500)
    }
}


module.exports = init
