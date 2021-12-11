import { useState, useEffect, useCallback } from 'react'
import { proxy } from 'comlink'
import Modal from 'react-bootstrap/Modal'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

function TransfertModal(props) {

    const { workers } = props
    const { transfertFichiers } = workers

    const [etatDownload, setEtatDownload] = useState({})

    // Entretien idb/cache de fichiers
    useEffect(()=>{
        if(!transfertFichiers) return 
        transfertFichiers.down_entretienCache()
        // const intervalId = setInterval(()=>{transfertFichiers.down_entretienCache()}, 300000)

        const proxySetEtatDownload = proxy((pending, pct, flags)=>{
            flags = flags || {}
            console.debug("Set nouvel etat download. pending:%d, pct:%d, flags: %O", pending, pct, flags)
            handleDownloadUpdate(transfertFichiers, {pending, pct, ...flags}, setEtatDownload)
        })
        transfertFichiers.down_setCallbackDownload(proxySetEtatDownload)

        // Faire premiere maj
        handleDownloadUpdate(transfertFichiers, {}, setEtatDownload)

        return () => {
            // clearInterval(intervalId)
            transfertFichiers.down_entretienCache()
        }
    }, [transfertFichiers])

    return (
        <Modal 
            show={props.show} 
            onHide={props.fermer} 
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    Transfert de fichiers
                </Modal.Title>
            </Modal.Header>

            <EtatDownload etat={etatDownload} />

        </Modal>
    )

}

export default TransfertModal

const CACHE_TEMP_NAME = 'fichiersDechiffresTmp'

export async function handleDownloadUpdate(transfertFichiers, params, setEtatDownload) {
    console.debug("handleDownloadUpdate params: %O", params)
    // const {pending, pct, filename, fuuid} = params
    const etat = await transfertFichiers.down_getEtatCourant()
    const etatComplet = {...params, ...etat}
    console.debug("Etat download courant : %O", etatComplet)
    setEtatDownload(etatComplet)

    if(params.fuuidReady) {
        const infoFichier = etat.downloads.filter(item=>item.fuuid===params.fuuidReady).pop()
        console.debug("Download cache avec fuuid: %s, fichier: %O", params.fuuidReady, infoFichier)
        downloadCache(params.fuuidReady, {filename: infoFichier.filename})
    }
}

async function downloadCache(fuuid, opts) {
    opts = opts || {}
    if(fuuid.currentTarget) fuuid = fuuid.currentTarget.value
    console.debug("Download fichier : %s = %O", fuuid, opts)
    const cacheTmp = await caches.open(CACHE_TEMP_NAME)
    const cacheFichier = await cacheTmp.match(fuuid)
    console.debug("Cache fichier : %O", cacheFichier)

    promptSaveFichier(await cacheFichier.blob(), opts)
}

function promptSaveFichier(blob, opts) {
    opts = opts || {}
    const filename = opts.filename
    let objectUrl = null
    try {
        objectUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        if (filename) a.download = filename
        if (opts.newTab) a.target = '_blank'
        a.click()
    } catch (err) {
        console.error("Erreur download : %O", err)
    } finally {
        if (objectUrl) {
            try {
                URL.revokeObjectURL(objectUrl)
            } catch (err) {
                console.debug("Erreur revokeObjectURL : %O", err)
            }
        }
    }
}

function EtatDownload(props) {

    console.debug("EtatDownload PROPPYS %O", props)

    const { etat } = props
    const { downloads } = etat || []

    const downloadClick = useCallback(event=>{
        const fuuid = event.currentTarget.value
        const { filename } = event.currentTarget.dataset
        downloadCache(fuuid, {filename})
    }, [])

    return (
        <>
            <p>Downloads</p>
            {downloads.map(item=>{
                return (
                    <Row key={item.fuuid}>
                        <Col>{item.filename}</Col>
                        <Col>
                            <Button 
                                variant="secondary" 
                                value={item.fuuid} 
                                data-filename={item.filename}
                                onClick={downloadClick}
                            >
                                Download
                            </Button>
                        </Col>
                    </Row>
                )
            })}
        </>
    )
}