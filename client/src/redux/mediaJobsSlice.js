import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'

const SLICE_NAME = 'downloader'

const initialState = {
    liste: [],                  // Liste de fichiers en traitement (tous etats confondus)
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
}

// Actions

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function pushMediaJobAction(state, action) {
    const job = action.payload
    console.debug("pushMediaJobAction payload : ", job)
    state.liste.push(job)
}

const mediaJobsSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        pushMediaJob: pushMediaJobAction,
    }
})

export const { 
    setUserId, pushMediaJob,
} = mediaJobsSlice.actions
export default mediaJobsSlice.reducer

// Thunks

export function ajouterJob(workers, job) {
    return (dispatch, getState) => traiterAjouterJob(workers, job, dispatch, getState)
}

async function traiterAjouterJob(workers, job, dispatch, getState) {
    const { clesDao } = workers
    
    // console.debug("traiterAjouterJob ", job.tuuid)
    console.debug("traiterAjouterDownload payload : ", job)
    
    const userId = getState()[SLICE_NAME].userId
    if(!userId) throw new Error("userId n'est pas initialise dans downloaderSlice")

    const { fuuid, tuuid } = job

    dispatch(pushMediaJob(job))

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
