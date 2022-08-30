import { creerSlice, creerThunks, creerMiddleware } from './grosfichiersSlice'

const slice = creerSlice('fichiers')
export const { reducer } = slice
export default slice.actions
export const thunks = creerThunks(slice.actions)

export function setup(workers) {
    return creerMiddleware(workers, slice.actions, thunks)
}

// import { base64 } from 'multiformats/bases/base64'
// import { createSlice, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'

// const SOURCE_COLLECTION = 'collection',
//       SOURCE_PLUS_RECENT = 'plusrecent',
//       SOURCE_CORBEILLE = 'corbeille',
//       // SOURCE_INDEX = 'index',
//       CONST_SYNC_BATCH_SIZE = 250,
//       SAFEGUARD_BATCH_MAX = 1000

// const initialState = {
//     idbInitialise: false,       // Flag IDB initialise
//     cuuid: null,                // Identificateur de collection
//     sortKeys: {},               // Ordre de tri
//     source: SOURCE_COLLECTION,  // Source de la requete - collection, plusrecent, corbeille, index, etc.
//     liste: null,                // Liste triee de fichiers
//     collection: '',             // Information sur la collection courante
//     breadcrumb: [],             // Breadcrumb du path de la collection affichee
//     userId: '',                 // UserId courant, permet de stocker plusieurs users localement
//     intervalle: null,           // Intervalle de temps des donnees, l'effet depend de la source
//     listeDechiffrage: [],       // Liste de fichiers a dechiffrer
//     selection: null,            // Fichiers/collections selectionnees
// }

// // Actions

// function setUserIdAction(state, action) {
//     state.userId = action.payload
// }

// function setSortKeysAction(state, action) {
//     const sortKeys = action.payload
//     state.sortKeys = sortKeys
//     if(state.liste) state.liste.sort(genererTriListe(sortKeys))
// }

// function setCuuidAction(state, action) {
//     state.source = SOURCE_COLLECTION
//     state.cuuid = action.payload
// }

// function setSourceAction(state, action) {
//     state.source = action.payload
//     state.cuuid = null
//     state.intervalle = null
//     state.breadcrumb = []
//     state.liste = null
// }

// function setIntervalleAction(state, action) {
//     state.intervalle = action.payload
// }

// function setCollectionInfoAction(state, action) {
//     const collection = action.payload
//     state.collection = collection
//     state.source = SOURCE_COLLECTION
//     state.sortKeys = {}

//     // Transferer le nom vers le breadcrumb
//     // console.debug("setCollectionInfoAction ", collection)
//     if(collection && collection.nom) {
//         const len = state.breadcrumb.length
//         if(len > 0) {
//             const courant = state.breadcrumb[len-1]
//             // console.debug("Breadcrumb courant %s (nom %s)", courant.tuuid, courant.nom)
//             if(courant.tuuid === collection.tuuid) {
//                 // console.debug("Changer nom courant pour %s", collection.nom)
//                 courant.label = collection.nom
//             }
//         }
//     }
// }

// function pushAction(state, action) {
//     let payload = action.payload
//     let liste = state.liste || []
//     if( Array.isArray(payload) ) {
//         liste = liste.concat(payload)    
//     } else {
//         liste.push(payload)            
//     }

//     // Trier
//     liste.sort(genererTriListe(state.sortKeys))
//     // console.debug("pushAction liste triee : %O", liste)

//     state.liste = liste
// }

// function clearAction(state) {
//     state.liste = null
//     // state.cuuid = null
//     state.collection = null
// }

// // function supprimerAction(state, action) {
// //     const tuuid = action.payload
// //     state.liste = state.liste.filter(item => item.tuuid !== tuuid)
// // }

// function breadcrumbPushAction(state, action) {
//     // console.debug("State breadcrumb ", state.breadcrumb)

//     let { tuuid, opts } = action.payload
//     opts = opts || {}

//     if(!tuuid) return  // Rien a faire, on ne push pas le favoris

//     const len = state.breadcrumb.length
//     if(len > 0) {
//         const courant = state.breadcrumb[len-1]
//         if(courant.tuuid === tuuid) return  // Erreur, on push le meme cuuid a nouveau
//     }

//     const label = opts.nom || tuuid
//     const val = {tuuid, label}
//     state.breadcrumb.push(val)
//     // console.debug("Breadcrumb etat : ", [...state.breadcrumb])
// }

// function breadcrumbSliceAction(state, action) {
//     // console.debug("Breadcrumb slice : ", action)
//     const toLevel = action.payload
//     // level '' est favoris, 0 est la premiere collection (idx === 0)
//     if(!toLevel) state.breadcrumb = []
//     else state.breadcrumb = state.breadcrumb.slice(0, toLevel+1)
// }

// // payload {tuuid, data, images, video}
// function mergeTuuidDataAction(state, action) {
//     // console.debug("mergeTuuidDataAction action: %O, cuuid courant: %O", action, state.cuuid)
//     let { tuuid } = action.payload
//     const data = action.payload.data || {},
//           cuuids = data.cuuids || [],
//           images = action.payload.images || data.images,
//           video = action.payload.video || data.video

//     const liste = state.liste || []
//     const cuuidCourant = state.cuuid,
//           source = state.source,
//           intervalle = state.intervalle
    
//     let peutAppend = false
//     if(source === SOURCE_COLLECTION) {
//         if(data.supprime === true) {
//             // false
//         } else if(cuuidCourant) {
//             // Verifier si le fichier est sous le cuuid courant
//             peutAppend = cuuids.includes(cuuidCourant)
//         } else if( ! data.mimetype ) {
//             peutAppend = data.favoris === true  // Inclure si le dossier est un favoris
//         }
//     } else if(source === SOURCE_CORBEILLE) {
//         peutAppend = data.supprime === true
//     } else if(source === SOURCE_PLUS_RECENT) {
//         if(data.supprime === true) {
//             // False
//         } else if(intervalle) {
//             const { debut, fin } = intervalle
//             const champsDate = ['derniere_modification', 'date_creation']
//             champsDate.forEach(champ=>{
//                 const valDate = data[champ]
//                 if(valDate) {
//                     if(valDate >= debut) {
//                         if(fin) {
//                             if(valDate <= fin) peutAppend = true
//                         } else {
//                             // Pas de date de fin
//                             peutAppend = true
//                         }
//                     }
//                 }
//             })
//         }
//     }

//     // Maj du breadcrumb au besoin
//     if(data.nom) {
//         state.breadcrumb.forEach(item=>{
//             if(item.tuuid === tuuid) {
//                 item.label = data.nom
//             }
//         })
//     }

//     let dataCourant
//     if(cuuidCourant === tuuid) {
//         // Mise a jour de la collection active
//         dataCourant = state.collection || {}
//         state.collection = dataCourant
//     } else {
//         // Trouver un fichier correspondant
//         dataCourant = liste.filter(item=>item.tuuid === tuuid).pop()
//     }

//     // Copier donnees vers state
//     if(dataCourant) {
//         if(data) {
//             const copie = {...data}

//             // Retirer images et video, traiter separement
//             delete copie.images
//             delete copie.video

//             Object.assign(dataCourant, copie)
//         }
//         if(images) {
//             const imagesCourantes = dataCourant.images || {}
//             Object.assign(imagesCourantes, images)
//             dataCourant.images = imagesCourantes
//         }
//         if(video) {
//             const videoCourants = dataCourant.video || {}
//             Object.assign(videoCourants, video)
//             dataCourant.video = videoCourants
//         }

//         // Verifier si le fichier fait encore partie de la collection courante
//         const cuuids = dataCourant.cuuids || []
//         // console.debug("mergeTuuidDataAction Verifier si dataCourant est encore dans %s : %O", cuuidCourant, cuuids)
//         let retirer = false
//         if( source === SOURCE_CORBEILLE ) {
//             // Verifier si le document est toujours supprime
//             retirer = dataCourant.supprime !== true
//         } else {
//             if(dataCourant.supprime === true) {
//                 // Le document est supprime
//                 retirer = true
//             } else if( cuuidCourant ) {
//                 // Verifier si le fichier est encore candidat pour la liste courante
//                 retirer = ! cuuids.includes(cuuidCourant) 
//             } else {
//                 // Favoris
//                 retirer = dataCourant.favoris !== true
//             }
//         }

//         if(retirer) state.liste = liste.filter(item=>item.tuuid !== tuuid)

//     } else if(peutAppend === true) {
//         liste.push(data)
//         state.liste = liste
//     }

//     // Trier
//     state.liste.sort(genererTriListe(state.sortKeys))
// }

// // Ajouter des fichiers a la liste de fichiers a dechiffrer
// function pushFichiersChiffresAction(state, action) {
//     const fichiers = action.payload
//     state.listeDechiffrage = [...state.listeDechiffrage, ...fichiers]
// }

// // Retourne un fichier de la liste a dechiffrer
// function clearFichiersChiffresAction(state) {
//     state.listeDechiffrage = []
// }

// function selectionTuuidsAction(state, action) {
//     state.selection = action.payload
// }

// // Slice collection

// const fichiersSlice = createSlice({
//     name: 'collection',
//     initialState,
//     reducers: {
//         setUserId: setUserIdAction,
//         setCuuid: setCuuidAction,
//         setCollectionInfo: setCollectionInfoAction,
//         push: pushAction, 
//         // supprimer: supprimerAction,
//         clear: clearAction,
//         mergeTuuidData: mergeTuuidDataAction,
//         breadcrumbPush: breadcrumbPushAction,
//         breadcrumbSlice: breadcrumbSliceAction,
//         setSortKeys: setSortKeysAction,
//         setSource: setSourceAction,
//         setIntervalle: setIntervalleAction,
//         pushFichiersChiffres: pushFichiersChiffresAction,
//         clearFichiersChiffres: clearFichiersChiffresAction,
//         selectionTuuids: selectionTuuidsAction,
//     }
// })

// // Exports

// // Action creators are generated for each case reducer function
// const { 
//     setUserId, setCuuid, setCollectionInfo, push, clear, mergeTuuidData,
//     breadcrumbPush, breadcrumbSlice, setSortKeys, setSource, setIntervalle,
//     pushFichiersChiffres, clearFichiersChiffres, selectionTuuids,
//     // supprimer, 
// } = fichiersSlice.actions

// // Middleware

// export function dechiffrageMiddlewareSetup(workers) {
//     const uploaderMiddleware = createListenerMiddleware()
    
//     uploaderMiddleware.startListening({
//         matcher: isAnyOf(pushFichiersChiffres),
//         effect: (action, listenerApi) => dechiffrageMiddlewareListener(workers, action, listenerApi)
//     }) 
    
//     return uploaderMiddleware
// }

// async function dechiffrageMiddlewareListener(workers, action, listenerApi) {
//     // console.debug("dechiffrageMiddlewareListener running effect, action : %O, listener : %O", action, listenerApi)
//     const { clesDao, chiffrage, collectionsDao } = workers
//     await listenerApi.unsubscribe()
//     try {
//         // Recuperer la liste des fichiers chiffres
//         let fichiersChiffres = listenerApi.getState().fichiers.listeDechiffrage
//         while(fichiersChiffres.length > 0) {
//             listenerApi.dispatch(clearFichiersChiffres())

//             // Extraire toutes les cles a charger
//             const {clesHachage_bytes} = identifierClesHachages(fichiersChiffres)
//             const cles = await clesDao.getCles(clesHachage_bytes)
//             // console.debug("dechiffrageMiddlewareListener Recu cles : ", cles)

//             for await (const fichierChiffre of fichiersChiffres) {
//                 // console.debug("dechiffrageMiddlewareListener dechiffrer : %O", fichierChiffre)
//                 // Images inline chiffrees (thumbnail)
//                 const tuuid = fichierChiffre.tuuid
//                 let dechiffre = true

//                 const docCourant = (await collectionsDao.getParTuuids([tuuid])).pop()
//                 const version_courante = docCourant.version_courante || {}
//                 const images = version_courante.images || {}

//                 for await (const image of Object.values(images)) {
//                     if(image.data_chiffre) {
//                         // Dechiffrer
//                         const hachage_bytes = image.hachage
//                         const cleFichier = cles[hachage_bytes]
//                         if(cleFichier) {
//                             const dataChiffre = base64.decode(image.data_chiffre)
//                             const ab = await chiffrage.chiffrage.dechiffrer(cleFichier.cleSecrete, dataChiffre, cleFichier)
//                             const dataDechiffre = base64.encode(ab)
//                             image.data = dataDechiffre
//                             delete image.data_chiffre
//                         } else {
//                             dechiffre = false  // Echec, cle non trouvee
//                         }
//                     }
//                 }

//                 // console.debug("fichier dechiffre : %O", docCourant)

//                 // Mettre a jour dans IDB
//                 collectionsDao.updateDocument(docCourant, {dirty: false, dechiffre})
//                     .catch(err=>console.error("Erreur maj document %O dans idb : %O", docCourant, err))

//                     // Mettre a jour a l'ecran
//                 listenerApi.dispatch(mergeTuuidData({tuuid, data: docCourant}))

//             }

//             // Continuer tant qu'il reste des fichiers chiffres
//             fichiersChiffres = listenerApi.getState().fichiers.listeDechiffrage
//         }

//         // console.debug("dechiffrageMiddlewareListener Sequence dechiffrage terminee")
//     } finally {
//         await listenerApi.subscribe()
//     }
// }

// // Async thunks

// function dechiffrerFichiers(workers, fichiers) {
//     return (dispatch, getState) => traiterDechiffrerFichiers(workers, fichiers, dispatch, getState)
// }

// async function traiterDechiffrerFichiers(workers, fichiers, dispatch, getState) {

//     if(!fichiers || fichiers.length === 0) return

//     const { collectionsDao } = workers

//     // Detecter les cles requises
//     const {clesHachage_bytes, fichiersChiffres} = identifierClesHachages(fichiers)
//     // console.debug('traiterDechiffrerFichiers Cles a extraire : %O de fichiers %O', clesHachage_bytes, fichiersChiffres)
//     if(fichiersChiffres.length > 0) dispatch(pushFichiersChiffres(fichiersChiffres))

//     const tuuidsChiffres = fichiersChiffres.map(item=>item.tuuid)
//     for (const fichier of fichiers) {
//         // console.debug("traiterDechiffrerFichiers Dechiffrer fichier ", fichier)
//         const dechiffre = ! tuuidsChiffres.includes(fichier.tuuid)

//         // Mettre a jour dans IDB
//         collectionsDao.updateDocument(fichier, {dechiffre})
//             .catch(err=>console.error("Erreur maj document %O dans idb : %O", fichier, err))

//         // console.debug("traiterDechiffrerFichiers chargeTuuids dispatch merge %O", fichier)
//         dispatch(mergeTuuidData({tuuid: fichier.tuuid, data: fichier}))
//     }
// }

// function chargerTuuids(workers, tuuids) {
//     return (dispatch, getState) => traiterChargerTuuids(workers, tuuids, dispatch, getState)
// }

// async function traiterChargerTuuids(workers, tuuids, dispatch, getState) {
//     // console.debug("Charger detail fichiers tuuids : %O", tuuids)

//     const { connexion, collectionsDao } = workers

//     if(typeof(tuuids) === 'string') tuuids = [tuuids]

//     const resultat = await connexion.getDocuments(tuuids)

//     if(resultat.fichiers) {

//         // Detecter le besoin de cles
//         let fichiers = resultat.fichiers.filter(item=>item)

//         // Separer fichiers avec chiffrage des fichiers sans chiffrage
//         fichiers = fichiers.reduce((acc, item)=>{
//             let chiffre = false
            
//             if(item.champs_proteges) chiffre = true
            
//             const version_courante = item.version_courante || {},
//                   images = version_courante.images
//             if(images) Object.values(images).forEach(image=>{
//                 if(image.data_chiffre) chiffre = true
//             })

//             // Mettre a jour dans IDB
//             collectionsDao.updateDocument(item, {dirty: false, dechiffre: !chiffre})
//                 .catch(err=>console.error("Erreur maj document %O dans idb : %O", item, err))

//             if(chiffre) {
//                 // Conserver pour dechiffrer une fois la cle disponible
//                 // console.debug("Attendre dechiffrage pour %s", item.tuuid)
//                 acc.push(item)
//             } else {
//                 // Traiter immediatement, aucun chiffrage
//                 // console.debug("Aucun dechiffrage pour %O", item)
//                 dispatch(mergeTuuidData({tuuid: item.tuuid, data: item}))
//             }

//             return acc
//         }, [])

//         // Lancer dechiffrage des fichiers restants
//         dispatch(dechiffrerFichiers(workers, fichiers))
//             .catch(err=>console.error("Erreur dechiffrage fichiers : %O", err))
//     }
// }

// // Async collections

// function changerCollection(workers, cuuid) {
//     return (dispatch, getState) => traiterChangerCollection(workers, cuuid, dispatch, getState)
// }

// async function traiterChangerCollection(workers, cuuid, dispatch, getState) {
//     if(cuuid === undefined) cuuid = ''  // Favoris

//     const state = getState().fichiers
//     const cuuidPrecedent = state.cuuid
//     // console.debug("Cuuid precedent : %O, nouveau : %O", cuuidPrecedent, cuuid)

//     if(cuuidPrecedent === cuuid) return  // Rien a faire, meme collection

//     dispatch(setCuuid(cuuid))

//     return traiterRafraichirCollection(workers, dispatch, getState)
// }

// function rafraichirCollection(workers) {
//     // console.debug("rafraichirCollection")
//     return (dispatch, getState) => traiterRafraichirCollection(workers, dispatch, getState)
// }

// async function traiterRafraichirCollection(workers, dispatch, getState, promisesPreparationCollection) {
//     // console.debug('traiterRafraichirCollection')
//     const { collectionsDao } = workers

//     const state = getState().fichiers
//     const { userId, cuuid } = state

//     // console.debug("Rafraichir %s", cuuid)

//     // Nettoyer la liste
//     dispatch(clear())

//     // Charger le contenu de la collection deja connu
//     promisesPreparationCollection = promisesPreparationCollection || []
//     promisesPreparationCollection.push(collectionsDao.getParCollection(cuuid, userId))

//     // Attendre que les listeners soient prets, recuperer contenu idb
//     const contenuIdb = (await Promise.all(promisesPreparationCollection)).pop()

//     // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
//     // console.debug("Contenu idb : %O", contenuIdb)
//     if(contenuIdb) {
//         const { documents, collection } = contenuIdb
//         // console.debug("Push documents provenance idb : %O", documents)
//         dispatch(setCollectionInfo(collection))
//         dispatch(push(documents))

//         // Detecter les documents connus qui sont dirty ou pas encore dechiffres
//         const tuuids = documents.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
//         dispatch(chargerTuuids(workers, tuuids))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
//     }

//     let compteur = 0
//     for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
//         let resultatSync = await syncCollection(dispatch, workers, cuuid, CONST_SYNC_BATCH_SIZE, compteur)
//         // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
//         if( ! resultatSync || ! resultatSync.liste ) break
//         compteur += resultatSync.liste.length
//         if( resultatSync.complete ) break
//     }
//     if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncCollection")

//     // On marque la fin du chargement/sync
//     dispatch(push([]))
// }

// async function syncCollection(dispatch, workers, cuuid, limit, skip) {
//     const { connexion, collectionsDao } = workers
//     const resultat = await connexion.syncCollection(cuuid, {limit, skip})

//     const { liste } = resultat
//     const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)

//     // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
//     if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
//         dispatch(chargerTuuids(workers, listeTuuidsDirty))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
//     }

//     return resultat
// }

// async function syncPlusrecent(dispatch, workers, intervalle, limit, skip) {
//     const { connexion, collectionsDao } = workers
//     const resultat = await connexion.syncPlusrecent(intervalle.debut, intervalle.fin, {limit, skip})

//     const { liste } = resultat
//     const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)

//     // console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
//     if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
//         dispatch(chargerTuuids(workers, listeTuuidsDirty))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
//     }

//     return resultat
// }

// async function syncCorbeille(dispatch, workers, intervalle, limit, skip) {
//     const { connexion, collectionsDao } = workers
//     const resultat = await connexion.syncCorbeille(intervalle.debut, intervalle.fin, {limit, skip})

//     const { liste } = resultat
//     const listeTuuidsDirty = await collectionsDao.syncDocuments(liste)

//     console.debug("Liste tuuids dirty : ", listeTuuidsDirty)
//     if(listeTuuidsDirty && listeTuuidsDirty.length > 0) {
//         dispatch(chargerTuuids(workers, listeTuuidsDirty))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", listeTuuidsDirty, err))
//     }

//     return resultat
// }

// // Async plus recent
// function afficherPlusrecents(workers, opts) {
//     opts = opts || {}
//     let intervalle = opts.intervalle
//     if(!intervalle) {
//         // Utiliser la derniere semaine par defaut
//         let dateDebut = new Date()
//         dateDebut.setDate(dateDebut.getDate() - 7)
//         dateDebut.setHours(0)
//         dateDebut.setMinutes(0)
//         dateDebut.setSeconds(0)
//         intervalle = {debut: Math.floor(dateDebut.getTime() / 1000), fin: null}
//     }

//     return (dispatch, getState) => traiterChargerPlusrecents(workers, {...opts, intervalle}, dispatch, getState)
// }

// async function traiterChargerPlusrecents(workers, opts, dispatch, getState) {
//     opts = opts || {}

//     const stateInitial = getState().fichiers
//     const { userId } = stateInitial

//     // Changer source, nettoyer la liste
//     dispatch(setSource(SOURCE_PLUS_RECENT))
//     dispatch(clear())
    
//     let intervalle = opts.intervalle
//     if(!opts.intervalle) {
//         intervalle = stateInitial.intervalle
//     }
//     dispatch(setIntervalle(intervalle))
//     dispatch(setSortKeys({key: 'derniere_modification', order: -1}))

//     // console.debug("traiterChargerCorbeille Intervalle ", intervalle)
    
//     const { collectionsDao } = workers

//     // Charger le contenu de la collection deja connu
//     const contenuIdb = await collectionsDao.getPlusrecent(intervalle, userId)

//     // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
//     // console.debug("Contenu idb : %O", contenuIdb)
//     if(contenuIdb) {
//         // console.debug("Push documents provenance idb : %O", contenuIdb)
//         dispatch(push(contenuIdb))

//         const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
//         dispatch(chargerTuuids(workers, tuuids))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
//     }

//     let compteur = 0
//     for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
//         let resultatSync = await syncPlusrecent(dispatch, workers, intervalle, CONST_SYNC_BATCH_SIZE, compteur)
//         // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
//         if( ! resultatSync || ! resultatSync.liste ) break
//         compteur += resultatSync.liste.length
//         if( resultatSync.complete ) break
//     }
//     if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncPlusrecent")

//     // On marque la fin du chargement/sync
//     dispatch(push([]))
// }

// // Async corbeille

// function afficherCorbeille(workers, opts) {
//     opts = opts || {}
//     let intervalle = opts.intervalle
//     if(!intervalle) {
//         // Utiliser la derniere semaine par defaut
//         let dateDebut = new Date()
//         dateDebut.setDate(dateDebut.getDate() - 7)
//         dateDebut.setHours(0)
//         dateDebut.setMinutes(0)
//         dateDebut.setSeconds(0)
//         intervalle = {debut: Math.floor(dateDebut.getTime() / 1000), fin: null}
//     }
//     return (dispatch, getState) => traiterChargerCorbeille(workers, {...opts, intervalle}, dispatch, getState)
// }

// async function traiterChargerCorbeille(workers, opts, dispatch, getState) {
//     opts = opts || {}

//     const stateInitial = getState().fichiers
//     const { userId } = stateInitial

//     // Changer source, nettoyer la liste
//     dispatch(setSource(SOURCE_CORBEILLE))
//     dispatch(clear())
    
//     let intervalle = opts.intervalle
//     if(!opts.intervalle) {
//         intervalle = stateInitial.intervalle
//     }
//     dispatch(setIntervalle(intervalle))
//     dispatch(setSortKeys({key: 'date_suppression', order: -1}))

//     // console.debug("traiterChargerCorbeille Intervalle ", intervalle)
    
//     const { collectionsDao } = workers

//     // Charger le contenu de la collection deja connu
//     const contenuIdb = await collectionsDao.getSupprime(intervalle, userId)

//     // Pre-charger le contenu de la liste de fichiers avec ce qu'on a deja dans idb
//     // console.debug("Contenu idb : %O", contenuIdb)
//     if(contenuIdb) {
//         // console.debug("Push documents provenance idb : %O", contenuIdb)
//         dispatch(push(contenuIdb))

//         const tuuids = contenuIdb.filter(item=>item.dirty||!item.dechiffre).map(item=>item.tuuid)
//         dispatch(chargerTuuids(workers, tuuids))
//             .catch(err=>console.error("Erreur traitement tuuids %O : %O", tuuids, err))
//     }

//     let compteur = 0
//     for(var cycle=0; cycle<SAFEGUARD_BATCH_MAX; cycle++) {
//         let resultatSync = await syncCorbeille(dispatch, workers, intervalle, CONST_SYNC_BATCH_SIZE, compteur)
//         // console.debug("Sync collection (cycle %d) : %O", cycle, resultatSync)
//         if( ! resultatSync || ! resultatSync.liste ) break
//         compteur += resultatSync.liste.length
//         if( resultatSync.complete ) break
//     }
//     if(cycle === SAFEGUARD_BATCH_MAX) throw new Error("Detection boucle infinie dans syncCorbeille")

//     // On marque la fin du chargement/sync
//     dispatch(push([]))
// }

// // Ajouter un nouveau fichier (e.g. debut upload)
// function ajouterFichierVolatil(workers, fichier) {
//     return (dispatch, getState) => traiterAjouterFichierVolatil(workers, fichier, dispatch, getState)
// }

// async function traiterAjouterFichierVolatil(workers, fichier, dispatch, getState) {
//     // console.debug("traiterAjouterFichierVolatil ", fichier)
//     const entete = fichier['en-tete'] || {},
//           tuuid = fichier.tuuid || entete['uuid_transaction']
  
//     const fichierCopie = {tuuid, ...fichier}

//     let cuuids = fichier.cuuids
//     if(!cuuids && fichier.cuuid) {
//         cuuids = [fichier.cuuid]
//     }
//     fichierCopie.cuuids = cuuids

//     const state = getState().fichiers
//     const cuuidCourant = state.cuuid
//     if(!cuuidCourant) fichierCopie.favoris = true  // Conserver comme favoris

//     // Toujours associer a l'usager
//     if(!fichierCopie.userId) {
//         const userId = state.userId
//         fichierCopie.user_id = userId
//     }

//     // console.debug("Ajouter fichier volatil : %O", fichierCopie)

//     const { collectionsDao } = workers

//     // Ajouter fichier dans IDB avec flags dirty et expiration
//     const expiration = new Date().getTime() + 300000  // Valide 5 minutes (e.g. pour upload)
//     // // console.debug("Ajout document avec expiration : %O", new Date(expiration))
//     collectionsDao.updateDocument(fichierCopie, {dirty: true, expiration})
//         .catch(err=>console.error("Erreur maj document %O dans idb : %O", fichierCopie, err))

//     return dispatch(mergeTuuidData({tuuid, data: fichierCopie}))
// }

// function supprimerFichier(workers, tuuid) {
//     return (dispatch, getState) => traiterSupprimerFichier(workers, tuuid, dispatch, getState)
// }

// async function traiterSupprimerFichier(workers, tuuid, dispatch, getState) {
//     const { collectionsDao } = workers
//     const cuuid = getState().fichiers.cuuid

//     const doc = (await collectionsDao.getParTuuids([tuuid])).pop()
//     // console.debug("traiterSupprimerFichier Doc charge : %O, retirer de cuuid %s", doc, cuuid)
//     if(doc) {
//         const cuuids = doc.cuuids || []
//         doc.cuuids = cuuids.filter(item=>item!==cuuid)
//         if(doc.cuuids.length === 0) {
//             doc.supprime = true
//             doc.date_supprime = Math.floor(new Date()/1000)
//             doc.cuuid_supprime = cuuid
//         }
//         await collectionsDao.updateDocument(doc, {dirty: true, expiration: new Date().getTime() + 120000})
//         return dispatch(mergeTuuidData({tuuid, data: doc}))
//     }
// }

// function restaurerFichier(workers, tuuid) {
//     return (dispatch, getState) => traiterRestaurerFichier(workers, tuuid, dispatch, getState)
// }

// async function traiterRestaurerFichier(workers, tuuid, dispatch, getState) {
//     const { collectionsDao } = workers

//     const doc = (await collectionsDao.getParTuuids([tuuid])).pop()
//     // console.debug("traiterRestaurerFichier Doc charge : ", doc)
//     if(doc) {
//         const cuuid_supprime = doc.cuuid_supprime
//         if(cuuid_supprime) {
//             // console.debug("traiterRestaurerFichier Remettre dans cuuid %s", cuuid_supprime)
//             const cuuids = doc.cuuids || []
//             cuuids.push(cuuid_supprime)

//             // Corriger champs suppression
//             doc.cuuids = cuuids
//             doc.supprime = false
//             doc.date_supprime = null
//             doc.cuuid_supprime = null

//             await collectionsDao.updateDocument(doc, {dirty: true, expiration: new Date().getTime() + 120000})
//             return dispatch(mergeTuuidData({tuuid, data: doc}))
//         } else if(doc.favoris === true) {
//             // C'est un favoris, on met a jour l'affichage
//             doc.supprime = false
//             doc.date_supprime = null
//             doc.cuuid_supprime = null
//             await collectionsDao.updateDocument(doc, {dirty: true, expiration: new Date().getTime() + 120000})
//             return dispatch(mergeTuuidData({tuuid, data: doc}))
//         }
//     }
// }

// function genererTriListe(sortKeys) {

//     const key = sortKeys.key || 'nom',
//           ordre = sortKeys.ordre || 1

//     return (a, b) => {
//         if(a === b) return 0
//         if(!a) return 1
//         if(!b) return -1

//         const valA = a[key],
//               valB = b[key]

//         if(valA === valB) return 0
//         if(!valA) return 1
//         if(!valB) return -1

//         if(typeof(valA) === 'string') {
//             const diff = valA.localeCompare(valB)
//             if(diff) return diff * ordre
//         } else if(typeof(valA) === 'number') {
//             const diff = valA - valB
//             if(diff) return diff * ordre
//         } else {
//             throw new Error(`genererTriListe values ne peut pas etre compare ${''+valA} ? ${''+valB}`)
//         }

//         // Fallback, nom/tuuid du fichier
//         const { tuuid: tuuidA, nom: nomA } = a,
//               { tuuid: tuuidB, nom: nomB } = b

//         const labelA = nomA || tuuidA,
//               labelB = nomB || tuuidB
        
//         const compLabel = labelA.localeCompare(labelB)
//         if(compLabel) return compLabel * ordre

//         // Fallback, tuuid (doit toujours etre different)
//         return tuuidA.localeCompare(tuuidB) * ordre
//     }
// }

// function identifierClesHachages(liste) {
//     const fichiersChiffres = []
//     const clesHachage_bytes = liste.reduce( (acc, item) => {

//         let chiffre = false

//         // Champs proteges
//         if(item.champs_proteges) {
//             const champs_proteges = item.champs_proteges
//             const hachage_bytes = champs_proteges.ref_hachage_bytes
//             acc.push(hachage_bytes)
//             chiffre = true
//         }
        
//         // Images inline chiffrees (thumbnail)
//         const version_courante = item.version_courante || {},
//               images = version_courante.images
//         if(images) Object.values(images).forEach(image=>{
//             if(image.data_chiffre) {
//                 acc.push(image.hachage)
//                 chiffre = true
//             }
//         })

//         // Conserver le fichier dans la liste de fichiers chiffres au besoin
//         if(chiffre) fichiersChiffres.push(item)

//         return acc
//     }, [])    

//     return {clesHachage_bytes, fichiersChiffres}
// }

// export { 
//     setUserId, breadcrumbPush, breadcrumbSlice, 
//     setSortKeys, setIntervalle, selectionTuuids,
// }

// // Async actions
// export { 
//     changerCollection, afficherPlusrecents, afficherCorbeille,
//     chargerTuuids,
//     ajouterFichierVolatil, rafraichirCollection, supprimerFichier, restaurerFichier,
// }

// export default fichiersSlice.reducer
