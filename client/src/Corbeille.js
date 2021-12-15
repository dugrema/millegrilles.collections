import { useState, useEffect, useCallback } from 'react'

import { 
    ListeFichiers, FormatteurTaille, FormatterDate, saveCleDechiffree, getCleDechiffree,
} from '@dugrema/millegrilles.reactjs'

import { mapper, onContextMenu } from './mapperFichier'
import { MenuContextuelCorbeille } from './MenuContextuel'


function Corbeille(props) {

    const { workers, etatConnexion, evenementCollection, evenementFichier, usager } = props
    const { connexion } = workers

    const [ corbeille, setCorbeille ] = useState('')

    useEffect(()=>{
        if(!etatConnexion) return
        chargerCorbeille(connexion, setCorbeille)
    }, [etatConnexion, setCorbeille, chargerCorbeille])

    useEffect(()=>{
        if(!evenementCollection || !evenementCollection.message) return 
        // Empecher cycle
        const message = evenementCollection.message
        if(message.favoris) {
            // C'est un favoris, on recharge la liste au complet
            chargerCorbeille(workers, setCorbeille)
        }
    }, [evenementCollection, workers, setCorbeille, chargerCorbeille])

    return (
        <div>
            <h1><i className="fa fa-trash-o"/> Corbeille</h1>
            <NavigationCorbeille
                liste={corbeille} 
                workers={workers} 
                etatConnexion={etatConnexion}
                evenementFichier={evenementFichier}
                evenementCollection={evenementCollection}
                usager={usager}
            />
        </div>
    )
}

export default Corbeille

async function chargerCorbeille(connexion, setCorbeille) {
    try {
        const reponse = await connexion.getCorbeille()
        console.debug("Reponse getCorbeille : %O", reponse)
        setCorbeille(reponse.fichiers)
    } catch(err) {
        console.error("Erreur requete corbeille : %O", err)
    }
}

function NavigationCorbeille(props) {

    const { workers, liste: corbeille, etatConnexion } = props

    const [ colonnes, setColonnes ] = useState('')
    const [ liste, setListe ] = useState([])
    const [ selection, setSelection ] = useState('')
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})

    const onDoubleClick = useCallback((event, value)=>{
        window.getSelection().removeAllRanges()
    })

    const fermerContextuel = useCallback(()=>{
        setContextuel(false)
    }, [setContextuel])

    const onSelectionLignes = useCallback(selection=>{setSelection(selection)}, [setSelection])

    useEffect(()=>{ setColonnes(preparerColonnes()) }, [setColonnes])

    // Preparer donnees a afficher dans la liste
    useEffect(()=>{
        if(!corbeille || !etatConnexion) return  // Rien a faire
        // Utiliser liste de favoris
        setListe( preprarerDonnees(corbeille, workers, {trier: trierNom}) )
    }, [workers, etatConnexion, corbeille, setListe])
    
    return (
        <div>
            <ListeFichiers 
                modeView="liste"
                colonnes={colonnes}
                rows={liste} 
                // onClick={onClick} 
                onDoubleClick={onDoubleClick}
                onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
                onSelection={onSelectionLignes}
                onClickEntete={colonne=>{
                    // console.debug("Entete click : %s", colonne)
                }}
            />

            <MenuContextuelCorbeille 
                workers={props.workers}
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                selection={selection}
            />

        </div>
    )
}

function preparerColonnes() {
    const params = {
        ordreColonnes: ['nom', 'taille', 'mimetype', 'dateAjout', 'boutonDetail'],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 11, lg: 5},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2},
            'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterDate, xs: 5, lg: 2},
            'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 1},
        },
        tri: {colonne: 'nom', ordre: 1},
    }
    return params
}

function trierNom(a, b) {
    const nomA = a.nom?a.nom:'',
          nomB = b.nom?b.nom:''
    if(nomA === nomB) return 0
    if(!nomA) return 1
    if(!nomB) return -1
    return nomA.localeCompare(nomB)
}

function preprarerDonnees(liste, workers, opts) {
    opts = opts || {}
    const listeMappee = liste.map(item=>mapper(item, workers))

    if(opts.trier) {
        listeMappee.sort(opts.trier)
    }

    return listeMappee
}
