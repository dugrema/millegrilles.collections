
const DOMAINE_GROSFICHIERS = 'GrosFichiers'

export function challenge(socket, params) {
    // Repondre avec un message signe
    const reponse = {
        reponse: params.challenge,
        message: 'Trust no one',
        nomUsager: socket.nomUsager,
        userId: socket.userId,
    }
    return socket.amqpdao.pki.formatterMessage(reponse, 'challenge', {ajouterCertificat: true})
}

export function getFavoris(socket, params) {
    const action = 'favoris'
    verifierMessage(params, DOMAINE_GROSFICHIERS, action)
    return socket.amqpdao.transmettreRequete(DOMAINE_GROSFICHIERS, params, {action, noformat: true, decoder: true})
}

function verifierMessage(message, domaine, action) {
    const entete = message['en-tete'] || {},
          domaineRecu = entete.domaine,
          actionRecue = entete.action
    if(domaineRecu !== domaine) throw new Error(`Mismatch domaine (${domaineRecu} !== ${domaine})"`)
    if(actionRecue !== action) throw new Error(`Mismatch action (${actionRecue} !== ${action})"`)
}