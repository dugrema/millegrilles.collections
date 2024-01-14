import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react'
// import ReactPlayer from 'react-player/file'

function VideoViewer(props) {
    const {
        poster,
        srcVideo,
        className,
        timeStamp,
        jumpToTimeStamp,

        // Evenements
        onTimeUpdate, onProgress, onPlay, onError, onWaiting, onCanPlay, onAbort, onEmptied,
    } = props

    const width = props.width || '100%',
          height = props.height || ''  //,
          // codecVideo = props.codecVideo || '',
          // mimetype = props.mimetype || ''
          
    const [timeStampEffectif, setTimeStampEffectif] = useState(0)
    const [actif, setActif] = useState(true)
    const [playbackCommence, setPlaybackCommence] = useState(false)
    const [srcVideoDebounce, setSrcVideoDebounce] = useState('')

    const refVideo = useRef()

    // Debounce URL/mimetype/codec pour element video. Evite de faire un reload des sources video (double request)
    useEffect(()=>{
        if(!srcVideo) return

        const champs = ['src', 'mimetype', 'codec']
        let changement = false
        const copieDebounce = srcVideoDebounce || {}
        for(const champ of champs) {
            if(srcVideo[champ] !== copieDebounce[champ]) {
                copieDebounce[champ] = srcVideo[champ]
                changement = true
            }
        }

        if(changement) {
            // console.debug("Debounce src video : ", copieDebounce)
            setSrcVideoDebounce(copieDebounce)
        }
    }, [srcVideoDebounce, srcVideo, setSrcVideoDebounce])

    let sources = useMemo(()=>{
        if(!srcVideoDebounce) return []

        // console.debug("srcVideo ", srcVideoDebounce)

        const mimetype = srcVideoDebounce.mimetype
        let mimetypeCodec = mimetype
        if(srcVideoDebounce.codec) {
            mimetypeCodec = mapperCodec(mimetype, srcVideoDebounce.codec)
        }

        let srcHref = srcVideoDebounce.src
        if(timeStampEffectif) {
            srcHref = srcHref + '#t=' + timeStampEffectif
            setPlaybackCommence(true)
        }
        return [<source key={mimetypeCodec} src={srcHref} type={mimetypeCodec} />]
    }, [srcVideoDebounce, timeStampEffectif, setPlaybackCommence])

    const playbackCommenceHandler = useCallback(event=>{
        setPlaybackCommence(true)
        if(onPlay) onPlay(event)  // propagation
    }, [onPlay, setPlaybackCommence])

    useEffect(()=>{
        // Override pour playback, la source a change
        setPlaybackCommence(false)
        setActif(false)
        setTimeStampEffectif(0)
    }, [/*selecteur, */ srcVideo, setActif, setPlaybackCommence])

    useEffect(()=>{
        if(playbackCommence) return  // Ignorer changements au video si le playback est commence

        // Forcer un toggle d'affichage sur changements sources ou videos
        // console.debug("Changement videos : src : %O, videos : %O", src, videos)
        setActif(false)
        setTimeStampEffectif(timeStamp)
    }, [/* src, videos, sources, */ timeStamp, playbackCommence, setActif])

    useEffect(()=>{
        if(jumpToTimeStamp === -1) return
        if(refVideo.current && refVideo.current.currentTime !== undefined) {
            refVideo.current.currentTime = jumpToTimeStamp
        }
    }, [jumpToTimeStamp, refVideo])

    useEffect(()=>{
        if(!actif) setActif(true)
    }, [actif, setActif])

    if(!actif) return ''

    return (
        <video ref={refVideo} width={width} height={height} className={className} poster={poster} controls
            onPlay={playbackCommenceHandler}
            onTimeUpdate={onTimeUpdate}
            onProgress={onProgress}
            onWaiting={onWaiting}
            onError={onError}
            onCanPlay={onCanPlay}
            onAbort={onAbort}
            onEmptied={onEmptied}>
            {sources}
        </video>
    )
}

export default VideoViewer

function mapperCodec(mimetype, codecVideo) {
    let mimetypeCodec = mimetype
    if(codecVideo === 'hevc') {
        // Nom codec pour iOS
        mimetypeCodec = mimetype + `; codecs="hvc1"`
    } else if(codecVideo === 'h264') {
        // Omettre le codecs, devrait etre supporte partout
        mimetypeCodec = mimetype
    } else if(codecVideo) {
        mimetypeCodec = mimetype + `; codecs="${codecVideo}"`
    } 
    return mimetypeCodec
}