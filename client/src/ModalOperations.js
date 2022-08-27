import { useCallback, useEffect, useState, useMemo } from 'react'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import { FormatteurTaille, FormatterDate, FormatterDuree, Thumbnail, FilePicker } from '@dugrema/millegrilles.reactjs'

import { mapDocumentComplet } from './mapperFichier'
import { ConversionVideo } from './OperationsVideo'

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

    const { workers, show, fermer, favoris, selection } = props
    const { connexion } = workers

    const [ path, setPath ] = useState([])

    const copier = useCallback( () => {
        const tuuidSelectionne = path.length>0?path[path.length-1]:''

        if(tuuidSelectionne) {
            connexion.copierVersCollection(tuuidSelectionne, selection)
                .then(reponse=>{
                    // console.debug("Reponse copierVersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        console.error("Erreur copierVersCollection : %O", reponse.message)
                    } else {
                        fermer()
                    }
                })
                .catch(err=>{
                    console.error("Erreur copierVersCollection : %O", err)
                })
        } else {
            // Ajouter au favoris?
            console.error("Erreur copierVersCollection - aucune collection selectionnee")
        }
    }, [connexion, selection, path, fermer])

    const actionPath = useCallback( cuuidpath => {
        // console.debug("Set path : %O", cuuidpath)
        setPath(cuuidpath)
    }, [setPath])

    const loadCollection = useCallback( cuuid => {
        if(!cuuid) {
            // Root, utiliser favoris
            // console.debug("CopierModalFAVORIS : %O", favoris)
            return Promise.resolve(favoris)
        } else {
            return connexion.getContenuCollection(cuuid)
                .then(reponse=>{
                    // console.debug("Reponse contenu collection: %O", reponse)
                    const docs = reponse.documents.filter(item=>!item.fuuid_v_courante)
                    return docs
                })
        }
    }, [connexion, favoris])

    return (
        <Modal show={show} onHide={fermer}>
            <Modal.Header closeButton={true}>
                Copier
            </Modal.Header>

            <FilePicker setPath={actionPath} loadCollection={loadCollection} />

            <Modal.Footer>
                <Button onClick={copier} disabled={path.length===0}>Copier</Button>
            </Modal.Footer>
        </Modal>
    )
}

export function DeplacerModal(props) {

    const { workers, show, fermer, favoris, cuuid, selection } = props
    const { connexion } = workers

    const [ path, setPath ] = useState([])

    const deplacer = useCallback( () => {
        const tuuidSelectionne = path.length>0?path[path.length-1]:''

        if(tuuidSelectionne) {
            connexion.deplacerFichiersCollection(cuuid, tuuidSelectionne, selection)
                .then(reponse=>{
                    // console.debug("Reponse deplacerFichiersCollection : %O", reponse)
                    if(reponse.ok === false) {
                        console.error("Erreur deplacerFichiersCollection : %O", reponse.message)
                    } else {
                        fermer()
                    }
                })
                .catch(err=>{
                    console.error("Erreur deplacerFichiersCollection : %O", err)
                })
        } else {
            // Ajouter au favoris?
            console.error("Erreur deplacerFichiersCollection - aucune collection selectionnee")
        }
    }, [connexion, cuuid, selection, path, fermer])

    const actionPath = useCallback( cuuidpath => {
        // console.debug("Set path : %O", cuuidpath)
        setPath(cuuidpath)
    }, [setPath])

    const loadCollection = useCallback( cuuid => {
        if(!cuuid) {
            // Root, utiliser favoris
            // console.debug("CopierModalFAVORIS : %O", favoris)
            return Promise.resolve(favoris)
        } else {
            return connexion.getContenuCollection(cuuid)
                .then(reponse=>{
                    // console.debug("Reponse contenu collection: %O", reponse)
                    const docs = reponse.documents.filter(item=>!item.fuuid_v_courante)
                    return docs
                })
        }
    }, [connexion, favoris])

    return (
        <Modal show={show} onHide={fermer} className="modal-picklist">
            <Modal.Header closeButton={true}>
                Deplacer
            </Modal.Header>

            <FilePicker setPath={actionPath} loadCollection={loadCollection} />

            <Modal.Footer>
                <Button onClick={deplacer} disabled={path.length===0}>Deplacer</Button>
            </Modal.Footer>
        </Modal>
    )

}

export function InfoModal(props) {
    const { 
        workers, etatConnexion, etatAuthentifie, 
        show, fermer, cuuid, fichiers, selection, support, downloadAction, 
        usager 
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
                />
            </Modal.Body>

        </Modal>
    )
}

function InfoVide(props) {
    return ''
}

function InfoFichier(props) {
    const { workers, etatConnexion, etatAuthentifie, support, downloadAction, usager } = props

    const valueItem = props.valueItem || {}
    const thumbnail = valueItem.thumbnail || {}
    const {thumbnailIcon} = thumbnail
    const imageLoader = valueItem.imageLoader

    const fichier = props.value || {}
    const nom = valueItem.nom
    const versionCourante = fichier.version_courante || {}
    const { mimetype, taille } = versionCourante
    const derniereModification = fichier.derniere_modification || versionCourante.dateFichier
    const dateFichier = versionCourante.dateFichier

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
                        <Col xs={12} md={9}><FormatterDate value={derniereModification} /></Col>
                    </Row>
                    <Row>
                        <Col xs={12} md={3}>Date originale</Col>
                        <Col xs={12} md={9}><FormatterDate value={dateFichier} /></Col>
                    </Row>
                    <InfoMedia fichier={fichier} />
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

    console.debug("Info videos fichier %O : %O", fichier)

    if(!versionCourante) return ''

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

    return (
        <>
            {infoRows.map(item=>(
                <Row key={item.label}>
                    <Col xs={12} md={3}>{item.label}</Col>
                    <Col xs={12} md={9}>{item.value}</Col>
                </Row>
            ))}
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
    const { connexion } = workers

    // let tuuidSelectionne = null,
    //     docSelectionne = null
    // if(fichiers && selection && selection.length === 1) {
    //     tuuidSelectionne = selection[0]
    //     docSelectionne = fichiers.filter(item=>tuuidSelectionne===(item.fileId || item.folderId)).pop()
    // }

    const { docSelectionne } = useMemo(()=>{
        if(!fichiers || !selection) return {}
        const tuuidSelectionne = selection[0]
        const docSelectionne = fichiers.filter(item=>tuuidSelectionne===item.tuuid).pop()
        return { docSelectionne }
    }, [fichiers, selection])

    const [nom, setNom] = useState('')

    useEffect(()=>{ 
        if(!docSelectionne) return
        setNom(docSelectionne.nom) 
    }, [docSelectionne])

    const appliquer = useCallback( async event => {
        event.preventDefault()
        event.stopPropagation()
        
        // console.debug("Appliquer a %s", tuuidSelectionne)
        try {
            let reponse = null
            const tuuid = docSelectionne.tuuid,
                  mimetype = docSelectionne.mimetype
            if(mimetype) {
                // Fichier
                reponse = await connexion.decrireFichier(tuuid, {nom})
            } else {
                // Collection
                reponse = await connexion.decrireCollection(tuuid, {nom})
            }

            if(reponse.ok === false) {
                console.error("Erreur renommer fichier/collection : %O", reponse.message)
            }
        } catch(err) {
            console.error("Erreur renommer fichier/collection : %O", err)
        }

        fermer()
    }, [connexion, docSelectionne, nom, fermer])

    const changerNom = useCallback(event=>{
        const { value } = event.currentTarget
        setNom(value)
    }, [setNom])

    if(!docSelectionne) return ''

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
                </Form>

            </Modal.Body>

            <Modal.Footer>
                <Button onClick={appliquer}>OK</Button>
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