import { createSignal, For, onCleanup, Show } from 'solid-js'
import { createStore } from 'solid-js/store'
import { ArrowUp, Mic, Plus } from '../ui/icons'
import { ProgressiveBlur } from '../ui/ProgressiveBlur'
import { delegate } from './agents'
import { replyTo, type Reply } from './replies'
import { LiveShelf } from './LiveShelf'
import { SandboxIcon } from './SandboxIcon'
import { sandboxes, switchSandbox, type SandboxId } from './store'
import './ChatBar.css'

const MAX_INPUT_HEIGHT = 160
const THINK_DELAY = 380
const REPLY_DELAY = 1100
const ACTION_DELAY = 350
const SLIDE_DURATION = 420
const SLIDE_EASING = 'cubic-bezier(0.2, 0.9, 0.25, 1)'

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  pending: boolean
  sandbox?: SandboxId
}

let ids = 0
let focusInput: ((text?: string) => void) | undefined

export function focusChat(text?: string) {
  focusInput?.(text)
}

export function ChatBar() {
  const [text, setText] = createSignal('')
  const [messages, setMessages] = createStore<Message[]>([])
  const [clearing, setClearing] = createSignal(false)
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const bubbles = new Map<number, HTMLDivElement>()
  let input!: HTMLTextAreaElement
  let list!: HTMLDivElement
  let track!: HTMLDivElement

  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, ms)
    timers.add(timer)
  }
  onCleanup(() => timers.forEach(clearTimeout))

  function slide(change: () => void) {
    const before = track.getBoundingClientRect().top
    change()
    list.scrollTop = list.scrollHeight
    const shift = before - track.getBoundingClientRect().top
    if (shift) {
      track.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], {
        duration: SLIDE_DURATION,
        easing: SLIDE_EASING,
      })
    }
    return shift
  }

  function fit() {
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, MAX_INPUT_HEIGHT)}px`
  }

  focusInput = (value) => {
    if (value !== undefined) {
      setText(value)
      input.value = value
      fit()
    }
    input.focus()
    input.select()
  }
  onCleanup(() => (focusInput = undefined))

  function fill(id: number, reply: Reply) {
    reply.action?.()
    if (reply.sandbox && reply.task) delegate(reply.sandbox, reply.task)
    const bubble = bubbles.get(id)
    const from = bubble?.getBoundingClientRect()
    const shift = slide(() =>
      setMessages((m) => m.id === id, { text: reply.text, pending: false, sandbox: reply.sandbox }),
    )
    if (!bubble || !from) return

    const to = bubble.getBoundingClientRect()
    const top = Math.max(0, to.height - from.height)
    const right = Math.max(0, to.width - from.width)
    bubble.animate(
      [
        {
          transform: `translateY(${-shift}px)`,
          clipPath: `inset(${top}px ${right}px 0 0 round 20px 20px 20px 6px)`,
        },
        { transform: 'translateY(0)', clipPath: 'inset(0 0 0 0 round 20px 20px 20px 6px)' },
      ],
      { duration: SLIDE_DURATION, easing: SLIDE_EASING },
    )
    bubble.querySelector('.msg-text')?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 300,
      delay: 80,
      easing: 'ease-out',
      fill: 'backwards',
    })
  }

  function respond(prompt: string) {
    const id = ++ids
    slide(() => setMessages(messages.length, { id, role: 'assistant', text: '', pending: true }))
    const reply = replyTo(prompt)
    later(() => fill(id, reply), reply.action ? ACTION_DELAY : REPLY_DELAY)
  }

  function send() {
    const body = text().trim()
    if (!body) return
    setClearing(false)
    slide(() => setMessages(messages.length, { id: ++ids, role: 'user', text: body, pending: false }))
    setText('')
    input.value = ''
    fit()
    later(() => respond(body), THINK_DELAY)
  }

  function clear() {
    if (!messages.length) return
    timers.forEach(clearTimeout)
    timers.clear()
    setClearing(true)
    later(() => {
      setMessages([])
      bubbles.clear()
      setClearing(false)
    }, 260)
  }

  return (
    <div class="chat" classList={{ 'has-messages': messages.length > 0 }}>
      <ProgressiveBlur class="chat-blur chat-blur-rest" sideFade={22} max={8} />
      <ProgressiveBlur class="chat-blur chat-blur-open" sideFade={22} />

      <div class="chat-column">
        <div ref={list} class="chat-messages" classList={{ 'is-clearing': clearing() }}>
          <div ref={track} class="chat-track">
            <For each={messages}>
              {(message) => (
                <div class={`msg msg-${message.role}`}>
                  <div
                    ref={(el) => bubbles.set(message.id, el)}
                    class="msg-bubble"
                    classList={{ 'is-typing': message.pending && !message.text }}
                  >
                    <Show
                      when={message.text}
                      fallback={
                        <span class="msg-dots">
                          <i />
                          <i />
                          <i />
                        </span>
                      }
                    >
                      <span class="msg-text">
                        {message.text}
                        <Show when={message.sandbox && sandboxes[message.sandbox] ? message.sandbox : undefined}>
                          {(id) => (
                            <button class="msg-chip" onClick={() => switchSandbox(id())}>
                              <SandboxIcon id={id()} size={18} status={false} />
                              <span class="msg-chip-name">{sandboxes[id()].name}</span>
                              <span class="msg-chip-activity">{sandboxes[id()].activity}</span>
                            </button>
                          )}
                        </Show>
                      </span>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <LiveShelf />
        <form
          class="chat-bar"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <button type="button" class="chat-btn" aria-label="Attach">
            <Plus width="18" height="18" />
          </button>
          <textarea
            ref={input}
            class="chat-input"
            rows={1}
            placeholder="Ask SI anything"
            spellcheck={false}
            value={text()}
            onInput={(e) => {
              setText(e.currentTarget.value)
              fit()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault()
                send()
              }
              if (e.key === 'Escape') clear()
            }}
          />
          <button type="button" class="chat-btn" aria-label="Dictate">
            <Mic width="18" height="18" />
          </button>
          <button type="submit" class="chat-send" classList={{ 'is-ready': !!text().trim() }} aria-label="Send">
            <ArrowUp width="18" height="18" stroke-width="2.2" />
          </button>
        </form>
      </div>
    </div>
  )
}
