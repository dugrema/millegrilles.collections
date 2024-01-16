import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'
import * as Comlink from 'comlink'
import * as CONST_TRANSFERT from '../transferts/constantes'


const SLICE_NAME = 'uploader'

const // ETAT_PREPARATION = 1,
      ETAT_PRET = 2,
      ETAT_UPLOADING = 3,
      ETAT_COMPLETE = 4,
      ETAT_ECHEC = 5,
      ETAT_CONFIRME = 6,
      ETAT_UPLOAD_INCOMPLET = 7

const initialState = {
    liste: [],                  // Liste de fichiers en traitement (tous etats confondus)
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
    progres: null,              // Pourcentage de progres en int
    completesCycle: [],         // Conserve la liste des uploads completes qui restent dans le total de progres
    enCours: false,             // True si un upload est en cours de transfert
    autoResumeMs: 20_000,       // Intervalle en millisecondes pour l'activation de l'auto-resume
    autoResumeEnCours: false,   // Auto-resume deja en cours (timer actif)
    uploadPause: false,         // Pause de l'upload. Empeche le demarrage des jobs et arrete la job en cours.
}

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function setUploadsAction(state, action) {
    // Merge listes
    const listeUploads = action.payload
    const listeExistanteMappee = state.liste.reduce((acc, item)=>{
        acc[item.correlation] = item
        return acc
    }, {})

    // Retirer les uploads connus
    const nouvelleListe = listeUploads.filter(item=>!listeExistanteMappee[item.correlation])
    
    // Push les items manquants a la fin de la liste
    nouvelleListe.forEach(item=>state.liste.push(item))
    
    const { pourcentage } = calculerPourcentage(state.liste, [])

    state.liste.sort(sortDateCreation)
    state.completesCycle = []
    state.progres = pourcentage
}

function clearCycleUploadAction(state, action) {
    state.completesCycle = []
}

function ajouterUploadAction(state, action) {
    const docUpload = action.payload
    const correlation = docUpload.correlation
    const infoUpload = state.liste.filter(item=>item.correlation === correlation).pop()
    // console.debug("ajouterUploadAction correlation %s info existante %O", correlation, infoUpload)
    if(!infoUpload) {
        // Ajouter l'upload, un middleware va charger le reste de l'information
        // console.debug("Ajout upload %O", correlation)
        state.liste.push(docUpload)
        const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
        state.progres = pourcentage
    } else {
        throw new Error(`Upload ${correlation} existe deja`)
    }
}

function updateUploadAction(state, action) {
    const docUpload = action.payload
    const correlation = docUpload.correlation

    // Trouver objet existant
    const infoUpload = state.liste.filter(item=>item.correlation === correlation).pop()

    // Detecter changement etat a confirme
    if(infoUpload.etat === ETAT_COMPLETE && docUpload.etat === ETAT_CONFIRME) {
        state.completesCycle.push(correlation)
    }

    if(!infoUpload) state.liste.push(docUpload)    // Append
    else Object.assign(infoUpload, docUpload)       // Merge

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function continuerUploadAction(state, action) {
    const docUpload = action.payload
    
    // docUpload peut etre null si on fait juste redemarrer le middleware
    if(docUpload) {
        const correlation = docUpload.correlation

        // Trouver objet existant
        const infoUpload = state.liste.filter(item=>item.correlation === correlation).pop()

        // console.debug("continuerUploadAction ", docUpload)

        if(!infoUpload) state.liste.push(docUpload)    // Append
        else Object.assign(infoUpload, docUpload)       // Merge
    }

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function retirerUploadAction(state, action) {
    const correlation = action.payload
    state.liste = state.liste.filter(item=>item.correlation !== correlation)

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function clearUploadsAction(state, action) {
    state.liste = []
    state.progres = null
    state.completesCycle = []
}

function supprimerUploadsParEtatAction(state, action) {
    const etat = action.payload
    state.liste = state.liste.filter(item=>{
        // Nettoyer liste completes
        const correlation = item.correlation
        state.completesCycle.filter(item=>item.correlation !== correlation)

        // Filtrer etat a retirer
        return item.etat !== etat
    })

    const { pourcentage } = calculerPourcentage(state.liste, state.completesCycle)
    state.progres = pourcentage
}

function arretUploadAction(state, action) {
    // Middleware trigger seulement
}

function setUploadEnCoursAction(state, action) {
    state.enCours = action.payload
}


function bloquerAutoResumeAction(state, action) {
    state.autoResumeEnCours = true
}

function debloquerAutoResumeAction(state, action) {
    state.autoResumeEnCours = false
}

const uploadSlice = createSlice({
    name: 'uploader',
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        ajouterUpload: ajouterUploadAction,
        updateUpload: updateUploadAction,
        retirerUpload: retirerUploadAction,
        setUploads: setUploadsAction,
        clearUploadsState: clearUploadsAction,
        supprimerUploadsParEtat: supprimerUploadsParEtatAction,
        majContinuerUpload: continuerUploadAction,
        arretUpload: arretUploadAction,
        clearCycleUpload: clearCycleUploadAction,
        setUploadEnCours: setUploadEnCoursAction,
        bloquerAutoResume: bloquerAutoResumeAction,
        debloquerAutoResume: debloquerAutoResumeAction,
    }
})

export const { 
    setUserId, ajouterUpload, updateUpload, retirerUpload, setUploads, 
    clearUploadsState, supprimerUploadsParEtat, majContinuerUpload,
    arretUpload, clearCycleUpload, setUploadEnCours,
    bloquerAutoResume, debloquerAutoResume,
} = uploadSlice.actions
export default uploadSlice.reducer

// Thunks

export function demarrerUploads(workers, correlationIds) {
    return (dispatch, getState) => traiterDemarrerUploads(workers, correlationIds, dispatch, getState)
}

async function traiterDemarrerUploads(workers, correlationIds, dispatch, getState) {
    // console.debug("traiterDemarrerUploads ", correlationIds)
    if(typeof(correlationIds) === 'string') correlationIds = [correlationIds]
    correlationIds.forEach(correlation=>{
        dispatch(ajouterUpload(correlation))
    })
}

export function clearUploads(workers) {
    return (dispatch, getState) => traiterClearUploads(workers, dispatch, getState)
}

async function traiterClearUploads(workers, dispatch, getState) {
    // console.debug("traiterClearUploads")
    const { uploadFichiersDao } = workers
    await uploadFichiersDao.clear()
    dispatch(clearUploadsState())
}

export function supprimerParEtat(workers, etat) {
    return (dispatch, getState) => traiterSupprimerParEtat(workers, etat, dispatch, getState)
}

async function traiterSupprimerParEtat(workers, etat, dispatch, getState) {
    // console.debug("traiterSupprimerParEtat ", etat)
    const { uploadFichiersDao } = workers
    const state = getState().uploader
    const userId = state.userId
    await uploadFichiersDao.supprimerParEtat(userId, etat)
    dispatch(supprimerUploadsParEtat(etat))
}

export function continuerUpload(workers, opts) {
    opts = opts || {}
    return (dispatch, getState) => traiterContinuerUpload(workers, dispatch, getState, opts)
}

async function traiterContinuerUpload(workers, dispatch, getState, opts) {
    opts = opts || {}
    const correlation = opts.correlation
    console.debug("traiterContinuerUpload (correlation %s)", correlation)

    const { uploadFichiersDao } = workers
    const state = getState().uploader
    const userId = state.userId

    const uploads = await uploadFichiersDao.chargerUploads(userId)
    const uploadsIncomplets = uploads.filter(item => {
        if(correlation) return item.correlation === correlation
        else return [CONST_TRANSFERT.ETAT_ECHEC, CONST_TRANSFERT.ETAT_DOWNLOAD_SUCCES_CHIFFRE].includes(item.etat)
    })

    if(uploadsIncomplets.length > 0) {
        for await (const upload of uploadsIncomplets) {
            upload.etat = ETAT_PRET
            await uploadFichiersDao.updateFichierUpload(upload)
            dispatch(majContinuerUpload(upload))
        }
    } else{
        // Kick-off middleware pour uploads prets
        dispatch(majContinuerUpload())
    }
}

export function annulerUpload(workers, correlation) {
    return (dispatch, getState) => traiterAnnulerUpload(workers, correlation, dispatch, getState)
}

async function traiterAnnulerUpload(workers, correlation, dispatch, getState) {
    // console.debug("traiterAnnulerUpload ", correlation)
    const { uploadFichiersDao } = workers
    const state = getState().uploader
    const upload = state.liste.filter(item=>item.correlation===correlation).pop()
    if(upload) {
        if(upload.etat === ETAT_UPLOADING) {
            // Arreter l'upload courant
            dispatch(arretUpload())
        }
        // Supprimer le fichier
        await uploadFichiersDao.supprimerFichier(correlation)
        dispatch(retirerUpload(correlation))
    }
}

export function confirmerUpload(workers, correlation) {
    return (dispatch, getState) => traiterConfirmerUpload(workers, correlation, dispatch, getState)
}

async function traiterConfirmerUpload(workers, correlation, dispatch, getState) {
    // console.debug("traiterConfirmerUpload ", correlation)
    const { uploadFichiersDao } = workers
    const state = getState().uploader
    const upload = state.liste.filter(item=>item.correlation===correlation).pop()
    if(upload) {
        const uploadCopie = {...upload}
        uploadCopie.etat = ETAT_CONFIRME
        uploadCopie.dateConfirmation = new Date().getTime()

        // Supprimer parts
        await uploadFichiersDao.supprimerPartsFichier(correlation)

        // Maj contenu upload
        await uploadFichiersDao.updateFichierUpload(uploadCopie)

        // Maj redux state
        return dispatch(updateUpload(uploadCopie))
    }
}

// Uploader middleware
export function uploaderMiddlewareSetup(workers) {
    const uploaderMiddleware = createListenerMiddleware()
    
    uploaderMiddleware.startListening({
        matcher: isAnyOf(ajouterUpload, setUploads, majContinuerUpload),
        effect: (action, listenerApi) => uploaderMiddlewareListener(workers, action, listenerApi)
    }) 
    
    return uploaderMiddleware
}

async function uploaderMiddlewareListener(workers, action, listenerApi) {
    // console.debug("uploaderMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
    // console.debug("Arret upload info : %O", arretUpload)

    {
        const state = listenerApi.getState()[SLICE_NAME]
        if(state.uploadPause) return  // Upload est en pause
    }

    await listenerApi.unsubscribe()
    listenerApi.dispatch(setUploadEnCours(true))
    try {
        // Reset liste de fichiers completes utilises pour calculer pourcentage upload
        listenerApi.dispatch(clearCycleUpload())

        const task = listenerApi.fork( forkApi => tacheUpload(workers, listenerApi, forkApi) )
        const stopAction = listenerApi.condition(arretUpload.match)
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
        listenerApi.dispatch(setUploadEnCours(false))
        await listenerApi.subscribe()
    }

    // Verifier si on doit declencher un trigger d'auto-resume apres un certain delai
    {
        const state = listenerApi.getState()[SLICE_NAME]
        // console.debug("Verifier si on redemarre automatiquement : %O", state)
        if(state.liste) {
            const echecTransfert = state.liste.reduce((acc, item)=>{
                if(acc) return acc
                if(item.etat === CONST_TRANSFERT.ETAT_ECHEC) return item
                return false
            }, false)
            // console.debug("Resultat echecTransfert ", echecTransfert)
            if(echecTransfert && state.autoResumeMs && !state.autoResumeEnCours) {
                console.info("Au moins un transfert en echec (%O), on cedule le redemarrage", echecTransfert)
                listenerApi.dispatch(bloquerAutoResume())
                setTimeout(()=>declencherRedemarrage(workers, listenerApi.dispatch, listenerApi.getState), state.autoResumeMs)
            }
        }
    }
}

function declencherRedemarrage(workers, dispatch, getState) {
    dispatch(debloquerAutoResume())
    const state = getState()[SLICE_NAME]
    const fichier = state.liste.reduce((acc, item)=>{
        if(acc) return acc
        if(item.etat === CONST_TRANSFERT.ETAT_ECHEC) return item
        return false
    }, false)
    if(fichier) {
        console.info("declencherRedemarrage Transfert de %O", fichier.fuuid)
        dispatch(continuerUpload(workers))
            .catch(err=>console.error("declencherRedemarrage Erreur auto-resume upload", err))
    } else {
        console.debug("declencherRedemarrage Il ne reste aucun fichiers a transferer")
    }
}

async function tacheUpload(workers, listenerApi, forkApi) {
    // console.debug("Fork api : %O", forkApi)
    const dispatch = listenerApi.dispatch

    let nextUpload = getProchainUpload(listenerApi.getState().uploader.liste)

    const cancelToken = {cancelled: false}
    const aborted = event => {
        // console.debug("Aborted ", event)
        cancelToken.cancelled = true
    }
    forkApi.signal.onabort = aborted

    if(!nextUpload) return  // Rien a faire

    // Commencer boucle d'upload
    while(nextUpload) {
        // console.debug("Next upload : %O", nextUpload)
        const correlation = nextUpload.correlation
        try {
            await uploadFichier(workers, dispatch, nextUpload, cancelToken)

            // Trouver prochain upload
            if (forkApi.signal.aborted) {
                // console.debug("tacheUpload annulee")
                marquerUploadEtat(workers, dispatch, correlation, {etat: ETAT_UPLOAD_INCOMPLET})
                    .catch(err=>console.error("Erreur marquer upload echec %s : %O", correlation, err))
                return
            }
            nextUpload = getProchainUpload(listenerApi.getState().uploader.liste)

        } catch (err) {
            console.error("Erreur tache upload correlation %s: %O", correlation, err)
            await marquerUploadEtat(workers, dispatch, correlation, {etat: ETAT_ECHEC})
                .catch(err2=>{
                    console.error("Erreur marquer upload echec %s : %O", correlation, err2)
                    throw err  // Relancer l'erreur originale pour eviter une boucle sans fin
                })
            // Tenter de passer au prochain upload
            nextUpload = getProchainUpload(listenerApi.getState().uploader.liste)
            // throw err
        }
    }
}

async function uploadFichier(workers, dispatch, fichier, cancelToken) {
//     console.debug("uploadFichier : ", fichier)
    const { transfertUploadFichiers } = workers
    const { correlation } = fichier

    await marquerUploadEtat(workers, dispatch, correlation, {etat: ETAT_UPLOADING})

    const marquerUploadEtatProxy = Comlink.proxy((correlation, opts)=>{
        return marquerUploadEtat(workers, dispatch, correlation, opts)
    })

    await transfertUploadFichiers.uploadFichier(workers, marquerUploadEtatProxy, fichier, cancelToken)

    // Upload complete, dispatch nouvel etat
    await marquerUploadEtat(workers, dispatch, correlation, {etat: ETAT_COMPLETE})
    await dispatch(confirmerUpload(workers, correlation))
        .catch(err=>console.error("Erreur cleanup fichier upload ", err))
}

async function marquerUploadEtat(workers, dispatch, correlation, etat) {
    const contenu = {correlation, ...etat}
    const { uploadFichiersDao } = workers
    
    await uploadFichiersDao.updateFichierUpload(contenu)
    
    return dispatch(updateUpload(contenu))
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

    const inclureEtats = [ETAT_PRET, ETAT_ECHEC, ETAT_UPLOADING, ETAT_UPLOAD_INCOMPLET]
    liste.forEach( upload => {
        const { correlation, etat, tailleCompletee, taille } = upload

        let inclure = false
        if(inclureEtats.includes(etat)) inclure = true
        else if([ETAT_COMPLETE, ETAT_CONFIRME].includes(etat) && completesCycle.includes(correlation)) inclure = true

        if(inclure) {
            tailleCompleteeTotale += tailleCompletee
            tailleTotale += taille
        }
    })

    const pourcentage = Math.floor(100 * tailleCompleteeTotale / tailleTotale)

    return {total: tailleTotale, complete: tailleCompleteeTotale, pourcentage}
}

function getProchainUpload(liste) {
    // console.debug("Get prochain upload pre-tri ", liste)
    const listeCopie = liste.filter(item=>item.etat === ETAT_PRET)
    listeCopie.sort(trierListeUpload)
    // console.debug("Get prochain upload : ", listeCopie)
    return listeCopie.shift()
}

export function trierListeUpload(a, b) {
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