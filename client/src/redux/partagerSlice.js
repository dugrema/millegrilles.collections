import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'

const SLICE_NAME = 'partager'

const initialState = {
    userId: '',         // UserId courant, permet de stocker plusieurs users localement
    listeContacts: [],  // Liste de contacts connus
    listePartagesAutres: [],    // Liste des partages par autres usagers
    listePartagesUsager: [],    // Liste des partages par l'usager avec d'autres
}

// Actions

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function entretienAction(state, action) {
    // Dummy pour declencher middleware
}

const mediaJobsSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        entretien: entretienAction,
    }
})

export const { 
    setUserId, merge, clearCompletes, entretien,
} = mediaJobsSlice.actions
export default mediaJobsSlice.reducer

// Thunks

function chargerInfoContacts(workers) {
    return (dispatch, getState) => traiterChargerInfoContacts(workers, dispatch, getState)
}

async function traiterChargerInfoContacts(workers, dispatch, getState) {
    const { connexion, clesDao, contactsDao } = workers
    
    // console.debug("traiterChargerInfoFichiers")
    
    // const jobsIncompletes = getState()[SLICE_NAME].liste.filter(item=>{
    //     return item.charge !== true
    // })

    // let tuuids = new Set(), fuuidsChiffres = new Set()
    // for await (const job of jobsIncompletes) {
    //     const { fuuid, tuuid } = job

    //     // Tenter de charger information locale
    //     if(tuuid) {
    //         const fichier = (await collectionsDao.getParTuuids([tuuid])).pop()
    //         if(fichier) {
    //             // console.debug("Fichier existant : ", fichier)
    //             const jobMaj = {...fichier, ...job, charge: true}
    //             if(!fichier.nom) {
    //                 fuuidsChiffres.add(fuuid)  // Le fichier n'est pas dechiffre
    //             } else {
    //                 jobMaj.dechiffre = true
    //             }
    //             dispatch(merge(jobMaj))
    //         } else {
    //             tuuids.add(tuuid)
    //         }
    //     } else {
    //         console.warn("Job sans tuuid ", job)
    //     }
    // }

    // // console.debug("Tuuids a charger : ", tuuids)

    // tuuids = [...tuuids]  // Convertir HashSet en array
    // if(tuuids.length > 0) {
    //     const documentsInfo = await connexion.getDocuments(tuuids)
    //     // console.debug("Recu docs info pour jobs ", documentsInfo)
    //     if(documentsInfo.fichiers && documentsInfo.fichiers.length > 0) {
    //         for(const fichier of documentsInfo.fichiers) {
    //             dispatch(merge({...fichier, fuuid: fichier.fuuid_v_courante, charge: true}))
    //             collectionsDao.updateDocument(fichier)
    //                 .catch(err=>console.error("Erreur sauvegarde fichier"))
    //         }
    //     }
    // }

}

function dechiffrerContacts(workers) {
    return (dispatch, getState) => traiterDechiffrerContacts(workers, dispatch, getState)
}

async function traiterDechiffrerContacts(workers, dispatch, getState) {
    const { connexion, clesDao, contactsDao, chiffrage } = workers
    
    // console.debug("traiterDechiffrerInfoFichiers")

    // const fuuidsChiffres = getState()[SLICE_NAME].liste.filter(item=>{
    //     return item.dechiffre !== true
    // }).map(item=>item.fuuid)

    // // console.debug("Charger cles pour ", fuuidsChiffres)
    // if(fuuidsChiffres.length > 0) {
    //     const cles = await clesDao.getCles(fuuidsChiffres)
    //     // console.debug("Cles recues ", cles)

    //     for await (const job of getState()[SLICE_NAME].liste) {
    //         const { tuuid, fuuid } = job
    //         const cle = cles[fuuid]
    //         if(cle) {
    //             const version_courante = job.version_courante || {}
    //             const metadata = version_courante.metadata
    //             if(metadata) {
    //                 // console.debug("Dechiffrer ", job)
    //                 const metaDechiffree = await chiffrage.chiffrage.dechiffrerChampsChiffres(metadata, cle)
    //                 // console.debug("Fichier dechiffre : ", metaDechiffree)
    //                 const jobMaj = {...job, ...metaDechiffree, dechiffre: true}
    //                 dispatch(merge(jobMaj))
    //             }
    //         }
    //     }

    // }
    
}

// Middleware
export function middlewareSetup(workers) {
    const uploaderMiddleware = createListenerMiddleware()
    
    uploaderMiddleware.startListening({
        matcher: isAnyOf(entretien),
        effect: (action, listenerApi) => middlewareListener(workers, action, listenerApi)
    }) 
    
    return uploaderMiddleware
}

async function middlewareListener(workers, action, listenerApi) {
    // console.debug("downloaderMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
    // console.debug("Arret upload info : %O", arretUpload)

    await listenerApi.unsubscribe()
    try {
        if(action.type === entretien.type) {
            // console.debug("Action entretien")
        }

        await listenerApi.dispatch(chargerInfoContacts(workers))
        await listenerApi.dispatch(dechiffrerContacts(workers))

    } finally {
        await listenerApi.subscribe()
    }
}
