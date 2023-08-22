import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'
import path from 'path'
import { proxy } from 'comlink'
import { makeZip } from 'client-zip'

const CACHE_TEMP_NAME = 'fichiersDechiffresTmp',
      DECHIFFRAGE_TAILLE_BLOCK = 64 * 1024,
      SLICE_NAME = 'downloader',
      STORE_DOWNLOADS = 'downloads',
      EXPIRATION_CACHE_MS = 24 * 60 * 60 * 1000,
      CONST_PROGRESS_UPDATE_THRESHOLD = 10 * 1024 * 1024,
      CONST_PROGRESS_UPDATE_INTERVAL = 1000

const ETAT_PRET = 1,
      ETAT_EN_COURS = 2,
      ETAT_SUCCES = 3,
      ETAT_ECHEC = 4
      
const initialState = {
    liste: [],                  // Liste de fichiers en traitement (tous etats confondus)
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
    progres: null,              // Pourcentage de progres en int
    completesCycle: [],         // Conserve la liste des uploads completes qui restent dans le total de progres
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

    console.debug("pushDownloadAction payload : ", docDownload)
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

    // Detecter changement etat a confirme
    if(docDownload.etat === ETAT_SUCCES) {
        state.completesCycle.push(fuuid)
    }

    if(!infoDownload) state.liste.push(infoDownload)    // Append
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

        if(!infoDownload) state.liste.push(infoDownload)    // Append
        else Object.assign(infoDownload, docDownload)       // Merge
    }

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
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
    }
})

export const { 
    setUserId, setDownloads, 
    pushDownload, continuerDownload, retirerDownload, arretDownload,
    clearDownloads, clearCycleDownload,
    updateDownload, supprimerDownload,
    pushGenererZip,
} = downloaderSlice.actions
export default downloaderSlice.reducer

// Thunks

export function ajouterDownload(workers, docDownload) {
    return (dispatch, getState) => traiterAjouterDownload(workers, docDownload, dispatch, getState)
}

async function traiterAjouterDownload(workers, docDownload, dispatch, getState) {
    const { downloadFichiersDao, clesDao } = workers
    
    console.debug("traiterAjouterDownload payload : ", docDownload)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    const version_courante = docDownload.version_courante || {}
    const fuuid = docDownload.fuuidDownload || docDownload.fuuid || version_courante.fuuid
    const fuuidCle = docDownload.fuuid_v_courante || fuuid
    const taille = version_courante.taille
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
    let { cuuid, selection } = params
    
    console.debug("traiterAjouterZipDownload cuuid : %s, selection : %O", cuuid, selection)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    // Charger statistiques cuuid, liste de fichiers/dossiers
    if(cuuid === '') cuuid = null
    const reponseStructure = await connexion.getStructureRepertoire(cuuid)
    console.debug("Reponse structure : ", reponseStructure)
    if(reponseStructure.ok === false) {
        throw new Error("Erreur preparation ZIP : ", reponseStructure.err)
    }

    // Batir la hierarchie du repertoire
    const nodeParTuuid = {}, nodeParCuuidParent = {}, root = [], fuuidsCles = []
    reponseStructure.liste.forEach(item=>{
        nodeParTuuid[item.tuuid] = item

        // Ajouter flag noSave=true pour le processus de download. Evite pop-up de sauvegarde.
        item.noSave = true

        if(item.versions) {
            // Extraire version courante (idx: 0)
            const version = item.versions[0]
            item.version_courante = version
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
    console.debug("nodeParTuuid : %O, nodeParCuuidParent : %O, root: %O, fuuidsCles: %O", 
        nodeParTuuid, nodeParCuuidParent, root, fuuidsCles)

    for (const cuuid of Object.keys(nodeParCuuidParent)) {
        const nodes = nodeParCuuidParent[cuuid]
        const parent = nodeParTuuid[cuuid]
        console.debug("Wiring sous cuuid parent %s (%O) nodes %O", cuuid, parent, nodes)
        if(parent) {
            parent.nodes = nodes
        } else {
            console.warn("Aucun lien pour parent %s pour %O, fichiers ignores", cuuid, nodes)
            // Retirer le download des tuuids 
            nodes.forEach(item=>{
                delete nodeParTuuid[item.tuuid]
            })
        }
    }

    const fichiersADownloader = Object.values(nodeParTuuid).filter(item=>item.type_node === 'Fichier')

    console.debug("Arborescence completee : %O\nDownload %d fichiers\n%O", root, fichiersADownloader.length, fichiersADownloader)

    // Preparer toutes les cles (tous les tuuids incluant repertoires)
    const cles = await clesDao.getCles(fuuidsCles)
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

    console.debug("Contenu fichier ZIP : ", root)

    // Ajouter tous les fichiers a downloader dans la Q de downloader et demarrer
    for await(const tuuid of Object.keys(nodeParTuuid)) {
        const item = nodeParTuuid[tuuid]
        if(item.fuuids_versions) {
            // console.warn("SKIP download - TO DO fix me")
            await dispatch(ajouterDownload(workers, item))
        }
    }

    const nodeRoot = nodeParTuuid[cuuid] || {}
    nodeRoot.nodes = root

    // Creer un fuuid artificiel pour supporter la meme structure que le download de fichiers
    let fuuidZip = 'zip/root'
    if(cuuid) {
        fuuidZip = 'zip/' + cuuid
    }

    let nomArchive = 'millegrilles'
    if(nodeRoot.nom) nomArchive = nodeRoot.nom

    const docGenererZip = {
        fuuid: fuuidZip,
        cuuid,
        userId,
        root: nodeRoot,
        genererZip: true,
        nom: nomArchive,
    }

    // Conserver le nouveau download dans IDB
    await downloadFichiersDao.updateFichierDownload(docGenererZip)
    // Inserer dans la Q de traitement
    dispatch(pushGenererZip(docGenererZip))
}

export function arreterDownload(workers, fuuid) {
    return (dispatch, getState) => traiterArreterDownload(workers, fuuid, dispatch, getState)
}

async function traiterArreterDownload(workers, fuuid, dispatch, getState) {
    // console.debug("traiterCompleterDownload ", fuuid)
    const { downloadFichiersDao, transfertFichiers } = workers
    const state = getState()[SLICE_NAME]
    const download = state.liste.filter(item=>item.fuuid===fuuid).pop()
    if(download) {
        
        // Arreter et retirer download state (interrompt le middleware au besoin)
        dispatch(supprimerDownload(fuuid))

        await transfertFichiers.down_supprimerDownloadsCache(fuuid)

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
        const downloadCopie = {...download}
        downloadCopie.etat = ETAT_SUCCES
        downloadCopie.dateConfirmation = new Date().getTime()
        downloadCopie.tailleCompletee = downloadCopie.taille

        // Maj contenu download
        await downloadFichiersDao.updateFichierDownload(downloadCopie)

        // Maj redux state
        dispatch(updateDownload(downloadCopie))

        const noSave = downloadCopie || false

        try {
            // Prompt sauvegarder
            // console.debug("TraitementFichiers ", traitementFichiers)
            const fuuid = download.fuuid,
                filename = download.nom
            await traitementFichiers.downloadCache(fuuid, {filename, noSave})
        } catch(err) {
            console.warn("Erreur prompt pour sauvgarder fichier downloade ", err)
        }
    }
}

export function supprimerDownloadsParEtat(workers, etat) {
    return (dispatch, getState) => traiterSupprimerDownloadsParEtat(workers, etat, dispatch, getState)
}

async function traiterSupprimerDownloadsParEtat(workers, etat, dispatch, getState) {
    const { downloadFichiersDao, transfertFichiers } = workers
    const downloads = getState()[SLICE_NAME].liste.filter(item=>item.etat === etat)
    for await (const download of downloads) {
        const fuuid = download.fuuid

        // Arreter et retirer download state (interrompt le middleware au besoin)
        dispatch(supprimerDownload(fuuid))

        await transfertFichiers.down_supprimerDownloadsCache(fuuid)

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
    //console.debug("downloaderMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
    // console.debug("Arret upload info : %O", arretUpload)

    await listenerApi.unsubscribe()
    try {
        // Reset liste de fichiers completes utilises pour calculer pourcentage upload
        listenerApi.dispatch(clearCycleDownload())

        const task = listenerApi.fork( forkApi => tacheDownload(workers, listenerApi, forkApi) )
        const stopAction = listenerApi.condition(arretDownload.match)
        await Promise.race([task.result, stopAction])

        // console.debug("downloaderMiddlewareListener Task %O\nstopAction %O", task, stopAction)
        task.result.catch(err=>console.error("Erreur task : %O", err))
        // stopAction
        //     .then(()=>task.cancel())
        //     .catch(()=>{
        //         // Aucun impact
        //     })

        const resultat = await task.result  // Attendre fin de la tache en cas d'annulation
        // console.debug("downloaderMiddlewareListener Sequence download terminee, resultat %O", resultat)
    } finally {
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
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_ECHEC})
                .catch(err=>console.error("Erreur marquer download echec %s : %O", fuuid, err))
            throw err
        }

        // Trouver prochain download
        if (forkApi.signal.aborted) {
            // console.debug("tacheUpload annulee")
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_ECHEC})
                .catch(err=>console.error("Erreur marquer download echec %s : %O", fuuid, err))
            return
        }
        nextDownload = getProchainDownload(listenerApi.getState()[SLICE_NAME].liste)
    }
}

async function downloadFichier(workers, dispatch, fichier, cancelToken) {
    // console.debug("Download fichier params : ", fichier)
    const { transfertFichiers, clesDao } = workers
    const fuuid = fichier.fuuid,
          fuuidCle = fichier.fuuidCle || fichier.fuuid,
          infoDechiffrage = fichier.infoDechiffrage || {}

    // await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_EN_COURS})
    const cles = await clesDao.getCles([fuuidCle])  // Fetch pour cache (ne pas stocker dans redux)
    const valueCles = Object.values(cles).pop()
    Object.assign(valueCles, infoDechiffrage) // Injecter header custom
    delete valueCles.date
    // valueCles.cleSecrete = base64.encode(valueCles.cleSecrete)

    // transfertFichiers.download() ...
    const frequenceUpdate = 500
    let dernierUpdate = 0
    const progressCb = proxy( tailleCompletee => {
        const now = new Date().getTime()
        if(now - frequenceUpdate > dernierUpdate) {
            dernierUpdate = now
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_EN_COURS, tailleCompletee})
                .catch(err=>console.warn("progressCb Erreur maj download ", err))
        }
    })

    const url = ''+fuuid
    const paramsDownload = {
        ...valueCles,
        url,
        fuuid, hachage_bytes: fuuid, filename: fichier.nom, mimetype: fichier.mimetype,
        password: valueCles.cleSecrete,
    }
    // console.debug("Params download : ", paramsDownload)
    const resultat = await transfertFichiers.downloadCacheFichier(paramsDownload, progressCb)
    console.debug("Resultat download fichier : ", resultat)

    if(cancelToken && cancelToken.cancelled) {
        console.warn("Upload cancelled")
        return
    }

    // Upload complete, dispatch nouvel etat
    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_SUCCES})
    await dispatch(completerDownload(workers, fuuid))
        .catch(err=>console.error("Erreur cleanup fichier upload ", err))
}

async function genererFichierZip(workers, dispatch, downloadInfo, cancelToken) {
    console.debug("genererFichierZip Downloads completes, generer le zip pour ", downloadInfo)
    const fuuidZip = downloadInfo.fuuid, userId = downloadFichier.userId

    // for await (const fichier of streamRepertoireDansZipRecursif(workers, downloadInfo.root.nodes, [])) {
    //     console.debug("Ajouter fichier %O", fichier)
    // }

    // Parcourir tous les repertoires, streamer les fichiers dans le stream
    const resultatZip = makeZip(streamRepertoireDansZipRecursif(workers, downloadInfo.root.nodes, []))
    console.debug("Resultat zip : %O", resultatZip)

    const headersModifies = new Headers()
    headersModifies.set('content-type', 'application/zip')
    headersModifies.set('content-disposition', `attachment; filename="${encodeURIComponent('root.zip')}"`)
    // const reader = resultatZip.getReader()
    const response = new Response(resultatZip, {headers: headersModifies, status: 200})

    const cacheTmp = await caches.open(CACHE_TEMP_NAME)
    await cacheTmp.put('/' + fuuidZip, response)

    console.debug("Marquer download %s comme pret / complete", fuuidZip)
    await marquerDownloadEtat(workers, dispatch, fuuidZip, {etat: ETAT_SUCCES, userId})
    await dispatch(completerDownload(workers, fuuidZip))
        .catch(err=>console.error("Erreur cleanup fichier upload ", err))
}

async function* ajouterRepertoireDansZip(workers, node, parents) {
    console.debug("Ajouter path %O/%s", parents.join('/'), node.nom)

    // Ajouter le node dans le zip

    const pathAjoute = [...parents, node.nom]
    const nodes = node.nodes
    if(nodes) {
        console.debug("Sous repertoire ", pathAjoute)
        for await (const fichier of streamRepertoireDansZipRecursif(workers, node.nodes, pathAjoute)) {
            console.debug("ajouterRepertoireDansZip Node ", fichier)
            yield fichier
        }
    }
}

async function* streamRepertoireDansZipRecursif(workers, nodes, parents) {
    console.debug("streamRepertoireDansZipRecursif parents ", parents)
    for await (const node of nodes) {
        if(node.type_node === 'Fichier') {
            const fuuid = node.fuuid
            let nomFichier = node.nom
            if(parents && parents.length > 0) {
                nomFichier = parents.join('/') + '/' + node.nom
            }
            
            // Ouvrir le stream pour le fuuid
            const cacheTmp = await caches.open(CACHE_TEMP_NAME)
            const response = await cacheTmp.match('/'+fuuid)
        
            console.debug("Conserver fichier %s (parents : %O)", nomFichier, parents)
            yield {name: nomFichier, input: response}
        } else {
            // Sous-repertoire
            console.debug("streamRepertoireDansZipRecursif Sous repertoire ", node.nom)
            for await (const sousNode of ajouterRepertoireDansZip(workers, node, parents)) {
                yield sousNode
            }
        }
    }
}

async function marquerDownloadEtat(workers, dispatch, fuuid, etat) {
    const contenu = {fuuid, ...etat}
    const { downloadFichiersDao } = workers
    await downloadFichiersDao.updateFichierDownload(contenu)
    return dispatch(updateDownload(contenu))
}

function getProchainDownload(liste) {
    // console.debug("Get prochain upload pre-tri ", liste)
    const listeCopie = liste.filter(item=>item.etat === ETAT_PRET)
    listeCopie.sort(trierListeDownload)
    // console.debug("Get prochain upload : ", listeCopie)
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

    const inclureEtats = [ETAT_PRET, ETAT_ECHEC, ETAT_EN_COURS]
    liste.forEach( download => {
        const { fuuid, etat, tailleCompletee, taille } = download

        let inclure = false
        if(inclureEtats.includes(etat)) inclure = true
        else if(ETAT_SUCCES === etat && completesCycle.includes(fuuid)) inclure = true

        if(inclure) {
            tailleCompleteeTotale += tailleCompletee
            tailleTotale += taille
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
