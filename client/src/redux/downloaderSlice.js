import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'

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
    const listeUploads = action.payload
    const listeExistanteMappee = state.liste.reduce((acc, item)=>{
        acc[item.fuuid] = item
        return acc
    }, {})

    // Retirer les uploads connus
    const nouvelleListe = listeUploads.filter(item=>!listeExistanteMappee[item.fuuid])
    
    // Push les items manquants a la fin de la liste
    nouvelleListe.forEach(item=>state.liste.push(item))
    
    const { pourcentage } = calculerPourcentage(state.liste, [])

    state.liste.sort(sortDateCreation)
    state.completesCycle = []
    state.progres = pourcentage
}

function ajouterDownloadAction(state, action) {
    const docDownload = action.payload
    const fuuid = docDownload.fuuid
    const infoDownload = state.liste.filter(item=>item.fuuid === fuuid).pop()
    console.debug("ajouterDownloadAction fuuid %s info existante %O", fuuid, infoDownload)
    if(!infoDownload) {
        // Ajouter l'upload, un middleware va charger le reste de l'information
        // console.debug("Ajout upload %O", correlation)
        state.liste.push(docDownload)
        const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
        state.progres = pourcentage
    } else {
        throw new Error(`Upload ${fuuid} existe deja`)
    }
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

function supprimerDownloadsParEtatAction(state, action) {
    const etat = action.payload
    state.liste = state.liste.filter(item=>{
        // Nettoyer liste completes
        const fuuid = item.fuuid
        state.completesCycle.filter(item=>item.fuuid !== fuuid)

        // Filtrer etat a retirer
        return item.etat !== etat
    })

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
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
        ajouterDownload: ajouterDownloadAction,
        continuerDownload: continuerDownloadAction,
        retirerDownload: retirerDownloadAction,
        clearDownloads: clearDownloadsAction,
        supprimerDownloadsParEtat: supprimerDownloadsParEtatAction,
        arretDownload: arretDownloadAction,
        clearCycleDownload: clearCycleDownloadAction,
        updateDownload: updateDownloadAction,
    }
})

export const { 
    setUserId, setDownloads, 
    ajouterDownload, continuerDownload, retirerDownload, arretDownload,
    clearDownloads, supprimerDownloadsParEtat, clearCycleDownload,
    updateDownload,
} = downloaderSlice.actions
export default downloaderSlice.reducer

// Thunks

export function completerDownload(workers, fuuid) {
    return (dispatch, getState) => traiterCompleterDownload(workers, fuuid, dispatch, getState)
}

async function traiterCompleterDownload(workers, fuuid, dispatch, getState) {
    // console.debug("traiterCompleterDownload ", fuuid)
    const { downloadFichiersDao } = workers
    const state = getState()[SLICE_NAME]
    const upload = state.liste.filter(item=>item.fuuid===fuuid).pop()
    if(upload) {
        const downloadCopie = {...upload}
        downloadCopie.etat = ETAT_SUCCES
        downloadCopie.dateConfirmation = new Date().getTime()

        // Supprimer parts
        await downloadFichiersDao.supprimerPartsFichier(fuuid)

        // Maj contenu upload
        await downloadFichiersDao.updateFichierDownload(downloadCopie)

        // Maj redux state
        return dispatch(updateDownload(downloadCopie))
    }
}

// Middleware
export function downloaderMiddlewareSetup(workers) {
    const uploaderMiddleware = createListenerMiddleware()
    
    uploaderMiddleware.startListening({
        matcher: isAnyOf(ajouterDownload, setDownloads, continuerDownload),
        effect: (action, listenerApi) => downloaderMiddlewareListener(workers, action, listenerApi)
    }) 
    
    return uploaderMiddleware
}

async function downloaderMiddlewareListener(workers, action, listenerApi) {
    // console.debug("uploaderMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
    // console.debug("Arret upload info : %O", arretUpload)

    await listenerApi.unsubscribe()
    try {
        // Reset liste de fichiers completes utilises pour calculer pourcentage upload
        listenerApi.dispatch(clearCycleDownload())

        const task = listenerApi.fork( forkApi => tacheDownload(workers, listenerApi, forkApi) )
        const stopAction = listenerApi.condition(arretDownload.match)
        await Promise.race([task.result, stopAction])

        // console.debug("Task %O\nstopAction %O", task, stopAction)
        task.result.catch(err=>console.error("Erreur task : %O", err))
        stopAction
            .then(()=>task.cancel())
            .catch(()=>{
                // Aucun impact
            })

        await task.result  // Attendre fin de la tache en cas d'annulation
        // console.debug("uploaderMiddlewareListener Sequence upload terminee")
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
        // console.debug("Next upload : %O", nextDownload)
        const fuuid = nextDownload.fuuid
        try {
            await downloadFichier(workers, dispatch, nextDownload, cancelToken)

            // Trouver prochain upload
            if (forkApi.signal.aborted) {
                // console.debug("tacheUpload annulee")
                marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_ECHEC})
                    .catch(err=>console.error("Erreur marquer upload echec %s : %O", fuuid, err))
                return
            }
            nextDownload = getProchainDownload(listenerApi.getState()[SLICE_NAME].liste)

        } catch (err) {
            console.error("Erreur tache upload fuuid %s: %O", fuuid, err)
            marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_ECHEC})
                .catch(err=>console.error("Erreur marquer upload echec %s : %O", fuuid, err))
            throw err
        }
    }
}

async function downloadFichier(workers, dispatch, fichier, cancelToken) {
    // console.debug("Upload fichier workers : ", workers)
    const { uploadFichiersDao, transfertFichiers, chiffrage } = workers
    const fuuid = fichier.fuuid

    // Charger la liste des parts a uploader
    let parts = await uploadFichiersDao.getPartsFichier(fuuid)
    
    // Retirer les partis qui sont deja uploadees
    let tailleCompletee = 0,
        positionsCompletees = fichier.positionsCompletees,
        retryCount = fichier.retryCount
    parts = parts.filter(item=>{
        const dejaTraite = positionsCompletees.includes(item.position)
        if(dejaTraite) tailleCompletee += item.taille
        return !dejaTraite
    })
    // console.debug("Parts a uploader : ", parts)

    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_EN_COURS})

    // Mettre a jour le retryCount
    retryCount++
    await marquerDownloadEtat(workers, dispatch, fuuid, {retryCount})

    for await (const part of parts) {
        let tailleCumulative = tailleCompletee
        const position = part.position,
              partContent = part.data
        await marquerDownloadEtat(workers, dispatch, fuuid, {tailleCompletee: tailleCumulative})
        
        // await new Promise(resolve=>setTimeout(resolve, 250))
        const opts = {}
        const resultatUpload = transfertFichiers.partUploader(fuuid, position, partContent, opts)
        // await Promise.race([resultatUpload, cancelToken])
        await resultatUpload
        // console.debug("uploadFichier Resultat upload %s (cancelled? %O) : %O", fuuid, cancelToken, resultatUpload)

        if(cancelToken && cancelToken.cancelled) {
            console.warn("Upload cancelled")
            return
        }

        tailleCompletee += part.taille
        positionsCompletees = [...positionsCompletees, position]
        await marquerDownloadEtat(workers, dispatch, fuuid, {tailleCompletee, positionsCompletees})
    }

    // Signer et uploader les transactions
    const transactionMaitredescles = {...fichier.transactionMaitredescles}
    const partitionMaitreDesCles = transactionMaitredescles['_partition']
    delete transactionMaitredescles['_partition']
    const cles = await chiffrage.formatterMessage(
        transactionMaitredescles, 'MaitreDesCles', {partition: partitionMaitreDesCles, action: 'sauvegarderCle', DEBUG: false})

    const transaction = await chiffrage.formatterMessage(
        fichier.transactionGrosfichiers, 'GrosFichiers', {action: 'nouvelleVersion'})

    // Upload complete, dispatch nouvel etat
    await marquerDownloadEtat(workers, dispatch, fuuid, {etat: ETAT_SUCCES})
    await dispatch(completerDownload(workers, fuuid))
        .catch(err=>console.error("Erreur cleanup fichier upload ", err))
}

async function marquerDownloadEtat(workers, dispatch, fuuid, etat) {
    throw new Error("todo")
    // const contenu = {fuuid, ...etat}
    // const { uploadFichiersDao } = workers
    
    // await uploadFichiersDao.updateFichierUpload(contenu)
    
    // return dispatch(updateUpload(contenu))
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
