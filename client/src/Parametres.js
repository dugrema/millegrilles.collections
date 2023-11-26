import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import { useCapabilities } from './WorkerContext'


function Parametres(props) {

    const { toggleModeAffichage } = props

    return (
        <div>
            <h2>Parametres</h2>

            <hr />

            <ChangerResolutionVideo />

            <hr />

            <ChangerModeAffichage toggleModeAffichage={toggleModeAffichage} />
        </div>
    )
}

export default Parametres

function ChangerResolutionVideo(props) {

    const [resolution, setResolution] = useState(window.localStorage.getItem('videoResolution'))

    const changerCb = useCallback(e=>{
        const value = e.currentTarget.value
        window.localStorage.setItem('videoResolution', value)
        setResolution(value)
    }, [setResolution])

    return (
        <div>
            <p>Changer la resolution video par defaut pour ce navigateur.</p>
            <p>Si la resolution n'est pas disponible pour un video, la prochaine plus grande resolution disponible est choisie.</p>
            <Row>
                <Col xs={6} md={4} lg={2}>
                    <p>Resolution choisie</p>
                </Col>
                <Col xs={6} md={4} lg={2}>
                    <Form.Select value={resolution} onChange={changerCb}>
                        <option value='1080'>1080</option>
                        <option value='0720'>720</option>
                        <option value='0480'>480</option>
                        <option value='0360'>360</option>
                        <option value='0270'>270</option>
                    </Form.Select>
                </Col>
            </Row>
        </div>
    )
}

function ChangerModeAffichage(props) {

    const { toggleModeAffichage } = props

    const capabilities = useCapabilities()
    const estMobile = capabilities.device !== 'desktop'
    const { t } = useTranslation()
    
    const labelModeToggle = useMemo(()=>{
        if(estMobile) return 'menu.modeDesktop'
        return 'menu.modeMobile'
      }, [estMobile])
    
    return (
        <div>
            <p>Changer le mode d'affichage pour ce navigateur.</p>
            <Button onClick={toggleModeAffichage}>
                {t(labelModeToggle)}
            </Button>
        </div>
    )
}
