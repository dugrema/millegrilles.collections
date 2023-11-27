import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { FormatteurTaille, FormatterDate, FormatterDuree, Thumbnail, FilePicker, hachage } from '@dugrema/millegrilles.reactjs'

import { mapDocumentComplet, estMimetypeMedia } from './mapperFichier'
import { majFichierMetadata, majCollectionMetadata } from './fonctionsFichiers'
import { ConversionVideo } from './OperationsVideo'

import useWorkers, { useCapabilities, useEtatAuthentifie, useEtatConnexion, useEtatPret, useUsager } from './WorkerContext'

import actionsNavigationSecondaire, {thunks as thunksNavigationSecondaire} from './redux/navigationSecondaireSlice'
import { chargerInfoContacts } from './redux/partagerSlice'
import { PathFichier } from './NavigationCommun'
import { AlertHeading } from 'react-bootstrap'

const CONST_LIMITE_FICHIERS_ZIP = 1_000
const CONST_EXPIRATION_VISITE = 3 * 86_400_000

export function SupprimerModal(props) {

    const { workers, show, fermer, selection, cuuid } = props
    const connexion = workers.connexion
    const breadcrumb = useSelector(state=>state.fichiers.breadcrumb)

    const breadcrumbPath = useMemo(()=>{
        if(!breadcrumb) return ''
        return breadcrumb.map(item=>item.tuuid)
    }, [breadcrumb])

    const supprimer = useCallback( () => {
        // console.debug("SUPRIMER %O", selection)

        connexion.supprimerDocuments(cuuid, selection, breadcrumbPath)
        .then(reponse => {
            if(reponse.ok === false) {
                console.error("Erreur suppression documents %O : %s", selection, reponse.message)
            }
        })
        .catch(err => {
            console.error("Erreur suppression documents %O : %O", selection, err)
        })
        .finally(() => {
            fermer()
        })
        
    }, [connexion, fermer, selection, cuuid, breadcrumbPath])

    if(!selection || selection.length === 0) return ''

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Supprimer
            </Modal.Header>

            <p>Supprimer le fichier?</p>

            <Modal.Footer>
                <Button onClick={supprimer}>Supprimer</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function ArchiverModal(props) {

    const { show, fermer } = props

    const workers = useWorkers()

    const liste = useSelector(state => state.fichiers.liste)
    const cuuid = useSelector(state => state.fichiers.cuuid)
    const selection = useSelector(state => state.fichiers.selection )
    const breadcrumb = useSelector(state=>state.fichiers.breadcrumb)

    const [selectionListe, toggleArchive] = useMemo(()=>{
        if(!liste || !selection) return [null, null]
        // console.debug("ArchiverModal liste %O\nselection %O", liste, selection)
        const selectionListe = liste.filter(item=>{
            return selection.includes(item.tuuid)
        })
        // console.debug("Selection liste ", selectionListe)

        const toggleArchive = selectionListe.reduce((acc, item)=>{
            return acc && !item.archive
        }, true)

        return [selectionListe, toggleArchive]
    }, [liste, selection])

    const connexion = workers.connexion

    const breadcrumbPath = useMemo(()=>{
        if(!breadcrumb) return ''
        return breadcrumb.map(item=>item.tuuid)
    }, [breadcrumb])

    const actionHandler = useCallback( () => {
        // console.debug("SUPRIMER %O", selection)

        const promise = toggleArchive?connexion.archiverDocuments(selection):connexion.recupererDocuments(selection)

        promise
            .then(reponse => {
                if(reponse.ok === false) {
                    console.error("Erreur archivage/restauration documents %O : %s", selection, reponse.message)
                }
            })
            .catch(err => {
                console.error("Erreur archivage/restauration documents %O : %O", selection, err)
            })
            .finally(() => {
                fermer()
            })
        
    }, [connexion, fermer, selection, cuuid, breadcrumbPath, toggleArchive])

    const labelButton = useMemo(()=>{
        if(toggleArchive) return 'Archiver'
        return 'Reactiver'
    }, [toggleArchive])

    if(!selection || selection.length === 0) return ''

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Archiver
            </Modal.Header>

            {toggleArchive?
                <p>Archiver les fichiers?</p>
                :
                <p>Reactiver les fichiers?</p>
            }

            <Modal.Footer>
                <Button onClick={actionHandler}>{labelButton}</Button>
            </Modal.Footer>
        </Modal>
    )
}


export function CopierModal(props) {

    const { show, fermer, selection, erreurCb, partage } = props

    const { connexion } = useWorkers()

    const contactId = useSelector(state=>state.fichiers.partageContactId)

    // const stateFichiers = useSelector(state=>state.fichiers)
    // console.debug("StateFichiers ", stateFichiers)

    const copier = useCallback( cuuid => {
        if(cuuid) {
            const contactIdEffectif = partage?contactId:null
            console.debug("Copier selection %O vers cuuid %O (contactId: %O) ", selection, cuuid, contactIdEffectif)
            connexion.copierVersCollection(cuuid, selection, {contactId: contactIdEffectif})
                .then(reponse=>{
                    // console.debug("Reponse copierVersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        erreurCb(reponse.err, "Erreur copierVersCollection")
                    } else {
                        fermer()
                    }
                  })
                .catch(err=>erreurCb(err, "Erreur copier vers collection"))
        } else {
            // Ajouter au favoris?
            erreurCb("Erreur copierVersCollection - aucune collection selectionnee")
        }
    }, [connexion, selection, partage, contactId, fermer])

    const BoutonAction = useMemo(() => {
        return props => <Button onClick={()=>copier(props.cuuid)} disabled={props.disabled}>Copier</Button>
    }, [copier])

    return (
        <ModalNavigationCollections 
            titre="Copier"
            show={show}
            BoutonAction={BoutonAction}
            fermer={fermer}
            erreurCb={erreurCb} />
    )

}

export function DeplacerModal(props) {

    const { show, fermer, selection, erreurCb } = props

    const { connexion } = useWorkers()

    const cuuidOrigine = useSelector(state=>state.fichiers.cuuid)  // Cuuid courant

    const deplacer = useCallback( cuuidDestination => {
        if(cuuidDestination) {
            // console.debug("Deplacer de cuuid %s vers cuuid %s", cuuidOrigine, cuuidDestination)
            connexion.deplacerFichiersCollection(cuuidOrigine, cuuidDestination, selection)
                .then(reponse=>{
                    // console.debug("Reponse copierVersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        erreurCb(reponse.message, "Erreur copierVersCollection")
                    } else {
                        fermer()
                    }
                  })
                .catch(err=>erreurCb(err, "Erreur copier vers collection"))
        } else {
            // Ajouter au favoris?
            erreurCb("Erreur copierVersCollection - aucune collection selectionnee")
        }
    }, [connexion, cuuidOrigine, selection, fermer])

    const BoutonAction = props => (
        <Button onClick={()=>deplacer(props.cuuid)} disabled={props.disabled}>Deplacer</Button>
    )

    return (
        <ModalNavigationCollections
            titre="Deplacer" 
            show={show}
            BoutonAction={BoutonAction}
            fermer={fermer}
            erreurCb={erreurCb} />
    )

}

export function ModalNavigationCollections(props) {

    const { titre, show, fermer, erreurCb, BoutonAction } = props
    
    const workers = useWorkers()
    const dispatch = useDispatch()
    const usager = useUsager()

    const [initComplete, setInitComplete] = useState(false)

    const listeBrute = useSelector(state=>state.navigationSecondaire.liste)
    const cuuid = useSelector(state=>state.navigationSecondaire.cuuid)
    const breadcrumb = useSelector((state) => state.navigationSecondaire.breadcrumb)

    const userId = useMemo(()=>{
        if(!usager || !usager.extensions) return
        return usager.extensions.userId
    }, [usager])

    const liste = useMemo(()=>{
        if(!show || !listeBrute) return []
        return listeBrute
          .filter(item=>!item.mimetype)
          .map(item=>mapDocumentComplet(workers, item))
    }, [show, listeBrute])

    const naviguerCollection = useCallback( cuuid => {
        if(!cuuid) cuuid = ''
        try {
            if(cuuid) {
                dispatch(actionsNavigationSecondaire.breadcrumbPush({tuuid: cuuid}))
            } else {
                dispatch(actionsNavigationSecondaire.breadcrumbSlice())
            }
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch breadcrumb : ", err)
        }
        try {
            dispatch(thunksNavigationSecondaire.changerCollection(workers, cuuid))
                .then(()=>{
                    // console.debug("Succes changerCollection : ", cuuid)
                })
                .catch(err=>erreurCb(err, 'Erreur changer collection'))
        } catch(err) {
            console.error("naviguerCollection Erreur dispatch changerCollection", err)
        }
    }, [dispatch, workers, erreurCb])

    const handlerSliceBreadcrumb = useCallback(level => {
        let tuuid = ''
        if(level) {
            const collection = breadcrumb[level]
            tuuid = collection.tuuid
            dispatch(actionsNavigationSecondaire.breadcrumbSlice(level))
            try {
                Promise.resolve(naviguerCollection(tuuid))
                    .catch(err=>console.error("SectionBreadcrumb Erreur navigation ", err))
            } catch(err) {
                console.error("handlerSliceBreadcrumb Erreur naviguerCollection %s: ", tuuid, err)
            }
        } else {
            try {
                Promise.resolve(naviguerCollection())
                    .catch(err=>console.error("SectionBreadcrumb Erreur navigation vers favoris", err))
            } catch(err) {
                console.error("handlerSliceBreadcrumb Erreur naviguerCollection favoris : ", err)
            }
        }
    }, [dispatch, breadcrumb, naviguerCollection])

    useEffect(()=>{
        if(!show || initComplete) return
        // Charger position initiale (favoris)
        // console.debug("ModalCopier Set collection favoris")
        Promise.resolve(naviguerCollection())
          .then(()=>setInitComplete(true))
          .catch(err=>console.error("CopierModal Erreur navigation ", err))
    }, [naviguerCollection, show, initComplete, setInitComplete])

    useEffect(()=>{
        if(!userId) return
        dispatch(actionsNavigationSecondaire.setUserId(userId))
    }, [userId])

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton={true}>
                {titre}
            </Modal.Header>

            <FilePicker 
                liste={liste} 
                breadcrumb={breadcrumb} 
                toBreadrumbIdx={handlerSliceBreadcrumb}
                toCollection={naviguerCollection}
                />

            <Modal.Footer>
                <BoutonAction cuuid={cuuid} disabled={breadcrumb.length === 0} />
            </Modal.Footer>

        </Modal>
    )
}

export function InfoModal(props) {
    const { 
        show, fermer, cuuid, contactId, fichiers, selection, support, downloadAction, 
        usager, downloadRepertoire, erreurCb
    } = props

    const workers = useWorkers(),
          etatConnexion = useEtatConnexion(),
          etatAuthentifie = useEtatAuthentifie()

    const [infoStatistiques, setInfoStatistiques] = useState('')

    const { docSelectionne, header, tuuidSelectionne } = useMemo(()=>{
        // console.debug("useMemo show : %O, selection %O, fichiers %O", show, selection, fichiers)
        if(!show || !fichiers) return {}

        let tuuidSelectionne = show
        let docSelectionne = null

        if(show === 1) {
            tuuidSelectionne = ''  // Root de l'usager avec toutes les collections
        } else if(typeof(show) === 'string') {
            tuuidSelectionne = show
            // docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        } else if(tuuidSelectionne === true) {
            if(!selection || selection.length === 0) return  // On n'a aucune source pour le tuuid
            tuuidSelectionne = selection[0]
            docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        }
        
        let header = null
        if(docSelectionne) {
            // mimetype = docSelectionne.mimetype
            // Mapper le fichier (thumbnails, etc.)
            docSelectionne = mapDocumentComplet(workers, docSelectionne)

            if(docSelectionne.type_node === 'Fichier') {
                header = 'Information fichier'
            } else {
                header = 'Information collection'
            }
        } else if(tuuidSelectionne === '') {
            header = 'Collections'
        } else {
            header = 'Repertoire'
        }

        return {docSelectionne, header, tuuidSelectionne}
    }, [workers, show, selection, fichiers])

    useEffect(()=>{
        let cuuid = null
        if(tuuidSelectionne === '') {
            // Ok, root des collections
        } else {
            if(!tuuidSelectionne) return  // Aucune collection selectionnee
            cuuid = tuuidSelectionne
            // if( ! ['Collection', 'Repertoire'].includes(docSelectionne.type_node) ) return
            // cuuid = docSelectionne.tuuid
        }
        // console.debug("InfoModal Charger information statistiques cuuid %s", cuuid)
        // Recuperer statistiques du repertoire
        workers.connexion.getInfoStatistiques(cuuid, contactId)
            .then(reponse=>{
                // console.debug("InfoModal statistiques cuuids %s : %O", cuuid, reponse)
                const infoStatistiques = reponse.info.reduce((acc, item)=>{
                    if(item.type_node === 'Fichier') {
                        acc.nombreFichiers = item.count
                        acc.tailleFichiers = item.taille
                    } else {
                        acc.nombreRepertoires = item.count
                    }
                    return acc
                }, {})
                // console.debug("InfoModal Info statistiques combinees : %O", infoStatistiques)
                setInfoStatistiques(infoStatistiques)
            })
            .catch(err=>console.error("Erreur chargement statistiques : ", err))

        return () => { setInfoStatistiques('') }
    }, [workers, tuuidSelectionne, setInfoStatistiques, contactId])

    let Body = InfoVide
    if(tuuidSelectionne === '') {
        Body = InfoCollection
    } else if(!tuuidSelectionne) {
        // Rien a faire
    } else if(docSelectionne && docSelectionne.type_node === 'Fichier') {
        Body = InfoFichier
    } else {
        Body = InfoCollection
    }

    return (
        <Modal show={!!show} onHide={fermer} size="lg">
            <Modal.Header closeButton={true}>{header}</Modal.Header>

            <Modal.Body>
                <Body
                    workers={workers}
                    support={support}
                    cuuid={cuuid}
                    tuuid={tuuidSelectionne}
                    valueItem={docSelectionne}
                    value={docSelectionne}
                    downloadAction={downloadAction}
                    etatConnexion={etatConnexion}
                    etatAuthentifie={etatAuthentifie}
                    usager={usager}
                    infoStatistiques={infoStatistiques}
                    downloadRepertoire={downloadRepertoire}
                    fermer={fermer}
                    erreurCb={erreurCb}
                />
            </Modal.Body>

        </Modal>
    )
}

function InfoVide(props) {
    return ''
}

function InfoFichier(props) {
    const { workers, etatConnexion, etatAuthentifie, support, downloadAction, usager, erreurCb } = props

    const valueItem = props.valueItem || {}
    const thumbnail = valueItem.thumbnail || {}
    const {thumbnailIcon} = thumbnail
    const imageLoader = valueItem.imageLoader

    const fichier = props.value || {}
    const nom = valueItem.nom

    return (
        <div>
            <Row>
                <Col xs={12} lg={4}>
                    <Thumbnail loader={imageLoader} placeholder={thumbnailIcon}>
                        <span></span>
                    </Thumbnail>
                </Col>
                <Col xs={12} lg={8} className="text-hardwrap info-labels">
                    <Row>
                        <Col xs={5} md={3}>Nom</Col>
                        <Col xs={7} md={9}>{nom}</Col>
                    </Row>
                    <InfoGenerique value={fichier} valueItem={valueItem} detail={true} />
                    <InfoMedia workers={workers} fichier={fichier} erreurCb={erreurCb} />
                </Col>
            </Row>

            <ConversionVideo 
                workers={workers}
                fichier={fichier} 
                support={support}
                downloadAction={downloadAction}
                etatConnexion={etatConnexion}
                etatAuthentifie={etatAuthentifie}
                usager={usager}
            />
        </div>
    )
}

export function InfoGenerique(props) {

    const { detail, cuuidTransfereAction } = props

    const valueItem = props.valueItem || {}
    const fichier = props.value || {}

    const nom = valueItem.nom
    const { tuuid } = fichier
    const versionCourante = fichier.version_courante || {}
    const fuuid = versionCourante.fuuid
    const mimetype = fichier.mimetype || versionCourante.mimetype
    const { taille, visites } = versionCourante
    const derniereModification = fichier.derniere_modification || versionCourante.dateFichier
    const dateFichier = valueItem.dateFichier

    const hachageOriginal = useMemo(()=>{
        const hachageOriginal = fichier.hachage_original
        if(!hachageOriginal) return '' // Hachage non disponible

        // Convertir en hex
        const {algo, digest} = hachage.decoderHachage(hachageOriginal)
        const digestHex = Buffer.from(digest).toString('hex')
        return { algo, digest: digestHex }
    }, [fichier])

    const infoVisites = useMemo(()=>{
        if(!visites) return {plusRecente: null, nombreServeurs: 0, serveurs: []}

        const expire = Math.floor((new Date().getTime() - CONST_EXPIRATION_VISITE) / 1000)

        let nombreServeurs = 0,
            serveurs = []
        for (const serveur of Object.keys(visites)) {
            const derniereVisite = visites[serveur]
            if(derniereVisite > expire) {
                nombreServeurs++
                serveurs.push(serveur)
            }
        }

        const plusRecente = Object.values(visites).reduce((acc, item)=>{
            if(!acc || acc < item) return item
            return acc
        }, 0)

        return {plusRecente, nombreServeurs, serveurs}
    }, [visites])    

    return (
        <div>
            <Row>
                <Col xs={5} md={3}>Type</Col>
                <Col xs={7} md={9}>{mimetype}</Col>
            </Row>
            <Row>
                <Col xs={5} md={3}>Taille</Col>
                <Col xs={7} md={9}><FormatteurTaille value={taille} /> ({taille} bytes)</Col>
            </Row>
            <Row>
                <Col xs={5} md={3}>Date</Col>
                <Col xs={7} md={9}><FormatterDate value={dateFichier} /></Col>
            </Row>
            {detail?(
                <>
                    <Row>
                        <Col xs={5} md={3}>Path</Col>
                        <Col xs={7} md={9}>
                            <PathFichier pathCuuids={fichier.path_cuuids} />
                            {' '}
                            {cuuidTransfereAction?
                                <Button variant="secondary" 
                                        onClick={cuuidTransfereAction} 
                                        value={fichier.path_cuuids[0]}>
                                    Ouvrir
                                </Button>
                            :''}
                            
                        </Col>
                    </Row>

                    <Row>
                        <Col xs={5} md={3}>Modification</Col>
                        <Col xs={7} md={9}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                    {hachageOriginal?
                        <Row>
                            <Col xs={12} md={3}>Hachage</Col>
                            <Col xs={12} md={9} className='fuuid'>
                                {hachageOriginal.digest}<br/>
                                Algorithme : {hachageOriginal.algo}
                            </Col>
                        </Row>
                        :''
                    }
                    <Row>
                        <Col xs={12} md={3}>id systeme</Col>
                        <Col xs={12} md={9} className='tuuid'>{tuuid}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>fuuid</Col>
                        <Col xs={12} md={9} className='fuuid'>{fuuid}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Presence</Col>
                        <Col xs={12} md={9}>
                            <div>
                                <FormatterDate value={infoVisites.plusRecente} /> ({infoVisites.nombreServeurs} serveurs)
                            </div>
                            <ul>
                                {infoVisites.serveurs.map(item=><li>{item}</li>)}
                            </ul>
                        </Col>
                    </Row>            
                </>):''
            }
        </div>
    )
}

export function InfoMedia(props) {
    const fichier = props.fichier || {}
    const versionCourante = fichier.version_courante || {}

    const fuuid = versionCourante.fuuid
    const connexion = props.workers.connexion
    const erreurCb = props.erreurCb
    const genererPreviewHandler = useCallback(()=>{
        console.debug("InfoMedia Regenerer previews pour fichier %s", fuuid)
        connexion.regenererPreviews([fuuid])
            .catch(err=>erreurCb(err, 'Erreur generer images'))
    }, [connexion, fuuid])

    // console.debug("Info videos fichier %O : %O", fichier)
    if(!fichier.mimetype) return ''
    const estMedia = estMimetypeMedia(fichier.mimetype)
    if(!estMedia) return ''

    const infoRows = []
    if(versionCourante.height && versionCourante.width) {
        infoRows.push({label: 'Dimension', value: '' + versionCourante.width + ' x ' + versionCourante.height})
    } else if(versionCourante.height || versionCourante.width) {
        const resolution = Math.min([versionCourante.height, versionCourante.width].filter(item=>!isNaN(item))) || ''
        infoRows.push({label: 'Resolution', value: resolution?resolution+'p':''})
    }
    if(versionCourante.anime) {
        infoRows.push({label: 'Anime', value: 'Oui'})
    }
    if(versionCourante.duration) {
        // const dureeStr = Math.floor(versionCourante.duration)
        infoRows.push({label: 'Duree', value: <FormatterDuree value={versionCourante.duration} />})
    }

    const images = versionCourante.images || {}
    const imagesGenerees = Object.keys(images).length > 2

    return (
        <>
            {infoRows.map(item=>(
                <Row key={item.label}>
                    <Col xs={5} md={3}>{item.label}</Col>
                    <Col xs={7} md={9}>{item.value}</Col>
                </Row>
            ))}
            {!imagesGenerees?
                <Row>
                    <Col xs={12} md={3}>Thumbnail</Col>
                    <Col xs={12} md={9}>
                        <Button onClick={genererPreviewHandler}>Generer</Button>
                    </Col>
                </Row>
            :''}
        </>
    )
}

function InfoCollection(props) {
    const { fermer, tuuid, downloadRepertoire } = props

    const workers = useWorkers()
    const capabilities = useCapabilities()
    const estMobile = useMemo(()=>capabilities.device !== 'desktop', [capabilities])

    const liste = useSelector(state => state.fichiers.liste )
    const bytesTotalDossier = useSelector(state => state.fichiers.bytesTotalDossier)

    const [err, setErr] = useState('')

    const [nombreFichiers, nombreRepertoires] = useMemo(()=>{
        let nombreFichiers = 0, nombreRepertoires = 0
        if(liste) {
            liste.forEach(item=>{
                if(item.type_node === 'Fichier') nombreFichiers++
                else if(item.tuuid !== tuuid) nombreRepertoires++
            })
        }
        return [nombreFichiers, nombreRepertoires]
    }, [tuuid, liste])

    const [repertoire, setRepertoire] = useState({})

    const downloadComplet = useCallback(e => {
        if(nombreFichiers <= CONST_LIMITE_FICHIERS_ZIP) {
            downloadRepertoire(e)
            fermer()
        } else {
            setErr(`Plus de ${CONST_LIMITE_FICHIERS_ZIP} fichiers - ZIP non supporte`)
        }
    }, [fermer, downloadRepertoire, nombreFichiers, setErr])

    useEffect(()=>{
        if(!tuuid) return setRepertoire({nom: 'Favoris'})
        workers.collectionsDao.getParTuuids([tuuid])
        .then(docs=>{
            const repertoire = docs[0]
            setRepertoire(repertoire)
        })
        .catch(err=>console.error("InfoCollection Erreur chargement collection : ", err))
    }, [workers, tuuid, setRepertoire])

    const infoStatistiques = props.infoStatistiques || {}
    const nombreSousRepertoires = useMemo(()=>{
        if(!infoStatistiques || !infoStatistiques.nombreRepertoires) return 0
        if(tuuid) return infoStatistiques.nombreRepertoires - 1  // Retirer le repertoire courant
        return infoStatistiques.nombreRepertoires
    }, [infoStatistiques, tuuid])
    const nom = repertoire.nom
    const derniereModification = repertoire.derniere_modification || repertoire.dateAjout

    const desactiverZip = useMemo(()=>{
        if(!infoStatistiques) return true
        return infoStatistiques.nombreFichiers > CONST_LIMITE_FICHIERS_ZIP 
    }, [infoStatistiques])

    return (
        <div>
            <Row>
                <Col xs={12} md={8}>
                    <Row>
                        <Col xs={7} md={3}>Nom</Col>
                        <Col xs={5} md={9}>{nom}</Col>
                    </Row>
                    <Row>
                        <Col xs={7} md={3}>Date</Col>
                        <Col xs={5} md={9}><FormatterDate value={derniereModification} /></Col>
                    </Row>

                    <br/>

                    <Row>
                        <Col>Statistiques du repertoire courant</Col>
                    </Row>

                    <Row>
                        <Col xs={7} md={3}>Nombre repertoires</Col>
                        <Col xs={5} md={9}>{nombreRepertoires}</Col>
                    </Row>
                    <Row>
                        <Col xs={7} md={3}>Nombre fichiers</Col>
                        <Col xs={5} md={9}>{nombreFichiers}</Col>
                    </Row>

                    <Row>
                        <Col xs={7} md={3}>Taille fichiers</Col>
                        <Col xs={5} md={9}><FormatteurTaille value={bytesTotalDossier} /></Col>
                    </Row>

                    {nombreRepertoires > 0?
                        <>
                            <br/>

                            <Row>
                                <Col>Statistiques incluant sous-repertoires</Col>
                            </Row>
                            <Row>
                                <Col xs={7} md={3}>Nombre repertoires</Col>
                                <Col xs={5} md={9}>{nombreSousRepertoires}</Col>
                            </Row>
                            <Row>
                                <Col xs={7} md={3}>Nombre fichiers</Col>
                                <Col xs={5} md={9}>{infoStatistiques.nombreFichiers}</Col>
                            </Row>

                            <Row>
                                <Col xs={7} md={3}>Taille fichiers</Col>
                                <Col xs={5} md={9}><FormatteurTaille value={infoStatistiques.tailleFichiers} /></Col>
                            </Row>
                        </>
                    :''}
                </Col>
            </Row>

            {estMobile?'':
                <>
                    <br />
                    <Alert variant="warning" show={infoStatistiques.nombreFichiers>CONST_LIMITE_FICHIERS_ZIP}>
                        <AlertHeading>Download .zip non disponible</AlertHeading>
                        <p>
                            Le repertoire et ses sous-repertoires contiennent plus de {CONST_LIMITE_FICHIERS_ZIP} fichiers. 
                            Le download en archive zip n'est pas disponible.
                        </p>
                    </Alert>
                    <Row>
                        <Col xs={7} md={3}>Download complet (zip)</Col>
                        <Col xs={5} md={9}>
                            <Button variant="secondary" disabled={desactiverZip} onClick={downloadComplet}>
                                <i className='fa fa-download' />
                            </Button>
                        </Col>
                    </Row>
                </>
            }
        </div>
    )
}

export function ConversionVideoModal(props) {

    const { 
        show, fermer, cuuid, fichiers, selection, support, downloadAction, 
        usager, downloadRepertoire, erreurCb
    } = props

    const workers = useWorkers(),
          etatConnexion = useEtatConnexion(),
          etatAuthentifie = useEtatAuthentifie()

    const { docSelectionne, header, tuuidSelectionne } = useMemo(()=>{
        // console.debug("useMemo show : %O, selection %O, fichiers %O", show, selection, fichiers)
        if(!show || !fichiers) return {}

        let tuuidSelectionne = show
        let docSelectionne = null

        if(show === 1) {
            tuuidSelectionne = ''  // Root de l'usager avec toutes les collections
        } else if(typeof(show) === 'string') {
            tuuidSelectionne = show
            // docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        } else if(tuuidSelectionne === true) {
            if(!selection || selection.length === 0) return  // On n'a aucune source pour le tuuid
            tuuidSelectionne = selection[0]
            docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        }
        
        let header = null
        if(docSelectionne) {
            // mimetype = docSelectionne.mimetype
            // Mapper le fichier (thumbnails, etc.)
            docSelectionne = mapDocumentComplet(workers, docSelectionne)

            if(docSelectionne.type_node === 'Fichier') {
                header = 'Information fichier'
            } else {
                header = 'Information collection'
            }
        } else if(tuuidSelectionne === '') {
            header = 'Collections'
        } else {
            header = 'Repertoire'
        }

        return {docSelectionne, header, tuuidSelectionne}
    }, [workers, show, selection, fichiers])

    return (
        <Modal show={!!show} onHide={fermer} size="lg">
            <Modal.Header closeButton={true}>Conversion video</Modal.Header>

            <Modal.Body>
                <ConversionVideo 
                    workers={workers}
                    fichier={docSelectionne} 
                    support={support}
                    downloadAction={downloadAction}
                    etatConnexion={etatConnexion}
                    etatAuthentifie={etatAuthentifie}
                    usager={usager}
                />
            </Modal.Body>

        </Modal>
    )
}

export function RenommerModal(props) {
    const { workers, show, fermer, fichiers, selection } = props
    const { connexion, chiffrage } = workers

    const refInput = useRef()

    const { docSelectionne } = useMemo(()=>{
        if(!fichiers || !selection) return {}
        const tuuidSelectionne = selection[0]
        const docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        return { docSelectionne }
    }, [fichiers, selection])

    const [nom, setNom] = useState('')
    const [mimetype, setMimetype] = useState('')

    useEffect(()=>{ 
        if(!docSelectionne) return
        setNom(docSelectionne.nom) 
        setMimetype(docSelectionne.mimetype)
    }, [docSelectionne, setNom, setMimetype])

    const appliquer = useCallback( async event => {
        event.preventDefault()
        event.stopPropagation()
        
        console.debug("Appliquer nom %s (mimetype: %s) a %s", nom, mimetype, docSelectionne.tuuid)
        try {
            let reponse = null
            const tuuid = docSelectionne.tuuid,
                  estFichier = docSelectionne.mimetype?true:false
            
            if(estFichier) {
                await majFichierMetadata(workers, tuuid, {nom}, {mimetype})
            } else {
                await majCollectionMetadata(workers, tuuid, {nom})
            }

        } catch(err) {
            console.error("Erreur renommer fichier/collection : %O", err)
        }

        fermer()
    }, [connexion, chiffrage, docSelectionne, nom, mimetype, fermer])

    const changerNom = useCallback(event=>{
        const { value } = event.currentTarget
        setNom(value)
    }, [setNom])

    const changerMimetype = useCallback(event=>{
        const { value } = event.currentTarget
        setMimetype(value)
    }, [setMimetype])

    useEffect(()=>{
        if(show && refInput.current) refInput.current.focus()
    }, [show, refInput])

    if(!docSelectionne) return ''

    const estFichier = docSelectionne.mimetype?true:false

    return (
        <Modal show={show} onHide={fermer}>

            <Modal.Header closeButton={true}>
                Renommer {docSelectionne.nom}
            </Modal.Header>

            <Modal.Body>

                <Form onSubmit={appliquer}>
                    <Form.Group controlId="formNom">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control 
                            ref={refInput}
                            type="text"
                            placeholder="Saisir le nom ..."
                            value={nom}
                            onChange={changerNom}
                        />
                    </Form.Group>
                    {estFichier?
                        <Form.Group controlId="formMimetype">
                            <Form.Label>Mimetype</Form.Label>
                            <Form.Control 
                                type="text"
                                value={mimetype}
                                onChange={changerMimetype}
                            />
                        </Form.Group>
                    :''}
                </Form>

            </Modal.Body>

            <Modal.Footer>
                <Button disabled={estFichier&&!mimetype||!nom} onClick={appliquer}>OK</Button>
            </Modal.Footer>

        </Modal>
    )
}


export function ReindexerModal(props) {

    const { workers, show, fermer } = props
    const { connexion } = workers

    const lancer = useCallback(event=>{
        const reset = true
        connexion.indexerContenu(reset)
            .then(reponse=>{
                if(reponse.ok === false) {
                    console.error("ReindexerModal Reponse erreur : %O", reponse.message)
                } else {
                    fermer()
                }
            })
            .catch(err=>{
                console.error("ReindexerModal erreur : %O", err)
            })
    }, [connexion, fermer])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Reindexer pour la recherche
            </Modal.Header>
            <Modal.Footer>
                <Button onClick={lancer}>Lancer</Button>
            </Modal.Footer>
        </Modal>
    )

}

export function PartagerModal(props) {

    const { show, hide } = props

    const workers = useWorkers(),
          dispatch = useDispatch(),
          selection = useSelector(state=>state.fichiers.selection),
          fichiers = useSelector(state=>state.fichiers.liste),
          contacts = useSelector(state=>state.partager.listeContacts)

    const [selectionContacts, setSelectionContacts] = useState(new Set())

    const collections = useMemo(()=>{
        if(!show || !fichiers || !selection) return []
        // console.debug("COLLECTIONS Selection ", selection)
        return fichiers.filter(item=>selection.includes(item.tuuid))
    }, [show, selection, fichiers])

    const selectionContactsChangeHandler = useCallback(e => {
        const maj = new Set(selectionContacts)
        const {value, checked} = e.currentTarget
        // console.debug("Toggle %O = %O", value, checked)
        if(checked) maj.add(value)
        else maj.delete(value)
        setSelectionContacts(maj)
    }, [selectionContacts, setSelectionContacts])

    const partagerCb = useCallback(()=>{
        // console.debug("selection ", selection)
        if(selectionContacts.size === 0) return

        // Convertir selectionContacts de Set vers Array
        const selectionContactsArray = [...selectionContacts.values()]

        workers.connexion.partagerCollections(selection, selectionContactsArray)
            .then(reponse=>{
                if(reponse.ok === false) {
                    console.error("Erreur partage collections : ", reponse.err)
                } else {
                    hide()
                }
            })
            .catch(err=>console.error("Erreur partage collections : ", err))
    }, [hide, workers, selection, selectionContacts])

    useEffect(()=>{
        if(!show) return
        // Charger la liste des contacts
        dispatch(chargerInfoContacts(workers))
            .catch(err=>console.erreur("Erreur chargement des contacts ", err))
    }, [workers, dispatch, show])

    return (
        <Modal show={show} onHide={hide}>
            <Modal.Header closeButton={true}>
                <h3>Partager avec un autre usager</h3>
            </Modal.Header>

            <Modal.Body>
                <Row>
                    <Col xs={12}>
                        Partager
                    </Col>
                    <Col>
                        <ul>
                            {collections.map(item=>{
                                return (
                                    <li>{item.nom}</li>
                                )
                            })}
                        </ul>
                    </Col>
                </Row>

                Choisir les contacts
                <p></p>
                {contacts.map(item=>{
                    const checked = selectionContacts.has(item.contact_id)
                    return (
                        <PartageContact key={item.contact_id} value={item} checked={checked} onChange={selectionContactsChangeHandler} />
                    )
                })}
            </Modal.Body>

            <Modal.Footer>
                <Button onClick={partagerCb} disabled={selectionContacts.size===0}>Partager</Button>
            </Modal.Footer>
        </Modal>
    )
}

function PartageContact(props) {
    const { value, checked, onChange } = props
    return (
        <Row>
            <Col xs={2} md={1}>
                <Form.Check id={'Check' + value.contact_id} value={value.contact_id} checked={checked} onChange={onChange} />
            </Col>
            <Col>
                <Form.Label htmlFor={'Check' + value.contact_id}>{value.nom_usager}</Form.Label>
            </Col>
        </Row>
    )
}