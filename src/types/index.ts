export type Character = {
  id: number
  name: string
  description: string
  system_prompt: string
  avatar: string
  voice_name: string
}

export type AIAction = {
  conversation_id: number
  user_message_id: number
  assistant_message_id: number
  reply: string
  animation: 'idle'|'wave'|'fly'|'point'|'laugh'|'surprised'|'talk'
  emotion: 'neutral'|'happy'|'excited'|'curious'|'surprised'|'calm'
}

export type ChatMessage = {
  id: string | number
  role: 'user'|'assistant'
  content: string
  pending?: boolean
}

export type Conversation = {
  id: number
  title: string
  character: Character
  messages: ChatMessage[]
  updated_at: string
}
