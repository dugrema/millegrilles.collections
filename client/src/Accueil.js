import { useState, useEffect, useCallback, useMemo } from 'react'

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

    const { workers, etatConnexion, etatAuthentifie, evenementCollection, evenementFichier, usager, downloadAction } = props
    const [ favoris, setFavoris ] = useState('')

    useEffect(()=>{ 
        if(etatConnexion && etatAuthentifie) chargerFavoris(workers, setFavoris) 
    }, [workers, etatConnexion, etatAuthentifie, setFavoris])

    useEffect(()=>{
        if(!evenementCollection || !evenementCollection.message) return 

        console.debug("ACCUEIL(top) Message evenementCollection: %O", evenementCollection)

        // Empecher cycle
        //const message = evenementCollection.message || {}
        let trigger = true
        // if(message.favoris === true || message.tuuid) {
        //     // C'est un favoris, on recharge la liste au complet
        // }

        if(trigger) {
            console.debug("ACCUEIL(top) reload favoris sur evenement")
            chargerFavoris(workers, setFavoris)
        }
    }, [evenementCollection, workers, setFavoris])

    return (
        <>
            <h1>Collections</h1>
            <NavigationFavoris 
                favoris={favoris} 
                workers={workers} 
                etatConnexion={etatAuthentifie}
                etatAuthentifie={etatAuthentifie}
                evenementFichier={evenementFichier}
                evenementCollection={evenementCollection}
                usager={usager}
                downloadAction={downloadAction}
            />
        </>
    )

}

export default Accueil

function NavigationFavoris(props) {

    const { favoris, workers, etatConnexion, evenementFichier, evenementCollection, usager, downloadAction, erreurCb } = props
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
        uploaderFichiers(workers, cuuidCourant, acceptedFiles)
    }, [workers, cuuidCourant])

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

    useEffect(()=>{
        if(evenementCollection && evenementCollection.message) {
            console.debug("ACCUEIL.NavigationFavoris Message evenementCollection: %O", evenementCollection)
        } else if(evenementFichier && evenementFichier.message) {
            console.debug("ACCUEIL.NavigationFavoris Message evenementFichier: %O", evenementFichier)
        }

        // let trigger = false
        // const message = evenementCollection?evenementCollection.message:'' || evenementFichier?evenementFichier.message:{}
        // const cuuids = message.cuuids || []
        // trigger = cuuids && cuuids.includes(cuuidCourant)

        // if(trigger) {
        //     console.debug("ACCUEIL.NavigationFavoris reload sur evenement")
        //     chargerCollection(workers, cuuidCourant, usager)
        //         .then(resultat=>{
        //             setListe(resultat.data)
        //             setListeComplete(resultat.estComplet)
        //         })
        //         .catch(erreurCb)
        // }

    }, [workers, usager, cuuidCourant, evenementFichier, evenementCollection, setListe, setListeComplete, erreurCb])

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
                evenementFichier={evenementFichier}
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
