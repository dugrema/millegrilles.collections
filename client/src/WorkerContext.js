import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { setupWorkers, cleanupWorkers } from './workers/workerLoader'
import { setWorkers as setWorkersTraitementFichiers } from './workers/traitementFichiers'
import { init as initCollectionsIdb } from './redux/collectionsIdbDao'

const Context = createContext()

// Hooks
function useWorkers() {
    return useContext(Context).workers
}
export default useWorkers

export function useUsager() {
    return useContext(Context).usager
}

export function useEtatConnexion() {
    return useContext(Context).etatConnexion
}

export function useFormatteurPret() {
    return useContext(Context).formatteurPret
}

export function useEtatAuthentifie() {
    return useContext(Context).etatAuthentifie
}

export function useInfoConnexion() {
    return useContext(Context).infoConnexion
}

export function useEtatPret() {
    return useContext(Context).etatPret
}

// Provider
export function WorkerProvider(props) {

    const [workers, setWorkers] = useState('')
    const [usager, setUsager] = useState('')
    const [etatConnexion, setEtatConnexion] = useState('')
    const [formatteurPret, setFormatteurPret] = useState('')
    const [infoConnexion, setInfoConnexion] = useState('')

    const etatAuthentifie = useMemo(()=>usager && formatteurPret, [usager, formatteurPret])
    const etatPret = useMemo(()=>{
        return etatConnexion && usager && formatteurPret
    }, [etatConnexion, usager, formatteurPret])

    const value = useMemo(()=>{
        return { workers, usager, etatConnexion, formatteurPret, etatAuthentifie, infoConnexion, etatPret }
    }, [workers, usager, etatConnexion, formatteurPret, etatAuthentifie, infoConnexion, etatPret])

    useEffect(()=>{
        console.info("Initialiser web workers")
        const { workerInstances, workers, ready } = setupWorkers()

        // Initialiser workers et tables collections dans IDB
        const promiseWorkers = initCollectionsIdb()
        Promise.all([ready, promiseWorkers])
            .then(()=>setWorkers(workers))
            .catch(err=>console.error("Erreur initialisation collections IDB / workers ", err))

        // Cleanup
        return () => { 
            console.info("Cleanup web workers")
            cleanupWorkers(workerInstances) 
        }
    }, [setWorkers])

    useEffect(()=>{
        if(!workers) return
        setWorkersTraitementFichiers(workers)
        if(workers.connexion) {
            // setErreur('')
            connecter(workers, setUsager, setEtatConnexion, setFormatteurPret)
                .then(infoConnexion=>{
                    // const statusConnexion = JSON.stringify(infoConnexion)
                    if(infoConnexion.ok === false) {
                        console.error("Erreur de connexion : %O", infoConnexion)
                        // setErreur("Erreur de connexion au serveur : " + infoConnexion.err); 
                    } else {
                        console.info("Info connexion : %O", infoConnexion)
                        setInfoConnexion(infoConnexion)
                    }
                })
                .catch(err=>{
                    // setErreur('Erreur de connexion. Detail : ' + err); 
                    console.debug("Erreur de connexion : %O", err)
                })
        } else {
            // setErreur("Pas de worker de connexion")
            console.error("Pas de worker de connexion")
        }
    }, [ workers, setUsager, setEtatConnexion, setFormatteurPret, setInfoConnexion ])

    useEffect(()=>{
        if(etatAuthentifie) {
          // Preload certificat maitre des cles
          workers.connexion.getCertificatsMaitredescles().catch(err=>console.error("Erreur preload certificat maitre des cles : %O", err))
        }
    }, [workers, etatAuthentifie])
  
    if(!workers) return props.attente

    return <Context.Provider value={value}>{props.children}</Context.Provider>
}

export function WorkerContext(props) {
    return <Context.Consumer>{props.children}</Context.Consumer>
}

async function connecter(workers, setUsager, setEtatConnexion, setFormatteurPret) {
    const { connecter: connecterWorker } = await import('./workers/connecter')
    return connecterWorker(workers, setUsager, setEtatConnexion, setFormatteurPret)
}
