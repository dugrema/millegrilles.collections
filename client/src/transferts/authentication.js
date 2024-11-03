import axios from 'axios';

import { MESSAGE_KINDS } from '@dugrema/millegrilles.utiljs/src/constantes';

export async function authenticateFilehost(workers, urlFilehost) {
    let url = new URL(urlFilehost.href + '/authenticate')
    url.pathname = url.pathname.replaceAll('//', '/');
  
    let signedMessage = await workers.chiffrage.formatterMessage(
        {}, 'filehost', {kind: MESSAGE_KINDS.KIND_COMMANDE, action: 'authenticate', inclureCa: true});
  
    console.debug('Authenticate url: %s, Signed message: %O', url.href, signedMessage);
    let response = await axios({
        method: 'POST',
        url: url.href,
        data: signedMessage,
    });
    console.debug("Authentication response: ", response)
    if(!response.data.ok) {
        throw new Error("Authentication error");
    }
}
