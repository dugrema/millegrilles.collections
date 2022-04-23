import { useState, useEffect, useCallback, useMemo } from 'react'
import { proxy as comlinkProxy } from 'comlink'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'

import { useDropzone } from 'react-dropzone'

import { 
    ListeFichiers, FormatteurTaille, FormatterDate, usagerDao,
} from '@dugrema/millegrilles.reactjs'

import PreviewFichiers from './FilePlayer'
import { SupprimerModal, CopierModal, DeplacerModal, InfoModal, RenommerModal } from './ModalOperations'
import { mapper, onContextMenu } from './mapperFichier'
import { MenuContextuelFichier, MenuContextuelRepertoire, MenuContextuelMultiselect } from './MenuContextuel'
import { detecterSupport, uploaderFichiers } from './fonctionsFichiers'

function Accueil(props) {

    // console.debug("Accueil props : %O", props)

    const { workers, etatConnexion, etatAuthentifie, evenementFichier, usager, downloadAction, erreurCb } = props
    const [ favoris, setFavoris ] = useState('')

    useEffect(()=>{ 
        if(etatConnexion && etatAuthentifie) chargerFavoris(workers, setFavoris) 
    }, [workers, etatConnexion, etatAuthentifie, setFavoris])

    return (
        <>
            <h1>Collections</h1>
            <NavigationFavoris 
                favoris={favoris} 
                setFavoris={setFavoris}
                workers={workers} 
                etatConnexion={etatAuthentifie}
                etatAuthentifie={etatAuthentifie}
                evenementFichier={evenementFichier}
                usager={usager}
                downloadAction={downloadAction}
                erreurCb={erreurCb}
            />
        </>
    )

}

export default Accueil

function NavigationFavoris(props) {

    const { workers, etatConnexion, etatAuthentifie, favoris, usager, downloadAction, setFavoris, erreurCb } = props
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
    const [ showCreerRepertoire, setShowCreerRepertoire ] = useState(false)
    const [ showSupprimerModal, setShowSupprimerModal ] = useState(false)
    const [ showCopierModal, setShowCopierModal ] = useState(false)
    const [ showDeplacerModal, setShowDeplacerModal ] = useState(false)
    const [ showInfoModal, setShowInfoModal ] = useState(false)
    const [ showRenommerModal, setShowRenommerModal ] = useState(false)
    const [ isListeComplete, setListeComplete ] = useState(false)

    // Event handling
    const [ evenementFichier, addEvenementFichier ] = useState('')        // Pipeline d'evenements fichier
    const [ evenementCollection, addEvenementCollection ] = useState('')  // Pipeline d'evenements de collection
    const [ evenementContenuCollection, addEvenementContenuCollection ] = useState('')
    const evenementFichierCb = useMemo(()=>comlinkProxy(evenement=>addEvenementFichier(evenement)), [addEvenementFichier])
    const evenementCollectionCb = useMemo(()=>comlinkProxy(evenement=>addEvenementCollection(evenement)), [addEvenementCollection])
    const evenementContenuCollectionCb = useMemo(()=>comlinkProxy(evenement=>addEvenementContenuCollection(evenement)), [addEvenementContenuCollection])

    // Extraire tri pour utiliser comme trigger pour useEffect
    const triColonnes = useMemo(()=>colonnes?colonnes.tri||{}:{}, [colonnes])

    // Callbacks
    const showSupprimerModalOuvrir = useCallback(()=>{ setShowSupprimerModal(true) }, [setShowSupprimerModal])
    const showSupprimerModalFermer = useCallback(()=>{ setShowSupprimerModal(false) }, [setShowSupprimerModal])
    const showCopierModalOuvrir = useCallback(()=>{ setShowCopierModal(true) }, [setShowCopierModal])
    const showCopierModalFermer = useCallback(()=>{ setShowCopierModal(false) }, [setShowCopierModal])
    const showDeplacerModalOuvrir = useCallback(()=>{ setShowDeplacerModal(true) }, [setShowDeplacerModal])
    const showDeplacerModalFermer = useCallback(()=>{ setShowDeplacerModal(false) }, [setShowDeplacerModal])
    const showInfoModalOuvrir = useCallback(()=>{ setShowInfoModal(true) }, [setShowInfoModal])
    const showInfoModalFermer = useCallback(()=>{ setShowInfoModal(false) }, [setShowInfoModal])
    const showRenommerModalOuvrir = useCallback(()=>{ setShowRenommerModal(true) }, [setShowRenommerModal])
    const showRenommerModalFermer = useCallback(()=>{ setShowRenommerModal(false) }, [setShowRenommerModal])

    const showPreviewAction = useCallback( async tuuid => {
        await setTuuidSelectionne(tuuid)
        setShowPreview(true)
    }, [setShowPreview, setTuuidSelectionne])

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
    }, [liste, setCuuidCourant, breadcrumb, setBreadcrumb, showPreviewAction])

    const onSelectionLignes = useCallback(selection=>{setSelection(selection)}, [setSelection])
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
            setListe( preprarerDonnees(favoris, workers, {tri: triColonnes}) )
        } else if(etatConnexion) {
            chargerCollection(workers, cuuidCourant, usager, {tri: triColonnes})
                .then(resultat=>{
                    setListe(resultat.data)
                    setListeComplete(resultat.estComplet)
                })
                .catch(erreurCb)
        }
    }, [workers, usager, etatConnexion, favoris, triColonnes, setListe, cuuidCourant, setListeComplete, erreurCb])
    
    // Detect support divers de l'appareil/navigateur
    useEffect(()=>detecterSupport(setSupport), [setSupport])

    // Event pour bloquer onClick sur dropzone (panneau background)
    const onClickBack = useCallback(event=>{
        event.stopPropagation()
        event.preventDefault()
    }, [])

    const onDrop = useCallback( acceptedFiles => {
        if(!cuuidCourant) {
            console.error("Cuuid non selectionne (favoris actif)")
            return
        }
        uploaderFichiers(workers, cuuidCourant, acceptedFiles, {erreurCb})
    }, [workers, cuuidCourant, erreurCb])

    const dzHook = useDropzone({onDrop})
    const {getRootProps, getInputProps, open: openDropzone} = dzHook

    const uploaderFichiersAction = useCallback(event=>{
        event.stopPropagation()
        event.preventDefault()
        openDropzone()
    }, [openDropzone])

    const suivantCb = useCallback(()=>{
        if(!cuuidCourant) {
            // Favoris - on n'a pas de suivant pour favoris
        } else if(etatConnexion) {
            chargerCollection(workers, cuuidCourant, usager, {listeCourante: liste, limit: 20, tri: triColonnes})
                .then(resultat=>{
                    // console.debug("!!! Resultat call suivant : %O", resultat)
                    setListe(resultat.data)
                    setListeComplete(resultat.estComplet)
                })
                .catch(erreurCb)
        }
    }, [workers, liste, cuuidCourant, etatConnexion, usager, triColonnes, setListe, setListeComplete, erreurCb])

    const enteteOnClickCb = useCallback(colonne=>{
        console.debug("Click entete nom colonne : %s", colonne)
        const triCourant = {...colonnes.tri}
        const colonnesCourant = {...colonnes}
        const colonneCourante = triCourant.colonne
        let ordre = triCourant.ordre || 1
        if(colonne === colonneCourante) {
            // Toggle direction
            ordre = ordre * -1
        } else {
            ordre = 1
        }
        colonnesCourant.tri = {colonne, ordre}
        console.debug("Sort key maj : %O", colonnesCourant)
        setColonnes(colonnesCourant)
    }, [colonnes, setColonnes])

    // useEffect(()=>{
    //     if(evenementCollection && evenementCollection.message) {
    //         console.debug("ACCUEIL.NavigationFavoris Message evenementCollection: %O", evenementCollection)
    //     } else if(evenementFichier && evenementFichier.message) {
    //         console.debug("ACCUEIL.NavigationFavoris Message evenementFichier: %O", evenementFichier)
    //     }

    //     // let trigger = false
    //     // const message = evenementCollection?evenementCollection.message:'' || evenementFichier?evenementFichier.message:{}
    //     // const cuuids = message.cuuids || []
    //     // trigger = cuuids && cuuids.includes(cuuidCourant)

    //     // if(trigger) {
    //     //     console.debug("ACCUEIL.NavigationFavoris reload sur evenement")
    //     //     chargerCollection(workers, cuuidCourant, usager)
    //     //         .then(resultat=>{
    //     //             setListe(resultat.data)
    //     //             setListeComplete(resultat.estComplet)
    //     //         })
    //     //         .catch(erreurCb)
    //     // }

    // }, [workers, usager, cuuidCourant, evenementFichier, evenementCollection, setListe, setListeComplete, erreurCb])

    useEffect(()=>{
        if(!evenementFichierCb) return
        if(cuuidCourant && etatConnexion && etatAuthentifie) {
            enregistrerEvenementsFichiersCollection(workers, cuuidCourant, evenementFichierCb)
                .catch(err=>console.warn("Erreur enregistrement listeners majFichier : %O", err))
            return () => {
                retirerEvenementsFichiersCollection(workers, cuuidCourant, evenementFichierCb)
                    .catch(err=>console.debug("Erreur retrait listeners majFichier : %O", err))
            }
        }
    }, [workers, cuuidCourant, etatConnexion, etatAuthentifie, evenementFichierCb])

    useEffect(()=>{
        if(evenementFichier) {
            mapperEvenementFichier(workers, evenementFichier, liste, cuuidCourant, setListe)
            addEvenementFichier('')  // Vider liste evenements
        }
    }, [workers, liste, evenementFichier, cuuidCourant, setListe, addEvenementFichier])

    useEffect(()=>{
        const {connexion} = workers
        if(!evenementCollectionCb) return
        if(liste && etatConnexion && etatAuthentifie) {
            const cuuids = liste.filter(item=>item.folderId).map(item=>item.folderId)
            if(cuuidCourant) cuuids.push(cuuidCourant)  // Folder courant
            connexion.enregistrerCallbackMajCollections({cuuids}, evenementCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners majCollection : %O", err))
            return () => {
                connexion.retirerCallbackMajCollections({cuuids}, evenementCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners majCollection : %O", err))
            }
        }
    }, [workers, evenementCollectionCb, cuuidCourant, liste, etatConnexion, etatAuthentifie])

    useEffect(()=>{
        if(evenementCollection) {
            mapperEvenementCollection(evenementCollection, favoris, liste, setFavoris, setListe)
            addEvenementCollection('')  // Vider liste evenements
        }
    }, [cuuidCourant, favoris, liste, setFavoris, setListe, evenementCollection, addEvenementCollection])

    useEffect(()=>{
        const {connexion} = workers
        if(!evenementContenuCollectionCb) return
        if(cuuidCourant && etatConnexion && etatAuthentifie) {
            connexion.enregistrerCallbackMajContenuCollection({cuuid: cuuidCourant}, evenementContenuCollectionCb)
                .catch(err=>console.warn("Erreur enregistrement listeners maj contenu collection : %O", err))
            return () => {
                connexion.retirerCallbackMajContenuCollection({cuuid: cuuidCourant}, evenementContenuCollectionCb)
                    .catch(err=>console.warn("Erreur retirer listeners maj contenu collection : %O", err))
            }
        }

    }, [workers, etatConnexion, etatAuthentifie, cuuidCourant, evenementContenuCollectionCb])

    useEffect(()=>{
        if(evenementContenuCollection) {
            console.debug("Recu evenementContenuCollection : %O", evenementContenuCollection)
            mapperEvenementContenuCollection(workers, evenementContenuCollection, liste, setListe, addEvenementFichier, addEvenementCollection)
            addEvenementContenuCollection('')
        }
    }, [workers, evenementContenuCollection, addEvenementContenuCollection, liste, setListe, addEvenementFichier, addEvenementCollection])

    return (
        <div {...getRootProps({onClick: onClickBack})}>
            <input {...getInputProps()} />

            <Row>
                <Col xs={12} lg={7}>
                    <SectionBreadcrumb value={breadcrumb} setIdx={setBreadcrumbIdx} />
                </Col>

                <Col xs={12} lg={5} className="buttonbars">
                    <BoutonsFormat modeView={modeView} setModeView={setModeView} />
                    <BoutonsUpload 
                        cuuid={cuuidCourant}
                        uploaderFichiersAction={uploaderFichiersAction} 
                        setShowCreerRepertoire={setShowCreerRepertoire}
                    />
                </Col>
            </Row>

            <ListeFichiers 
                modeView={modeView}
                colonnes={colonnes}
                rows={liste} 
                // onClick={onClick} 
                onDoubleClick={onDoubleClick}
                onContextMenu={(event, value)=>onContextMenu(event, value, setContextuel)}
                onSelection={onSelectionLignes}
                onClickEntete={enteteOnClickCb}
                suivantCb={(!cuuidCourant||isListeComplete)?'':suivantCb}
            />

            <MenuContextuelFavoris 
                workers={props.workers}
                contextuel={contextuel} 
                fermerContextuel={fermerContextuel}
                fichiers={liste}
                tuuidSelectionne={tuuidSelectionne}
                selection={selection}
                showPreview={showPreviewAction}
                usager={usager}
                showSupprimerModalOuvrir={showSupprimerModalOuvrir}
                showCopierModalOuvrir={showCopierModalOuvrir}
                showDeplacerModalOuvrir={showDeplacerModalOuvrir}
                showInfoModalOuvrir={showInfoModalOuvrir}
                showRenommerModalOuvrir={showRenommerModalOuvrir}
                cuuid={cuuidCourant}
                downloadAction={downloadAction}
                etatConnexion={etatConnexion}
                etatAuthentifie={etatAuthentifie}
            />

            <PreviewFichiers 
                workers={workers}
                showPreview={showPreview} 
                setShowPreview={setShowPreview}
                tuuidSelectionne={tuuidSelectionne}
                fichiers={liste}
                support={support}
            />

            <ModalCreerRepertoire 
                show={showCreerRepertoire} 
                cuuid={cuuidCourant}
                fermer={()=>{setShowCreerRepertoire(false)}} 
                workers={workers}
            />

            <SupprimerModal
                show={showSupprimerModal}
                fermer={showSupprimerModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
            />

            <CopierModal 
                show={showCopierModal} 
                fermer={showCopierModalFermer}
                favoris={favoris}
                selection={selection}
                workers={workers}
            />

            <DeplacerModal 
                show={showDeplacerModal} 
                fermer={showDeplacerModalFermer}
                favoris={favoris}
                cuuid={cuuidCourant}
                selection={selection}
                workers={workers}
            />

            <InfoModal 
                show={showInfoModal} 
                fermer={showInfoModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
                support={support}
                downloadAction={downloadAction}
                etatConnexion={etatConnexion}
                etatAuthentifie={etatAuthentifie}
                usager={usager}
            />

            <RenommerModal
                show={showRenommerModal} 
                fermer={showRenommerModalFermer}
                fichiers={liste}
                selection={selection}
                workers={workers}
            />

        </div>
    )
}

function ModalCreerRepertoire(props) {

    const { show, fermer, workers, cuuid } = props
    const { connexion } = workers

    const [ nomCollection, setNomCollection ] = useState('')

    const changerNomCollection = useCallback(event=>{
        const value = event.currentTarget.value
        setNomCollection(value)
    }, [setNomCollection])

    const creerCollection = useCallback(event=>{
        event.preventDefault()
        event.stopPropagation()

        const opts = {}
        if(cuuid) opts.cuuid = cuuid
        else opts.favoris = true

        connexion.creerCollection(nomCollection, opts)
            .then(()=>{
                setNomCollection('')  // Reset
                fermer()
            })
            .catch(err=>{
                console.error("Erreur creation collection : %O", err)
            })
    }, [connexion, nomCollection, cuuid, setNomCollection, fermer])

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton>Creer nouvelle collection</Modal.Header>

            <Modal.Body>
                <Form onSubmit={creerCollection}>
                    <Form.Group className="mb-3" controlId="formNomCollection">
                        <Form.Label>Nom de la collection</Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="Saisir le nom ..." 
                            onChange={changerNomCollection}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={creerCollection}>Creer</Button>
            </Modal.Footer>

        </Modal>
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

function BoutonsUpload(props) {

    const { cuuid, uploaderFichiersAction, setShowCreerRepertoire } = props

    return (
        <>
            <Button 
                variant="secondary" 
                className="individuel"
                onClick={uploaderFichiersAction}
                disabled={!cuuid}
            >
                <i className="fa fa-plus"/> Fichier
            </Button>
            <Button 
                variant="secondary" 
                className="individuel"
                onClick={setShowCreerRepertoire}
            >
                <i className="fa fa-folder"/> Collection
            </Button>
        </>
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

function trierTaille(a, b) {
    const nomA = a.nom?a.nom:'',
          nomB = b.nom?b.nom:''
    const tailleA = a.taille?a.taille:0,
          tailleB = b.taille?b.taille:0
    if(tailleA !== tailleB) {
        return tailleA - tailleB
    }
    if(nomA === nomB) return 0
    if(!nomA) return 1
    if(!nomB) return -1
    return nomA.localeCompare(nomB)
}

function trierDateAjout(a, b) {
    const nomA = a.nom?a.nom:'',
          nomB = b.nom?b.nom:''
    const dateAjoutA = a.dateAjout?a.dateAjout:0,
          dateAjoutB = b.dateAjout?b.dateAjout:0
    if(dateAjoutA !== dateAjoutB) {
        return dateAjoutA - dateAjoutB
    }
    if(nomA === nomB) return 0
    if(!nomA) return 1
    if(!nomB) return -1
    return nomA.localeCompare(nomB)
}

function trierMimetype(a, b) {
    const nomA = a.nom?a.nom:'',
          nomB = b.nom?b.nom:''
    const mimetypeA = a.mimetype?a.mimetype:'',
          mimetypeB = b.mimetype?b.mimetype:''
    if(mimetypeA !== mimetypeB) {
        if(!mimetypeA) return 1
        if(!mimetypeB) return -1
        return mimetypeA.localeCompare(mimetypeB)
    }
    if(nomA === nomB) return 0
    if(!nomA) return 1
    if(!nomB) return -1
    return nomA.localeCompare(nomB)
}

function preprarerDonnees(liste, workers, opts) {
    opts = opts || {}
    const tri = opts.tri || {}

    const listeMappee = liste.map(item=>mapper(item, workers))

    let triFunction = null
    switch(tri.colonne) {
        case 'nom': triFunction = trierNom; break
        case 'taille': triFunction = trierTaille; break
        case 'mimetype': triFunction = trierMimetype; break
        case 'dateAjout': triFunction = trierDateAjout; break
        default: triFunction = null
    }

    if(triFunction) {
        listeMappee.sort(triFunction)
        if(tri.ordre < 0) {
            listeMappee.reverse()
        }
    }

    return listeMappee
}

function MenuContextuelFavoris(props) {

    const { contextuel, fichiers, selection } = props

    if(!contextuel.show) return ''

    console.debug("!!! Selection : %s, FICHIERS : %O", selection, fichiers)

    if( selection && selection.length > 1 ) {
        return <MenuContextuelMultiselect {...props} />
    } else if(selection.length>0) {
        const fichierTuuid = selection[0]
        const fichier = fichiers.filter(item=>(item.folderId||item.fileId)===fichierTuuid).pop()
        if(fichier) {
            if(fichier.folderId) {
                return <MenuContextuelRepertoire {...props} repertoire={fichier} />
            } else if(fichier.fileId) {
                return <MenuContextuelFichier fichier={fichier} {...props} />
            }
        }
    }

    return ''
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

async function chargerCollection(workers, cuuid, usager, opts) {
    opts = opts || {}
    const { listeCourante, tri } = opts
    const limit = opts.limit || 20

    let sort_keys = null
    if(tri) {
        let nomColonne
        switch(tri.colonne) {
            case 'nom': nomColonne = 'nom'; break
            case 'taille': nomColonne = 'version_courante.taille'; break
            case 'mimetype': nomColonne = 'mimetype'; break
            case 'dateAjout': nomColonne = '_mg-creation'; break
            default: nomColonne = null
        }

        if(nomColonne) {
            sort_keys = [{colonne: nomColonne, ordre: tri.ordre}]
        }
    }

    let skip = 0
    if(listeCourante) {
        skip = listeCourante.length
    }

    // console.debug("Charger collection %s (offset: %s)", cuuid, skip)
    const { connexion, chiffrage } = workers
    const reponse = await connexion.getContenuCollection(cuuid, {skip, limit, sort_keys})
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
        const cleFichier = await usagerDao.getCleDechiffree(fuuid)
        if(!cleFichier) fuuidsInconnus.push(fuuid)
    }

    if(fuuidsInconnus.length > 0) {
        // console.debug("Get cles manquantes pour fuuids %O", fuuidsInconnus)
        connexion.getClesFichiers(fuuidsInconnus, usager)
            .then(async reponse=>{
                console.debug("Reponse dechiffrage cles : %O", reponse)

                for await (const fuuid of Object.keys(reponse.cles)) {
                    const cleFichier = reponse.cles[fuuid]
                    console.debug("Dechiffrer cle %O", cleFichier)
                    const cleSecrete = await chiffrage.dechiffrerCleSecrete(cleFichier.cle)
                    cleFichier.cleSecrete = cleSecrete
                    console.debug("Cle secrete fichier %O", cleFichier)
                    usagerDao.saveCleDechiffree(fuuid, cleSecrete, cleFichier)
                        .catch(err=>{
                            console.warn("Erreur sauvegarde cle dechiffree %s dans la db locale", err)
                        })
                }
            
            })
            .catch(err=>{console.error("Erreur chargement cles fichiers %O : %O", fuuidsInconnus, err)})
    } else {
        // console.debug("Toutes les cles sont deja chargees")
    }

    let liste = listeCourante || [],
        estComplet = false
    if(documents) {
        const nouveauxFichiers = preprarerDonnees(documents, workers)
        if(nouveauxFichiers.length === 0) {
            // Aucuns fichiers ajoutes, on a la liste au complet
            estComplet = true
        }
        // console.debug("chargerCollection donnees recues : %O", nouveauxFichiers)
        // setListe( data )
        liste = [...liste, ...nouveauxFichiers]  // Concatener
    }

    return {data: liste, estComplet}
}

async function enregistrerEvenementsFichiersCollection(workers, cuuid, callback) {
    const { connexion } = workers
    try {
        // const tuuids = liste.filter(item=>item.fileId).map(item=>item.fileId)
        await connexion.enregistrerCallbackMajFichierCollection({cuuids: [cuuid]}, callback)
    } catch (err) {
        console.error("Erreur enregistrerCallbackMajFichier : %O", err)
    }
}

async function retirerEvenementsFichiersCollection(workers, cuuid, callback) {
    const { connexion } = workers
    try {
        // const tuuids = liste.filter(item=>item.fileId).map(item=>item.fileId)
        await connexion.retirerCallbackMajFichierCollection({cuuids: [cuuid]}, callback)
    } catch (err) {
        console.error("Erreur retirerEvenementsFichiers : %O", err)
    }
}

function mapperEvenementFichier(workers, evenementFichier, liste, cuuidCourant, setListe) {
    console.debug("Mapper evenement fichier : %O, liste : %O", evenementFichier, liste)
    const message = evenementFichier.message
    const tuuid = message.tuuid
    const listeMaj = liste
        .filter(item=>{
            // Detecter retrait/supprime
            const tuuidItem = item.fileId
            if(tuuidItem === tuuid) {
                if(message.supprime === true) return false  // Fichier supprime
                if(!message.cuuids.includes(cuuidCourant)) return false  // Fichier retire de la collection
            }
            return true  // Conserver le fichier
        })
        .map(item=>{
            const tuuidItem = item.fileId
            if(tuuidItem === tuuid) {
                return mapper(message, workers)
            }
            return item
        })

    if(evenementFichier.nouveau) {
        listeMaj.push(mapper(message, workers))
    }

    setListe(listeMaj)
}

function mapperEvenementCollection(evenementCollection, favoris, liste, setFavoris, setListe) {
    const message = evenementCollection.message
    const cuuid = message.tuuid
    const { nom } = message
    const favorisMaj = favoris.map(item=>{
        if(item.tuuid === cuuid) return {...item, nom}
        return item
    })

    const listeMaj = liste.map(item=>{
        if(item.tuuid === cuuid) return {...item, nom}
        return item
    })

    setFavoris(favorisMaj)
    setListe(listeMaj)
}

async function mapperEvenementContenuCollection(workers, evenementContenuCollection, liste, setListe, addEvenementFichier, addEvenementCollection) {
    console.debug("Mapper evenement contenu collection : %O, liste : %O", evenementContenuCollection, liste)
    const message = evenementContenuCollection.message
    const retires = message.retires || []
    const listeMaj = liste
        .filter(item=>{
            // Detecter retrait/supprime
            const tuuidItem = item.fileId || item.folderId
            if(retires.includes(tuuidItem)) {
                return false  // Retirer l'item
            }
            return true  // Conserver item
        })

    // Maj liste (retraits)
    setListe(listeMaj)

    // Determiner si on a des ajouts. Traitement va etre async, on utilise le meme
    // mecanisme d'ajout que pour les evenements d'ajout de fichiers / collections.
    let tuuids = []
    if(message.fichiers_ajoutes) tuuids = [...tuuids, ...message.fichiers_ajoutes]
    if(message.collections_ajoutees) tuuids = [...tuuids, ...message.collections_ajoutees]
    const { connexion } = workers
    if(tuuids.length > 0) {
        const reponseDocuments = await connexion.getDocuments(tuuids)
        const fichiers = reponseDocuments.fichiers
        if(fichiers) {
            console.debug("Reponse charger tuuids : %O", fichiers)
            fichiers.forEach(doc=>{
                addEvenementFichier({nouveau: true, message: doc})
            })
        }
    }
}
