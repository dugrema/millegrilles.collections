import { base64 } from 'multiformats/bases/base64'
import { createSlice, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { getDocuments } from '../fonctionsFichiers'

const SOURCE_COLLECTION = 'collection',
      SOURCE_PLUS_RECENT = 'plusrecent',
      SOURCE_CORBEILLE = 'corbeille',
      SOURCE_RECHERCHE = 'recherche',
      SOURCE_PARTAGES_USAGER = 'partagesUsager',  // Usager courant envers d'autres usagers (contacts)
      SOURCE_PARTAGES_CONTACTS = 'partagesContacts',  // Partages par un autre usager (on est le contact)

      // SOURCE_INDEX = 'index'
      CONST_SYNC_BATCH_SIZE = 100,
      SAFEGUARD_BATCH_MAX = 1000,
      TAILLE_AFFICHEE_INIT = 50,
      INCREMENT_TAILLE_AFFICHEE = 25,
      CONST_RECHERCHE_LIMITE = 500

const initialState = {
    idbInitialise: false,       // Flag IDB initialise
    cuuid: null,                // Identificateur de collection
    sortKeys: {key: 'nom', ordre: 1}, // Ordre de tri
    source: SOURCE_COLLECTION,  // Source de la requete - collection, plusrecent, corbeille, index, etc.
    liste: null,                // Liste triee de fichiers
    collection: '',             // Information sur la collection courante
    breadcrumb: [],             // Breadcrumb du path de la collection affichee
    userId: '',                 // UserId courant, permet de stocker plusieurs users localement
    intervalle: null,           // Intervalle de temps des donnees, l'effet depend de la source
    // listeDechiffrage: [],       // Liste de fichiers a dechiffrer
    dictDechiffrage: {},        // Dict de dechiffrage (tuuid:doc)
    selection: null,            // Fichiers/collections selectionnees
    mergeVersion: 0,            // Utilise pour flagger les changements
    maxNombreAffiches: TAILLE_AFFICHEE_INIT,
    dechiffrageInitialComplete: false,
    bytesTotalDossier: 0,       // Nombre de bytes dans le dossier
    parametresRecherche: '',    // String de recherche
    nombreFichiersTotal: 0,     // Utilise pour listes partielles (e.g. recherche)
    
    partageUserIdTiers: '',     // Le userId tiers du a utiliser pour la navigation
    partageContactId: '',       // Le contactId du partage de reference
}

// Actions

function setUserIdAction(state, action) {
    state.userId = action.payload
}

function setSortKeysAction(state, action) {
    const sortKeys = action.payload
    state.sortKeys = sortKeys
    if(state.liste) state.liste.sort(genererTriListe(sortKeys))
}

function setCuuidAction(state, action) {
    // state.source = SOURCE_COLLECTION
    state.cuuid = action.payload
}

function setUserContactIdAction(state, action) {
    const { userId, contactId } = action.payload
    state.partageUserIdTiers = userId
    state.partageContactId = contactId
    if(state.liste) state.liste.forEach(item=>{
        item.contactId = contactId
    })
}

function setSourceAction(state, action) {
    state.source = action.payload
    state.cuuid = null
    state.intervalle = null
    state.breadcrumb = []
    state.liste = null
    state.partageUserIdTiers = ''
    state.partageContactId = ''
}

function setIntervalleAction(state, action) {
    state.intervalle = action.payload
}

function setCollectionInfoAction(state, action) {
    const collection = action.payload
    state.collection = collection
    // state.source = SOURCE_COLLECTION
    // state.sortKeys = {}

    // // Transferer le nom vers le breadcrumb
    // for(const bc of state.breadcrumb) {
    //     console.debug("setCollectionInfoAction Breadcrumb ", {...bc})
    // }
    // console.debug("setCollectionInfoAction %O", collection)
    // if(collection && collection.nom) {
    //     const len = state.breadcrumb.length
    //     if(len > 0) {
    //         const courant = state.breadcrumb[len-1]
    //         // console.debug("Breadcrumb courant %s (nom %s)", courant.tuuid, courant.nom)
    //         if(courant.tuuid === collection.tuuid) {
    //             // console.debug("Changer nom courant pour %s", collection.nom)
    //             courant.label = collection.nom
    //         }
    //     }
    // }
}

function pushAction(state, action) {
    const mergeVersion = state.mergeVersion
    state.mergeVersion++

    const contactId = state.partageContactId

    let {liste: payload, clear, nombreFichiersTotal} = action.payload
    if(clear === true) state.liste = []  // Reset liste

    let liste = state.liste || []
    if( Array.isArray(payload) ) {
        const ajouts = payload.map(item=>{return {...item, '_mergeVersion': mergeVersion, contactId}})
        // console.debug("pushAction ajouter ", ajouts)
        liste = liste.concat(ajouts)
    } else {
        const ajout = {...payload, '_mergeVersion': mergeVersion, contactId}
        // console.debug("pushAction ajouter ", ajout)
        liste.push(ajout)
    }

    if(nombreFichiersTotal) {
        state.nombreFichiersTotal = nombreFichiersTotal
    } else {
        state.nombreFichiersTotal = payload.length
    }

    // Trier
    liste.sort(genererTriListe(state.sortKeys))
    // console.debug("pushAction liste triee : %O", liste)

    state.bytesTotalDossier = liste
        .filter(item=>item.version_courante && item.version_courante.taille)
        .reduce((acc, item)=>acc+item.version_courante.taille, 0)

    state.liste = liste
}

function clearAction(state) {
    state.liste = null
    // state.cuuid = null
    state.collection = null
    state.maxNombreAffiches = TAILLE_AFFICHEE_INIT
    state.dechiffrageInitialComplete = false
}

// function supprimerAction(state, action) {
//     const tuuid = action.payload
//     state.liste = state.liste.filter(item => item.tuuid !== tuuid)
// }

function breadcrumbPushAction(state, action) {
    // console.debug("State breadcrumb %O, action %O", state.breadcrumb, action)

    let { tuuid, opts } = action.payload
    opts = opts || {}

    if(!tuuid) return  // Rien a faire, on ne push pas le favoris

    const label = opts.nom || tuuid
    const val = {tuuid, label}

    const len = state.breadcrumb.length
    if(len > 0) {
        const courant = state.breadcrumb[len-1]
        if(courant.tuuid === tuuid) {
            // on push le meme cuuid a nouveau, remplacer
            const liste = [...state.breadcrumb]
            liste[len-1] = val
            // console.debug("breadcrumbPushAction Mise a jour breadcrumb ", liste)
            state.breadcrumb = liste
            return
        }
    }
    state.breadcrumb.push(val)
    // console.debug("breadcrumbPushAction Breadcrumb etat : ", [...state.breadcrumb])
}

function breadcrumbSliceAction(state, action) {
    // console.debug("Breadcrumb slice : ", action)
    const toLevel = action.payload
    // level '' est favoris, 0 est la premiere collection (idx === 0)
    if(!toLevel) state.breadcrumb = []
    else state.breadcrumb = state.breadcrumb.slice(0, toLevel+1)
}

// payload {tuuid, data, images, video}
function mergeTuuidDataAction(state, action) {
    const mergeVersion = state.mergeVersion
    state.mergeVersion++

    let payload = action.payload
    if(!Array.isArray(payload)) {
        payload = [payload]
    }

    const cuuidCourant = state.cuuid
    if(state.source === SOURCE_RECHERCHE) {
        // Pas de filtre, les fichiers proviennent de tous les cuuids
    } else {
        if(!cuuidCourant) {
            // S'assurer que tous les fichiers sont sans path_cuuids
            payload = payload.filter(item=>!item.data.path_cuuids)
        } else {
            // S'assurer que tous les fichiers sont du meme cuuid
            payload = payload.filter(item=>{
                return item.data.path_cuuids && item.data.path_cuuids[0] === cuuidCourant
            })
        }
    }

    const contactId = state.partageContactId

    for (const payloadFichier of payload) {
        // console.debug("mergeTuuidDataAction action: %O, cuuid courant: %O", action, state.cuuid)
        let { tuuid } = payloadFichier

        // Ajout flag _mergeVersion pour rafraichissement ecran
        const data = {...(payloadFichier.data || {}), contactId}
        data['_mergeVersion'] = mergeVersion

        // const cuuid = data.cuuid,
        //       cuuids = data.cuuids || []
        const cuuid = data.path_cuuids?data.path_cuuids[0]:null
        const images = payloadFichier.images || data.images,
              video = payloadFichier.video || data.video

        const liste = state.liste || []
        const cuuidCourant = state.cuuid,
            source = state.source,
            intervalle = state.intervalle
        
        let peutAppend = false
        if(source === SOURCE_COLLECTION) {
            if( data.supprime === true ) {
                // false
            } else if( cuuidCourant ) {
                // Verifier si le fichier est sous le cuuid courant
                peutAppend = cuuid === cuuidCourant  // || cuuids.includes(cuuidCourant)
            } else if( data.type_node === 'Collection' ) {
                // cuuidCourant est falsy, inclure si le dossier est une Collection
                peutAppend = true
            }
        } else if(source === SOURCE_CORBEILLE) {
            peutAppend = data.supprime === true
        } else if(source === SOURCE_RECHERCHE) {
            peutAppend = data.supprime === true
        // } else if(source === SOURCE_PARTAGES_USAGER) {
        //     peutAppend = true  // On n'a pas de filtres sur les partages usager
        } else if(source === SOURCE_PARTAGES_CONTACTS) {
            peutAppend = true  // On n'a pas de filtres sur les partages contacts
        } else if(source === SOURCE_PLUS_RECENT) {
            if(data.supprime === true) {
                // False
            } else if(intervalle) {
                const { debut, fin } = intervalle
                const champsDate = ['derniere_modification', 'date_creation']
                champsDate.forEach(champ=>{
                    const valDate = data[champ]
                    if(valDate) {
                        if(valDate >= debut) {
                            if(fin) {
                                if(valDate <= fin) peutAppend = true
                            } else {
                                // Pas de date de fin
                                peutAppend = true
                            }
                        }
                    }
                })
            }
        } else {
            throw new Error(`Source ${source} non supportee`)
        }

        // Maj du breadcrumb au besoin
        if(data.nom) {
            state.breadcrumb.forEach(item=>{
                if(item.tuuid === tuuid) {
                    item.label = data.nom
                }
            })
        }

        let dataCourant
        if(cuuidCourant === tuuid) {
            // Mise a jour de la collection active
            dataCourant = state.collection || {}
            state.collection = dataCourant
        } else {
            // Trouver un fichier correspondant
            dataCourant = liste.filter(item=>item.tuuid === tuuid).pop()
        }

        // Copier donnees vers state
        if(dataCourant) {
            if(data) {
                const copie = {...data}

                // Retirer images et video, traiter separement
                delete copie.images
                delete copie.video

                Object.assign(dataCourant, copie)
            }
            if(images) {
                const imagesCourantes = dataCourant.images || {}
                Object.assign(imagesCourantes, images)
                dataCourant.images = imagesCourantes
            }
            if(video) {
                const videoCourants = dataCourant.video || {}
                Object.assign(videoCourants, video)
                dataCourant.video = videoCourants
            }

            // Verifier si le fichier fait encore partie de la collection courante
            // const cuuids = dataCourant.cuuids || []
            const cuuidDataCourant = dataCourant.path_cuuids?dataCourant.path_cuuids[0]:null

            // console.debug("mergeTuuidDataAction Verifier si dataCourant est encore dans %s : %O", cuuidCourant, cuuids)
            let retirer = false
            if( source === SOURCE_CORBEILLE ) {
                // Verifier si le document est toujours supprime
                retirer = dataCourant.supprime !== true
            } else if( source === SOURCE_RECHERCHE ) {
                // Verifier si le document est toujours supprime
                retirer = dataCourant.supprime === true
            } else {
                if(dataCourant.supprime === true) {
                    // Le document est supprime
                    retirer = true
                } else if( cuuidCourant ) {
                    // Verifier si le fichier est encore candidat pour la liste courante
                    retirer = ! ( cuuidCourant === cuuidDataCourant )
                } else {
                    // Favoris
                    retirer = dataCourant.type_node !== 'Collection'
                }
            }

            if(retirer) state.liste = liste.filter(item=>item.tuuid !== tuuid)

        } else if(peutAppend === true) {
            liste.push(data)
            state.liste = liste
        }
    }

    // Trier
    state.liste.sort(genererTriListe(state.sortKeys))

    state.bytesTotalDossier = state.liste
        .filter(item=>item.version_courante && item.version_courante.taille)
        .reduce((acc, item)=>acc+item.version_courante.taille, 0)

}

// Ajouter des fichiers a la liste de fichiers a dechiffrer
function pushFichiersChiffresAction(state, action) {
    // const fichiers = action.payload
    const fichiers = action.payload.reduce((acc, item)=>{
        acc[item.tuuid] = item
        return acc
    }, {})
    // console.debug("pushFichiersChiffresAction Dechiffrer ", fichiers)
    // state.listeDechiffrage = [...state.listeDechiffrage, ...fichiers]
    state.dictDechiffrage = {...state.dictDechiffrage, ...fichiers}
}

function setFichiersChiffresAction(state, action) {
    const fichiers = action.payload.reduce((acc, item)=>{
        acc[item.tuuid] = item
        return acc
    }, {})
    // console.debug("setFichiersChiffresAction Dechiffrer ", fichiers)
    // state.listeDechiffrage = fichiers
    state.dictDechiffrage = fichiers
}

// Retourne un fichier de la liste a dechiffrer
function clearFichiersChiffresAction(state) {
    // state.listeDechiffrage = []
    state.dictDechiffrage = {}
}

function selectionTuuidsAction(state, action) {
    state.selection = action.payload
}

function incrementerNombreAffichesAction(state, action) {
    if(action.payload === true) {
        // Desactiver la limite
        state.maxNombreAffiches = null
    } else {
        state.maxNombreAffiches = state.maxNombreAffiches + INCREMENT_TAILLE_AFFICHEE
        if(state.dechiffrageInitialComplete === true) {
            // Verifier taille totale des fichiers
            const nombreFichiers = state.liste.length
            if(state.maxNombreAffiches >= nombreFichiers) {
                state.maxNombreAffiches = null
            }
        }
        // console.debug("Nombre affiches : " + state.maxNombreAffiches?state.maxNombreAffiches:'tous')
    }
}

function setDechiffrageCompleteAction(state, action) {
    state.dechiffrageInitialComplete = true
    // console.debug("Dechiffrage complete")
    if(state.maxNombreAffiches >= state.liste.length) {
        state.maxNombreAffiches = null
    }
}

function setParametresRechercheAction(state, action) {
    state.parametresRecherche = action.payload
}

function retirerTuuidsListeAction(state, action) {
    const {cuuid, tuuids} = action.payload
    // console.debug("retirerTuuidsListeAction Retirer de %s tuuids %O", cuuid, tuuids)
    if(cuuid === state.cuuid) {
        const listeMaj = state.liste.filter(item=>!tuuids.includes(item.tuuid))
        state.liste = listeMaj
    }
}

// Slice collection

export function creerSlice(name) {

    return createSlice({
        name,
        initialState,
        reducers: {
            setUserId: setUserIdAction,
            setCuuid: setCuuidAction,
            setCollectionInfo: setCollectionInfoAction,
            setUserContactId: setUserContactIdAction,
            push: pushAction, 
            // supprimer: supprimerAction,
            clear: clearAction,
            mergeTuuidData: mergeTuuidDataAction,
            breadcrumbPush: breadcrumbPushAction,
            breadcrumbSlice: breadcrumbSliceAction,
            setSortKeys: setSortKeysAction,
            setSource: setSourceAction,
            setIntervalle: setIntervalleAction,
            pushFichiersChiffres: pushFichiersChiffresAction,
            clearFichiersChiffres: clearFichiersChiffresAction,
            selectionTuuids: selectionTuuidsAction,
            setFichiersChiffres: setFichiersChiffresAction,
            incrementerNombreAffiches: incrementerNombreAffichesAction,
            setDechiffrageComplete: setDechiffrageCompleteAction,
            setParametresRecherche: setParametresRechercheAction,
            retirerTuuidsListe: retirerTuuidsListeAction,
        }
    })

}

export function creerThunks(actions, nomSlice) {

    // Action creators are generated for each case reducer function
    const { 
        setCuuid, setCollectionInfo, push, clear, mergeTuuidData,
        setSortKeys, setSource, setIntervalle, pushFichiersChiffres, setDechiffrageComplete,
        setUserContactId, breadcrumbPush, breadcrumbSlice, retirerTuuidsListe,
    } = actions

    // Async thunks
    
    function dechiffrerFichiers(workers, fichiers) {
        return (dispatch, getState) => traiterDechiffrerFichiers(workers, fichiers, dispatch, getState)
    }
    
    async function traiterDechiffrerFichiers(workers, fichiers, dispatch, getState) {
    
        if(!fichiers || fichiers.length === 0) return
    
        const { collectionsDao } = workers
    
        // Detecter les cles requises
        const {fichiersChiffres} = identifierClesHachages(fichiers)

        // console.debug('traiterDechiffrerFichiers Cles a extraire : %O de fichiers %O', clesHachage_bytes, fichiersChiffres)
        if(fichiersChiffres.length > 0) dispatch(pushFichiersChiffres(fichiersChiffres))
    
        const tuuidsChiffres = fichiersChiffres.map(item=>item.tuuid)
        for (const fichier of fichiers) {
            // console.debug("traiterDechiffrerFichiers Dechiffrer fichier ", fichier)
            const dechiffre = ! tuuidsChiffres.includes(fichier.tuuid)
    
            // Mettre a jour dans IDB
            collectionsDao.updateDocument(fichier, {dechiffre})
                .catch(err=>console.error("Erreur maj document %O dans idb : %O", fichier, err))
    
            // console.debug("traiterDechiffrerFichiers chargeTuuids dispatch merge %O", fichier)
            dispatch(mergeTuuidData({tuuid: fichier.tuuid, data: fichier}))
        }
    }
    
    function chargerTuuids(workers, tuuids, opts) {
        return (dispatch, getState) => traiterChargerTuuids(workers, tuuids, opts, dispatch, getState)
    }
    
    async function traiterChargerTuuids(workers, tuuids, opts, dispatch, getState) {
        opts = opts || {}
        // console.debug("Charger detail fichiers tuuids : %O, opts : %O", tuuids, opts)
    
        const { connexion, collectionsDao } = workers
        const contactId = opts.contactId || getState().partageContactId
    
        if(typeof(tuuids) === 'string') tuuids = [tuuids]
    
        const resultat = await connexion.getDocuments(tuuids, {...opts, contactId})
        // console.debug("traiterChargerTuuids Reponse ", resultat)

        if(resultat.fichiers) {
    
            // Detecter le besoin de cles
            let fichiers = resultat.fichiers.filter(item=>item)
    
            // Separer fichiers avec chiffrage des fichiers sans chiffrage
            fichiers = fichiers.reduce((acc, item)=>{
                let chiffre = false

                // console.debug("traiterChargerTuuids Traiter item ", item)
                
                const version_courante = item.version_courante || {},
                      { images } = version_courante,
                      metadata = item.metadata  //version_courante.metadata || item.metadata
                if(metadata && metadata.data_chiffre) chiffre = true
                if(images) Object.values(images).forEach(image=>{
                    if(image.data_chiffre) chiffre = true
                })
    
                // Mettre a jour dans IDB
                collectionsDao.updateDocument(item, {dirty: false, dechiffre: !chiffre})
                    .catch(err=>console.error("Erreur maj document %O dans idb : %O", item, err))
    
                if(chiffre) {
                    // Conserver pour dechiffrer une fois la cle disponible
                    // console.debug("Attendre dechiffrage pour %s", item.tuuid)
                    acc.push(item)
                } else {
                    // Traiter immediatement, aucun chiffrage
                    // console.debug("Aucun dechiffrage pour %O", item)
                    dispatch(mergeTuuidData({tuuid: item.tuuid, data: item}))
                }
    
                return acc
            }, [])
    
            // Lancer dechiffrage des fichiers restants
            dispatch(dechiffrerFichiers(workers, fichiers))
                .catch(err=>console.error("Erreur dechiffrage fichiers : %O", err))
        }
    }
    
    // Async collections
    
    function changerCollection(workers, cuuid) {
        return (dispatch, getState) => traiterChangerCollection(workers, cuuid, dispatch, getState)
    }
    
    async function traiterChangerCollection(workers, cuuid, dispatch, getState) {
        if(cuuid === undefined) cuuid = ''  // Collections
    
        const state = getState()[nomSlice]
        const cuuidPrecedent = state.cuuid
        // console.debug("Cuuid precedent : %O, nouveau : %O", cuuidPrecedent, cuuid)
    
        if(cuuidPrecedent === cuuid) return  // Rien a faire, meme collection
    
        dispatch(setCuuid(cuuid))
    
        return Promise.all([
            traiterRafraichirCollection(workers, dispatch, getState),
            traiterRafraichirBreadcrumb(workers, dispatch, getState)
        ])
    }
    
    function rafraichirCollection(workers) {
        // console.debug("rafraichirCollection")
        return (dispatch, getState) => traiterRafraichirCollection(workers, dispatch, getState)
    }
    
    async function traiterRafraichirCollection(workers, dispatch, getState, promisesPreparationCollection) {
        // console.debug('traiterRafraichirCollection')
        const { collectionsDao } = workers
    
        const state = getState()[nomSlice]
        const { userId, cuuid, partageContactId: contactId } = state
    
        // console.debug("Rafraichir '%s' pour userId %O (contactId: %O)", cuuid, userId, contactId)
    
        // Charger le contenu de la collection deja connu
        promisesPreparationCollection = promisesPreparationCollection || []
        promisesPreparationCollection.push(collectionsDao.getParCollection(cuuid, userId))

        // Attendre que les listeners soient prets, recuperer contenu idb
        const contenuIdb = (await Promise.all(promisesPreparationCollection)).pop()

        // Nettoyer la liste
        dispatch(clear())
        
        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        // console.debug("Contenu idb : %O", contenuIdb)
        let documentsExistants = new Set()
        if(contenuIdb) {
            const { documents, collection } = contenuIdb

            // Conserver la liste de tuuids pour determiner si on doit les retirer (e.g. deplace vers autre collection)
            for (const doc of documents) { documentsExistants.add(doc.tuuid) }

            // console.debug("Push documents provenance idb : %O", documents)
            dispatch(setCollectionInfo(collection))
            dispatch(push({liste: documents}))
    
            // Detecter les documents connus qui sont dirty ou pas encore dechiffres
            const tuuids = documents.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            if(tuuids.length > 0) {
                dispatch(chargerTuuids(workers, tuuids, {partage: !!contactId, contactId}))
                    .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
            }
        }
    
        let compteur = 0
        for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
            let resultatSync = await syncCollection(
                dispatch, workers, cuuid, CONST_SYNC_BATCH_SIZE, compteur, 
                {existants: documentsExistants, contactId}
            )
            // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
            if( ! resultatSync || ! resultatSync.liste ) break
            compteur += resultatSync.liste.length
            if( resultatSync.complete ) break
        }
        if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncCollection")
    
        if(documentsExistants.size > 0) {
            // console.debug("Documents retires/deplaces de '%s' : %O", cuuid, documentsExistants)
            const tuuids = []
            for(const tuuid of documentsExistants) {
                dispatch(mergeTuuidData({tuuid, data: {tuuid, cuuid, supprime: true}}))
                tuuids.push(tuuid)
            }
            await collectionsDao.deleteDocuments(tuuids)
        }

        // On marque la fin du chargement/sync
        dispatch(push({liste: []}))
    }
    
    async function traiterRafraichirBreadcrumb(workers, dispatch, getState) {
        const { collectionsDao } = workers
    
        const state = getState()[nomSlice]
        const { userId, cuuid, partageContactId: contactId } = state

        // console.debug('traiterRafraichirBreadcrumb cuuid ', cuuid)

        if(cuuid) {
            // console.debug("Rafraichir '%s' pour userId %O (contactId: %O)", cuuid, userId, contactId)

            const dictRepertoires = {}

            // Charger le contenu de la collection deja connu
            let cuuidInfo = (await collectionsDao.getParTuuids([cuuid])).pop()
            // console.debug("traiterRafraichirBreadcrumb cuuidInfo ", cuuidInfo)
            if(!cuuidInfo) {
                // Charger a partir de la connexion
                const resultat = await getDocuments(workers, [cuuid])
                for(const rep of resultat) {
                    dictRepertoires[rep.tuuid] = rep
                }
                cuuidInfo = dictRepertoires[cuuid]
            } else {
                dictRepertoires[cuuid] = cuuidInfo
            }

            if(!cuuidInfo) throw new Error(`cuuid ${cuuid} introuvable`)

            let pathCuuids = [...(cuuidInfo.path_cuuids || [])]

            if(contactId) {
                // On est en mode partage, ne pas modifier la breadcrumb
                pathCuuids = getState().fichiers.breadcrumb.map(item=>item.tuuid)
            } else {
                // Le path_cuuids est en ordre inverse (idx:0 est le parent immediat)
                pathCuuids.reverse()
            }

            if(pathCuuids.length > 0) {
                const pathCuuidsIdb = await workers.collectionsDao.getParTuuids(pathCuuids)
                // console.debug("Repertoires charges localement : ", repertoires)
                for(const item of pathCuuidsIdb) {
                    dictRepertoires[item.tuuid] = item
                }
                // Trouver repertoires manquants
                const cuuidsManquants = []
                for(const cuuid of pathCuuids) {
                    if(!dictRepertoires[cuuid]) cuuidsManquants.push(cuuid)
                }
                // Charger repertoires manquants
                if(cuuidsManquants.length > 0) {
                    const resultat = await getDocuments(workers, cuuidsManquants)
                    for(const rep of resultat) {
                        dictRepertoires[rep.tuuid] = rep
                    }
                }

                // console.debug("traiterRafraichirBreadcrumb PathFichier Dict repertoires ", dictRepertoires)
                dispatch(breadcrumbSlice(''))
                for(const bc of pathCuuids) {
                    const bcInfo = dictRepertoires[bc]
                    // console.debug("traiterRafraichirBreadcrumb Parent breadcrumb %s : %O", bc, bcInfo)
                    dispatch(breadcrumbPush({tuuid: bcInfo.tuuid, opts: {nom: bcInfo.nom}}))
                }
            }

            // console.debug("traiterRafraichirBreadcrumb Leaf breadcrumb %O", cuuidInfo)
            dispatch(breadcrumbPush({tuuid: cuuidInfo.tuuid, opts: {nom: cuuidInfo.nom}}))

        } else {
            dispatch(breadcrumbSlice(''))  // Favoris
        }
    }

    // DEBUT SOURCES AFFICHAGE

    async function syncCollection(dispatch, workers, cuuid, limit, skip, opts) {
        opts = opts || {}
        const contactId = opts.contactId
        const existants = opts.existants
        const { connexion, collectionsDao } = workers
        const resultat = await connexion.syncCollection(cuuid, {limit, skip, contactId})
        // console.debug("syncCollection liste sync docs : ", resultat)
        const { liste } = resultat
        const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)
        if(existants) {
            for (const doc of liste) {
                existants.delete(doc.tuuid)
            }
        }
    
        // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
        if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
            dispatch(chargerTuuids(workers, listeTuuidsDirty, {partage: !!contactId, contactId}))
                .catch(err=>console.error("Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
        } else {
            dispatch(setDechiffrageComplete())
        }
    
        return resultat
    }
    
    async function syncPlusrecent(dispatch, workers, intervalle, limit, skip) {
        const { connexion, collectionsDao } = workers
        const resultat = await connexion.syncRecents(intervalle.debut, intervalle.fin, {limit, skip})
    
        const { liste } = resultat
        const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)
    
        // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
        if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
            dispatch(chargerTuuids(workers, listeTuuidsDirty))
                .catch(err=>console.error("syncPlusrecent Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
        } else {
            dispatch(setDechiffrageComplete())
        }
    
        return resultat
    }
    
    async function syncCorbeille(dispatch, workers, intervalle, limit, skip) {
        const { connexion, collectionsDao } = workers
        const resultat = await connexion.syncCorbeille(intervalle.debut, intervalle.fin, {limit, skip})
    
        const { liste } = resultat
        const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)
    
        // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
        if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
            dispatch(chargerTuuids(workers, listeTuuidsDirty))
                .catch(err=>console.error("syncCorbeille Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
        } else {
            dispatch(setDechiffrageComplete())
        }
    
        return resultat
    }

    async function syncRecherche(dispatch, workers, listeTuuidsDirty) {
        // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
        if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
            await dispatch(chargerTuuids(workers, listeTuuidsDirty))
        }
        dispatch(setDechiffrageComplete())
    }
    
    // Async plus recent
    function afficherPlusrecents(workers, opts) {
        opts = opts || {}
        let intervalle = opts.intervalle
        if(!intervalle) {
            // Utiliser la derniere semaine par defaut
            let dateDebut = new Date()
            dateDebut.setDate(dateDebut.getDate() - 7)
            dateDebut.setHours(0)
            dateDebut.setMinutes(0)
            dateDebut.setSeconds(0)
            intervalle = {debut: Math.floor(dateDebut.getTime() / 1000), fin: null}
        }
    
        return (dispatch, getState) => traiterChargerPlusrecents(workers, {...opts, intervalle}, dispatch, getState)
    }
    
    async function traiterChargerPlusrecents(workers, opts, dispatch, getState) {
        opts = opts || {}

        const stateInitial = getState()[nomSlice]
        const { userId } = stateInitial
    
        // Changer source, nettoyer la liste
        dispatch(setSource(SOURCE_PLUS_RECENT))
        dispatch(clear())
        
        let intervalle = opts.intervalle
        if(!opts.intervalle) {
            intervalle = stateInitial.intervalle
        }
        dispatch(setIntervalle(intervalle))
        dispatch(setSortKeys({key: 'derniere_modification', ordre: -1}))
    
        // console.debug("traiterChargerCorbeille Intervalle ", intervalle)
        
        const { collectionsDao } = workers
    
        // Charger le contenu de la collection deja connu
        const contenuIdb = await collectionsDao.getPlusrecent(intervalle, userId)
    
        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        // console.debug("Contenu idb : %O", contenuIdb)
        if(contenuIdb) {
            // console.debug("Push documents provenance idb : %O", contenuIdb)
            dispatch(push({liste: contenuIdb, clear: true}))
    
            const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            if(tuuids.length > 0) {
                dispatch(chargerTuuids(workers, tuuids))
                    .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
            }
        }
    
        let compteur = 0
        for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
            let resultatSync = await syncPlusrecent(dispatch, workers, intervalle, CONST_SYNC_BATCH_SIZE, compteur)
            // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
            if( ! resultatSync || ! resultatSync.liste ) break
            compteur += resultatSync.liste.length
            if( resultatSync.complete ) break
        }
        if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncPlusrecent")
    
        // On marque la fin du chargement/sync
        dispatch(push({liste: []}))
    }
    
    // Async corbeille
    
    function afficherCorbeille(workers, opts) {
        opts = opts || {}
        let intervalle = opts.intervalle
        if(!intervalle) {
            // Utiliser la derniere semaine par defaut
            let dateDebut = new Date()
            dateDebut.setDate(dateDebut.getDate() - 7)
            dateDebut.setHours(0)
            dateDebut.setMinutes(0)
            dateDebut.setSeconds(0)
            intervalle = {debut: Math.floor(dateDebut.getTime() / 1000), fin: null}
        }
        return (dispatch, getState) => traiterChargerCorbeille(workers, {...opts, intervalle}, dispatch, getState)
    }
    
    async function traiterChargerCorbeille(workers, opts, dispatch, getState) {
        opts = opts || {}
    
        const stateInitial = getState()[nomSlice]
        const { userId } = stateInitial
    
        // Changer source, nettoyer la liste
        dispatch(setSource(SOURCE_CORBEILLE))
        dispatch(clear())
        
        let intervalle = opts.intervalle
        if(!opts.intervalle) {
            intervalle = stateInitial.intervalle
        }
        dispatch(setIntervalle(intervalle))
        dispatch(setSortKeys({key: 'date_suppression', ordre: -1}))
    
        // console.debug("traiterChargerCorbeille Intervalle ", intervalle)
        
        const { collectionsDao } = workers
    
        // Charger le contenu de la collection deja connu
        const contenuIdb = await collectionsDao.getSupprime(intervalle, userId)
    
        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        // console.debug("Contenu idb : %O", contenuIdb)
        if(contenuIdb) {
            // console.debug("Push documents provenance idb : %O", contenuIdb)
            dispatch(push({liste: contenuIdb, clear: true}))
    
            const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            dispatch(chargerTuuids(workers, tuuids))
                .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
        }
    
        let compteur = 0
        for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
            let resultatSync = await syncCorbeille(dispatch, workers, intervalle, CONST_SYNC_BATCH_SIZE, compteur)
            // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
            if( ! resultatSync || ! resultatSync.liste ) break
            compteur += resultatSync.liste.length
            if( resultatSync.complete ) break
        }
        if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncCorbeille")
    
        // On marque la fin du chargement/sync
        dispatch(push({liste: []}))
    }

    // Async recherche

    function afficherRecherche(workers, opts) {
        opts = opts || {}
        return (dispatch, getState) => traiterChargerRecherche(workers, opts, dispatch, getState)
    }    

    async function traiterChargerRecherche(workers, opts, dispatch, getState) {
        opts = opts || {}
    
        const stateInitial = getState()[nomSlice]
        const {parametresRecherche } = stateInitial

        console.debug("Rechercher fichiers correspondants au terme : %s", parametresRecherche)
    
        // Changer source, nettoyer la liste
        dispatch(setSource(SOURCE_RECHERCHE))
        dispatch(clear())

        if(!parametresRecherche) {
            console.debug("Aucun terme - clear ecran")
            dispatch(push({liste: []}))
            return
        }
        
        dispatch(setSortKeys({key: 'score', ordre: -1}))
    
        const { connexion, collectionsDao } = workers
        const resultatRecherche = await connexion.rechercheIndex( parametresRecherche, 0, CONST_RECHERCHE_LIMITE )
        console.debug("Resultat recherche : ", resultatRecherche)

        if(resultatRecherche.ok !== true) {
            console.warn("Erreur recherche : ", resultatRecherche)
            return
        }

        const listeHits = resultatRecherche.resultat.docs
        const itemsDict = listeHits.reduce((acc, item)=>{
            acc[item.tuuid] = item
            item.fuuid = item.id
            delete item.id
            return acc
        }, {})

        // // Charger le contenu de la collection deja connu
        let contenuIdb = await collectionsDao.getParTuuids(listeHits.map(item=>item.tuuid))
        contenuIdb = contenuIdb.filter(item=>item)

        // Injecter le score
        contenuIdb.forEach(item=>{
            item.score = itemsDict[item.tuuid].score
            delete itemsDict[item.tuuid]
        })

        // Ajouter tous les resultats manquants
        const tuuidsManquants = []
        for(const item of Object.values(itemsDict)) {
            contenuIdb.push(item)
            tuuidsManquants.push(item.tuuid)
        }

        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        if(contenuIdb) {
            // console.debug("Push documents provenance idb : %O", contenuIdb)
            dispatch(push({liste: contenuIdb, nombreFichiersTotal: resultatRecherche.resultat.numFound, clear: true}))
    
            const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            dispatch(chargerTuuids(workers, tuuids))
                .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
        }
    
        // await syncRecherche(dispatch, workers, listeHits.map(item=>item.tuuid))
        await syncRecherche(dispatch, workers, tuuidsManquants)
    }

    // Async partages

    function afficherPartagesUsager(workers, contactId, opts) {
        opts = opts || {}
        return (dispatch, getState) => traiterChargerPartagesUsager(workers, contactId, opts, dispatch, getState)
    }    

    async function traiterChargerPartagesUsager(workers, contactId, opts, dispatch, getState) {
        opts = opts || {}
    
        const stateInitial = getState()[nomSlice]
        const { parametresRecherche } = stateInitial

        console.debug("Rechercher fichiers correspondants au terme : %s", parametresRecherche)
    
        // Changer source, nettoyer la liste
        dispatch(setSource(SOURCE_PARTAGES_USAGER))
        dispatch(clear())

        dispatch(setSortKeys({key: 'nom', ordre: 1}))
    
        const { connexion, collectionsDao } = workers
        const resultat = await connexion.getPartagesUsager(contactId)
        // console.debug("Resultat getPartagesUsager : ", resultat)
        const partages = resultat.partages
        const partagesDict = partages.reduce((acc, item)=>{
            acc[item.tuuid] = item
            return acc
        }, {})

        // Charger le contenu de la collection deja connu
        let contenuIdb = await collectionsDao.getParTuuids(partages.map(item=>item.tuuid))
        contenuIdb = contenuIdb.filter(item=>item)


        // Injecter le contactId
        contenuIdb.forEach(item=>{
            item.contactId = contactId
            delete partagesDict[item.tuuid]  // Retirer la collection qui est deja connue
        })

        // Ajouter tous les resultats manquants
        const tuuidsManquants = []
        for(const item of Object.values(partagesDict)) {
            contenuIdb.push(item)
            tuuidsManquants.push(item.tuuid)
        }

        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        if(contenuIdb) {
            // console.debug("Push documents provenance idb : %O", contenuIdb)
            dispatch(push({liste: contenuIdb, nombreFichiersTotal: partages.length, clear: true}))
            const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            dispatch(chargerTuuids(workers, tuuids))
                .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
        }
    
        // await syncRecherche(dispatch, workers, tuuidsManquants)
    }

    function afficherPartagesContact(workers, userIdTiers, contactId, opts) {
        opts = opts || {}
        return (dispatch, getState) => traiterChargerPartagesContact(workers, userIdTiers, contactId, opts, dispatch, getState)
    }    

    async function traiterChargerPartagesContact(workers, userIdTiers, contactId, opts, dispatch, getState) {
        opts = opts || {}
    
        const stateInitial = getState()[nomSlice]
        const { parametresRecherche } = stateInitial

        // console.debug("Rechercher fichiers correspondants au terme : %s", parametresRecherche)
    
        // Changer source, nettoyer la liste
        dispatch(setSource(SOURCE_PARTAGES_CONTACTS))
        dispatch(clear())

        dispatch(setUserContactId({userId: userIdTiers, contactId: contactId}))
        dispatch(setSortKeys({key: 'nom', ordre: 1}))
    
        const { connexion, collectionsDao } = workers
        const resultat = await connexion.getPartagesContact(userIdTiers, contactId)
        // console.debug("Resultat getPartagesContact : ", resultat)
        const partages = resultat.partages.filter(item=>{
            if(contactId) return item.contact_id === contactId
            return item.user_id === userIdTiers
        })
        const partagesDict = partages
            .reduce((acc, item)=>{
                acc[item.tuuid] = item
                return acc
            }, {})

        // Charger le contenu de la collection deja connu
        let contenuIdb = await collectionsDao.getParTuuids(partages.map(item=>item.tuuid))
        contenuIdb = contenuIdb.filter(item=>item)

        // Injecter le contactId
        contenuIdb.forEach(item=>{
            item.contactId = contactId
            delete partagesDict[item.tuuid]  // Retirer la collection qui est deja connue
        })

        // Ajouter tous les resultats manquants
        const tuuidsManquants = []
        for(const item of Object.values(partagesDict)) {
            contenuIdb.push(item)
            tuuidsManquants.push(item.tuuid)
        }

        // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
        if(contenuIdb) {
            // console.debug("Push documents provenance idb : %O", contenuIdb)
            dispatch(push({liste: contenuIdb, nombreFichiersTotal: partages.length, clear: true}))
            const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
            dispatch(chargerTuuids(workers, tuuids, {partage: true, contactId}))
                .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
        }
    }

    // FIN SOURCES AFFICHAGE
    
    // Ajouter un nouveau fichier (e.g. debut upload)
    function ajouterFichierVolatil(workers, fichier) {
        return (dispatch, getState) => traiterAjouterFichierVolatil(workers, fichier, dispatch, getState)
    }
    
    async function traiterAjouterFichierVolatil(workers, fichier, dispatch, getState) {
        // console.debug("traiterAjouterFichierVolatil ", fichier)
        const tuuid = fichier.id
        
        const fichierCopie = {tuuid, ...fichier}
    
        let cuuids = fichier.cuuids
        if(!cuuids && fichier.cuuid) {
            cuuids = [fichier.cuuid]
        }
        fichierCopie.cuuids = cuuids
    
        const state = getState()[nomSlice]
        const cuuidCourant = state.cuuid
        if(!cuuidCourant) fichierCopie.favoris = true  // Conserver comme favoris
    
        // Toujours associer a l'usager
        if(!fichierCopie.userId) {
            const userId = state.userId
            fichierCopie.user_id = userId
        }
    
        // console.debug("Ajouter fichier volatil : %O", fichierCopie)
    
        const { collectionsDao } = workers
    
        // Ajouter fichier dans IDB avec flags dirty et expiration
        const expiration = new Date().getTime() + 300000  // Valide 5 minutes (e.g. pour upload)
        // // console.debug("Ajout document avec expiration : %O", new Date(expiration))
        collectionsDao.updateDocument(fichierCopie, {dirty: true, expiration})
            .catch(err=>console.error("Erreur maj document %O dans idb : %O", fichierCopie, err))
    
        return dispatch(mergeTuuidData({tuuid, data: fichierCopie}))
    }
    
    function supprimerFichier(workers, tuuid) {
        return (dispatch, getState) => traiterSupprimerFichier(workers, tuuid, dispatch, getState)
    }
    
    async function traiterSupprimerFichier(workers, tuuid, dispatch, getState) {
        const { collectionsDao } = workers
        const cuuid = getState()[nomSlice].cuuid
    
        const doc = (await collectionsDao.getParTuuids([tuuid])).pop()
        // console.debug("traiterSupprimerFichier Doc charge : %O, retirer de cuuid %s", doc, cuuid)
        if(doc) {
            const cuuids = doc.cuuids || []
            doc.cuuids = cuuids.filter(item=>item!==cuuid)
            if(doc.cuuids.length === 0) {
                doc.supprime = true
                doc.date_supprime = Math.floor(new Date()/1000)
                doc.cuuid_supprime = cuuid
            }
            await collectionsDao.updateDocument(doc, {dirty: true, expiration: new Date().getTime() + 120000})
            return dispatch(mergeTuuidData({tuuid, data: doc}))
        }
    }
    
    function restaurerFichier(workers, tuuid) {
        return (dispatch, getState) => traiterRestaurerFichier(workers, tuuid, dispatch, getState)
    }
    
    async function traiterRestaurerFichier(workers, tuuid, dispatch, getState) {
        const { collectionsDao } = workers
    
        const doc = (await collectionsDao.getParTuuids([tuuid])).pop()
        // console.debug("traiterRestaurerFichier Doc charge : ", doc)
        if(doc) {

            // Corriger champs suppression
            doc.supprime = false
            doc.date_supprime = null
            doc.cuuid_supprime = null

            const cuuid_supprime = doc.cuuid_supprime
            if(cuuid_supprime) {
                // console.debug("traiterRestaurerFichier Remettre dans cuuid %s", cuuid_supprime)
                const cuuids = doc.cuuids || []
                cuuids.push(cuuid_supprime)
                doc.cuuids = cuuids
            }

            await collectionsDao.updateDocument(doc, {dirty: true, expiration: new Date().getTime() + 120000})
            return dispatch(mergeTuuidData({tuuid, data: doc}))
        }
    }

    function retirerTuuidsCollection(workers, cuuid, tuuids) {
        return (dispatch, getState) => traiterRetirerTuuidsCollection(workers, cuuid, tuuids, dispatch, getState)
    }

    async function traiterRetirerTuuidsCollection(workers, cuuid, tuuids, dispatch, getState) {
        const { collectionsDao } = workers

        // console.debug("traiterRetirerTuuidsCollection Retirer cuuid %s des docs suivants : %O", cuuid, tuuids)
        // Retirer les documents, laisser redownloader la version la plus a jour
        collectionsDao.deleteDocuments(tuuids)
            .catch(err=>console.error("Erreur suppression documents deplaces %s : ", tuuids, err))

        const cuuidCourant = getState()[nomSlice].cuuid
        if(cuuid === cuuidCourant) {
            // Retirer les tuuids de l'affichage courante
            dispatch(retirerTuuidsListe({cuuid, tuuids}))
        }
    }
    
    // Async actions
    const thunks = { 
        changerCollection, 
        afficherPlusrecents, afficherCorbeille, afficherRecherche, 
        afficherPartagesUsager, 
        afficherPartagesContact,
        chargerTuuids,
        ajouterFichierVolatil, rafraichirCollection, supprimerFichier, restaurerFichier,
        retirerTuuidsCollection,
    }

    return thunks
}

export function creerMiddleware(workers, actions, thunks, nomSlice) {
    // Setup du middleware
    const dechiffrageMiddleware = createListenerMiddleware()

    dechiffrageMiddleware.startListening({
        matcher: isAnyOf(actions.pushFichiersChiffres),
        effect: (action, listenerApi) => dechiffrageMiddlewareListener(workers, actions, thunks, nomSlice, action, listenerApi)
    }) 
    
    return { dechiffrageMiddleware }
}

async function dechiffrageMiddlewareListener(workers, actions, _thunks, nomSlice, _action, listenerApi) {
    // console.debug("dechiffrageMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
    const getState = () => listenerApi.getState()[nomSlice]

    const { clesDao, chiffrage, collectionsDao } = workers
    await listenerApi.unsubscribe()
    try {
        // Recuperer la liste des fichiers chiffres
        // let fichiersChiffres = [...getState().listeDechiffrage]
        let tuuidsChiffres = Object.values(getState().dictDechiffrage).map(item=>item.tuuid)
        const source = getState().source
        const contactId = getState().partageContactId
        const partage = !!(contactId || source === SOURCE_PARTAGES_CONTACTS)
        while(tuuidsChiffres.length > 0) {
            // Trier et slicer une batch de fichiers a dechiffrer
            // const sortKeys = getState().sortKeys
            // fichiersChiffres.sort(genererTriListe(sortKeys))
            const batchTuuids = tuuidsChiffres.slice(0, 50)  // Batch de 20 fichiers a la fois
            tuuidsChiffres = tuuidsChiffres.slice(50)  // Clip

            // Recuperer valeurs a dechiffrer. Si la liste est longue, elle peut etre mise a jour
            // pendant qu'on dechiffre d'autres fichiers.
            const dictDechiffrageMaj = {...getState().dictDechiffrage}
            const tuuidsValues = batchTuuids.map(tuuid=>{
                const valeur = dictDechiffrageMaj[tuuid]
                delete dictDechiffrageMaj[tuuid]
                return valeur
            })
            const listeRestante = Object.values(dictDechiffrageMaj)
            listenerApi.dispatch(actions.setFichiersChiffres(Object.values(listeRestante)))

            // console.debug("dechiffrageMiddlewareListener Dechiffrer %d, reste %d", tuuidsValues.length, listeRestante.length)
            // console.debug("dechiffrageMiddlewareListener Dechiffrer batch ", tuuidsValues)

            // Extraire toutes les cles a charger
            const {liste_hachage_bytes} = identifierClesHachages(tuuidsValues)
            // console.debug("Dechiffrer avec liste_hachage_bytes %s (source: %s, partage: %s) ", liste_hachage_bytes, source, partage)
            let cles = null
            try {
                cles = await clesDao.getCles(liste_hachage_bytes, {partage})
            } catch(err) {
                console.error("Erreur chargement cles %O : %O", liste_hachage_bytes, err)
                continue  // Prochaine batch
            }

            const fichiersDechiffres = []

            for await (const fichierChiffre of tuuidsValues) {
                // console.debug("dechiffrageMiddlewareListener dechiffrer : %O", fichierChiffre)
                // Images inline chiffrees (thumbnail)
                const tuuid = fichierChiffre.tuuid
                let dechiffre = true

                const docCourant = (await collectionsDao.getParTuuids([tuuid])).pop()
                // const fuuid_v_courante = docCourant.fuuid_v_courante
                const version_courante = docCourant.version_courante || {}
                const fuuid_v_courante = version_courante.fuuid
                const metadata = docCourant.metadata || version_courante.metadata,
                      images = version_courante.images || {}

                if( metadata ) {
                    // Dechiffrer champs de metadata chiffres (e.g. nom, date du fichier)
                    const hachage_bytes = metadata.ref_hachage_bytes || metadata.hachage_bytes || fuuid_v_courante
                    let cleMetadata = cles[hachage_bytes]
                    if(cleMetadata) {
                        const metaDechiffree = await chiffrage.chiffrage.dechiffrerChampsChiffres(metadata, cleMetadata)
                        // console.debug("Contenu dechiffre : ", metaDechiffree)
                        // Ajout/override champs de metadonne avec contenu dechiffre
                        Object.assign(docCourant, metaDechiffree)
                    } else {
                        dechiffre = false  // Cle inconnue
                    }
                }

                for await (const image of Object.values(images)) {
                    if(image.data_chiffre) {
                        // Dechiffrer
                        const hachage_bytes = fuuid_v_courante  // image.hachage
                        const cleFichier = cles[hachage_bytes]
                        if(cleFichier) {
                            const cleImage = {...cleFichier, ...image}  // Injecter header/format de l'image
                            const dataChiffre = base64.decode(image.data_chiffre)
                            const ab = await chiffrage.chiffrage.dechiffrer(cleFichier.cleSecrete, dataChiffre, cleImage)
                            const dataDechiffre = base64.encode(ab)
                            image.data = dataDechiffre
                            delete image.data_chiffre
                        } else {
                            dechiffre = false  // Echec, cle non trouvee
                        }
                    }
                }

                // console.debug("fichier dechiffre : %O", docCourant)

                // Mettre a jour dans IDB
                collectionsDao.updateDocument(docCourant, {dirty: false, dechiffre})
                    .catch(err=>console.error("Erreur maj document %O dans idb : %O", docCourant, err))

                // Mettre a jour a l'ecran si on affiche le meme cuuid
                fichiersDechiffres.push({tuuid, data: docCourant})
            }

            // console.debug("Mettre a jour l'ecran pour batch dechiffree, state %O, batch %O", getState(), fichiersDechiffres)            
            // const cuuidCourant = getState().cuuid
            // Filtrer fichiers pour s'assurer qu'ils sont inclus dans le cuuid courant (si changement de repertoire)
            // const fichiersDechiffreesAfficher = []
            // for(const item of fichiersDechiffres) {
            //     const fichier = item.data
            //     if(!cuuidCourant && !fichier.path_cuuids) {
            //         // Inclure, collection top level (favoris)
            //         fichiersDechiffreesAfficher.push(item)
            //     } else if(cuuidCourant && fichier.path_cuuids && fichier.path_cuuids[0] === cuuidCourant) {
            //         // Inclure, meme repertoire
            //         fichiersDechiffreesAfficher.push(item)
            //     }
            // }

            if(fichiersDechiffres.length > 0) {
                listenerApi.dispatch(actions.mergeTuuidData(fichiersDechiffres))
            }

            // Continuer tant qu'il reste des fichiers chiffres
            // tuuidsChiffres = [...getState().listeDechiffrage]
            tuuidsChiffres = Object.values(getState().dictDechiffrage).map(item=>item.tuuid)
        }

        listenerApi.dispatch(actions.setDechiffrageComplete())

        // console.debug("dechiffrageMiddlewareListener Sequence dechiffrage terminee")
    } finally {
        await listenerApi.subscribe()
    }
}


function genererTriListe(sortKeys) {

    const key = sortKeys.key || 'nom',
          ordre = sortKeys.ordre || 1

    return (a, b) => {

        if(a === b) return 0
        if(!a) return 1
        if(!b) return -1

        let valA = a[key], valB = b[key]
        if(key === 'dateFichier') {
            valA = a.dateFichier || a.derniere_modification || a.date_creation
            valB = b.dateFichier || b.derniere_modification || b.date_creation
        } else if(key === 'taille') {
            const version_couranteA = a.version_courante || {},
                  version_couranteB = b.version_courante || {}
            valA = version_couranteA.taille || a.taille
            valB = version_couranteB.taille || b.taille
        }

        if(key === 'nom') {
            // Fallback, nom/tuuid du fichier, repertoire en premier
            const typeNodeA = a.type_node, typeNodeB = b.type_node
            if(typeNodeA !== typeNodeB) {
                if(!typeNodeA) return 1
                if(!typeNodeB) return -1
                if(typeNodeA === 'Fichier') return 1
                if(typeNodeB === 'Fichier') return -1
            }
        }


        if(valA === valB) return 0
        if(!valA) return 1
        if(!valB) return -1

        if(typeof(valA) === 'string') {
            const diff = valA.localeCompare(valB)
            if(diff) return diff * ordre
        } else if(typeof(valA) === 'number') {
            const diff = valA - valB
            if(diff) return diff * ordre
        } else {
            throw new Error(`genererTriListe values ne peut pas etre compare ${''+valA} ? ${''+valB}`)
        }

        const { tuuid: tuuidA, nom: nomA } = a,
              { tuuid: tuuidB, nom: nomB } = b

        const labelA = nomA || tuuidA,
              labelB = nomB || tuuidB
        
        const compLabel = labelA.localeCompare(labelB)
        if(compLabel) return compLabel * ordre

        // Fallback, tuuid (doit toujours etre different)
        return tuuidA.localeCompare(tuuidB) * ordre
    }
}

function identifierClesHachages(liste) {
    const fichiersChiffres = []

    const liste_hachage_bytes = Object.keys( liste.reduce( (acc, item) => {

        let chiffre = false

        // Images inline chiffrees (thumbnail)
        const version_courante = item.version_courante || {},
              // { fuuids_versions } = item,
              { images } = version_courante,
              metadata = item.metadata  // version_courante.metadata || item.metadata
        const fuuid_v_courante = version_courante.fuuid

        if(metadata) {
            // Champs proteges
            //if(metadata.hachage_bytes) acc[metadata.hachage_bytes] = true
            //else 
            if(metadata.ref_hachage_bytes) acc[metadata.ref_hachage_bytes] = true
            else acc[fuuid_v_courante] = true  // Default, cle du fichier

            chiffre = true
        }
        if(images) Object.values(images).forEach(image=>{
            if(image.data_chiffre) {
                //acc[fuuid_v_courante] = true  // Le ref_hachage_bytes est le fuuid
                chiffre = true
            }
        })

        // Conserver le fichier dans la liste de fichiers chiffres au besoin
        if(chiffre) fichiersChiffres.push(item)

        return acc

    }, {}))

    return {liste_hachage_bytes, fichiersChiffres}
}