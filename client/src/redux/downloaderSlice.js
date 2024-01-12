import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'
// import path from 'path'
import { releaseProxy, proxy } from 'comlink'
// import { makeZip } from 'client-zip'

import {ETAT_PRET, ETAT_COMPLETE, ETAT_DOWNLOAD_ENCOURS, ETAT_DOWNLOAD_SUCCES_CHIFFRE, ETAT_DOWNLOAD_SUCCES_DECHIFFRE, ETAT_ECHEC} from '../transferts/constantes'

import * as CONST_TRANSFERT from '../transferts/constantes'

const SLICE_NAME = 'downloader'
      
const initialState = {
    liste: [],                  // Liste de fichiers en traitement (tous etats confondus)
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
    progres: null,              // Pourcentage de progres en int
    completesCycle: [],         // Conserve la liste des uploads completes qui restent dans le total de progres
    enCours: false,             // True si download en cours
}

// Actions

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function setDownloadsAction(state, action) {
    // Merge listes
    const listeDownloads = action.payload
    const listeExistanteMappee = state.liste.reduce((acc, item)=>{
        acc[item.fuuid] = item
        return acc
    }, {})

    // Retirer les uploads connus
    const nouvelleListe = listeDownloads.filter(item=>!listeExistanteMappee[item.fuuid])
    
    // Push les items manquants a la fin de la liste
    nouvelleListe.forEach(item=>state.liste.push(item))
    
    const { pourcentage } = calculerPourcentage(state.liste, [])

    state.liste.sort(sortDateCreation)
    state.completesCycle = []
    state.progres = pourcentage
}

function pushDownloadAction(state, action) {
    const docDownload = action.payload

    // console.debug("pushDownloadAction payload : ", docDownload)
    state.liste.push(docDownload)

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function pushGenererZipAction(state, action) {
    const infoGenererZip = action.payload
    console.debug("pushGenererZipAction payload : ", infoGenererZip)

    infoGenererZip.etat = ETAT_PRET
    infoGenererZip.dateCreation = new Date().getTime()

    state.liste.push(infoGenererZip)
}

function updateDownloadAction(state, action) {
    const docDownload = action.payload
    const fuuid = docDownload.fuuid

    // Trouver objet existant
    const infoDownload = state.liste.filter(item=>item.fuuid === fuuid).pop()

    // Detecter changement etat a succes
    if([ETAT_DOWNLOAD_SUCCES_CHIFFRE, ETAT_DOWNLOAD_SUCCES_DECHIFFRE].includes(docDownload.etat)) {
        state.completesCycle.push(fuuid)
    }

    if(!infoDownload) state.liste.push(docDownload)    // Append
    else Object.assign(infoDownload, docDownload)       // Merge

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function continuerDownloadAction(state, action) {
    const docDownload = action.payload
    
    // docDownload peut etre null si on fait juste redemarrer le middleware
    if(docDownload) {
        const fuuid = docDownload.fuuid

        // Trouver objet existant
        const infoDownload = state.liste.filter(item=>item.fuuid === fuuid).pop()

        console.debug("continuerDownloadAction ", docDownload)

        if(!infoDownload) state.liste.push(docDownload)    // Append
        else Object.assign(infoDownload, docDownload)       // Merge

        const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
        state.progres = pourcentage
    }
}

function retirerDownloadAction(state, action) {
    const fuuid = action.payload
    state.liste = state.liste.filter(item=>item.fuuid !== fuuid)

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function clearDownloadsAction(state, action) {
    state.liste = []
    state.progres = null
}

function supprimerDownloadAction(state, action) {
    const fuuid = action.payload
    state.liste = state.liste.filter(item=>item.fuuid !== fuuid)
}

function arretDownloadAction(state, action) {
    // Middleware trigger seulement
}

function clearCycleDownloadAction(state, action) {
    state.completesCycle = []
}

function setEnCoursAction(state, action) {
    state.enCours = action.payload
}

const downloaderSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        setDownloads: setDownloadsAction,
        pushDownload: pushDownloadAction,
        continuerDownload: continuerDownloadAction,
        retirerDownload: retirerDownloadAction,
        clearDownloads: clearDownloadsAction,
        supprimerDownload: supprimerDownloadAction,
        arretDownload: arretDownloadAction,
        clearCycleDownload: clearCycleDownloadAction,
        updateDownload: updateDownloadAction,
        pushGenererZip: pushGenererZipAction,
        setEnCours: setEnCoursAction, 
    }
})

export const { 
    setUserId, setDownloads, 
    pushDownload, continuerDownload, retirerDownload, arretDownload,
    clearDownloads, clearCycleDownload,
    updateDownload, supprimerDownload,
    pushGenererZip, setEnCours,
} = downloaderSlice.actions
export default downloaderSlice.reducer

// Thunks

export function ajouterDownload(workers, docDownload) {
    return (dispatch, getState) => traiterAjouterDownload(workers, docDownload, dispatch, getState)
}

async function traiterAjouterDownload(workers, docDownload, dispatch, getState) {
    const { downloadFichiersDao, clesDao } = workers
    
    // console.debug("traiterAjouterDownload payload : ", docDownload)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    const version_courante = docDownload.version_courante || {}
    const fuuid = docDownload.fuuidDownload || docDownload.fuuid || version_courante.fuuid
    const fuuidCle = version_courante.fuuid || fuuid
    const taille = version_courante.taille

    // Verifier s'il y a assez d'espace pour downloader le fichier
    // if('storage' in navigator) {
    //     const estimate = await navigator.storage.estimate()
    //     console.debug("traiterAjouterDownload storage estimate ", estimate)
    //     const quota = estimate.quota
    //     if(quota && quota < taille) {
    //         const error = new Error(
    //             `Espace disponible dans le navigateur insuffisant : 
    //             requis ${Math.floor(taille/CONST_1MB)} MB, 
    //             disponible ${quota/CONST_1MB} MB`
    //         )
    //         error.code = 1
    //         error.tailleTotale = taille
    //         error.tailleDisponible = quota
    //         throw error
    //     }
    // }

    const infoDownload = getState()[SLICE_NAME].liste.filter(item=>item.fuuid === fuuid).pop()
    // console.debug("ajouterDownloadAction fuuid %s info existante %O", fuuid, infoDownload)
    if(!infoDownload) {
        // Ajouter l'upload, un middleware va charger le reste de l'information
        // console.debug("Ajout upload %O", correlation)

        // Fetch pour cache (ne pas stocker dans redux)
        await clesDao.getCles([fuuidCle])

        const nouveauDownload = {
            ...docDownload,
            fuuid,
            fuuidCle,
            taille,
            userId,
            etat: ETAT_PRET,
            dateCreation: new Date().getTime(),
        }

        // Conserver le nouveau download dans IDB
        await downloadFichiersDao.updateFichierDownload(nouveauDownload)

        dispatch(pushDownload(nouveauDownload))
    } else {
        throw new Error(`Download ${fuuid} existe deja`)
    }    
}

/** Creer un nouveau download de repertoire par cuuid. Genere un fichier ZIP. */
export function ajouterZipDownload(workers, cuuid) {
    return (dispatch, getState) => traiterAjouterZipDownload(workers, cuuid, dispatch, getState)
}

async function traiterAjouterZipDownload(workers, params, dispatch, getState) {
    const { connexion, chiffrage, downloadFichiersDao, clesDao } = workers
    let { cuuid, selection, contactId } = params
    
    console.debug("traiterAjouterZipDownload cuuid : %s, selection : %O (contactId: %s)", cuuid, selection, contactId)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    // Charger statistiques cuuid, liste de fichiers/dossiers
    if(cuuid === '') cuuid = null
    const reponseStructure = await connexion.getStructureRepertoire(cuuid, contactId)
    console.debug("Reponse structure : ", reponseStructure)
    if(reponseStructure.ok === false) {
        throw new Error("Erreur preparation ZIP : ", reponseStructure.err)
    }

    // Batir la hierarchie du repertoire
    let tailleTotale = 0
    const nodeParTuuid = {}, nodeParCuuidParent = {}, root = [], fuuidsCles = []
    reponseStructure.liste.forEach(item=>{
        nodeParTuuid[item.tuuid] = item

        // Ajouter flag noSave=true pour le processus de download. Evite pop-up de sauvegarde.
        item.noSave = true

        if(item.versions) {
            // Extraire version courante (idx: 0)
            const version = item.versions[0]
            item.version_courante = version
            if(version) tailleTotale += version.taille
            // if(version) {
            //     item.taille = version.taille
            // }
        }

        if(item.fuuids_versions) {
            const fuuid = item.fuuids_versions[0]
            item.fuuid = fuuid  // Set pour download
            fuuidsCles.push(fuuid)
        } else if(item.metadata.ref_hachage_bytes) {
            fuuidsCles.push(item.metadata.ref_hachage_bytes)
        }

        if(item.path_cuuids && item.path_cuuids[0] !== cuuid) {
            const cuuidParent = item.path_cuuids[0]
            let nodes = nodeParCuuidParent[cuuidParent]
            if(!nodes) {
                nodes = []
                nodeParCuuidParent[cuuidParent] = nodes
            }
            nodes.push(item)
        } else {
            // Ajouter sous-repertoire (si ce n'est pas le repertoire de base)
            if(item.tuuid !== cuuid) root.push(item)
        }
    })
    console.debug("traiterAjouterZipDownload Taille totale : %s, nodeParTuuid : %O, nodeParCuuidParent : %O, root: %O, fuuidsCles: %O", 
        tailleTotale, nodeParTuuid, nodeParCuuidParent, root, fuuidsCles)

    // Verifier s'il y a assez d'espace pour tout downloader et generer le ZIP
    // if('storage' in navigator) {
    //     const estimate = await navigator.storage.estimate()
    //     console.debug("traiterAjouterZipDownload storage estimate ", estimate)
    //     const quota = estimate.quota
    //     if(quota && quota < 2*tailleTotale) {
    //         const error = new Error(
    //             `Espace disponible dans le navigateur insuffisant : 
    //             requis ${Math.floor(2*tailleTotale/CONST_1MB)} MB, 
    //             disponible ${quota/CONST_1MB} MB`
    //         )
    //         error.code = 1
    //         error.tailleTotale = tailleTotale
    //         error.tailleDisponible = quota
    //         throw error
    //     }
    // }

    for (const cuuidLoop of Object.keys(nodeParCuuidParent)) {
        const nodes = nodeParCuuidParent[cuuidLoop]
        const parent = nodeParTuuid[cuuidLoop]
        // console.debug("Wiring sous cuuid parent %s (%O) nodes %O", cuuidLoop, parent, nodes)
        if(parent) {
            parent.nodes = nodes
        } else {
            console.warn("Aucun lien pour parent %s pour %O, fichiers ignores", cuuidLoop, nodes)
            // Retirer le download des tuuids 
            nodes.forEach(item=>{
                if(item.tuuid !== cuuid) {
                    delete nodeParTuuid[item.tuuid]
                }
            })
        }
    }

    const fichiersADownloader = Object.values(nodeParTuuid).filter(item=>item.type_node === 'Fichier')

    console.debug("Arborescence completee : %O\nDownload %d fichiers\n%O", root, fichiersADownloader.length, fichiersADownloader)

    // Preparer toutes les cles (tous les tuuids incluant repertoires)
    const cles = await clesDao.getCles(fuuidsCles, {partage: !!contactId})
    console.debug("Cles chargees : ", cles)

    // Dechiffrer le contenu des tuuids. On a besoin du nom (fichiers et repertoires)
    for await(const tuuid of Object.keys(nodeParTuuid)) {
        const item = nodeParTuuid[tuuid]
        const metadata = item.metadata
        let fuuid = metadata.ref_hachage_bytes
        if(item.fuuids_versions) fuuid = item.fuuids_versions[0]
        if(!fuuid) {
            console.warn("Aucun fuuid pour %s - SKIP", tuuid)
            continue
        }

        const cle = cles[fuuid]
        if(!cle) {
            console.warn("Aucune cle pour fuuid %s - SKIP", fuuid)
        }

        console.debug("Dechiffrer %O avec cle %O", metadata, cle)
        const metaDechiffree = await chiffrage.chiffrage.dechiffrerChampsChiffres(metadata, cle)
        console.debug("Contenu dechiffre : ", metaDechiffree)
        // Ajout/override champs de metadonne avec contenu dechiffre
        Object.assign(item, metaDechiffree)
    }

    // console.debug("Contenu fichier ZIP : ", root)

    // Ajouter tous les fichiers a downloader dans la Q de downloader et demarrer
    for await(const tuuid of Object.keys(nodeParTuuid)) {
        const item = nodeParTuuid[tuuid]
        if(item.fuuids_versions) {
            // console.warn("SKIP download - TO DO fix me")
            try {
                await dispatch(ajouterDownload(workers, item))
            } catch(err) {
                console.warn("Erreur ajout fuuid %s dans downloads - on assume qu'il existe deja : %O", item.fuuid, err)
            }
        }
    }

    const nodeRoot = nodeParTuuid[cuuid] || {}
    nodeRoot.nodes = root

    console.debug("traiterAjouterZipDownload nodeParTuuid : %O, nodeRoot : ", nodeParTuuid, nodeRoot)

    // Creer un fuuid artificiel pour supporter la meme structure que le download de fichiers
    let fuuidZip = 'zip/root'
    if(cuuid) {
        fuuidZip = 'zip/' + cuuid
    }

    let nomArchive = 'millegrilles.zip'
    if(nodeRoot.nom) nomArchive = nodeRoot.nom + '.zip'

    const docGenererZip = {
        fuuid: fuuidZip,
        cuuid,
        userId,
        root: nodeRoot,
        genererZip: true,
        nom: nomArchive,
        mimetype: 'application/zip',
    }

    // Conserver le nouveau download dans IDB
    console.debug("Doc generer zip : %O", docGenererZip)
    await downloadFichiersDao.updateFichierDownload(docGenererZip)
    // Inserer dans la Q de traitement
    dispatch(pushGenererZip(docGenererZip))
}

export function arreterDownload(workers, fuuid) {
    return (dispatch, getState) => traiterArreterDownload(workers, fuuid, dispatch, getState)
}

async function traiterArreterDownload(workers, fuuid, dispatch, getState) {
    // console.debug("traiterCompleterDownload ", fuuid)
    const { downloadFichiersDao, transfertDownloadFichiers } = workers
    const state = getState()[SLICE_NAME]
    const download = state.liste.filter(item=>item.fuuid===fuuid).pop()
    if(download) {
        // Arreter et retirer download state (interrompt le middleware au besoin)
        dispatch(supprimerDownload(fuuid))

        await transfertDownloadFichiers.down_supprimerDownloadsCache(fuuid)

        // Supprimer le download dans IDB, cache
        await downloadFichiersDao.supprimerDownload(fuuid)
    }
}

export function completerDownload(workers, fuuid) {
    return (dispatch, getState) => traiterCompleterDownload(workers, fuuid, dispatch, getState)
}

async function traiterCompleterDownload(workers, fuuid, dispatch, getState) {
    // console.debug("traiterCompleterDownload ", fuuid)
    const { downloadFichiersDao, traitementFichiers } = workers
    const state = getState()[SLICE_NAME]
    const download = state.liste.filter(item=>item.fuuid===fuuid).pop()
    if(download) {
        // console.debug('traiterCompleterDownload ', download)

        const downloadCopie = {...download}
        downloadCopie.etat = ETAT_COMPLETE
        downloadCopie.dateConfirmation = new Date().getTime()
        downloadCopie.tailleCompletee = downloadCopie.taille

        // Maj contenu download
        await downloadFichiersDao.updateFichierDownload(downloadCopie)

        // Maj redux state
        dispatch(updateDownload(downloadCopie))

        const noSave = downloadCopie.noSave || false

        if(!noSave) {
            try {
                // Prompt sauvegarder
                const fuuid = download.fuuid,
                      filename = download.nom
                await traitementFichiers.downloadCache(fuuid, {filename})
            } catch(err) {
                console.warn("Erreur prompt pour sauvegarder fichier downloade ", err)
            }
        } else {
            console.debug("Skip prompt sauvegarde %O", download)
        }
    }
}

export function supprimerDownloadsParEtat(workers, etat) {
    return (dispatch, getState) => traiterSupprimerDownloadsParEtat(workers, etat, dispatch, getState)
}

async function traiterSupprimerDownloadsParEtat(workers, etat, dispatch, getState) {
    const { downloadFichiersDao, transfertDownloadFichiers } = workers
    const downloads = getState()[SLICE_NAME].liste.filter(item=>item.etat === etat)
    for await (const download of downloads) {
        const fuuid = download.fuuid

        // Arreter et retirer download state (interrompt le middleware au besoin)
        dispatch(supprimerDownload(fuuid))

        await transfertDownloadFichiers.down_supprimerDownloadsCache(fuuid)

        // Supprimer le download dans IDB, cache
        await downloadFichiersDao.supprimerDownload(fuuid)
    }
}

// Middleware
export function downloaderMiddlewareSetup(workers) {
    const uploaderMiddleware = createListenerMiddleware()
    
    uploaderMiddleware.startListening({
        matcher: isAnyOf(ajouterDownload, pushGenererZip, setDownloads, continuerDownload),
        effect: (action, listenerApi) => downloaderMiddlewareListener(workers, action, listenerApi)
    }) 
    
    return uploaderMiddleware
}

async function downloaderMiddlewareListener(workers, action, listenerApi) {
    // console.debug("downloaderMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)

    await listenerApi.unsubscribe()
    listenerApi.dispatch(setEnCours(true))
    try {
        // Reset liste de fichiers completes utilises pour calculer pourcentage upload
        listenerApi.dispatch(clearCycleDownload())

        const task = listenerApi.fork( forkApi => tacheDownload(workers, listenerApi, forkApi) )
        const stopAction = listenerApi.condition(arretDownload.match)
        await Promise.race([task.result, stopAction])

        // console.debug("downloaderMiddlewareListener Task %O\nstopAction %O", task, stopAction)
        task.result.catch(err=>console.error("Erreur task : %O", err))

        await task.result  // Attendre fin de la tache en cas d'annulation
    } finally {
        listenerApi.dispatch(setEnCours(false))
        await listenerApi.subscribe()
    }
}

async function tacheDownload(workers, listenerApi, forkApi) {
    // console.debug("Fork api : %O", forkApi)
    const dispatch = listenerApi.dispatch

    let nextDownload = getProchainDownload(listenerApi.getState()[SLICE_NAME].liste)

    const cancelToken = {cancelled: false}
    const aborted = event => {
        // console.debug("Aborted ", event)
        cancelToken.cancelled = true
    }
    forkApi.signal.onabort = aborted

    if(!nextDownload) return  // Rien a faire

    // Commencer boucle d'upload
    while(nextDownload) {
        // console.debug("Next download : %O", nextDownload)
        const fuuid = nextDownload.fuuid
        try {
            if(nextDownload.genererZip === true) {
                // Generer un fichier zip
                await genererFichierZip(workers, dispatch, nextDownload, cancelToken)
            } else {
                await downloadFichier(workers, dispatch, nextDownload, cancelToken)
            }
        } catch (err) {
            console.error("Erreur tache download fuuid %s: %O", fuuid, err)
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: CONST_TRANSFERT.ETAT_ECHEC})
                .catch(err=>console.error("Erreur marquer download echec %s : %O", fuuid, err))
            throw err
        }

        // Trouver prochain download
        if (forkApi.signal.aborted) {
            // console.debug("tacheUpload annulee")
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: CONST_TRANSFERT.ETAT_ECHEC})
                .catch(err=>console.error("Erreur marquer download echec %s : %O", fuuid, err))
            return
        }
        nextDownload = getProchainDownload(listenerApi.getState()[SLICE_NAME].liste)
    }
}

async function genererFichierZip(workers, dispatch, downloadInfo, cancelToken) {
    const transfertDownloadFichiers = workers.transfertDownloadFichiers
    const fuuidZip = downloadInfo.fuuid,
          userId = downloadInfo.userId
    await transfertDownloadFichiers.genererFichierZip(workers, downloadInfo, cancelToken)    
    // console.debug("Marquer download %s comme pret / complete", fuuidZip)
    await marquerDownloadEtat(workers, dispatch, fuuidZip, {etat: ETAT_COMPLETE, userId})
    await dispatch(completerDownload(workers, fuuidZip))
        .catch(err=>console.error("Erreur cleanup download fichier zip ", err))
}

async function downloadFichier(workers, dispatch, fichier, cancelToken) {
    console.debug("Download fichier params : ", fichier)
    const { transfertDownloadFichiers, downloadFichiersDao, clesDao } = workers
    const fuuid = fichier.fuuid,
          fuuidCle = fichier.fuuidCle || fichier.fuuid,
          infoDechiffrage = fichier.infoDechiffrage || {}

    const cles = await clesDao.getCles([fuuidCle])  // Fetch pour cache (ne pas stocker dans redux)
    const valueCles = Object.values(cles).pop()
    Object.assign(valueCles, infoDechiffrage) // Injecter header custom
    delete valueCles.date

    const frequenceUpdate = 500
    let dernierUpdate = 0
    const progressCb = proxy( (tailleCompletee, opts) => {
        opts = opts || {}
        const champ = opts.champ || 'tailleCompletee'  // tailleCompletee et tailleDechiffree
        const dechiffre = (opts.dechiffre!==undefined)?opts.dechiffre:false
        if(opts.transfertComplete) {
            dernierUpdate = 0  // S'assurer de faire une mise a jour
        }
        let etat = ETAT_DOWNLOAD_ENCOURS
        if(champ == 'tailleDechiffree') etat = CONST_TRANSFERT.ETAT_DOWNLOAD_SUCCES_CHIFFRE
        const now = new Date().getTime()
        if(now - frequenceUpdate > dernierUpdate) {
            dernierUpdate = now
            marquerDownloadEtat(workers, dispatch, fuuid, {etat, [champ]: tailleCompletee, dechiffre})
                .catch(err=>console.warn("progressCb Erreur maj download ", err))
        }
    })

    // Downloader les chunks du fichier - supporte resume
    const url = ''+fuuid
    const paramsDownload = {url,fuuid}
    await transfertDownloadFichiers.downloadFichierParts(workers, paramsDownload, progressCb)
    // console.debug("Resultat download fichier : ", resultat)
    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_DOWNLOAD_SUCCES_CHIFFRE, dechiffre: false, DEBUG: false})
        .catch(err=>console.warn("progressCb Erreur maj download ", err))

    // Dechiffrer le fichier
    const paramsDechiffrage = {
        fuuid, filename: fichier.nom, mimetype: fichier.mimetype,
        ...valueCles,  // Inclure params optionnels comme iv, header, etc
        password: valueCles.cleSecrete,
    }
    await transfertDownloadFichiers.dechiffrerPartsDownload(workers, paramsDechiffrage, progressCb)
    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_DOWNLOAD_SUCCES_DECHIFFRE, dechiffre: true, DEBUG: false})
        .catch(err=>console.warn("progressCb Erreur maj download ", err))

    if(cancelToken && cancelToken.cancelled) {
        console.warn("Download cancelled")
        return
    }

    // Download complete, dispatch nouvel etat
    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_COMPLETE})
    await dispatch(completerDownload(workers, fuuid))
        .catch(err=>console.error("Erreur cleanup fichier upload ", err))
}

// async function streamToDownloadIDB(workers, fuuid, reader) {
//     const {downloadFichiersDao} = workers
//     let arrayBuffers = [], tailleChunks = 0, position = 0
//     while(true) {
//         const val = await reader.read()
//         // console.debug("genererFichierZip Stream read %O", val)
//         const data = val.value
//         if(data) {
//             arrayBuffers.push(data)
//             tailleChunks += data.length
//             position += data.length
//         }

//         if(tailleChunks > CONST_BLOB_DOWNLOAD_CHUNKSIZE) {
//             // Split chunks
//             const blob = new Blob(arrayBuffers)
//             const positionBlob = position - blob.size
//             // console.debug("Blob cree position %d : ", positionBlob, blob)
//             await downloadFichiersDao.ajouterFichierDownloadFile(fuuid, positionBlob, blob)
//             arrayBuffers = []
//             tailleChunks = 0
//         }

//         if(val.done) break  // Termine
//         if(val.done === undefined) throw new Error('Erreur lecture stream, undefined')
//     }

//     if(arrayBuffers.length > 0) {
//         const blob = new Blob(arrayBuffers)
//         const positionBlob = position - blob.size
//         // console.debug("Dernier blob position %d : ", positionBlob, blob)
//         await downloadFichiersDao.ajouterFichierDownloadFile(fuuid, positionBlob, blob)
//     }
// }

// async function genererFichierZip(workers, dispatch, downloadInfo, cancelToken) {
//     console.debug("genererFichierZip Downloads completes, generer le zip pour ", downloadInfo)
//     // const { transfertDownloadFichiers, downloadFichiersDao } = workers

//     const fuuidZip = downloadInfo.fuuid, 
//           userId = downloadInfo.userId

//     // for await (const fichier of streamRepertoireDansZipRecursif(workers, downloadInfo.root.nodes, [])) {
//     //     console.debug("Ajouter fichier %O", fichier)
//     // }

//     // Parcourir tous les repertoires, streamer les fichiers dans le stream
//     const nodes = downloadInfo.root.nodes
//     const resultatZip = makeZip(parcourirRepertoireDansZipRecursif(workers, nodes, []))
//     // console.debug("Resultat zip : %O", resultatZip)

//     const headersModifies = new Headers()
//     headersModifies.set('content-type', 'application/zip')
//     headersModifies.set('content-disposition', `attachment; filename="${encodeURIComponent('millegrilles.zip')}"`)

//     // Sauvegarder blob 
//     const reader = resultatZip.getReader()
//     await streamToDownloadIDB(workers, fuuidZip, reader)

//     // Cleanup downloads individuels - on garde juste le ZIP
//     for await (const info of parcourirRepertoireDansZipRecursif(workers, nodes, [], {operation: 'getFuuid'})) {
//         const fuuid = info.fuuid
//         // console.debug("Supprimer download fuuid %s", fuuid)
//         await dispatch(arreterDownload(workers, fuuid))
//     }

//     // console.debug("Marquer download %s comme pret / complete", fuuidZip)
//     await marquerDownloadEtat(workers, dispatch, fuuidZip, {etat: ETAT_COMPLETE, userId})
//     await dispatch(completerDownload(workers, fuuidZip))
//         .catch(err=>console.error("Erreur cleanup download fichier zip ", err))
// }

// async function* ajouterRepertoireDansZip(workers, node, parents, opts) {
//     // console.debug("Ajouter path %O/%s", parents.join('/'), node.nom)

//     // Ajouter le node dans le zip

//     const pathAjoute = [...parents, node.nom]
//     const nodes = node.nodes
//     if(nodes) {
//         console.debug("Sous repertoire ", pathAjoute)
//         for await (const fichier of parcourirRepertoireDansZipRecursif(workers, node.nodes, pathAjoute, opts)) {
//             // console.debug("ajouterRepertoireDansZip Node ", fichier)
//             yield fichier
//         }
//     }
// }

// async function* parcourirRepertoireDansZipRecursif(workers, nodes, parents, opts) {
//     opts = opts || {}
//     const { downloadFichiersDao } = workers
//     const operation = opts.operation || 'stream'
//     console.debug("streamRepertoireDansZipRecursif parents ", parents)
//     for await (const node of nodes) {
//         if(node.type_node === 'Fichier') {
//             const fuuid = node.fuuid
//             let nomFichier = node.nom
//             if(parents && parents.length > 0) {
//                 nomFichier = parents.join('/') + '/' + node.nom
//             }
            
//             if(operation === 'stream') {
//                 // Ouvrir le stream pour le fuuid
//                 // const cacheTmp = await caches.open(CACHE_TEMP_NAME)
//                 // const response = await cacheTmp.match('/'+fuuid)
//                 const fichierDownload = await downloadFichiersDao.getDownloadComplet(fuuid)
//                 const blob = fichierDownload.blob
            
//                 console.debug("Conserver fichier %s (parents : %O)", nomFichier, parents)
//                 yield {name: nomFichier, input: blob}
//             } else if(operation === 'getFuuid') {
//                 yield {name: nomFichier, fuuid}
//             }
//         } else {
//             // Sous-repertoire
//             console.debug("streamRepertoireDansZipRecursif Sous repertoire ", node.nom)
//             for await (const sousNode of ajouterRepertoireDansZip(workers, node, parents, opts)) {
//                 yield sousNode
//             }
//         }
//     }
// }

async function marquerDownloadEtat(workers, dispatch, fuuid, etat) {
    const contenu = {fuuid, ...etat}
    const { downloadFichiersDao } = workers
    await downloadFichiersDao.updateFichierDownload(contenu)
    return dispatch(updateDownload(contenu))
}

function getProchainDownload(liste) {
    // console.debug("getProchainDownload Get prochain download pre-tri ", liste)
    const ETATS_RESUME = [
        CONST_TRANSFERT.ETAT_PRET,
    ]
    const listeCopie = liste.filter(item=>ETATS_RESUME.includes(item.etat))
    listeCopie.sort(trierListeDownload)
    // console.debug("Get prochain download liste filtree triee: ", listeCopie)
    return listeCopie.shift()
}

function sortDateCreation(a, b) {
    if(a === b) return 0
    if(!a) return 1
    if(!b) return -1

    const dcA = a.dateCreation,
          dcB = b.dateCreation
    
    if(dcA === dcB) return 0
    if(!dcA) return 1
    if(!dcB) return -1

    return dcA - dcB
}

function calculerPourcentage(liste, completesCycle) {
    let tailleTotale = 0, 
        tailleCompleteeTotale = 0

    const inclureEtats = [ETAT_PRET, ETAT_ECHEC, ETAT_DOWNLOAD_ENCOURS, ETAT_DOWNLOAD_SUCCES_CHIFFRE, ETAT_DOWNLOAD_SUCCES_DECHIFFRE]
    liste.forEach( download => {
        const { fuuid, etat, tailleCompletee, taille } = download

        let inclure = false
        if(inclureEtats.includes(etat)) inclure = true
        else if(ETAT_COMPLETE === etat && completesCycle.includes(fuuid)) inclure = true

        if(inclure) {
            if(tailleCompletee) tailleCompleteeTotale += tailleCompletee
            if(taille) tailleTotale += taille
        }
    })

    const pourcentage = Math.floor(100 * tailleCompleteeTotale / tailleTotale)

    return {total: tailleTotale, complete: tailleCompleteeTotale, pourcentage}
}

export function trierListeDownload(a, b) {
    if(a === b) return 0
    if(!a) return 1
    if(!b) return -1

    // // Trier par taille completee (desc)
    // const tailleCompleteeA = a.tailleCompletee,
    //       tailleCompleteeB = b.tailleCompletee
    // if(tailleCompleteeA !== tailleCompleteeB) {
    //     if(!tailleCompleteeA) return 1
    //     if(!tailleCompleteeB) return -1
    //     return tailleCompleteeB - tailleCompleteeA
    // }

    // Trier par date de creation
    const dateCreationA = a.dateCreation,
          dateCreationB = b.dateCreation
    // if(dateCreationA === dateCreationB) return 0
    if(dateCreationA !== dateCreationB) return dateCreationA - dateCreationB
    if(!dateCreationA) return 1
    if(!dateCreationB) return -1

    const cA = a.correlation,
          cB = b.correlation
    return cA.localeCompare(cB)
}
