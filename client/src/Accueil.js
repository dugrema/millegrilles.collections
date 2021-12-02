import {useState, useEffect} from 'react'
import { Breadcrumb } from 'react-bootstrap'

function Accueil(props) {

    const { workers, etatConnexion } = props
    const [favoris, setFavoris] = useState('')

    useEffect(()=>{ chargerFavoris(workers.connexion, etatConnexion, setFavoris) }, [workers, etatConnexion, setFavoris])

    return (
        <>
            <h1>Favoris</h1>
            <NavigationFavoris 
                favoris={favoris} 
                workers={workers} 
            />
        </>
    )

}

export default Accueil

async function chargerFavoris(connexion, etatConnexion, setFavoris) {
    if(etatConnexion !== true) return  // Rien a faire

    console.debug("Charger favoris")
    try {
        const favoris = await connexion.getFavoris()
        console.debug("Favoris recus : %O", favoris)
        setFavoris(favoris)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }

}

function NavigationFavoris(props) {

    const [breadcrumb, setBreadcrumb] = useState([])

    return (
        <>
            <SectionBreadcrumb value={breadcrumb} />
            <p>Navigation</p>
        </>
    )
}

function SectionBreadcrumb(props) {

    return (
        <Breadcrumb>
            <Breadcrumb.Item>Favoris</Breadcrumb.Item>
        </Breadcrumb>
    )
}
