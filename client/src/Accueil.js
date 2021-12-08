import { useState, useEffect, useCallback } from 'react'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'

import { 
    ListeFichiers, MenuContextuel, FormatteurTaille, FormatterDate, saveCleDechiffree, getCleDechiffree,
    supporteFormatWebp, supporteFormatWebm, supporteFileStream, isTouchEnabled,
} from '@dugrema/millegrilles.reactjs'

import { mapper, onContextMenu } from './mapperFichier.js'
import PreviewFichiers from './FilePlayer.js'

function Accueil(props) {

    const { workers, etatConnexion } = props
    const [ favoris, setFavoris ] = useState('')

    useEffect(()=>{ if(etatConnexion) chargerFavoris(workers, setFavoris) }, [workers, etatConnexion, setFavoris])

    return (
        <>
            <h1>Collections</h1>
            <NavigationFavoris 
                favoris={favoris} 
                workers={workers} 
                etatConnexion={etatConnexion}
            />
        </>
    )

}

export default Accueil

function NavigationFavoris(props) {

    const { favoris, workers, etatConnexion } = props
    const [ colonnes, setColonnes ] = useState('')
    const [ breadcrumb, setBreadcrumb ] = useState([])
    const [ cuuidCourant, setCuuidCourant ] = useState('')
    const [ liste, setListe ] = useState([])
    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ selection, setSelection ] = useState('')
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState('')
    const [ modeView, setModeView ] = useState('')
    const [ showPreview, setShowPreview ] = useState(false)
    const [ support, setSupport ] = useState({})

    // Callbacks
    const showPreviewAction = useCallback( async tuuid => {
        await setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setSelection, setShowPreview, setTuuidSelectionne])

    const onDoubleClick = useCallback((event, value)=>{
        window.getSelection().removeAllRanges()
        // console.debug("Ouvrir %O (liste courante: %O)", value, liste)
        if(value.folderId) {
            const folderItem = liste.filter(item=>item.folderId===value.folderId).pop()
            setBreadcrumb([...breadcrumb, folderItem])
            setCuuidCourant(value.folderId)
        } else {
            // Determiner le type de fichier
            showPreviewAction(value.fileId)
        }
    }, [liste, setCuuidCourant, setTuuidSelectionne, breadcrumb, setBreadcrumb, showPreviewAction])

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
        if(idx >= 0) setCuuidCourant(breadcrumbTronquee[idx].folderId)
        else setCuuidCourant('')  // Racine des favoris
    }, [breadcrumb, setBreadcrumb, setCuuidCourant])

    // Preparer format des colonnes
    useEffect(()=>{ setColonnes(preparerColonnes()) }, [setColonnes])

    // Preparer donnees a afficher dans la liste
    useEffect(()=>{
        if(!favoris || !etatConnexion) return  // Rien a faire
        if(!cuuidCourant) {
            // Utiliser liste de favoris
            setListe( preprarerDonnees(favoris, workers, {trier: trierNom}) )
        } else if(etatConnexion) {
            chargerCollection(workers, cuuidCourant, setListe)
        }
    }, [workers, etatConnexion, favoris, setListe, cuuidCourant])
    
    // Detect support divers de l'appareil/navigateur
    useEffect(()=>detecterSupport(setSupport), [setSupport])

    return (
        <>
            <SectionBreadcrumb value={breadcrumb} setIdx={setBreadcrumbIdx} />

            <BoutonsFormat modeView={modeView} setModeView={setModeView} />

            <ListeFichiers 
                modeView={modeView}
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

            <MenuContextuelFavoris 
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
            />

            <PreviewFichiers 
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={liste}
                support={support}
            />

        </>
    )
}

function SectionBreadcrumb(props) {

    const { value, setIdx } = props

    return (
        <Breadcrumb>
            
            <Breadcrumb.Item onClick={()=>setIdx(-1)}>Favoris</Breadcrumb.Item>
            
            {value.map((item, idxItem)=>{
                return (
                    <Breadcrumb.Item key={idxItem} onClick={()=>setIdx(idxItem)} >
                        {item.nom}
                    </Breadcrumb.Item>
                )
            })}

        </Breadcrumb>
    )

}

function BoutonsFormat(props) {

    const { modeView, setModeView } = props

    const setModeListe = useCallback(()=>{ setModeView('liste') }, [setModeView])
    const setModeThumbnails = useCallback(()=>{ setModeView('thumbnails') }, [setModeView])

    let variantListe = 'secondary', variantThumbnail = 'outline-secondary'
    if( modeView === 'thumbnails' ) {
        variantListe = 'outline-secondary'
        variantThumbnail = 'secondary'
    }

    return (
        <ButtonGroup>
            <Button variant={variantListe} onClick={setModeListe}><i className="fa fa-list" /></Button>
            <Button variant={variantThumbnail} onClick={setModeThumbnails}><i className="fa fa-th-large" /></Button>
        </ButtonGroup>
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

async function chargerFavoris(workers, setFavoris) {
    // console.debug("Charger favoris")
    const { connexion } = workers
    try {
        const messageFavoris = await connexion.getFavoris()
        const favoris = messageFavoris.favoris || {}
        // console.debug("Favoris recus : %O", favoris)
        setFavoris(favoris)
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }
}

async function chargerCollection(workers, cuuid, setListe) {
    // console.debug("Charger collection %s", cuuid)
    const { connexion } = workers
    const reponse = await connexion.getContenuCollection(cuuid)
    // console.debug("!!! Reponse collection %s = %O", cuuid, reponse)
    const { documents } = reponse

    // Precharger les cles des images thumbnails, small et posters
    const fuuidsImages = documents.map(item=>{
        const { version_courante } = item
        if(version_courante && version_courante.images) {
            const fuuidsImages = Object.keys(version_courante.images)
                .filter(item=>['thumb', 'thumbnail', 'poster', 'small'].includes(item))
                .map(item=>version_courante.images[item].hachage)
                .reduce((arr, item)=>{arr.push(item); return arr}, [])
            return fuuidsImages
        }
        return []
    }).reduce((arr, item)=>{
        return [...arr, ...item]
    }, [])
    // console.debug("Fuuids images : %O", fuuidsImages)

    // Verifier les cles qui sont deja connues
    let fuuidsInconnus = []
    for await (const fuuid of fuuidsImages) {
        const cleFichier = await getCleDechiffree(fuuid)
        if(!cleFichier) fuuidsInconnus.push(fuuid)
    }

    if(fuuidsInconnus.length > 0) {
        connexion.getClesFichiers(fuuidsInconnus)
            .then(async reponse=>{
                // console.debug("Reponse dechiffrage cles : %O", reponse)

                for await (const fuuid of Object.keys(reponse.cles)) {
                    const cleFichier = reponse.cles[fuuid]
                    // console.debug("Dechiffrer cle %O", cleFichier)
                    const cleSecrete = await workers.chiffrage.preparerCleSecreteSubtle(cleFichier.cle, cleFichier.iv)
                    cleFichier.cleSecrete = cleSecrete
                    // console.debug("Cle secrete fichier %O", cleFichier)
                    saveCleDechiffree(fuuid, cleSecrete, cleFichier)
                        .catch(err=>{
                            console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
                        })
                }
            
            })
            .catch(err=>{console.error("Erreur chargement cles fichiers %O : %O", fuuidsInconnus, err)})
    } else {
        // console.debug("Toutes les cles sont deja chargees")
    }

    if(documents) {
        setListe( preprarerDonnees(documents, workers) )
    }
}

async function detecterSupport(setSupport) {
    const webp = await supporteFormatWebp()
    const webm = supporteFormatWebm()
    const fileStream = await supporteFileStream()
    const touch = isTouchEnabled()

    const support = {webp, webm, fileStream, touch}
    console.info("Support du navigateur : %O", support)
    setSupport(support)
}