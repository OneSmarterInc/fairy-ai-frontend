import { useCallback, useEffect, useRef, useState } from 'react'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'user'|'environment'>('user')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStream(null)
  }, [])

  const start = useCallback(async (mode: 'user'|'environment' = facingMode) => {
    setError('')
    stop()
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Use Chrome/Edge on localhost or HTTPS.')
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = media
      setStream(media)
      setFacingMode(mode)
      if (videoRef.current) {
        videoRef.current.srcObject = media
        await videoRef.current.play()
      }
      return media
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Camera permission failed'
      setError(message)
      throw e
    }
  }, [facingMode, stop])

  const flip = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user'
    return start(next)
  }, [facingMode, start])

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return { videoRef, stream, error, start, stop, flip, facingMode }
}
