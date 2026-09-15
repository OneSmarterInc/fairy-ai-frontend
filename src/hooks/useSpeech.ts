import { useCallback, useRef, useState } from 'react'

type SpeechRecognitionCtor = new () => any

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() =>
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  )
  const recRef = useRef<any>(null)

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1.16
    window.speechSynthesis.speak(u)
  }

  const listen = useCallback(
    (onText: (text: string) => void, onError?: (error: string) => void) => {
      const Ctor: SpeechRecognitionCtor | undefined =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!Ctor) {
        onError?.('Speech recognition is not supported in this browser. Try Chrome on desktop or Android.')
        return
      }

      // Kill any previous session
      if (recRef.current) {
        try { recRef.current.abort() } catch { /* ignore */ }
      }

      const rec = new Ctor()
      recRef.current = rec
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.continuous = false

      let gotResult = false

      rec.onstart = () => {
        setListening(true)
      }

      rec.onerror = (event: any) => {
        setListening(false)
        recRef.current = null
        if (!onError || !event.error) return
        const errMap: Record<string, string> = {
          'not-allowed': 'Mic permission denied. Please allow microphone access in your browser settings to talk to Tansy!',
          'no-speech': 'No speech detected. Please try again and speak clearly.',
          'network': 'Speech recognition requires an internet connection. Please check your network.',
          'audio-capture': 'No microphone found or mic is in use by another app.',
          'aborted': 'Voice input was cancelled.',
          'service-not-available': 'Speech recognition service is temporarily unavailable. Please try again.',
        }
        onError(errMap[event.error] || `Mic error: ${event.error}`)
      }

      rec.onresult = (event: any) => {
        if (event.results?.length > 0 && event.results[0]?.length > 0) {
          gotResult = true
          const transcript = event.results[0][0].transcript
          if (transcript?.trim()) {
            onText(transcript)
          } else {
            onError?.('Could not understand what you said. Please try again.')
          }
        }
      }

      rec.onend = () => {
        setListening(false)
        recRef.current = null
      }

      try {
        rec.start()
      } catch (startErr: any) {
        setListening(false)
        recRef.current = null
        onError?.(
          startErr?.message?.includes('already started')
            ? 'Voice input is already active. Please wait for it to finish.'
            : `Could not start voice input: ${startErr?.message || startErr}`
        )
      }
    },
    []
  )

  const stop = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.stop() } catch { /* ignore */ }
    }
  }, [])

  return { speak, listen, listening, supported, stop }
}

