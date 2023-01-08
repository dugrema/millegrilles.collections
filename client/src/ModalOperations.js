import { useCallback, useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { FormatteurTaille, FormatterDate, FormatterDuree, Thumbnail, FilePicker } from '@dugrema/millegrilles.reactjs'

import { mapDocumentComplet, estMimetypeMedia } from './mapperFichier'
import { majFichierMetadata, majCollectionMetadata } from './fonctionsFichiers'
import { ConversionVideo } from './OperationsVideo'

import useWorkers, { useEtatPret, useUsager } from './WorkerContext'

import actionsNavigationSecondaire, {thunks as thunksNavigationSecondaire} from './redux/navigationSecondaireSlice'

export function SupprimerModal(props) {

    const { workers, show, fermer, selection, cuuid } = props
    const connexion = workers.connexion

    const supprimer = useCallback( () => {
        // console.debug("SUPRIMER %O", selection)

        connexion.supprimerDocuments(cuuid, selection)
        .then(reponse=>{
            if(reponse.ok === false) {
                console.error("Erreur suppression documents %O : %s", selection, reponse.message)
            }
        })
        .catch(err=>{
            console.error("Erreur suppression documents %O : %O", selection, err)
        })
        .finally(()=>{
            fermer()
        })
        
    }, [connexion, fermer, selection, cuuid])

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

export function CopierModal(props) {

    const { show, fermer, selection, erreurCb } = props

    const { connexion } = useWorkers()

    const copier = useCallback( cuuid => {
        if(cuuid) {
            console.debug("Copier vers cuuid ", cuuid)
            connexion.copierVersCollection(cuuid, selection)
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
    }, [connexion, selection, fermer])

    const BoutonAction = props => (
        <Button onClick={()=>copier(props.cuuid)} disabled={props.disabled}>Copier</Button>
    )

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
            console.debug("Deplacer de cuuid %s vers cuuid %s", cuuidOrigine, cuuidDestination)
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
                .then(()=>console.debug("Succes changerCollection : ", cuuid))
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
        console.debug("ModalCopier Set collection favoris")
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
        workers, etatConnexion, etatAuthentifie, 
        show, fermer, cuuid, fichiers, selection, support, downloadAction, 
        usager, erreurCb
    } = props

    const { mimetype, docSelectionne, header } = useMemo(()=>{
        if(!show || !selection || !fichiers) return {}
        const tuuidSelectionne = selection[0]
        let docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        
        let header = null, mimetype = null
        if(docSelectionne) {
            mimetype = docSelectionne.mimetype
            // Mapper le fichier (thumbnails, etc.)
            docSelectionne = mapDocumentComplet(workers, docSelectionne)

            if(docSelectionne.mimetype) {
                header = 'Information fichier'
            } else {
                header = 'Information collection'
            }
        } else {
            header = 'N/D'
        }

        return {docSelectionne, header, mimetype}
    }, [workers, show, selection, fichiers])

    let Body = InfoVide
    if(!docSelectionne) {
        // Rien a faire
    } else if(mimetype) {
        Body = InfoFichier
    } else {
        Body = InfoCollection
    }

    return (
        <Modal show={show} onHide={fermer} size="lg">
            <Modal.Header closeButton={true}>{header}</Modal.Header>

            <Modal.Body>
                <Body
                    workers={workers}
                    support={support}
                    cuuid={cuuid}
                    valueItem={docSelectionne}
                    value={docSelectionne}
                    downloadAction={downloadAction}
                    etatConnexion={etatConnexion}
                    etatAuthentifie={etatAuthentifie}
                    usager={usager}
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
    const { tuuid } = fichier
    const versionCourante = fichier.version_courante || {}
    const { mimetype, taille } = versionCourante
    const derniereModification = fichier.derniere_modification || versionCourante.dateFichier
    const dateFichier = valueItem.dateFichier

    return (
        <div>
            <Row>
                <Col xs={12} md={4}>
                    <Thumbnail loader={imageLoader} placeholder={thumbnailIcon}>
                        <span></span>
                    </Thumbnail>
                </Col>
                <Col xs={12} md={8} className="text-hardwrap info-labels">
                    <Row>
                        <Col xs={12} md={3}>Nom</Col>
                        <Col xs={12} md={9}>{nom}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Type</Col>
                        <Col xs={12} md={9}>{mimetype}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Taille</Col>
                        <Col xs={12} md={9}><FormatteurTaille value={taille} /></Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Date</Col>
                        <Col xs={12} md={9}><FormatterDate value={dateFichier} /></Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Modification</Col>
                        <Col xs={12} md={9}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>id systeme</Col>
                        <Col xs={12} md={9}>{tuuid}</Col>
                    </Row>
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

function InfoMedia(props) {
    const fichier = props.fichier || {}
    const versionCourante = fichier.version_courante

    const fuuid = fichier.fuuid_v_courante
    const connexion = props.workers.connexion
    const erreurCb = props.erreurCb
    const genererPreviewHandler = useCallback(()=>{
        connexion.regenererPreviews([fuuid])
            .catch(err=>erreurCb(err, 'Erreur generer images'))
    }, [connexion, fuuid])

    // console.debug("Info videos fichier %O : %O", fichier)
    const estMedia = estMimetypeMedia(fichier.mimetype)
    if(!versionCourante || !estMedia) return ''

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
                    <Col xs={12} md={3}>{item.label}</Col>
                    <Col xs={12} md={9}>{item.value}</Col>
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
    const valueItem = props.valueItem || {}
    const thumbnailIcon = valueItem.thumbnailIcon
    const fichier = props.value || {}
    const nom = valueItem.nom
    const derniereModification = fichier.derniere_modification || valueItem.dateAjout

    return (
        <div>
            <Row>
                <Col xs={12} md={4}>
                    <Thumbnail placeholder={thumbnailIcon}>
                        <span></span>
                    </Thumbnail>
                </Col>
                <Col xs={12} md={8}>
                    <Row>
                        <Col xs={12} md={2}>Nom</Col>
                        <Col xs={12} md={10}>{nom}</Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={2}>Date</Col>
                        <Col xs={12} md={10}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                </Col>
            </Row>
        </div>
    )
}

export function RenommerModal(props) {
    const { workers, show, fermer, fichiers, selection } = props
    const { connexion, chiffrage } = workers

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
        
        // console.debug("Appliquer a %s", tuuidSelectionne)
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
