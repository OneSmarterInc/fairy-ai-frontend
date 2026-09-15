import { useEffect, useState } from 'react'
import { getConversations } from '../services/api'
import type { Conversation } from '../types'

type ChatHistoryProps = {
  onClose: () => void
  onSelect: (id: number) => void
  currentId?: number
}

export default function ChatHistory({ onClose, onSelect, currentId }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConversations()
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="gc-modal-backdrop" onClick={onClose} />
      <div className="gc-drawer" onClick={e => e.stopPropagation()}>
        <div className="gc-drawer-header">
          <h3>Past Chats</h3>
          <button className="gc-drawer-close" onClick={onClose}>×</button>
        </div>
        <div className="gc-drawer-content">
          {loading ? (
            <p className="muted">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="muted">No chats yet — go say hi to Tansy!</p>
          ) : (
            <div className="gc-history-list">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  className={`gc-history-item ${conv.id === currentId ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(conv.id)
                    onClose()
                  }}
                >
                  <div className="gc-history-title">{conv.title || `Chat with ${conv.character.name}`}</div>
                  <div className="gc-history-date">{new Date(conv.updated_at).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
