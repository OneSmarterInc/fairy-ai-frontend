import { useState } from 'react'

type SpeechRecognitionCtor = new () => any

export function useSpeech() {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition))

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1.16
    window.speechSynthesis.speak(u)
  }

  const listen = (onText: (text: string) => void) => {
    const Ctor: SpeechRecognitionCtor | undefined = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false
    rec.onstart = () => setListening(true)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (event: any) => onText(event.results[0][0].transcript)
    rec.start()
  }

  return { speak, listen, listening, supported }
}
