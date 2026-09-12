import axios from 'axios'
import type { AIAction, Character } from '../types'

const baseURL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL, timeout: 90000 })

export async function getCharacters(): Promise<Character[]> {
  const { data } = await api.get('/characters/')
  return data
}

export async function askFairy(characterId: number, text: string, conversationId?: number): Promise<AIAction> {
  const { data } = await api.post('/ai/respond/', {
    character_id: characterId,
    text,
    conversation_id: conversationId,
  })
  return data
}

export async function health() {
  const { data } = await api.get('/health/')
  return data
}
