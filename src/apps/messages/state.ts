import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

export type Receipt = 'sent' | 'delivered' | 'read'

export interface Contact {
  id: string
  name: string
  colors: [string, string]
  agent?: string
  status: string
}

export interface Message {
  id: number
  chat: string
  from: string
  text?: string
  at: number
  receipt?: Receipt
  image?: string
  voice?: number
  replyTo?: number
  reaction?: string
  link?: { label: string; sandbox: string }
}

export interface Chat {
  id: string
  name: string
  members: string[]
  group?: boolean
  pinned?: boolean
  unread: number
  typing?: string
  draft: string
  catchUp?: string
  replyTo?: number
}

export const ME = 'me'

const contacts: Record<string, Contact> = {
  ana: { id: 'ana', name: 'Ana Krasniqi', colors: ['#ff8a5c', '#ff3d6e'], status: 'online' },
  leo: { id: 'leo', name: 'Leo Marín', colors: ['#5ac8fa', '#3d5afe'], status: 'last seen 10 min ago' },
  mei: { id: 'mei', name: 'Mei Chen', colors: ['#4ce38a', '#0e9f6e'], status: 'online' },
  tomas: { id: 'tomas', name: 'Tomás Berg', colors: ['#ffd34d', '#ff7a00'], status: 'last seen yesterday' },
}

export { contacts }

const minute = 60 * 1000
const now = Date.now()
let ids = 0

const m = (chat: string, from: string, ago: number, part: Partial<Message>): Message => ({
  id: ++ids,
  chat,
  from,
  at: now - ago * minute,
  receipt: from === ME ? 'read' : undefined,
  ...part,
})

const [messages, setMessages] = createStore<Message[]>([
  m('ana', 'ana', 160, { text: 'Did you read the essay draft? 👀' }),
  m('ana', ME, 150, { text: 'Yes! The part about the strip at the edge of the screen is great' }),
  m('ana', 'ana', 148, { image: 'radial-gradient(60% 70% at 70% 30%, #ff9a6b, transparent 60%), radial-gradient(70% 80% at 20% 80%, #5b4bd6, transparent 65%), #1d1747', text: 'Cover idea for Meridian' }),
  m('ana', ME, 140, { text: 'Love the colours. Ship it 🚀', reaction: '❤️' }),
  m('ana', 'ana', 12, { voice: 23 }),
  m('ana', 'ana', 11, { text: 'Can we talk about the launch tomorrow?' }),

  m('team', 'mei', 95, { text: 'Map app now respects the safe area on all edges' }),
  m('team', 'leo', 90, { text: 'Poll results are in: 62% want to watch the agents work' }),
  m('team', ME, 85, { text: 'That matches what people said in testing' }),
  m('team', 'tomas', 30, { text: 'Who is bringing coffee tomorrow? ☕️' }),
  m('team', 'mei', 28, { text: 'Not it' }),

  m('leo', 'leo', 2000, { text: 'Sending the slides tonight' }),
  m('leo', ME, 1990, { text: '👍' }),
  m('mei', ME, 3000, { text: 'Your map demo is so clean' }),
  m('mei', 'mei', 2990, { text: 'Thank you!! Safe areas everywhere now 😄' }),
])

setMessages(
  (x) => x.text === 'Not it',
  'replyTo',
  messages.find((x) => x.text?.startsWith('Who is bringing'))?.id,
)

const [chats, setChats] = createStore<Chat[]>([
  { id: 'ana', name: 'Ana Krasniqi', members: ['ana'], pinned: true, unread: 2, draft: '' },
  { id: 'team', name: 'SI OS team', members: ['mei', 'leo', 'tomas'], group: true, unread: 2, draft: '' },
  { id: 'leo', name: 'Leo Marín', members: ['leo'], unread: 0, draft: '' },
  { id: 'mei', name: 'Mei Chen', members: ['mei'], unread: 0, draft: '' },
])

const [activeChat, setActiveChat] = createSignal('ana')
const [playing, setPlaying] = createSignal<number>()
const [voiceProgress, setVoiceProgress] = createSignal(0)

export { activeChat, chats, messages, playing, voiceProgress }

export const messagesIn = (chat: string) => messages.filter((x) => x.chat === chat)
export const lastIn = (chat: string) => messagesIn(chat).at(-1)
export const chatById = (id: string) => chats.find((c) => c.id === id)!
export const totalUnread = () => chats.reduce((sum, c) => sum + c.unread, 0)

export function sortedChats() {
  return [...chats].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
    return (lastIn(b.id)?.at ?? 0) - (lastIn(a.id)?.at ?? 0)
  })
}

const SUMMARIES: Record<string, string> = {
  ana: 'Ana sent a voice note and wants to talk about the launch tomorrow.',
  team: 'Tomás asked who is bringing coffee tomorrow. Mei said not her.',
  mei: 'Mei is asking whether you are coming to the demo later.',
  leo: 'Leo sent a quick message.',
}

export const SUGGESTIONS: Record<string, string[]> = {
  ana: ['10am works 👍', 'Can we do 11 instead?'],
  team: ['I will bring coffee ☕️', 'Not it either 😅'],
  mei: ['Yes, I will be there!', 'What time?'],
  leo: ['Thanks!', 'Looking forward to it'],
}

const DRAFTS: Record<string, string> = {
  ana: 'Yes, let us talk tomorrow at 10. I listened to your voice note, and I think the launch plan is in good shape. Let us go through the open questions first.',
  team: 'I can bring coffee tomorrow. Oat milk for Mei, black for Tomás, and the usual for Leo?',
  mei: 'Yes, I will be at the demo! Can you save me a seat near the front?',
  leo: 'Thanks for the slides, Leo. I will review them tonight and send notes in the morning.',
}

export const draftFor = (id: string) => DRAFTS[id] ?? ''

export function openChat(id: string) {
  const chat = chats.find((c) => c.id === id)
  const catchUp = chat && chat.unread > 1 ? SUMMARIES[id] : undefined
  setActiveChat(id)
  setChats((c) => c.id === id, { unread: 0, ...(catchUp ? { catchUp } : {}) })
}

export function dismissCatchUp(id: string) {
  setChats((c) => c.id === id, 'catchUp', undefined)
}

export function setReplyTo(id?: number) {
  setChats((c) => c.id === activeChat(), 'replyTo', id)
}

export function setDraft(text: string) {
  setChats((c) => c.id === activeChat(), 'draft', text)
}

export function react(id: number) {
  setMessages((x) => x.id === id, 'reaction', (r) => (r ? undefined : '❤️'))
}

let voiceTimer: ReturnType<typeof setInterval> | undefined

export function toggleVoice(id: number, seconds: number) {
  clearInterval(voiceTimer)
  if (playing() === id) {
    setPlaying(undefined)
    return
  }
  setPlaying(id)
  setVoiceProgress(0)
  voiceTimer = setInterval(() => {
    const next = voiceProgress() + 0.1 / seconds
    if (next >= 1) {
      clearInterval(voiceTimer)
      setPlaying(undefined)
      setVoiceProgress(0)
      return
    }
    setVoiceProgress(next)
  }, 100)
}

const REPLIES: Record<string, string[]> = {
  ana: ['Perfect, 10am works for me', 'Haha yes exactly', 'I will send the final draft tonight ✍️'],
  team: ['mei:Agreed!', 'leo:On it', 'tomas:🙌'],
  leo: ['Sounds good', 'Will do 👍'],
  mei: ['Yay!', 'Sending it over now'],
}

const replyIndex: Record<string, number> = {}

function later(ms: number, fn: () => void) {
  setTimeout(fn, ms)
}

function deliver(chatId: string, part: Partial<Message> & { from: string }) {
  setMessages(messages.length, { id: ++ids, chat: chatId, at: Date.now(), ...part })
  if (activeChat() !== chatId || !visible()) setChats((c) => c.id === chatId, 'unread', (n) => n + 1)
}

const [visible, setVisible] = createSignal(false)
export { setVisible }

export function send(text: string) {
  const chatId = activeChat()
  const body = text.trim()
  if (!body) return
  const id = ++ids
  const replyTo = chatById(chatId).replyTo
  setMessages(messages.length, { id, chat: chatId, from: ME, text: body, at: Date.now(), receipt: 'sent', replyTo })
  setChats((c) => c.id === chatId, { draft: '', replyTo: undefined, catchUp: undefined })

  const chat = chatById(chatId)
  later(700, () => setMessages((x) => x.id === id, 'receipt', 'delivered'))
  later(1500, () => setMessages((x) => x.id === id, 'receipt', 'read'))

  const pool = REPLIES[chatId]
  if (!pool) return
  const index = replyIndex[chatId] ?? 0
  replyIndex[chatId] = index + 1
  const raw = pool[index % pool.length]
  const [from, reply] = chat.group && raw.includes(':') ? raw.split(/:(.*)/s) : [chat.members[0], raw]
  later(1900, () => setChats((c) => c.id === chatId, 'typing', contacts[from].name.split(' ')[0]))
  later(3400, () => {
    setChats((c) => c.id === chatId, 'typing', undefined)
    deliver(chatId, {
      from,
      text: reply,
    })
  })
}

export function startIncoming() {
  later(6000, () => setChats((c) => c.id === 'mei', 'typing', 'Mei'))
  later(8000, () => {
    setChats((c) => c.id === 'mei', 'typing', undefined)
    deliver('mei', { from: 'mei', text: 'Are you coming to the demo later? 🎉' })
  })
}

export function updateMessage(id: number, fn: (m: Message) => void) {
  setMessages((x) => x.id === id, produce(fn))
}
