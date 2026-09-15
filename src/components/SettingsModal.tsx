import { Settings } from '../hooks/useSettings'

type SettingsProps = {
  settings: Settings
  onChange: (settings: Settings) => void
  onClose: () => void
  onClearChat: () => void
  onNukeEverything: () => void
}

export default function SettingsModal({ settings, onChange, onClose, onClearChat, onNukeEverything }: SettingsProps) {
  return (
    <>
      <div className="gc-modal-backdrop" onClick={onClose} />
      <div className="gc-modal" onClick={e => e.stopPropagation()}>
        <div className="gc-modal-header">
          <h3>Settings</h3>
          <button className="gc-drawer-close" onClick={onClose}>×</button>
        </div>
        
        <div className="gc-settings-content">
          <div className="gc-setting-row">
            <label>
              <div className="gc-setting-label">Voice Replies</div>
              <div className="gc-setting-desc">Fairy speaks her replies out loud</div>
            </label>
            <input 
              type="checkbox" 
              checked={settings.voiceReplies} 
              onChange={e => onChange({ ...settings, voiceReplies: e.target.checked })} 
            />
          </div>
          
          <div className="gc-setting-row">
            <label>
              <div className="gc-setting-label">Camera Resolution</div>
              <div className="gc-setting-desc">Lower resolution runs faster on older devices</div>
            </label>
            <select 
              value={settings.resolution}
              onChange={e => onChange({ ...settings, resolution: e.target.value as '720p' | '1080p' })}
            >
              <option value="1080p">1080p (High Quality)</option>
              <option value="720p">720p (Performance)</option>
            </select>
          </div>

          <div className="gc-setting-row">
            <label>
              <div className="gc-setting-label">Animation Speed</div>
              <div className="gc-setting-desc">Adjust how fast the fairy breathes and moves</div>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={settings.animationSpeed}
              onChange={e => onChange({ ...settings, animationSpeed: parseFloat(e.target.value) })}
            />
          </div>

          <hr className="gc-divider" />

          <div className="gc-setting-actions">
            <button className="gc-btn-outline" onClick={onClearChat}>
              Start Fresh Chat
            </button>
            <button className="gc-btn-danger" onClick={onNukeEverything}>
              Nuke Everything
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
