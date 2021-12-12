import { useState, useEffect } from 'react'

function Recents(props) {
    const { workers, etatConnexion } = props
    const [ recents, setRecents ] = useState('')

    useEffect(()=>{ if(etatConnexion) chargerRecents(workers, setRecents) }, [workers, etatConnexion, setRecents])

    return (
        <>
            <h1>Recents</h1>
            <NavigationRecents
                recents={recents} 
                workers={workers} 
                etatConnexion={etatConnexion}
            />
        </>
    )
}

export default Recents

function NavigationRecents(props) {
    return (
        <p>Navigation</p>
    )
}

async function chargerRecents(workers, setRecents) {
    console.debug("Charger recents")
    const { connexion } = workers
    try {
        const message = await connexion.getRecents({})
        const recents = message.fichiers || {}
        console.debug("Recents recus : %O", recents)
        setRecents(recents)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }
}