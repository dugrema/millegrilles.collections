import path from 'path'
import axios from 'axios'
import * as Comlink from 'comlink'
import { v4 as uuidv4 } from 'uuid'
import { pki } from '@dugrema/node-forge'
import { base64 } from 'multiformats/bases/base64'
import { BlobReader, ZipReader } from '@zip.js/zip.js'

import { streamAsyncReaderIterable, createTransformStreamCallback, createTransformBatch, getAcceptedFileStream } from '@dugrema/millegrilles.reactjs/src/stream'
import * as hachage from '@dugrema/millegrilles.reactjs/src/hachage'
import { chiffrage }  from '@dugrema/millegrilles.reactjs/src/chiffrage'

import { getExtMimetypeMap } from '@dugrema/millegrilles.utiljs/src/constantes.js'
import { MESSAGE_KINDS } from '@dugrema/millegrilles.utiljs/src/constantes'
import { ETAT_ECHEC } from './constantes'
import { SignatureDomaines } from '@dugrema/millegrilles.utiljs/src/maitredescles'

const { preparerCipher, preparerCommandeMaitrecles } = chiffrage

// Globals
// Structure uploads : {file: AcceptedFile, status=1, }
var _uploadsPending = [],
    _uploadEnCours = null,
    _uploadsCompletes = [],
    _lockHachageChiffre = false

// Callback etat : (nbFichiersPending, pctFichierEnCours, {encours: uuid, complete: uuid})
var _callbackEtatUpload = null,
    _publicKeyCa = null,
    _fingerprintCa = null,
    _certificats = null,
    _domaine = null

// eslint-disable-next-line no-restricted-globals
var _pathServeur = new URL(self.location.href)

// Hacheurs reutilisables
const _hachageDechiffre = new hachage.Hacheur({hashingCode: 'blake2b-512', DEBUG: false}),
      _hachageChiffre = new hachage.Hacheur({hashingCode: 'blake2b-512', DEBUG: false})

_pathServeur.pathname = '/filehost'

const CONST_1MB = 1024 * 1024
const THRESHOLD_100mb = 2_000 * CONST_1MB,
      THRESHOLD_500mb = 10_000 * CONST_1MB

// Retourne la taille a utiliser pour les batch
function getUploadBatchSize(fileSize) {
    if(!fileSize) throw new Error("NaN")
    if(fileSize < THRESHOLD_100mb) return 100 * CONST_1MB
    if(fileSize < THRESHOLD_500mb) return 500 * CONST_1MB
    return 1_000 * CONST_1MB
}

const ETAT_PREPARATION = 1,
      ETAT_PRET = 2

export function up_setPathServeur(pathServeur) {
    console.info("up_setPathServeur Path upload : ", _pathServeur.href)
    _pathServeur = new URL(pathServeur)
    // if(pathServeur.startsWith('https://')) {
    //     _pathServeur = new URL(pathServeur)
    // } else {
    //     // eslint-disable-next-line no-restricted-globals
    //     const pathServeurUrl = new URL(self.location.href)
    //     pathServeurUrl.pathname = pathServeur
    //     _pathServeur = pathServeurUrl
    // }
}

export function up_getEtatCourant() {

    const loadedCourant = _uploadEnCours?_uploadEnCours.position:0

    const totalBytes = [..._uploadsPending, _uploadEnCours, ..._uploadsCompletes].reduce((total, item)=>{
        if(!item) return total
        return total + item.size
    }, 0)
    const loadedBytes = _uploadsCompletes.reduce((total, item)=>{
        return total + item.size
    }, loadedCourant)

    const pctTotal = Math.floor(loadedBytes * 100 / totalBytes)

    const etat = {
        uploadsPending: _uploadsPending.map(filtrerEntreeFichier),
        uploadEnCours: filtrerEntreeFichier(_uploadEnCours),
        uploadsCompletes: _uploadsCompletes.map(filtrerEntreeFichier),
        totalBytes, loadedBytes, pctTotal,
    }
    // console.debug("Retourner etat : %O", etat)
    return etat
}

function filtrerEntreeFichier(entree) {
    if(!entree) return null
    const entreeCopy = {...entree}
    delete entreeCopy.file
    delete entreeCopy.cancelTokenSource
    return entreeCopy
}

function mapAcceptedFile(file) {
    let dateFichier = null
    try {
        dateFichier = Math.floor(file.lastModified / 1000)
    } catch(err) {
        console.warn("Erreur chargement date fichier : %O", err)
    }

    // iOS utilise la forme decomposee (combining). Fix avec normalize()
    const nom = file.name.normalize()

    let mimetype = file.type
    if(!mimetype || mimetype === 'application/octet-stream') {
        // Tenter de detecter le mimetype avec l'extension
        const extension = path.extname(nom.toLocaleLowerCase()).slice(1)
        if(extension) {
            const mapExtensions = getExtMimetypeMap()
            mimetype = mapExtensions[extension]
        }
        // Set default au besoin
        if(!mimetype) mimetype = 'application/octet-stream'
    }

    const transaction = {
        nom,
        mimetype,
        taille: file.size,
        dateFichier,
    }

    const infoUpload = {
        nom,
        file: file.object,
        size: file.size,
        correlation: uuidv4(),
        transaction,
    }

    return infoUpload
}

/** Retourne un StreamReader qui applique les transformations requises */
async function preparerTransform() {
  if(_lockHachageChiffre) throw new Error("Hacheur global chiffre locked")
  try {
    _lockHachageChiffre = true
    await _hachageChiffre.reset()
    return preparerCipher({clePubliqueEd25519: _publicKeyCa, hacheur: _hachageChiffre})
  } finally {
    await _hachageChiffre.reset()
    _lockHachageChiffre = false
  }
}

async function emettreEtat(flags) {
    flags = flags || {}
    if(_callbackEtatUpload) {
        // console.debug("Emettre etat")

        // const flags = {}
        let pctFichierEnCours = 0
        if(_uploadEnCours) {
            flags.encours = _uploadEnCours.correlation
            const size = isNaN(_uploadEnCours.size)?0:_uploadEnCours.size
            const position = isNaN(_uploadEnCours.position)?0:_uploadEnCours.position
            const batchLoaded = isNaN(_uploadEnCours.batchLoaded)?0:_uploadEnCours.batchLoaded
            const courant = position + batchLoaded
            if(courant <= size) {
                pctFichierEnCours = Math.floor(courant/size*100)
            } else {
                // Erreur, on set pctFichierEnCours si disponible
                pctFichierEnCours = _uploadEnCours.pctFichierEnCours || 0
            }
        }

        _callbackEtatUpload(
            _uploadsPending.length,
            pctFichierEnCours,
            flags,
        )
    }
}

export function up_setCallbackUpload(cb) {
    _callbackEtatUpload = cb
}

export function up_setCertificatCa(certificat) {
    // _certificatCa = certificat
    const cert = pki.certificateFromPem(certificat)
    _publicKeyCa = cert.publicKey.publicKeyBytes
    hachage.hacherCertificat(cert)
        .then(fingerprint=>{
            _fingerprintCa = fingerprint
            // console.debug("Fingerprint certificat CA : %s", fingerprint)
        })
        .catch(err=>console.error("Erreur calcul fingerprint CA : %O", err))
    // console.debug("Cle CA chargee : %O, cle : %O", cert, _publicKeyCa)
}

export function up_setCertificats(certificats) {
    if( ! Array.isArray(certificats) ) {
        throw new Error(`Certificats de mauvais type (pas Array) : ${certificats}`)
    }
    // console.debug('up_setCertificats Set _certificats : ', certificats)
    _certificats = certificats
}

export function up_setDomaine(domaine) {
    _domaine = domaine
}

export function up_clearCompletes(opts) {
    opts = opts || {}
    const {status, correlation} = opts
    // console.debug(Clear completes : %O", opts)
    if(correlation) {
        const nouvelleListe = _uploadsCompletes.filter(item=>item.correlation!==correlation)
        _uploadsCompletes = nouvelleListe
    } else if(status) {
        const nouvelleListe = _uploadsCompletes.filter(item=>item.status!==status)
        _uploadsCompletes = nouvelleListe
    } else {
        _uploadsCompletes = []
    }

    emettreEtat()
}

export function up_retryErreur(opts) {
    opts = opts || {}
    const correlation = opts.correlation
    const correlationsRetry = []

    let critere = null
    if(correlation) {
        // console.debug("Retry correlation %s", correlation)
        critere = item => item.correlation === correlation
    } else {
        // Defaut, en erreur seulement (4)
        // console.debug("Filtre erreur (status 4) de %O", _uploadsCompletes)
        critere = item => {
            // console.debug("Comparer item %O", item)
            return item.status === 4
        }
    }

    _uploadsCompletes
        .filter(critere)
        .forEach(item=>{
            correlationsRetry.push(item.correlation)
            const updatedItem = {
                ...item,
                complete: false,
                status: 1, position: 0,
                batchLoaded: 0, pctBatchProgres: 0,
            }
            // console.debug("Resoumettre %O", updatedItem)
            _uploadsPending.push(updatedItem)
        })

    const completes = _uploadsCompletes.filter(item=>!correlationsRetry.includes(item.correlation))
    // console.debug("Update liste completes: %O", completes)
    _uploadsCompletes = completes
    emettreEtat()
    //traiterUploads()  // Demarrer traitement si pas deja en cours
}

/**
 * Chiffre et conserve un fichier dans IDB.
 * @param {*} file 
 * @param {*} fileMappe 
 * @param {*} params 
 * @param {*} fcts 
 * @returns 
 */
async function conserverFichier(file, fileMappe, params, fcts) {

    const tailleTotale = params.tailleTotale || file.size
    const positionFichier = params.positionFichier || -1
    const tailleCumulative = params.tailleCumulative || 0
    const { ajouterPart, setProgres, signalAnnuler } = fcts
    const { size } = fileMappe
    const { correlation } = params

    let positionOriginal = 0,
        positionChiffre = 0

    // Preparer chiffrage
    await _hachageDechiffre.reset()
    const transformInst = await preparerTransform()
    const transform = {
        transform: async chunk => {
            positionOriginal += chunk.length
            await _hachageDechiffre.update(chunk)
            return await transformInst.cipher.update(chunk)
        },
        flush: async () => {
            return await transformInst.cipher.finalize()
        },
        etatFinal: transformInst.cipher.etatFinal,
    }

    // console.debug("traiterAcceptedFiles Transform : ", transformInst)
    let intervalProgres = null
    if(setProgres) {
        intervalProgres = setInterval(()=>{
            // console.debug("intervalProgres positionOriginal %d, tailleCumulative %d", positionOriginal, tailleCumulative)
            const taillePreparee = positionOriginal + tailleCumulative
            setProgres(Math.floor(100*taillePreparee/tailleTotale), {idxFichier: positionFichier})
        }, 750)
    }

    const batchSize = getUploadBatchSize(size)

    const batchStream64k = createTransformBatch(64*1024)
    const transformStream = createTransformStreamCallback(transform)
    const batchStream = createTransformBatch(batchSize)
    const fileReadable = getAcceptedFileStream(file)

    const fr2 = fileReadable
        .pipeThrough(batchStream64k)    // Split l'input en chunks de 64kb (optimise le chiffrage).
        .pipeThrough(transformStream)   // Chiffrage
        .pipeThrough(batchStream)       // Accumule le resultat chiffre en blocks pour sauvegarder d'un coup dans IDB

    const reader = fr2.getReader()

    // Convertir reader en async iterable
    const iterReader = streamAsyncReaderIterable(reader, {batchSize, transform})

    try {
        for await (let chunk of iterReader) {
            if(signalAnnuler) if (await signalAnnuler()) {
                if(intervalProgres) clearInterval(intervalProgres)
                throw new Error("Cancelled")
            }

            // Conserver dans idb
            // console.debug("Conserver chunk position %d dans IDB", positionChiffre)
            await ajouterPart(correlation, positionChiffre, Comlink.transfer(chunk))
            // console.debug("Chunk position %d done, waiting", positionChiffre)
            positionChiffre += chunk.length
            // await new Promise(resolve => setTimeout(resolve, 2_000))  // TODO : DEBUG backpressure
        }
    } finally {
        if(intervalProgres) clearInterval(intervalProgres)
        // console.debug("Chunks done, size %d", positionChiffre)
    }

    if(size !== positionOriginal || size >= positionChiffre) {
        // Le fichier original n'a pas ete lu au complet
        console.error("conserverFichier - fichier %O incomplet. Taille lue %d", fileMappe, positionOriginal)
        throw new Error(`Erreur lecture ZIP, fichier ${fileMappe.name} incomplet`)
    }

    // console.debug("conserverFichier - fichier %O taille originale %d, chiffree %d", fileMappe, positionOriginal, positionChiffre)

    const etatFinalChiffrage = transform.etatFinal()
    etatFinalChiffrage.secretChiffre = transformInst.secretChiffre
    etatFinalChiffrage.hachage_original = await _hachageDechiffre.finalize()
    // console.debug("Etat final chiffrage : ", etatFinalChiffrage)
    return etatFinalChiffrage
}

async function formatterDocIdb(docIdb, infoChiffrage) {
    const hachage_bytes = infoChiffrage.hachage,
          secretKey = infoChiffrage.key,
          peerPublic = infoChiffrage.secretChiffre.slice(1)  // Retirer 'm' multibase

    // console.debug("formatterDocIdb docIdb %O, infoChiffrage %O", docIdb, infoChiffrage)
    // Signer avec la cle secrete pour ce domaine. Donne la reference au cleId.
    const signatureCleDomaines = new SignatureDomaines(['GrosFichiers'])
    await signatureCleDomaines.signerEd25519(peerPublic, secretKey)
    const cleId = await signatureCleDomaines.getCleRef()
    // console.debug("formatterDocIdb Nouveau cleId pour fuuid %s : %s", hachage_bytes, cleId)

    // Ajouter fuuid a la transaction GrosFichiers
    docIdb.transactionGrosfichiers.fuuid = hachage_bytes
    
    // Conserver information de dechiffrage

    // Chiffrer champs de metadonnees
    const transactionGrosfichiers = docIdb.transactionGrosfichiers

    transactionGrosfichiers.cle_id = cleId
    transactionGrosfichiers.format = infoChiffrage.format || 'mgs4'
    if(infoChiffrage.nonce) transactionGrosfichiers.nonce = infoChiffrage.nonce
    else if(infoChiffrage.header) transactionGrosfichiers.nonce = infoChiffrage.header.slice(1)  // Retirer 'm' multibase
    if(infoChiffrage.verification) transactionGrosfichiers.verification = infoChiffrage.verification

    const listeChamps = ['nom', 'dateFichier']
    const metadataDechiffre = {
        hachage_original: infoChiffrage.hachage_original,
    }
    docIdb.metadataDechiffre = metadataDechiffre
    for (const champ of listeChamps) {
        const value = transactionGrosfichiers[champ]
        if(value) metadataDechiffre[champ] = value
        delete transactionGrosfichiers[champ]
    }
    // console.debug("formatterDocIdb Champs a chiffrer ", metadataDechiffre)
    const champsChiffres = await chiffrage.updateChampsChiffres(metadataDechiffre, secretKey, cleId)
    champsChiffres.cle_id = cleId
    transactionGrosfichiers.metadata = champsChiffres

    // console.debug("Resultat chiffrage : %O", champsChiffres)
    if(_fingerprintCa && infoChiffrage.secretChiffre) {
        // Creer la commande de maitre des cles, chiffrer les cles
        const certificats = _certificats.map(item=>item[0])  // Conserver les certificats maitredescles (pas chaine)
        docIdb.transactionMaitredescles = await preparerCommandeMaitrecles(
            certificats,
            secretKey,
            signatureCleDomaines,
            {DEBUG: false}
        )
    } else {
        // Conserver la cle secrete directement (attention : le contenu du message devra etre chiffre)
        const informationCle = {
            hachage_bytes: infoChiffrage.hachage,
            format: infoChiffrage.format,
            header: infoChiffrage.header,
            cleSecrete: base64.encode(secretKey),
        }
        docIdb.cle = informationCle
    }

    docIdb.etat = ETAT_PRET
    // docIdb.taille = compteurPosition
    if(docIdb.taille !== infoChiffrage.taille) docIdb.taille_chiffree = infoChiffrage.taille

    return docIdb
}

/**
 * Chiffre et split un fichier qui a ete recu. Conserve le resultat dans IDB.
 * Demarre l'upload sauf si opts.demarrer est present et falsy.
 * @param {*} file 
 * @param {*} tailleTotale 
 * @param {*} params 
 * @param {*} fcts 
 * @returns 
 */
async function traiterFichier(file, tailleTotale, params, fcts) {
    fcts = fcts || {}
    // console.debug("traiterFichier params %O", params)
    const { signalAnnuler } = fcts
    if(signalAnnuler) {
        if(await signalAnnuler()) throw new Error("Cancelled")
    }

    const now = new Date().getTime()
    const { userId, cuuid, token } = params
    const { updateFichier } = fcts

    let demarrer = true
    if(params.demarrer !== undefined) demarrer = params.demarrer

    // Preparer fichier
    const fileMappe = mapAcceptedFile(file)
    fileMappe.transaction.cuuid = cuuid
    // console.debug("traiterFichier File mappe : ", fileMappe)
    const fileSize = fileMappe.size

    const correlation = '' + uuidv4()

    const docIdb = {
        // PK
        correlation, userId, token,

        // Metadata recue
        nom: fileMappe.nom || correlation,
        taille: fileSize, //fileMappe.size,
        mimetype: fileMappe.type || 'application/octet-stream',

        // Etat initial
        etat: ETAT_PREPARATION,
        positionsCompletees: [],
        tailleCompletee: 0,
        dateCreation: now,
        retryCount: -1,  // Incremente sur chaque debut d'upload
        transactionGrosfichiers: fileMappe.transaction,
        transactionMaitredescles: null,
    }

    // console.debug("Update initial docIdb ", docIdb)
    if(updateFichier) await updateFichier(Comlink.transfer(docIdb), {demarrer: false})

    try {
        const paramsConserver = {...params, correlation, tailleTotale}
        const etatFinalChiffrage = await conserverFichier(file, fileMappe, paramsConserver, fcts)

        const docIdbMaj = await formatterDocIdb(docIdb, etatFinalChiffrage)

        // Dispatch pour demarrer upload
        if(updateFichier) await updateFichier(Comlink.transfer(docIdbMaj), {demarrer})

        return etatFinalChiffrage
    } catch(err) {
        docIdb.etat = ETAT_ECHEC
        if(updateFichier) await updateFichier(Comlink.transfer(docIdb), {err: ''+err})
        throw err
    }


}

/**
 * Chiffre et commence l'upload de fichiers selectionnes dans le navigateur.
 *
 * Note : les fonctions (e.g. ajouterPart) ne peuvent pas etre combinees dans un Object a cause de comlink
 *
 * @param {*} params acceptedFiles, batchId, userId, cuuid,
 * @param {*} ajouterPart
 * @param {*} updateFichier
 * @param {*} setProgres
 * @param {*} signalAnnuler
 */
export async function traiterAcceptedFilesV2(params, ajouterPart, updateFichier, setProgres, signalAnnuler) {
    const { acceptedFiles } = params
    const fcts = { ajouterPart, updateFichier, setProgres, signalAnnuler }

    // console.debug("traiterAcceptedFilesV2 Accepted files ", acceptedFiles)
    const infoTaille = params.infoTaille || {}
    let tailleTotale = infoTaille.total || 0
    if(tailleTotale === 0) {
        // Calculer taille a partir de la batch
        for (const file of acceptedFiles) {
            tailleTotale += file.size
        }
    }

    const resultatChiffrage = []

    // console.debug("traiterAcceptedFilesV2 InfoTaille ", infoTaille)
    let tailleCumulative = infoTaille.positionChiffre || 0,
        positionFichier = infoTaille.positionFichier || 0
    for await (const file of acceptedFiles) {
        // console.debug("traiterAcceptedFilesV2 Traiter file ", file)
        // const debutTraiter = new Date().getTime()
        const resultat = await traiterFichier(file, tailleTotale, {...params, tailleCumulative, positionFichier}, fcts)
        resultatChiffrage.push(resultat)
        // console.debug("traiterAcceptedFilesV2 Temps traiterFichier %d ms", new Date().getTime()-debutTraiter)
        tailleCumulative += file.size
        positionFichier++
        infoTaille.positionChiffre = tailleCumulative
        infoTaille.positionFichier = positionFichier
    }
    // console.debug("Fin infoTaille ", infoTaille)

    return {chiffrage: resultatChiffrage, info: infoTaille}
}

var _cancelUploadToken = null

export function cancelUpload() {
    if(_cancelUploadToken) return _cancelUploadToken.cancel()
}

async function authenticate(workers) {
    let url = new URL(_pathServeur.href)
    url.pathname += '/authenticate';
    url.pathname = url.pathname.replaceAll('//', '/');

    let signedMessage = await workers.chiffrage.formatterMessage(
        {}, 'filehost', {kind: MESSAGE_KINDS.KIND_COMMANDE, action: 'authenticate', inclureCa: true});

    console.debug('Signed message: ', signedMessage);
    let response = await axios({
        method: 'POST',
        url: url.href,
        data: signedMessage,
    });
    console.debug("Authentication response: ", response)
}

async function onePassUploader(workers, fuuid, partContent, opts) {
    opts = opts || {}
    const onUploadProgress = opts.onUploadProgress,
    hachagePart = opts.hachagePart

    let pathUploadUrl = new URL(_pathServeur.href + '/files/' + fuuid)
    pathUploadUrl.pathname = pathUploadUrl.pathname.replaceAll('//', '/');

    // console.debug("partUploader pathUpload ", pathUploadUrl.href)
    const cancelTokenSource = axios.CancelToken.source()
    _cancelUploadToken = cancelTokenSource

    // console.debug("Cancel token source : ", cancelTokenSource)

    const headers = {
        'content-type': 'application/data',
    }
    if(hachagePart) {
        headers['x-content-hash'] = hachagePart
    }

    // console.debug("partUploader Part uploader headers ", headers)

    const reponse = await axios({
        url: pathUploadUrl.href,
        method: 'PUT',
        headers,
        data: partContent,
        onUploadProgress,
        cancelToken: cancelTokenSource.token,
      })
        .then(resultat=>{
            // console.debug("Resultat upload : ", resultat)
            return {status: resultat.status, data: resultat.data}
      })
        .catch(err=>{
            // console.error("partUploader Erreur upload : %O", err)
            const response = err.response
            // console.debug("partUploader Erreur response : %O", response)
            if(response.status === 409) return {status: response.status, data: null}  // Ok, part deja uploade avec succes. Skip
            throw err
        })
        .finally( () => _cancelUploadToken = null )

    return reponse
}

async function partUploader(workers, fuuid, position, partContent, opts) {
    opts = opts || {}
    const onUploadProgress = opts.onUploadProgress,
    hachagePart = opts.hachagePart

    let pathUploadUrl = new URL(_pathServeur.href + path.join('/files', ''+fuuid, ''+position))
    pathUploadUrl.pathname = pathUploadUrl.pathname.replaceAll('//', '/');

    // console.debug("partUploader pathUpload ", pathUploadUrl.href)
    const cancelTokenSource = axios.CancelToken.source()
    _cancelUploadToken = cancelTokenSource

    // console.debug("Cancel token source : ", cancelTokenSource)

    const headers = {
        'content-type': 'application/data',
    }
    if(hachagePart) {
        headers['x-content-hash'] = hachagePart  // 'm4OQCIPFQ/07VX/RQIGDoC1LRyicc1VBRaZEPr9DPm9qrdyDE'
    }

    // console.debug("partUploader Part uploader headers ", headers)

    const reponse = await axios({
        url: pathUploadUrl.href,
        method: 'PUT',
        headers,
        data: partContent,
        onUploadProgress,
        cancelToken: cancelTokenSource.token,
      })
        .then(resultat=>{
            // console.debug("Resultat upload : ", resultat)
            return {status: resultat.status, data: resultat.data}
      })
        .catch(async err => {
            // console.error("partUploader Erreur upload : %O", err)
            const response = err.response
            // console.debug("partUploader Erreur response : %O", response)
            if([409, 412].includes(response.status)) {
                return {status: response.status, data: null}  // Ok, part deja uploade avec succes. Skip
            }
            else if([401, 403].includes(response.status)) {
                console.debug("Not authenticated, try again");
                await authenticate(workers);
            }
            throw err
        })
        .finally( () => _cancelUploadToken = null )

    return reponse
}

export async function confirmerUpload(token, fuuid, opts) {
    opts = opts || {}
    const { transaction } = opts
    // console.debug("confirmerUpload %s cle : %O, transaction : %O", correlation, cle, transaction)

    let hachage = opts.hachage
    if(!hachage) {
        if(transaction) {
            const contenu = JSON.parse(transaction.contenu)
            hachage = contenu.fuuid
        }
    }
    if(!hachage) throw new Error("Hachage fichier manquant")

    const confirmationResultat = { etat: {hachage} }
    if(transaction) confirmationResultat.transaction = transaction
    // if(cle) confirmationResultat.cle = cle
    let pathConfirmation = new URL(_pathServeur.href + path.join('/files', fuuid))
    pathConfirmation.pathname = pathConfirmation.pathname.replaceAll('//', '/');

    try {
        const reponse = await axios({
            method: 'POST',
            url: pathConfirmation.href,
            data: confirmationResultat,
            timeout: 30_000,
        })
        if(reponse.data.ok === false) {
            const data = reponse.data
            console.error("Erreur verification fichier : %O", data)
            const err = new Error("Erreur upload fichier : %s", data.err)
            err.reponse = data
            throw err
        }

        return {
            status: reponse.status,
            reponse: reponse.data
        }
    } catch(err) {
        if(err.code) {
            return { errcode: err.code, err: ''+err }
        }
        const response = err.response
        if(response) {
            const { status, data } = response
            return {
                status,
                reponse: data
            }
        } else {
            throw err
        }
    }
}

export async function supprimerUpload(token, fuuid) {
    const pathConfirmation = _pathServeur.href + path.join('/' + fuuid)

    let response
    try {
        response = await axios({
            method: 'DELETE',
            url: pathConfirmation,
        })
    } catch(err) {
        response = err.response
    }

    return { status: response.status, data: response.data }
}

/** Upload un fichier conserve dans IDB avec uploadFichiersDao */
export async function uploadFichier(workers, marquerUploadEtat, fichier, cancelToken) {
    console.debug("uploadFichier : ", fichier)
    const { uploadFichiersDao, transfertUploadFichiers, chiffrage } = workers
    const { correlation, token, transactionGrosfichiers } = fichier
    let fuuid = transactionGrosfichiers.fuuid;

    // Charger la liste des parts a uploader
    let parts = await uploadFichiersDao.getPartsFichier(correlation)
    
    // Retirer les partis qui sont deja uploadees
    let tailleCompletee = 0,
        positionsCompletees = fichier.positionsCompletees,
        retryCount = fichier.retryCount

    // Mettre a jour le retryCount
    retryCount++
    await marquerUploadEtat(correlation, {retryCount})

    const progressFichier  = state => {
        // const {loaded, total, progress, bytes, estimated, rate, upload} = state
        const {loaded, rate} = state
        // console.debug("Progress fichier : ", state)
        const positionCourante = tailleCompletee + loaded
        marquerUploadEtat(correlation, {tailleCompletee: positionCourante, rate})
            .catch(err=>console.warn("uploadFichier.progressFichier Erreur maj etat upload : ", err))
    }

    // Re-authenticate to ensure the filehost is available. This updates the cookie.
    await authenticate(workers);

    // Access to the filehost works, emit the transaction/key immediately so that the file shows up in the list.
    // Also, the FileControler emits the newFuuid event as soon as the file is done. This event must
    // be received by GrosFichiers after the file entry is created.
    let cle = await chiffrage.formatterMessage(
        fichier.transactionMaitredescles, 'MaitreDesCles', 
        {kind: MESSAGE_KINDS.KIND_COMMANDE, action: 'ajouterCleDomaines', DEBUG: false}
    );
    let reponse = await workers.connexion.creerFichier(fichier.transactionGrosfichiers, cle);
    if(reponse.ok !== true) {
        if(reponse.code === 409) {
            // Ok, file entry already created. Continue
        } else {
            throw new Error("uploadFichier Error upload: " + reponse.err);
        }
    }

    if(parts.length === 1) {
        console.debug("uploadFichier Using one-shot uploader");
        let part = parts[0];
        const opts = {
            hachagePart: part.hachagePart,
            onUploadProgress: progressFichier,
        };
        await onePassUploader(workers, fuuid, part.data, opts);
        return;
    } else {
        for await (const part of parts) {
            let tailleCumulative = tailleCompletee
            const position = part.position,
                partContent = part.data
            await marquerUploadEtat(correlation, {tailleCompletee: tailleCumulative});
            
            const opts = {
                hachagePart: part.hachagePart,
                onUploadProgress: progressFichier,
            }
            // console.debug("uploadFichier Debut upload %s", correlation)
            await partUploader(workers, fuuid, position, partContent, opts)
            // console.debug("uploadFichier Resultat upload %s (cancelled? %O) : %O", correlation, cancelToken, resultatUpload)

            if(cancelToken && cancelToken.cancelled) {
                console.warn("Upload cancelled")
                return
            }

            tailleCompletee += part.taille
            positionsCompletees = [...positionsCompletees, position]
            await marquerUploadEtat(correlation, {tailleCompletee, positionsCompletees})
        }
    }

    // console.debug("Confirmer upload de transactions signees : %O", transaction)
    try {
        const reponseUpload = await transfertUploadFichiers.confirmerUpload(token, fuuid, {hachage: fuuid})
        if(reponseUpload.errcode === 'ECONNABORTED') {
            console.warn("uploadFichier Connexion aborted (%s) - marquer complete quand meme", reponseUpload.err)
        } else if(reponseUpload.err) {
            throw reponseUpload.err
        } else if(reponseUpload.status === 404) {
            // L'upload a ete resette (DELETE ou supprime par serveur)
            // Tenter de recommencer l'upload (resetter localement)
            await marquerUploadEtat(correlation, {etat: ETAT_PRET, tailleCompletee: 0, positionsCompletees: []})
            throw new Error(`Erreur upload status : ${reponseUpload.status}`)
        } else if( ! [200, 202].includes(reponseUpload.status)) {
            console.error("Erreur confirmation upload : ", reponseUpload)
            await marquerUploadEtat(correlation, {etat: ETAT_ECHEC, status: reponseUpload.status})

            // Reessayer
            await transfertUploadFichiers.confirmerUpload(token, correlation, {hachage: fuuid})

            throw new Error(`Erreur upload status : ${reponseUpload.status}`)
        }
        // console.debug("uploadFichier Upload confirme")

    } catch(err) {
        console.error("uploadFichier Erreur non geree durant POST ", err)
        throw err
    }
}

export async function parseZipFile(workers, userId, fichier, cuuid, updateFichier, ajouterPart) {
    const zipFileReader = new BlobReader(fichier)
    const zipReader = new ZipReader(zipFileReader)

    const ETAT_PREPARATION = 1

    const mapExtensions = getExtMimetypeMap()
    // console.debug("Map extensions : ", mapExtensions)

    const setProgres = null
    const signalAnnuler = null

    const certificatsMaitredescles = await workers.clesDao.getCertificatsMaitredescles()
    up_setCertificats(certificatsMaitredescles)

    const dictRepertoires = {[cuuid]: {tuuid: cuuid, nom: '.', liste: []}}

    // Charger tous les sous-repertoires existants a partir de la destination
    const reponseSousRepertoires = await workers.connexion.getSousRepertoires(cuuid)
    // console.debug("Sous repertoires de %s : %O", cuuid, reponseSousRepertoires)
    const cuuidsRepertoires = reponseSousRepertoires.liste.map(item=>item.tuuid)
    const repertoiresInconnus = new Set(cuuidsRepertoires)
    let repertoiresDechiffres = await workers.collectionsDao.getParTuuids(cuuidsRepertoires)
    repertoiresDechiffres = repertoiresDechiffres.filter(item=>!!item)  // Retirer reps inconnus
    repertoiresDechiffres.forEach(item=>{
        if(item) repertoiresInconnus.delete(item.tuuid)
    })

    // console.debug("Repertoires dechiffres : %O, inconnus : %O", repertoiresDechiffres, repertoiresInconnus)

    if(repertoiresInconnus.size > 0) {
        const repInconnusListe = []
        for(const rep of repertoiresInconnus) {
            repInconnusListe.push(rep)  // Creer array
        }
        const listeRepsDechiffres = await getDocuments(workers, repInconnusListe)
        // console.debug("Reponse repertoires inconnus : ", listeRepsDechiffres)
        for await (const rep of listeRepsDechiffres) {
            repertoiresDechiffres.push(rep)
            rep.user_id = userId
            await workers.collectionsDao.updateDocument(rep, {dechiffre: true})
            dictRepertoires[rep.tuuid] = {tuuid: rep.tuuid, nom: rep.nom, liste: []}
        }
        // const reponse = await workers.connexion.getDocuments(repInconnusListe)
        // throw new Error('todo - dechiffrer repertoires')
    }

    for(const rep of repertoiresDechiffres) {
        dictRepertoires[rep.tuuid] = {tuuid: rep.tuuid, nom: rep.nom, liste: []}
    }
    for(const rep of repertoiresDechiffres) {
        const repNode = dictRepertoires[rep.tuuid]
        const parent = dictRepertoires[rep.path_cuuids[0]]
        parent.liste.push(repNode)
    }

    // console.debug("Hierarchie repertoires : ", dictRepertoires[cuuid])

    mapperRepertoireRecursivement(dictRepertoires, '', dictRepertoires[cuuid])
    const mappingRepertoires = Object.values(dictRepertoires).reduce((acc, item)=>{
        acc[item.path] = item.tuuid
        return acc
    }, {})

    // // console.debug("Repertoires connus : ", mappingRepertoires)

    for await (const entry of zipReader.getEntriesGenerator()) {
        // console.debug("Zip entry : ", entry)

        const filename = entry.filename.normalize()

        const dirName = path.dirname(filename)
        const nom = path.basename(filename)
        // console.debug("Repertoire : %s, nom fichier : %s", dirName, nom)

        if(entry.directory) {
            const parentCuuid = dirName==='.'?cuuid:mappingRepertoires['./' + dirName]
            if(!parentCuuid) {
                console.warn("Erreur repertoire parent inconnu, liste connus : ", mappingRepertoires)
                throw new Error(`Repertoire parent ${dirName} inconnu`)
            }

            let dirNameMappe = dirName + '/' + nom
            if(!dirName.startsWith('.')) dirNameMappe = './' + dirNameMappe
            // console.debug("Mapper repertoire ", dirNameMappe)
            let repertoire = mappingRepertoires[dirNameMappe]
            if(!repertoire) {
                // console.debug("Creer le repertoire %s sous parent cuuid %s", nom, parentCuuid)

                const metadataDechiffre = {nom}
                const certificatsChiffrage = await workers.connexion.getCertificatsMaitredescles()
                const {doc: metadataChiffre, commandeMaitrecles} = await workers.chiffrage.chiffrerChampsV2(
                    metadataDechiffre, 'GrosFichiers', certificatsChiffrage, {DEBUG: false})
                // console.debug("creerCollection metadataChiffre %O, commande Maitre des cles : %O", metadataChiffre, commandeMaitrecles)

                const opts = { cuuid: parentCuuid }
                const reponseCreation = await workers.connexion.creerCollection(metadataChiffre, commandeMaitrecles, opts)
                // console.debug("Reponse creation repertoire ", reponseCreation)
                if(reponseCreation.ok !== true) {
                    throw new Error(`Erreur creation repertoire ${dirNameMappe} : ${reponseCreation.err}`)
                }
                const cuuidCree = reponseCreation.tuuid
                repertoire = {tuuid: cuuidCree, nom, liste: []}
                dictRepertoires[cuuidCree] = repertoire
                dictRepertoires[parentCuuid].liste.push(repertoire)
                mappingRepertoires[dirNameMappe] = cuuidCree
            }
        } else {

            const extension = path.extname(nom.toLocaleLowerCase()).slice(1)
            const mimetype = mapExtensions[extension] || 'application/octet-stream'
            // console.debug("Trouver mimetype avec extension '%s' : %O", extension, mimetype)

            // Mapper fichier
            let dateFichier = null
            try {
                dateFichier = Math.floor(entry.lastModDate.getTime() / 1000)
            } catch(err) {
                console.warn("Erreur chargement date fichier : %O", err)
            }

            const transaction = {
                nom,  // iOS utilise la forme decomposee (combining)
                mimetype,
                taille: entry.uncompressedSize,
                dateFichier,
            }

            const fileMappe = {
                nom,
                // file: file.object,
                size: entry.uncompressedSize,
                correlation: uuidv4(),
                transaction,
            }

            let cuuidRepertoire = dirName==='.'?cuuid:mappingRepertoires['./' + dirName]
            if(cuuidRepertoire) {
                fileMappe.transaction.cuuid = cuuidRepertoire
            } else {
                throw new Error(`Le repertoire ${dirName} n'est pas mappe`)
            }
            // console.debug("dirname %s mappe au cuuid %s", dirName, cuuidRepertoire)
            // console.debug("traiterFichier File mappe : ", fileMappe)
            const fileSize = fileMappe.size

            const correlation = '' + uuidv4()

            const dateCreation = Math.floor(new Date().getTime() / 1000)

            const docIdb = {
                // PK
                correlation, userId, //token,

                // Metadata recue
                nom: fileMappe.nom || correlation,
                taille: fileSize, //fileMappe.size,
                mimetype,

                // Etat initial
                etat: ETAT_PREPARATION,
                positionsCompletees: [],
                tailleCompletee: 0,
                dateCreation,
                retryCount: -1,  // Incremente sur chaque debut d'upload
                transactionGrosfichiers: fileMappe.transaction,
                transactionMaitredescles: null,
            }

            // console.debug("Fichier mappe ", docIdb)

            await updateFichier(Comlink.transfer(docIdb), {demarrer: false})
            const zipFileStream = new TransformStream()
            entry.getData(zipFileStream.writable)

            const fileStream = { readable: zipFileStream.readable }
            // console.debug("Filestream readable : ", fileStream)

            const paramsConserver = {correlation, tailleTotale: fileSize}

            try {
                const etatFinalChiffrage = await conserverFichier(
                    fileStream, fileMappe, paramsConserver, {ajouterPart, setProgres, signalAnnuler})

                // Dispatch pour demarrer upload
                const docIdbMaj = await formatterDocIdb(docIdb, etatFinalChiffrage)
                // console.debug("parseZipFile Fichier pret a uploader : ", docIdbMaj)
                if(updateFichier) await updateFichier(Comlink.transfer(docIdbMaj), {demarrer: true})
            } catch(err) {
                console.error("parseZipFile Erreur conserverFichier ", err)
            }
        }
    }
}

function mapperRepertoireRecursivement(dictRepertoires, pathParent, nodeCourant) {
    // console.debug("mapperRepertoireRecursivement pathParent : %s, nodeCourant : %O", pathParent, nodeCourant)
    const liste = nodeCourant.liste
    const pathCourant = pathParent?pathParent + '/' + nodeCourant.nom:nodeCourant.nom
    dictRepertoires[nodeCourant.tuuid].path = pathCourant
    for(const rep of liste) {
        mapperRepertoireRecursivement(dictRepertoires, pathCourant, rep)
    }
}

export async function getDocuments(workers, tuuids) {
    const { connexion, chiffrage, clesDao } = workers
    const chiffrageUtils = chiffrage.chiffrage
    // console.debug("getDocuments Charger documents ", tuuids)
    const reponseFichiers = await connexion.getDocuments(tuuids)
    // console.debug("getDocuments Resultat chargement fichiers : ", reponseFichiers)
    const fichiers = reponseFichiers.fichiers

    const ref_hachage_bytes = fichiers.map(item=>item.metadata.ref_hachage_bytes)
    // console.debug("getDocuments Charger cles documents : %O", ref_hachage_bytes)
    const cles = await clesDao.getCles(ref_hachage_bytes)

    const resultat = []
    for await (const fichier of fichiers) {
        // console.debug("getDocuments Recu fichier %O", fichier)

        // const version_courante = fichier.version_courante
        const metadataChiffre = fichier.metadata
        const ref_hachage_bytes = metadataChiffre.ref_hachage_bytes

        // Recuperer cle
        const cle = cles[ref_hachage_bytes]

        // Dechiffrer metadata
        const metaDechiffree = await chiffrageUtils.dechiffrerChampsChiffres(metadataChiffre, cle)
        // console.debug("metadata dechiffre : %O", metaDechiffree)

        const contenu = {...fichier, ...metaDechiffree}
        // console.debug("Contenu fichier dechiffre : %O", contenu)
        resultat.push(contenu)
    }

    return resultat
}
