import { useState, useEffect, useCallback } from 'react'

import { 
    ListeFichiers, FormatteurTaille, FormatterDate, saveCleDechiffree, getCleDechiffree,
} from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { MenuContextuelFichierRecherche, MenuContextuelMultiselect } from './MenuContextuel'
import { SupprimerModal, CopierModal, InfoModal } from './ModalOperations'

import { mapperRecherche, onContextMenu } from './mapperFichier'
import { detecterSupport } from './fonctionsFichiers'

function Recherche(props) {
    const { workers, etatConnexion, usager, paramsRecherche, downloadAction } = props
    const [ paramsCourant, setParamsCourant ] = useState('')
    const [ hits, setHits ] = useState('')
    const [ enCours, setEnCours ] = useState(true)
    const [ favoris, setFavoris ] = useState('')

    useEffect(()=>{
        // Nouvelle recherche, on reset tout
        setHits([])
        setParamsCourant({mots_cles: paramsRecherche, from_idx: 0, size: 50})
    }, [paramsRecherche, setParamsCourant, setHits])

    useEffect(()=>{ 
        if(etatConnexion && paramsCourant) {
            // console.debug("Recherche avec %O", paramsCourant)
            setEnCours(true)
            effectuerRecherche(workers, paramsCourant, setHits)
                .finally(()=>{ setEnCours(false) })
        }
    }, [workers, etatConnexion, paramsCourant, setHits, setEnCours])

    useEffect(()=>{ if(etatConnexion) chargerFavoris(workers, setFavoris) }, [workers, etatConnexion, setFavoris])

    // console.debug("!!! HITS : %O", hits)

    return (
        <>
            <h1>Recherche</h1>

            <p>Parametres : {paramsCourant.mots_cles}</p>

            <NavigationRecherche
                hits={hits}
                workers={workers} 
                etatConnexion={etatConnexion}
                usager={usager}
                paramsRecherche={paramsCourant}
                enCours={enCours}
                favoris={favoris}
                downloadAction={downloadAction}
            />
        </>
    )
}

export default Recherche

function NavigationRecherche(props) {

    const { workers, hits, usager, enCours, favoris, downloadAction } = props

    const [ contextuel, setContextuel ] = useState({show: false, x: 0, y: 0})
    const [ selection, setSelection ] = useState('')
    const [ tuuidSelectionne, setTuuidSelectionne ] = useState('')
    const [ showPreview, setShowPreview ] = useState(false)
    const [ support, setSupport ] = useState({})
    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ colonnes, setColonnes ] = useState([])

    const showSupprimerModalOuvrir = useCallback(()=>{ setShowSupprimerModal(true) }, [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>{ setShowSupprimerModal(false) }, [setShowSupprimerModal])
    const showCopierModalOuvrir = useCallback(()=>{ setShowCopierModal(true) }, [setShowCopierModal])
    const showCopierModalFermer = useCallback(()=>{ setShowCopierModal(false) }, [setShowCopierModal])
    const showInfoModalOuvrir = useCallback(()=>{ setShowInfoModal(true) }, [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>{ setShowInfoModal(false) }, [setShowInfoModal])

    const showPreviewAction = useCallback( async tuuid => {
        await setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, setTuuidSelectionne])

    const onDoubleClick = useCallback((event, value)=>{
        window.getSelection().removeAllRanges()
        // console.debug("Ouvrir %O (liste courante: %O)", value, liste)
        if(value.folderId) {
            // const folderItem = recents.filter(item=>item.folderId===value.folderId).pop()
            // setBreadcrumb([...breadcrumb, folderItem])
            // setCuuidCourant(value.folderId)
        } else {
            // Determiner le type de fichier
            showPreviewAction(value.fileId)
        }
    }, [setTuuidSelectionne, showPreviewAction])

    const onSelectionLignes = useCallback(selection=>{setSelection(selection)}, [setSelection])
    // const onSelectionThumbs = useCallback(selection=>{setSelection(selection.join(', '))}, [setSelection])

    const fermerContextuel = useCallback(()=>{
        setContextuel(false)
    }, [setContextuel])

    // Detect support divers de l'appareil/navigateur
    useEffect(()=>detecterSupport(setSupport), [setSupport])

    useEffect(()=>{
        setColonnes(preparerColonnes())
    }, [])

    return (
        <div>
            <ListeFichiers 
                rows={hits} 
                colonnes={colonnes}
                // onClick={onClick} 
                onDoubleClick={onDoubleClick}
                onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
                onSelection={onSelectionLignes}
                // onClickEntete={colonne=>{
                    // console.debug("Entete click : %s", colonne)
                //}}
            />

            <AucunsResultats hits={hits} enCours={enCours} />

            <MenuContextuelRecherche
                workers={props.workers}
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                fichiers={hits}
                tuuidSelectionne={tuuidSelectionne}
                selection={selection}
                showPreview={showPreviewAction}
                usager={usager}
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                downloadAction={downloadAction}
            />

            <PreviewFichiers 
                workers={workers}
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={hits}
                support={support}
            />

            <SupprimerModal
                show={showSupprimerModal}
                fermer={showSupprimerModalFermer}
                fichiers={hits}
                selection={selection}
                workers={workers}
            />

            <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                fichiers={hits}
                favoris={favoris}
                selection={selection}
                workers={workers}
            />

            <InfoModal 
                show={showInfoModal} 
                fermer={showInfoModalFermer}
                fichiers={hits}
                selection={selection}
                workers={workers}
            />

        </div>
    )
}

function AucunsResultats(props) {
    const { hits, enCours } = props

    if( !enCours && (!hits || hits.length === 0) ) {
        return <p>Aucuns resultats</p>
    }

    return ''
}

async function effectuerRecherche(workers, params, setHits) {
    // console.debug("Effectuer recherche (%O)", params)
    const { connexion } = workers
    try {
        const message = await connexion.rechercheIndex(params.mots_cles, params.from_idx, params.size)
        if(message.ok === true) {
            // console.debug("Resultat recherche : %O", message)

            const recents = message.hits || {}
            const listeMappee = preprarerDonnees(recents, workers)
            // console.debug("Recents mappes : %O", recents)

            // setParamsCourant({mots_cles, from_idx: 0, taille: 50})
            setHits(listeMappee)
        } else {
            console.error("Erreur recherche %O", message.message)
        }
    } catch(err) {
        console.error("Erreur chargement favoris : %O", err)
    }
}

function preprarerDonnees(liste, workers, opts) {
    opts = opts || {}
    const listeMappee = liste.map(item=>mapperRecherche(item, workers))

    if(opts.trier) {
        listeMappee.sort(opts.trier)
    }

    return listeMappee
}

function MenuContextuelRecherche(props) {

    const { contextuel, fichiers, selection } = props

    if(!contextuel.show) return ''

    if( selection && selection.length > 1 ) {
        return <MenuContextuelMultiselect {...props} />
    } else if(selection.length>0) {
        const fichierTuuid = selection[0]
        const fichier = fichiers.filter(item=>(item.folderId||item.fileId)===fichierTuuid).pop()
        if(fichier) {
            if(fichier.folderId) {
                return <p>Non supporte - TODO</p>
            } else if(fichier.fileId) {
                return <MenuContextuelFichierRecherche fichier={fichier} {...props} />
            }
        }
    }

    return ''
}

function preparerColonnes() {
    const params = {
        ordreColonnes: ['score', 'nom', 'taille', 'mimetype', 'dateAjout', 'boutonDetail'],
        paramsColonnes: {
            'score': {'label': 'Score', formatteur: FormatteurScore, xs: 1, lg: 1},
            'nom': {'label': 'Nom', showThumbnail: true, xs: 10, lg: 4},
            'taille': {'label': 'Taille', className: 'details', formatteur: FormatteurTaille, xs: 3, lg: 1},
            'mimetype': {'label': 'Type', className: 'details', xs: 3, lg: 2},
            'dateAjout': {'label': 'Date ajout', className: 'details', formatteur: FormatterDate, xs: 5, lg: 2},
            'boutonDetail': {label: ' ', className: 'details', showBoutonContexte: true, xs: 1, lg: 1},
        },
        tri: {colonne: 'nom', ordre: 1},
    }
    return params
}

function FormatteurScore(props) {
    const value = props.value
    if(isNaN(value)) return ''

    const valuepct = Math.floor(value)
    return <span>{valuepct}%</span>
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
