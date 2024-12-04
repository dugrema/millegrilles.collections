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
        if(job.job_id) {
            job = mapJob(job)
        } else {
            console.debug("job sans job_id : ", job)
            continue  // Skip
        }

        // console.debug("Mapper job ", job)
        const { job_id, fuuid } = job

        // Map job
        if(job.supprime === true) {
            // Delete. Supprimer la job de la liste
            state.liste = state.liste.filter(item=>{
                return ! (item.fuuid === fuuid && item.job_id === job_id)
            })
        } else {
            let jobItem = state.liste.filter(item=>{
                return item.fuuid === fuuid && item.job_id === job_id
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
        // console.warn("TODO - trier liste")
    }

}

function clearCompletesAction(state, action) {
    state.liste = state.liste.filter(item=>{
        // Retirer conversion completee et confirmee par convertisseur
        if(item.etat === 'termine') return false

        // Conserver jobs en erreur
        if([4, 5].includes(item.etat)) return true

        // Conserver jobs a moins de 100%
        return item.pct_progres === null || isNaN(item.pct_progres) || item.pct_progres !== 100
    })
}

function clearAction(state, action) {
    state.liste = []
}

function entretienAction(state, action) {
    // Dummy pour declencher middleware
}

const mediaJobsSlice = createSlice({
    name: SLICE_NAME,
    initialState,
    reducers: {
        setUserId: setUserIdAction,
        merge: mergeAction,
        clearCompletes: clearCompletesAction,
        clear: clearAction,
        entretien: entretienAction,
    }
})

export const { 
    setUserId, merge, clearCompletes, clear, entretien,
} = mediaJobsSlice.actions
export default mediaJobsSlice.reducer

// Thunks

function chargerInfoFichiers(workers) {
    return (dispatch, getState) => traiterChargerInfoFichiers(workers, dispatch, getState)
}

async function traiterChargerInfoFichiers(workers, dispatch, getState) {
    const { connexion, collectionsDao } = workers
    
    // console.debug("traiterChargerInfoFichiers")
    
    const jobsIncompletes = getState()[SLICE_NAME].liste.filter(item=>{
        return item.charge !== true
    })

    let tuuids = new Set(), fuuidsChiffres = new Set()
    for await (const job of jobsIncompletes) {
        const { fuuid, tuuid } = job

        // Tenter de charger information locale
        if(tuuid) {
            const fichier = (await collectionsDao.getParTuuids([tuuid])).pop()
            if(fichier) {
                // console.debug("Fichier existant : ", fichier)
                const jobMaj = {...fichier, ...job, charge: true}
                if(!fichier.nom) {
                    fuuidsChiffres.add(fuuid)  // Le fichier n'est pas dechiffre
                } else {
                    jobMaj.dechiffre = true
                }
                dispatch(merge(jobMaj))
            } else {
                tuuids.add(tuuid)
            }
        } else {
            console.warn("Job sans tuuid ", job)
        }
    }

    // console.debug("Tuuids a charger : ", tuuids)

    tuuids = [...tuuids]  // Convertir HashSet en array
    if(tuuids.length > 0) {
        const documentsInfo = await connexion.getDocuments(tuuids)
        // console.debug("Recu docs info pour jobs ", documentsInfo)
        if(documentsInfo.fichiers && documentsInfo.fichiers.length > 0) {
            for(const fichier of documentsInfo.fichiers) {
                dispatch(merge({...fichier, fuuid: fichier.fuuid_v_courante, charge: true}))
                collectionsDao.updateDocument(fichier)
                    .catch(err=>console.error("Erreur sauvegarde fichier"))
            }
        }
    }

}

function dechiffrerInfoFichiers(workers) {
    return (dispatch, getState) => traiterDechiffrerInfoFichiers(workers, dispatch, getState)
}

async function traiterDechiffrerInfoFichiers(workers, dispatch, getState) {
    const { /* connexion, collectionsDao, */ clesDao, chiffrage } = workers
    
    // console.debug("traiterDechiffrerInfoFichiers")

    const fuuidsChiffres = getState()[SLICE_NAME].liste.filter(item=>{
        return item.dechiffre !== true
    }).map(item=>item.fuuid)

    // console.debug("Charger cles pour ", fuuidsChiffres)
    if(fuuidsChiffres.length > 0) {
        const cles = await clesDao.getCles(fuuidsChiffres)
        // console.debug("Cles recues ", cles)

        for await (const job of getState()[SLICE_NAME].liste) {
            const { /* tuuid, */ fuuid } = job
            const cle = cles[fuuid]
            if(cle) {
                const version_courante = job.version_courante || {}
                const metadata = version_courante.metadata
                if(metadata) {
                    // console.debug("Dechiffrer ", job)
                    const metaDechiffree = await chiffrage.chiffrage.dechiffrerChampsChiffres(metadata, cle)
                    // console.debug("Fichier dechiffre : ", metaDechiffree)
                    const jobMaj = {...job, ...metaDechiffree, dechiffre: true}
                    dispatch(merge(jobMaj))
                }
            }
        }

    }
    
}

// Middleware
export function middlewareSetup(workers) {
    const uploaderMiddleware = createListenerMiddleware()
    
    uploaderMiddleware.startListening({
        matcher: isAnyOf(merge, entretien),
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

        await listenerApi.dispatch(chargerInfoFichiers(workers))
        await listenerApi.dispatch(dechiffrerInfoFichiers(workers))

    } finally {
        await listenerApi.subscribe()
    }
}

// Correction de mapping d'evenements/autre sources
function mapJob(job) {
    const jobCopie = {...job}
    if(jobCopie.pctProgres) jobCopie.pct_progres = jobCopie.pctProgres
    // if(!jobCopie.job_id) {
    //     let resolution = Math.min(jobCopie.width || Number.MAX_SAFE_INTEGER, jobCopie.height || Number.MAX_SAFE_INTEGER)
    //     resolution += 'p'
    //     const cle_conversion = [jobCopie.mimetype, jobCopie.videoCodec, resolution, jobCopie.videoQuality].join(';')
    //     jobCopie.cle_conversion = cle_conversion
    // }
    return jobCopie
}
