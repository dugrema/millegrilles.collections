import { createSlice, isAnyOf, createListenerMiddleware } from '@reduxjs/toolkit'

const SLICE_NAME = 'partager'

const initialState = {
    userId: '',         // UserId courant, permet de stocker plusieurs users localement

    // Partage de l'usager courant avec tiers
    listeContacts: [],  // Liste de contacts connus
    listePartagesUsager: [],    // Liste des partages par l'usager avec d'autres { tuuid, contact_id }

    // Partage de tiers avec l'usager courant
    listePartagesAutres: [],    // Liste des partages par d'autres usagers avec l'usager courant { tuuid, contact_id, user_id }
    userPartages: [],           // Liste des usagers qui ont partage au moins une collection { user_id, nom_usager }
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

function setPartagesUsagerAction(state, action) {
    state.listePartagesUsager = action.payload
}

function setListePartagesAutresAction(state, action) {
    state.listePartagesAutres = action.payload
}

function setUserPartagesAction(state, action) {
    const listeUsagers = [...action.payload]
    listeUsagers.sort((a,b)=>{
        return a.nom_usager.localeCompare(b.nom_usager)
    })
    state.userPartages = listeUsagers
}

const slice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        entretien: entretienAction,
        setContacts: setContactsAction,
        setPartagesUsager: setPartagesUsagerAction,
        setListePartagesAutres: setListePartagesAutresAction,
        setUserPartages: setUserPartagesAction,
    }
})

export const { 
    setUserId, merge, clearCompletes, entretien,
    setContacts, setPartagesUsager, 
    setListePartagesAutres, setUserPartages,
} = slice.actions
export default slice.reducer

// Thunks

export function chargerInfoContacts(workers) {
    return (dispatch, getState) => traiterChargerInfoContacts(workers, dispatch, getState)
}

async function traiterChargerInfoContacts(workers, dispatch, getState) {
    const { contactsDao } = workers
    
    console.debug("traiterChargerInfoContacts")

    const reponse = await contactsDao.getContacts()
    console.debug("Contacts recus : ", reponse)
    dispatch(setContacts(reponse.contacts))
}

export function chargerPartagesUsager(workers) {
    return (dispatch, getState) => traiterChargerPartagesUsagers(workers, dispatch, getState)
}

async function traiterChargerPartagesUsagers(workers, dispatch, getState) {
    const { contactsDao } = workers
    
    console.debug("traiterChargerPartages")

    const reponse = await contactsDao.getPartagesUsager()
    console.debug("Partages recus : ", reponse)
    dispatch(setPartagesUsager(reponse.partages))
}

export function chargerPartagesDeTiers(workers) {
    return (dispatch, getState) => traiterChargerPartagesDeTiers(workers, dispatch, getState)
}

async function traiterChargerPartagesDeTiers(workers, dispatch, getState) {
    const { contactsDao } = workers
    
    console.debug("traiterChargerPartagesDeTiers")

    const reponse = await contactsDao.getPartagesContact()
    console.debug("Partages tiers recus : ", reponse)
    dispatch(setListePartagesAutres(reponse.partages))

    // Charger liste des usagers
    dispatch(setUserPartages(reponse.usagers))

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