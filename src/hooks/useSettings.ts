import { useState, useEffect } from 'react'

export interface Settings {
  voiceReplies: boolean
  resolution: '720p' | '1080p'
  animationSpeed: number
}

const DEFAULT_SETTINGS: Settings = {
  voiceReplies: false,
  resolution: '1080p',
  animationSpeed: 1.0,
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('fairy_settings')
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      } catch (e) {
        console.error('Failed to parse settings', e)
      }
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    localStorage.setItem('fairy_settings', JSON.stringify(settings))
  }, [settings])

  return [settings, setSettings] as const
}
