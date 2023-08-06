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

function setContactsAction(state, action) {
    const liste = action.payload
    liste.sort(sortUsagers)
    state.listeContacts = liste
}

const slice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        entretien: entretienAction,
        setContacts: setContactsAction,
    }
})

export const { 
    setUserId, merge, clearCompletes, entretien,
    setContacts,
} = slice.actions
export default slice.reducer

// Thunks

export function chargerInfoContacts(workers) {
    return (dispatch, getState) => traiterChargerInfoContacts(workers, dispatch, getState)
}

async function traiterChargerInfoContacts(workers, dispatch, getState) {
    const { connexion, clesDao, contactsDao } = workers
    
    console.debug("traiterChargerInfoContacts")

    const reponse = await contactsDao.getContacts()
    console.debug("Contacts recus : ", reponse)
    dispatch(setContacts(reponse.contacts))
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
        // await listenerApi.dispatch(dechiffrerContacts(workers))

    } finally {
        await listenerApi.subscribe()
    }
}

function sortUsagers(a, b) {
    const nomA = a.nom_usager, nomB = b.nom_usager
    return nomA.localeCompare(nomB)
}