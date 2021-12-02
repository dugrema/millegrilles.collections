import { useState, useEffect, useCallback } from 'react'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { ListeFichiers, MenuContextuel } from '@dugrema/millegrilles.reactjs'
import { mapper, onContextMenu } from './mapperFichier.js'

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
        const messageFavoris = await connexion.getFavoris()
        const favoris = messageFavoris.favoris || {}
        console.debug("Favoris recus : %O", favoris)
        setFavoris(favoris)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }

}

function NavigationFavoris(props) {

    const { favoris } = props
    const [ colonnes, setColonnes ] = useState('')
    const [ breadcrumb, setBreadcrumb ] = useState([])
    const [ cuuidCourant, setCuuidCourant ] = useState('')
    const [ liste, setListe ] = useState([])
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ selection, setSelection ] = useState('')

    // Callbacks
    const onDoubleClick = useCallback((event, value)=>{
        window.getSelection().removeAllRanges()
        console.debug("Ouvrir %O (liste courante: %O)", value, liste)
        if(value.folderId) {
            const folderItem = liste.filter(item=>item.folderId===value.folderId).pop()
            setBreadcrumb([...breadcrumb, folderItem])
            //setCuuidCourant(value.folderId)
        } else {
            throw new Error("todo")
        }
    }, [liste, setCuuidCourant, breadcrumb, setBreadcrumb])

    const onSelectionLignes = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])
    // const onSelectionThumbs = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])

    const fermerContextuel = useCallback(()=>{
        setContextuel(false)
    }, [setContextuel])

    const setBreadcrumbIdx = useCallback( idx => {
        // Tronquer la breadcrumb pour revenir a un folder precedent
        const breadcrumbTronquee = breadcrumb.filter((_, idxItem)=>idxItem<=idx)
        setBreadcrumb(breadcrumbTronquee)

        // Set nouveau cuuid courant
        if(idx >= 0) setCuuidCourant(breadcrumbTronquee[idx])
        else setCuuidCourant('')  // Racine des favoris
    }, [breadcrumb, setBreadcrumb, setCuuidCourant])

    // Preparer format des colonnes
    useEffect(()=>{ setColonnes(preparerColonnes()) }, [setColonnes])

    // Preparer donnees a afficher dans la liste
    useEffect(()=>{
        if(!favoris) return  // Rien a faire
        if(!cuuidCourant) {
            // Utiliser liste de favoris
            setListe( preprarerDonnees(favoris, {trier: trierNom}) )
        } else {
            // Charger collection
            // throw new Error("todo - Charger collection")
        }
    }, [favoris, setListe, cuuidCourant])
    
    return (
        <>
            <SectionBreadcrumb value={breadcrumb} setIdx={setBreadcrumbIdx} />
            <p>Navigation</p>
            <ListeFichiers 
                colonnes={colonnes}
                rows={liste} 
                // onClick={onClick} 
                onDoubleClick={onDoubleClick}
                onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
                onSelection={onSelectionLignes}
                onClickEntete={colonne=>{console.debug("Entete click : %s", colonne)}}
            />

            <MenuContextuelFavoris 
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
            />

        </>
    )
}

function SectionBreadcrumb(props) {

    const { value, setIdx } = props

    console.debug("!!! PROPPYS Breadcrumb : %O", props)

    return (
        <Breadcrumb>
            <Breadcrumb.Item onClick={()=>setIdx(-1)}>Favoris</Breadcrumb.Item>
            {value.map((item, idxItem)=>{
                return (
                    <Breadcrumb.Item key={item.tuuid} onClick={()=>setIdx(idxItem)} >
                        {item.nom}
                    </Breadcrumb.Item>
                )
            })}
        </Breadcrumb>
    )

}

function preparerColonnes() {
    const params = {
        ordreColonnes: ['nom', 'boutonDetail'],
        paramsColonnes: {
            'nom': {'label': 'Nom', showThumbnail: true, xs: 10, lg: 8},
            'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 2},
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

function preprarerDonnees(liste, opts) {
    opts = opts || {}
    const listeMappee = liste.map(mapper)

    if(opts.trier) {
        listeMappee.sort(opts.trier)
    }

    return listeMappee
}

function MenuContextuelFavoris(props) {

    const { contextuel, fermerContextuel } = props

    return (
        <MenuContextuel show={contextuel.show} posX={contextuel.x} posY={contextuel.y} fermer={fermerContextuel}>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-search"/> Preview</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-download"/> Download</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-info-circle"/> Info</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-star"/> Favorite</Button></Col></Row>
            <hr/>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-edit"/> Rename</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-cut"/> Move</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-copy"/> Copy</Button></Col></Row>
            <Row><Col><Button variant="link" onClick={fermerContextuel}><i className="fa fa-remove"/> Remove</Button></Col></Row>
        </MenuContextuel>
    )

}
