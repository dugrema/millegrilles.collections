import { useState, useEffect } from 'react'

import { 
    ListeFichiers, FormatteurTaille, FormatterDate, saveCleDechiffree, getCleDechiffree,
} from '@dugrema/millegrilles.reactjs'

import { mapper, onContextMenu } from './mapperFichier'

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

    const { recents } = props

    return (
        <ListeFichiers 
            modeView="recents"
            rows={recents} 
            // onClick={onClick} 
            // onDoubleClick={onDoubleClick}
            // onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
            // onSelection={onSelectionLignes}
            // onClickEntete={colonne=>{
                // console.debug("Entete click : %s", colonne)
            //}}
        />
    )
}

async function chargerRecents(workers, setRecents) {
    console.debug("Charger recents")
    const { connexion } = workers
    try {
        const message = await connexion.getRecents({})
        const recents = message.fichiers || {}
        const listeMappee = preprarerDonnees(recents, workers)
        console.debug("Recents mappes : %O", recents)

        setRecents(listeMappee)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }
}

function preprarerDonnees(liste, workers, opts) {
    opts = opts || {}
    const listeMappee = liste.map(item=>mapper(item, workers))

    if(opts.trier) {
        listeMappee.sort(opts.trier)
    }

    return listeMappee
}
