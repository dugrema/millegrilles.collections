import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'

const SLICE_NAME = 'mediaJobs'

const initialState = {
    liste: [],                  // Liste de fichiers en traitement (tous etats confondus)
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
}

// Actions

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function mergeAction(state, action) {
    let jobs = action.payload

    // Convertir en array de jobs au besoin
    if(!Array.isArray(jobs)) jobs = [jobs]

    let trier = false

    for (let job of jobs) {
        job = mapJob(job)
        const { fuuid, cle_conversion } = job

        // Map job

        if(job.supprime === true) {
            // Delete. Supprimer la job de la liste
            state.liste = state.liste.filter(item=>{
                return ! (item.fuuid === fuuid && item.cle_conversion === cle_conversion)
            })
        } else {
            let jobItem = state.liste.filter(item=>{
                return item.fuuid === fuuid && item.cle_conversion === cle_conversion
            }).pop()
            
            if(!jobItem) {
                // Insert. Nouvelle job
                jobItem = job
                state.liste.push(jobItem)
                trier = true    // Trigger un tri de la liste
            } else {
                // Update. Copier contenu recu dans la job existante
                Object.assign(jobItem, job)
                trier = true    // Trigger un tri de la liste
            }
        }

    }

    if(trier) {
        console.warn("TODO - trier liste")
    }

    console.debug("Liste jobs post merge : ", [...state.liste])

}

function clearCompletesAction(state, action) {
    state.liste = state.liste.filter(item=>{
        return item.pct_progres !== 100
    })
}

const mediaJobsSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        merge: mergeAction,
        clearCompletes: clearCompletesAction,
    }
})

export const { 
    setUserId, merge, clearCompletes,
} = mediaJobsSlice.actions
export default mediaJobsSlice.reducer

// Thunks

export function mergeJobs(workers, jobs) {
    return (dispatch, getState) => traiterMergeJobs(workers, jobs, dispatch, getState)
}

async function traiterMergeJobs(workers, jobs, dispatch, getState) {
    const { clesDao } = workers
    
    // console.debug("traiterAjouterJob ", job.tuuid)
    console.debug("traiterMergeJobs payload : ", jobs)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    let fuuids = Set()
    for await (const job of jobs) {
        const { fuuid } = job
        fuuids.push(fuuid)
    }

    fuuids = [...fuuids]  // Convertir HashSet en array

    console.debug("Charger cles pour ", fuuids)
    const cles = await clesDao.getCles(fuuids)
    console.debug("Cles recues ", cles)

    // dispatch(pushMediaJob(job))

    // const infoDownload = getState()[SLICE_NAME].liste.filter(item=>item.fuuid === fuuid).pop()
    // console.debug("ajouterDownloadAction fuuid %s info existante %O", fuuid, infoDownload)
    // if(!infoDownload) {
    //     // Ajouter l'upload, un middleware va charger le reste de l'information
    //     // console.debug("Ajout upload %O", correlation)

    //     await clesDao.getCles([fuuid])  // Fetch pour cache (ne pas stocker dans redux)

    //     const nouveauDownload = {
    //         ...docDownload,
    //         fuuid,
    //         taille,
    //         userId,
    //         etat: ETAT_PRET,
    //         dateCreation: new Date().getTime(),
    //     }

    //     // Conserver le nouveau download dans IDB
    //     await downloadFichiersDao.updateFichierDownload(nouveauDownload)

    //     dispatch(pushDownload(nouveauDownload))
    // } else {
    //     throw new Error(`Download ${fuuid} existe deja`)
    // }    
}

// Correction de mapping d'evenements/autre sources
function mapJob(job) {
    const jobCopie = {...job}
    if(jobCopie.pctProgres) jobCopie.pct_progres = jobCopie.pctProgres
    return jobCopie
}
