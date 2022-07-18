const debug = require('debug')('routes:collectionsStreams')
const express = require('express')

function init(amqpdao, opts) {
    opts = opts || {}

    const route = express.Router()

    // Autoriser acces stream
    route.get('/collections/streams/verifier', verifierAutorisationStream)

    debug("Route /collections/streams initialisee")
    
    return route
}

async function verifierAutorisationStream(req, res) {
    try {
        debug("verifierAutorisationFichier Headers %O", req.headers)

        const uriVideo = req.headers['x-original-uri']
        const urlVideo = new URL('https://localhost/' + uriVideo)

        const reFuuid = /\/collections\/streams\/([A-Za-z0-9]+)(\/.*)?/
        const matches = reFuuid.exec(urlVideo.pathname)
        debug("Matches : %O", matches)
        const fuuid = matches[1]

        const userId = req.session.userId
        debug("Fuuid a charger pour usager %s : %s", userId, fuuid)

        if(!userId) {
            console.error("Erreur session, userId manquant sur %s", req.url)
            return res.sendStatus(400)
        }

        if(!fuuid || !userId) return res.sendStatus(400)

        const redisClient = req.redisClient
        // const adresseExterne = req.headers['x-forwarded-for'] || req.headers['x-real-ip']
        const cleStream = `streamtoken:${fuuid}:${userId}`

        debug("getCleRedis Cle = %O", cleStream)
        const cleFuuid = await redisClient.get(cleStream)
        if(cleFuuid && cleFuuid === 'ok') {
            return res.sendStatus(200)
        } else {
            
            // Requete pour savoir si l'usager a acces
            const mq = req.amqpdao
            const requete = { user_id: userId, fuuids: [fuuid] }
            const resultat = await mq.transmettreRequete('GrosFichiers', requete, {action: 'verifierAccesFuuids', exchange: '2.prive', attacherCertificat: true})
            if(resultat.acces_tous === true) {
                debug("verifierAutorisationStream Acces stream OK")

                // Conserver token dans Redis local, evite des requetes vers GrosFichiers
                const timeoutStream = 10 * 60
                redisClient.set(cleStream, 'ok', {NX: true, EX: timeoutStream})
                    .catch(err=>{console.info("verifierAutorisationStream Erreur set cle %s dans redis", cleStream)})
        
                return res.sendStatus(200)
            } else {
                debug("verifierAutorisationStream Acces stream refuse")
                return res.sendStatus(403)
            }

        }
    } catch(err) {
        console.error("ERROR verifierAutorisationFichier : %O", err)
        return res.sendStatus(500)
    }
}

// function verifierAutorisationStream(req, res) {
//     debug("verifierAutorisationStream Headers %O", req.headers)
//     //debug("verifierAutorisationStream Session %O", req.session)

//     const uriVideo = req.headers['x-original-uri']
//     const reFuuid = /\/collections\/streams\/([A-Za-z0-9]+)(\/.*)?/
//     const matches = reFuuid.exec(uriVideo)
//     debug("Matches : %O", matches)

//     if(!matches || matches.length < 1) {
//         debug("verifierAutorisationStream Mauvais url : %s", req.url)
//         return res.sendStatus(400)
//     }

//     const fuuid = matches[1]
//     const userId = req.session.userId
//     debug("Fuuid a charger pour usager %s : %s", userId, fuuid)

//     if(!userId) {
//         console.error("Erreur session, userId manquant sur %s", req.url)
//         return res.sendStatus(400)
//     }

//     const mq = req.amqpdao
//     const requete = { user_id: userId, fuuids: [fuuid] }
//     mq.transmettreRequete('GrosFichiers', requete, {action: 'verifierAccesFuuids', exchange: '2.prive', attacherCertificat: true})
//         .then(resultat=>{
//             if(resultat.acces_tous === true) {
//                 debug("verifierAutorisationStream Acces stream OK")
//                 return res.sendStatus(200)
//             } else {
//                 debug("verifierAutorisationStream Acces stream refuse")
//                 return res.sendStatus(403)
//             }
//         })
//         .catch(err=>{
//             debug("verifierAutorisationStream Erreur verification acces stream : %O", err)
//             return res.sendStatus(500)
//         })
// }

module.exports = init
