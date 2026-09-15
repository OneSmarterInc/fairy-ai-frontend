import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { AIAction, Character, ChatMessage } from '../types'
import { askFairy, getCharacters, health, getConversation } from '../services/api'
import { useCamera } from '../hooks/useCamera'
import { useCameraMotion } from '../hooks/useCameraMotion'
import { useSpeech } from '../hooks/useSpeech'
import { useSettings } from '../hooks/useSettings'
import FairyOverlay from './FairyOverlay'
import ChatHistory from './ChatHistory'
import SettingsModal from './SettingsModal'

const CHARACTER_ASSETS = [
  { name: 'Fairy', url: '/assets/fairy.png' },
  { name: 'Dora', url: '/assets/dora.png' },
  { name: 'Dora 1', url: '/assets/dora1.png' },
  { name: 'Dora 2', url: '/assets/dora2.png' },
  { name: 'Dora 3', url: '/assets/dora3.png' },
  { name: 'Dora 4', url: '/assets/dora4.png' },
  { name: 'Jian', url: '/assets/jian.png' },
  { name: 'Nobi', url: '/assets/nobi.png' },
  { name: 'Nobi 1', url: '/assets/nobi1.png' },
  { name: 'Siju', url: '/assets/siju.png' },
]

const EMOJI_REACTIONS = [
  { emoji: '❤️', text: '*Sends a heart* I love this!' },
  { emoji: '✨', text: '*Throws sparkles* So magical!' },
  { emoji: '😂', text: '*Laughs out loud* That is hilarious!' },
  { emoji: '😮', text: '*Gasps* Oh my goodness!' },
  { emoji: '👋', text: '*Waves* Hello there!' },
  { emoji: '🎉', text: '*Throws confetti* Let us celebrate!' }
]

export default function Experience() {
  const [settings, setSettings] = useSettings()
  const [character, setCharacter] = useState<Character | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<{ url: string, isVideo?: boolean } | null>(null)
  const [showCharacterSelector, setShowCharacterSelector] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [action, setAction] = useState<AIAction | null>(null)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Connecting…')
  const [error, setError] = useState('')
  const [showReply, setShowReply] = useState(true)
  const [isTakingPhoto, setIsTakingPhoto] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const cam = useCamera(settings.resolution)
  const cameraMotion = useCameraMotion(cam.videoRef, cam.stream, cam.facingMode === 'user')
  const speech = useSpeech()

  const loadApp = useCallback(async () => {
    setInitializing(true)
    setError('')
    setStatus('Connecting…')
    try {
      const [characters, healthData] = await Promise.all([getCharacters(), health()])
      if (!characters.length) throw new Error('The backend did not return the fairy character. Restart the backend and retry.')
      const foundChar = characters.find((item) => item.name.toLowerCase() === 'tansy') || characters[0]
      setCharacter(foundChar)
      setSelectedAsset({ url: foundChar.avatar || '/assets/fairy.png' })
      setStatus(healthData.gemini_configured ? 'Ready' : 'Add GEMINI_API_KEY in backend/.env')

      const savedConvId = localStorage.getItem('fairy_conversation_id')
      if (savedConvId) {
        try {
          const parsedId = parseInt(savedConvId, 10)
          const conv = await getConversation(parsedId)
          setConversationId(parsedId)
          setMessages(conv.messages)
        } catch (e) {
          localStorage.removeItem('fairy_conversation_id')
        }
      }
    } catch (err: any) {
      setCharacter(null)
      setSelectedAsset(null)
      setStatus('Connection problem')
      setError(err?.response?.data?.detail || err?.message || 'Could not connect to the backend.')
    } finally {
      setInitializing(false)
    }
  }, [])

  useEffect(() => { void loadApp() }, [loadApp])

  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('fairy_conversation_id', conversationId.toString())
    } else {
      localStorage.removeItem('fairy_conversation_id')
    }
  }, [conversationId])

  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const latestUser = [...messages].reverse().find((message) => message.role === 'user')

  const send = async (value = text) => {
    const question = value.trim()
    if (!character || !question || busy) return

    setError('')
    setText('')
    setBusy(true)
    setShowReply(true)
    setStatus('Thinking…')
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: 'user', content: question }])

    try {
      const result = await askFairy(character.id, question, conversationId)
      setAction(result)
      setConversationId(result.conversation_id)
      setMessages((current) => [
        ...current,
        { id: `assistant-${result.assistant_message_id}`, role: 'assistant', content: result.reply },
      ])
      setStatus('Ready')
      if (settings.voiceReplies) speech.speak(result.reply)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Could not reach Gemini. Check the backend and API key.'
      if (err?.response?.data?.conversation_id) setConversationId(err.response.data.conversation_id)
      setError(detail)
      setStatus('Request failed')
    } finally {
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void send()
  }

  const startVoice = () => speech.listen((heard) => {
    setText(heard)
    void send(heard)
  }, (err) => {
    setError(err)
    setShowReply(true)
  })

  const takePhoto = () => {
    const video = cam.videoRef.current
    const overlay = document.querySelector('.fairy-transform') as HTMLElement
    const asset = document.querySelector('.fairy-asset') as HTMLImageElement | HTMLVideoElement

    if (!video || !overlay || !asset) return

    setIsTakingPhoto(true)
    setTimeout(() => setIsTakingPhoto(false), 400)

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (cam.facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    if (cam.facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
    }

    const videoRect = video.getBoundingClientRect()
    const fairyRect = asset.getBoundingClientRect()

    const videoRatio = canvas.width / canvas.height
    const rectRatio = videoRect.width / videoRect.height

    let scale
    if (rectRatio > videoRatio) {
      scale = canvas.width / videoRect.width
    } else {
      scale = canvas.height / videoRect.height
    }

    const uncroppedWidth = canvas.width / scale
    const uncroppedHeight = canvas.height / scale
    const uncroppedLeft = videoRect.left + (videoRect.width - uncroppedWidth) / 2
    const uncroppedTop = videoRect.top + (videoRect.height - uncroppedHeight) / 2

    const fairyX = fairyRect.left - uncroppedLeft
    const fairyY = fairyRect.top - uncroppedTop
    const drawX = fairyX * scale
    const drawY = fairyY * scale
    const drawW = fairyRect.width * scale
    const drawH = fairyRect.height * scale

    ctx.drawImage(asset, drawX, drawY, drawW, drawH)

    const link = document.createElement('a')
    link.download = 'fairy-photo.jpg'
    link.href = canvas.toDataURL('image/jpeg', 0.9)
    link.click()
  }

  const startCamera = async () => {
    setError('')
    // Start the orientation permission request directly from the click gesture (important on iOS).
    const orientationPermission = cameraMotion.requestOrientationPermission()
    try {
      await cam.start()
      await orientationPermission
      cameraMotion.resetMotion()
    } catch {
      // useCamera already stores a user-facing message.
    }
  }

  const resetExperience = () => {
    setMessages([])
    setConversationId(undefined)
    setAction(null)
    setError('')
    setShowReply(false)
    cameraMotion.resetMotion()
  }

  if (initializing) {
    return <div className="loading-screen"><span className="loading-spinner" />Loading fairy…</div>
  }

  if (!character) {
    return (
      <div className="startup-error-screen">
        <img src="/assets/fairy.png" alt="Fairy" />
        <h1>Couldn’t start the fairy.</h1>
        <p>{error || 'The backend did not return a character.'}</p>
        <div className="startup-actions">
          <button className="primary" onClick={() => void loadApp()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <main ref={rootRef} className="good-company-root">
      {isTakingPhoto && <div className="gc-flash" />}
      <video
        ref={cam.videoRef}
        className={`good-camera-video ${cam.facingMode === 'user' ? 'mirrored' : ''}`}
        playsInline
        muted
      />

      {!cam.stream && (
        <section className="camera-start-screen">
          <img className="camera-start-fairy" src="/assets/fairy.png" alt="Fairy" />
          <p className="camera-start-kicker">IN YOUR ROOM</p>
          <h1>Bring your fairy into the camera.</h1>
          <p>The live camera stays in your browser. Gemini receives only the text you send.</p>
          <button className="camera-start-button" onClick={() => void startCamera()}>Turn on the camera</button>
          <div className="camera-start-tools">
            <button type="button" onClick={() => void cam.flip()}>Swap camera</button>
          </div>
          {(cam.error || error) && <div className="gc-error start-error">{cam.error || error}</div>}
        </section>
      )}

      {cam.stream && (
        <>
          <FairyOverlay
            character={character}
            action={action}
            cameraOffset={cameraMotion.offset}
            onResetCameraMotion={cameraMotion.resetMotion}
            assetUrl={selectedAsset?.url}
            isVideoAsset={selectedAsset?.isVideo}
            animationSpeed={settings.animationSpeed}
          />

          <header className="gc-top-controls">
            <button className="gc-company-pill" onClick={resetExperience} title="Start a fresh conversation">
              <span>←</span> FAIRY AI
            </button>

            <div className="gc-top-right">
              <button className="gc-round-control" onClick={() => setShowChatHistory(true)} title="Chat History">📖</button>
              <button className="gc-round-control" onClick={() => setShowCharacterSelector(true)} title="Change Character">🎭</button>
              <button className="gc-round-control" onClick={takePhoto} title="Take Photo">📸</button>
              <button className="gc-swap-control" onClick={() => void cam.flip()} title="Swap camera">SWAP</button>
            </div>
          </header>

          {showChatHistory && (
            <ChatHistory
              onClose={() => setShowChatHistory(false)}
              currentId={conversationId}
              onSelect={async (id) => {
                setBusy(true)
                try {
                  const conv = await getConversation(id)
                  setConversationId(id)
                  setMessages(conv.messages)
                  setShowChatHistory(false)
                } catch (err) {
                  console.error(err)
                } finally {
                  setBusy(false)
                }
              }}
            />
          )}

          {showCharacterSelector && (
            <div className="gc-modal-backdrop" onClick={() => setShowCharacterSelector(false)}>
              <div className="gc-modal" onClick={e => e.stopPropagation()}>
                <h3>Change Character</h3>
                <p className="muted">Select a character to display.</p>
                <div className="gc-character-list">
                  {CHARACTER_ASSETS.map(asset => (
                    <button
                      key={asset.url}
                      className={`gc-character-btn ${selectedAsset?.url === asset.url ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedAsset({ url: asset.url })
                        setShowCharacterSelector(false)
                      }}
                    >
                      {asset.name}
                    </button>
                  ))}
                  <label className="gc-character-btn" style={{ textAlign: 'center', borderStyle: 'dashed' }}>
                    + Upload custom image/video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          const isVideo = file.type.startsWith('video/')
                          setSelectedAsset({ url, isVideo })
                          setShowCharacterSelector(false)
                        }
                      }}
                    />
                  </label>
                </div>
                <button className="gc-modal-close" onClick={() => setShowCharacterSelector(false)}>Close</button>
              </div>
            </div>
          )}

          {showSettings && (
            <SettingsModal
              settings={settings}
              onChange={setSettings}
              onClose={() => setShowSettings(false)}
              onClearChat={() => {
                resetExperience()
                setShowSettings(false)
              }}
              onNukeEverything={() => {
                localStorage.clear()
                window.location.reload()
              }}
            />
          )}

          <div className="gc-drag-hint">Drag to move · pinch or scroll to resize</div>

          {showReply && (latestAssistant || busy || error) && (
            <section className="gc-reply-card" aria-live="polite">
              <button className="gc-reply-close" onClick={() => setShowReply(false)} aria-label="Hide reply">×</button>
              {busy ? (
                <div className="gc-thinking"><span /><span /><span /></div>
              ) : error ? (
                <div className="gc-error">{error}</div>
              ) : (
                <p>{latestAssistant?.content}</p>
              )}
            </section>
          )}

          <div className="gc-bottom-fade" />

          <form className="gc-composer" onSubmit={submit}>

            {/* <button
              type="button"
              className={`gc-mic ${speech.listening ? 'active' : ''}`}
              onClick={startVoice}
              aria-label="Start voice input"
              title={speech.supported ? "Start voice input" : "Voice input not supported in this browser"}
              disabled={!speech.supported || busy}
            >
              🎤
            </button> */}

            <button
              type="button"
              className={`gc-emoji-toggle ${showEmojis ? 'active' : ''}`}
              onClick={() => setShowEmojis(!showEmojis)}
              aria-label="Toggle emoji reactions"
            >
              😊
            </button>

            {showEmojis && (
              <div className="gc-emoji-row">
                {EMOJI_REACTIONS.map(({ emoji, text: emojiText }) => (
                  <button
                    key={emoji}
                    type="button"
                    className="gc-emoji-btn"
                    onClick={() => {
                      void send(emojiText)
                      setShowEmojis(false)
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Say something to them"
              disabled={busy}
              aria-label="Message the fairy"
            />
            <button className="gc-send" type="submit" disabled={busy || !text.trim()}>SEND</button>
          </form>

        </>
      )}
    </main>
  )
}