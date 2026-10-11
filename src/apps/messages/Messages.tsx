import { createEffect, createMemo, createSignal, For, on, onMount, Show } from 'solid-js'
import { focusChat } from '../../desktop/ChatBar'
import { SandboxIcon } from '../../desktop/SandboxIcon'
import { isOnStage, sandboxes, switchSandbox, windows } from '../../desktop/store'
import { Window } from '../../desktop/Window'
import { ArrowUp, Close, Mic, Pause, Play, Plus, Sparkles } from '../../ui/icons'
import {
  activeChat,
  chatById,
  contacts,
  dismissCatchUp,
  ME,
  messages,
  messagesIn,
  openChat,
  playing,
  react,
  send,
  setDraft,
  setReplyTo,
  setVisible,
  sortedChats,
  startIncoming,
  toggleVoice,
  voiceProgress,
  type Chat,
  type Message,
} from './state'
import './Messages.css'

const WAVE = Array.from({ length: 30 }, (_, i) => 0.25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 0.75)

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function dayLabel(at: number) {
  const d = new Date(at)
  if (d.toDateString() === new Date().toDateString()) return 'Today'
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long' })
}

const nameOf = (from: string) => (from === ME ? 'You' : contacts[from].name)
const firstName = (from: string) => nameOf(from).split(' ')[0]

function colorsOf(chat: Chat): [string, string] {
  return chat.group ? ['#7c8597', '#3d4452'] : contacts[chat.members[0]].colors
}

function preview(message?: Message) {
  if (!message) return ''
  if (message.voice) return 'Voice message'
  if (message.image) return message.text ?? 'Photo'
  return message.text ?? ''
}

function Avatar(props: { chat: Chat; size: number }) {
  const person = () => contacts[props.chat.members[0]]
  const agent = () => !props.chat.group && !!person().agent
  const initials = () =>
    props.chat.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
  return (
    <span
      class="ix-avatar"
      classList={{ 'is-agent': agent() }}
      style={{
        width: `${props.size}px`,
        height: `${props.size}px`,
        background: `linear-gradient(135deg, ${colorsOf(props.chat)[0]}, ${colorsOf(props.chat)[1]})`,
        'font-size': `${props.size * 0.36}px`,
      }}
    >
      <Show when={agent()} fallback={initials()}>
        <Sparkles width={props.size * 0.46} height={props.size * 0.46} />
      </Show>
    </span>
  )
}

function Rail() {
  return (
    <nav class="ix-rail glass-pill" aria-label="Conversations">
      <For each={sortedChats()}>
        {(chat) => (
          <button
            class="ix-person"
            classList={{ 'is-active': activeChat() === chat.id, 'is-typing': !!chat.typing }}
            aria-label={chat.name}
            onClick={() => openChat(chat.id)}
          >
            <Avatar chat={chat} size={42} />
            <Show when={chat.unread > 0}>
              <span class="ix-unread">{chat.unread}</span>
            </Show>
            <span class="ix-tip">
              <b>{chat.name}</b>
              <span>{chat.typing ? 'typing…' : preview(messagesIn(chat.id).at(-1))}</span>
            </span>
          </button>
        )}
      </For>
      <span class="ix-rail-gap" />
      <button class="ix-person ix-new" aria-label="New conversation">
        <Plus width="18" height="18" />
      </button>
    </nav>
  )
}

function Bubble(props: { message: Message; first: boolean; last: boolean; group: boolean; readLine?: string }) {
  const mine = () => props.message.from === ME
  const quoted = () => messages.find((x) => x.id === props.message.replyTo)
  const author = () => contacts[props.message.from]
  const linked = () => (props.message.link ? sandboxes[props.message.link.sandbox] : undefined)

  return (
    <div class="ix-msg" classList={{ 'is-mine': mine(), 'is-first': props.first, 'is-last': props.last }}>
      <Show when={props.group && !mine() && props.first}>
        <span class="ix-author" style={{ color: author().colors[0] }}>
          {author().name}
        </span>
      </Show>
      <div class="ix-bubble-row">
        <div class="ix-bubble" onDblClick={() => react(props.message.id)}>
          <Show when={quoted()}>
            {(q) => (
              <span class="ix-quote">
                <b>{firstName(q().from)}</b>
                <span>{preview(q())}</span>
              </span>
            )}
          </Show>
          <Show when={props.message.image}>
            <span class="ix-image" style={{ background: props.message.image }} />
          </Show>
          <Show when={props.message.voice}>
            {(seconds) => {
              const isPlaying = () => playing() === props.message.id
              return (
                <span class="ix-voice">
                  <button class="ix-voice-btn" aria-label={isPlaying() ? 'Pause' : 'Play'} onClick={() => toggleVoice(props.message.id, seconds())}>
                    <Show when={isPlaying()} fallback={<Play width="15" height="15" />}>
                      <Pause width="15" height="15" />
                    </Show>
                  </button>
                  <span class="ix-wave">
                    <For each={WAVE}>
                      {(h, i) => <i style={{ height: `${h * 100}%` }} classList={{ 'is-played': isPlaying() && i() / WAVE.length < voiceProgress() }} />}
                    </For>
                  </span>
                  <span class="ix-voice-time">
                    0:{String(Math.round(isPlaying() ? seconds() * voiceProgress() : seconds())).padStart(2, '0')}
                  </span>
                </span>
              )
            }}
          </Show>
          <Show when={props.message.text}>
            <span class="ix-text">{props.message.text}</span>
          </Show>
          <Show when={props.message.link && linked()}>
            <button class="ix-chip" onClick={() => switchSandbox(props.message.link!.sandbox)}>
              <SandboxIcon id={props.message.link!.sandbox} size={18} status={false} />
              <span class="ix-chip-name">{linked()!.name}</span>
              <span class="ix-chip-activity">{linked()!.activity}</span>
            </button>
          </Show>
          <Show when={props.message.reaction}>
            <span class="ix-reaction">{props.message.reaction}</span>
          </Show>
        </div>

        <div class="ix-actions glass-pill">
          <button aria-label="Love" onClick={() => react(props.message.id)}>
            ❤️
          </button>
          <button aria-label="Reply" onClick={() => setReplyTo(props.message.id)}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 6 6v4" />
            </svg>
          </button>
          <button
            aria-label="Ask SI"
            onClick={() => focusChat(`About ${firstName(props.message.from)}'s message “${preview(props.message)}”: `)}
          >
            <Sparkles width="14" height="14" />
          </button>
        </div>
      </div>
      <Show when={props.message.via === 'si' || props.readLine}>
        <span class="ix-read">
          <Show when={props.message.via === 'si'}>
            <span class="ix-via">
              <Sparkles width="10" height="10" />
              Sent by SI
            </span>
          </Show>
          <Show when={props.message.via === 'si' && props.readLine}> · </Show>
          {props.readLine}
        </span>
      </Show>
    </div>
  )
}

export function Messages() {
  const [writingOpen, setWritingOpen] = createSignal(false)
  const writing = () => writingOpen() || !!chat().draft.trim() || !!chat().replyTo
  let scroller!: HTMLDivElement
  let input!: HTMLTextAreaElement

  const chat = () => chatById(activeChat())
  const thread = createMemo(() => messagesIn(activeChat()))
  const person = () => contacts[chat().members[0]]
  const [c1, c2] = [() => colorsOf(chat())[0], () => colorsOf(chat())[1]]
  const replying = () => messages.find((x) => x.id === chat().replyTo)

  createEffect(() => {
    const shown = !windows.messages.minimized && isOnStage('messages')
    setVisible(shown)
    if (shown) openChat(activeChat())
  })

  onMount(startIncoming)

  createEffect(
    on(
      () => [activeChat(), thread().length, chat().typing, chat().catchUp],
      () => queueMicrotask(() => scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })),
    ),
  )

  createEffect(on(() => chat().replyTo, (id) => id && queueMicrotask(() => input?.focus()), { defer: true }))

  const status = () => {
    if (chat().typing) return chat().group ? `${chat().typing} is typing…` : 'typing…'
    if (chat().group) return chat().members.map((id) => contacts[id].name.split(' ')[0]).join(', ') + ' and you'
    return person().status
  }

  const lastMine = () => [...thread()].reverse().find((x) => x.from === ME)
  const readLine = (message: Message) => {
    if (message !== lastMine() || thread().at(-1)?.from !== ME) return undefined
    if (message.receipt === 'read') return `Read ${clock(message.at + 60000)}`
    if (message.receipt === 'delivered') return 'Delivered'
    return 'Sending…'
  }

  function fit() {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`
  }

  function submit() {
    send(chat().draft)
    queueMicrotask(fit)
  }



  return (
    <Window id="messages" title="Messages" class="ix" frameless>
      <div
        class="ix-stage"
        style={{
          '--c1': c1(),
          '--c2': c2(),
        }}
      >
        <div class="ix-backdrop" />

        <div ref={scroller} class="ix-scroll">
          <Show when={chat().catchUp}>
            <div class="ix-catchup glass-pill">
              <span class="ix-catchup-icon">
                <Sparkles width="14" height="14" />
              </span>
              <span class="ix-catchup-text">
                <b>Catch-up from SI</b>
                <span>{chat().catchUp}</span>
              </span>
              <button class="ix-catchup-close" aria-label="Dismiss" onClick={() => dismissCatchUp(chat().id)}>
                <Close width="12" height="12" />
              </button>
            </div>
          </Show>

          <For each={thread()}>
            {(message, i) => {
              const prev = () => thread()[i() - 1]
              const next = () => thread()[i() + 1]
              const newDay = () => !prev() || dayLabel(prev()!.at) !== dayLabel(message.at)
              const first = () => newDay() || prev()!.from !== message.from
              const last = () => !next() || next()!.from !== message.from || dayLabel(next()!.at) !== dayLabel(message.at)
              return (
                <>
                  <Show when={newDay()}>
                    <div class="ix-day">
                      {dayLabel(message.at)} · {clock(message.at)}
                    </div>
                  </Show>
                  <Bubble message={message} first={first()} last={last()} group={!!chat().group} readLine={readLine(message)} />
                </>
              )
            }}
          </For>

          <Show when={chat().typing}>
            <div class="ix-msg is-first is-last">
              <div class="ix-bubble-row">
                <div class="ix-bubble ix-typing">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </Show>
        </div>

        <div class="ix-top" data-drag>
          <div class="ix-contact glass-pill">
            <Avatar chat={chat()} size={30} />
            <span class="ix-contact-text">
              <b>{chat().name}</b>
              <span classList={{ 'is-typing': !!chat().typing }}>{status()}</span>
            </span>
            <Show when={!chat().group && person().agent}>
              <span class="ix-agent-tag">{person().agent}</span>
            </Show>
          </div>
          <div class="ix-calls glass-pill">
            <button aria-label="Video call">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
                <rect x="3" y="6" width="13" height="12" rx="3" />
                <path d="M16 10l5-3v10l-5-3z" />
              </svg>
            </button>
            <button aria-label="Call">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              </svg>
            </button>
          </div>
        </div>

        <Rail />

        <div class="ix-bottom">

          <Show
            when={writing()}
            fallback={
              <div class="ix-idle">
                <button
                  class="ix-write glass-pill"
                  onClick={() => {
                    setWritingOpen(true)
                    queueMicrotask(() => input?.focus())
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
                  </svg>
                  Write it yourself
                </button>
                <span class="ix-hint">
                  or tell SI: “tell {chat().group ? 'the team' : firstName(chat().members[0])} …”
                </span>
              </div>
            }
          >
          <form
            class="ix-compose glass-pill"
            onFocusOut={(e) => {
              if (!chat().draft.trim() && !chat().replyTo && !e.currentTarget.contains(e.relatedTarget as Node)) setWritingOpen(false)
            }}
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <Show when={replying()}>
              {(q) => (
                <div class="ix-replying">
                  <span>
                    Replying to <b>{firstName(q().from)}</b>: {preview(q())}
                  </span>
                  <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(undefined)}>
                    <Close width="11" height="11" />
                  </button>
                </div>
              )}
            </Show>
            <div class="ix-compose-row">
              <button type="button" class="ix-icon-btn" aria-label="Attach">
                <Plus width="19" height="19" />
              </button>
              <textarea
                ref={input}
                rows={1}
                placeholder={chat().group ? `Message ${chat().name}` : `Message ${firstName(chat().members[0])}`}
                value={chat().draft}
               
                onInput={(e) => {
                  setDraft(e.currentTarget.value)
                  fit()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                    e.preventDefault()
                    submit()
                  }
                  if (e.key === 'Escape') setReplyTo(undefined)
                }}
              />
              <button
                type="submit"
                class="ix-send"
                classList={{ 'is-ready': !!chat().draft.trim() }}
                aria-label={chat().draft.trim() ? 'Send' : 'Voice message'}
              >
                <Show when={chat().draft.trim()} fallback={<Mic width="18" height="18" />}>
                  <ArrowUp width="18" height="18" stroke-width="2.2" />
                </Show>
              </button>
            </div>
          </form>
          </Show>
        </div>
      </div>
    </Window>
  )
}
