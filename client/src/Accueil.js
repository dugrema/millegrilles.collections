import {useState, useEffect} from 'react'

function Accueil(props) {

    const { workers, etatConnexion } = props

    const [favoris, setFavoris] = useState('')

    useEffect(()=>{
        const { connexion } = workers
        if( etatConnexion === true ) {
            console.debug("Charger favoris")
            connexion.getFavoris()
                .then(favoris=>{
                    console.debug("Favoris recus : %O", favoris)
                    setFavoris(favoris)
                })
                .catch(err=>{
                    console.error("Erreur chargement favoris : %O", err)
                })
        }
    }, [workers, etatConnexion, setFavoris])

    return (
        <p>Accueil</p>
    )
}

export default Accueil
