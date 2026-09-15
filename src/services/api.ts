import axios from 'axios'
import type { AIAction, Character, Conversation } from '../types'

const baseURL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL, timeout: 90000 })

export async function getCharacters(): Promise<Character[]> {
  const { data } = await api.get('/characters/')
  return data
}

export async function getConversation(id: number): Promise<Conversation> {
  const { data } = await api.get(`/conversations/${id}/`)
  return data
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await api.get('/conversations/')
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
