import { wrap } from 'comlink'

import ChiffrageWorker from './chiffrage.worker'
import ConnexionWorker from './connexion.worker'
import X509 from './x509.worker'
import FiletransferDownloadWorker from './filetransferDownload.worker'
import * as traitementFichiers from './traitementFichiers'

// Exemple de loader pour web workers
export function chargerWorkers() {
    const {worker: chiffrage} = charger(ChiffrageWorker)
    const {worker: connexion} = charger(ConnexionWorker)
    const {worker: x509} = charger(X509)
    const {worker: download} = charger(FiletransferDownloadWorker)

    const workers = {
        chiffrage, 
        connexion, 
        x509,
        download,
        traitementFichiers,
    }
    traitementFichiers.setWorkers(workers)

    return workers
}

function charger(ClasseWorker) {
    const instance = new ClasseWorker()
    const worker = wrap(instance)
    return {instance, worker}
}