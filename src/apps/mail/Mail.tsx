import { createEffect, createSignal, For, on, onCleanup, Show } from 'solid-js'
import { focusChat } from '../../desktop/ChatBar'
import { Window } from '../../desktop/Window'
import { Close, Sparkles } from '../../ui/icons'
import {
  activeId,
  archive,
  composing,
  inBucket,
  ME,
  needsYou,
  openThread,
  reply,
  restore,
  send,
  senderOf,
  setComposing,
  setDraft,
  threadById,
  type Bucket,
  type Sender,
  type Thread,
} from './state'
import './Mail.css'

const SECTIONS: { bucket: Bucket; title: string }[] = [
  { bucket: 'needs', title: 'Needs you' },
  { bucket: 'fyi', title: 'For your information' },
  { bucket: 'handled', title: 'Handled by SI' },
]

function ago(at: number) {
  const m = Math.round((Date.now() - at) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return new Date(at).toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function stamp(at: number) {
  const d = new Date(at)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  if (d.toDateString() === new Date().toDateString()) return `Today ${time}`
  if (d.toDateString() === new Date(Date.now() - 86400000).toDateString()) return `Yesterday ${time}`
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`
}

const firstName = (name: string) => name.split(' ')[0]

function Avatar(props: { sender: Sender; size: number }) {
  const initials = () =>
    props.sender.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
  return (
    <span
      class="mx-avatar"
      style={{
        width: `${props.size}px`,
        height: `${props.size}px`,
        background: `linear-gradient(135deg, ${props.sender.colors[0]}, ${props.sender.colors[1]})`,
        'font-size': `${props.size * 0.38}px`,
      }}
    >
      {initials()}
    </span>
  )
}

function Row(props: { thread: Thread }) {
  const sender = () => senderOf(props.thread)
  const last = () => props.thread.mails[props.thread.mails.length - 1]
  return (
    <button
      class="mx-row"
      classList={{
        'is-active': activeId() === props.thread.id && !composing(),
        'is-unread': props.thread.unread,
        'is-done': !!props.thread.done,
      }}
      onClick={() => openThread(props.thread.id)}
    >
      <Avatar sender={sender()} size={34} />
      <span class="mx-row-text">
        <span class="mx-row-top">
          <span class="mx-row-from">{props.thread.to ? `To ${firstName(sender().name)}` : sender().name}</span>
          <span class="mx-row-time">{ago(last().at)}</span>
        </span>
        <span class="mx-row-summary">{props.thread.summary}</span>
        <Show when={props.thread.done ?? props.thread.handled ?? props.thread.tag}>
          {(label) => (
            <span
              class="mx-tag"
              classList={{ 'is-done': !!props.thread.done, 'is-handled': !props.thread.done && !!props.thread.handled }}
            >
              {label()}
            </span>
          )}
        </Show>
      </span>
    </button>
  )
}

function Inbox() {
  const [showHandled, setShowHandled] = createSignal(false)
  return (
    <nav class="mx-list glass-pill" aria-label="Inbox">
      <div class="mx-brief">
        <span class="mx-brief-icon">
          <Sparkles width="13" height="13" />
        </span>
        <span>
          <Show when={needsYou() > 0} fallback={<b>You’re all caught up</b>}>
            <b>
              {needsYou()} {needsYou() === 1 ? 'email needs' : 'emails need'} you
            </b>
          </Show>
          <span class="mx-dim">SI handled {inBucket('handled').length} on its own</span>
        </span>
      </div>
      <div class="mx-list-scroll">
        <For each={SECTIONS}>
          {(section) => (
            <Show when={inBucket(section.bucket).length > 0}>
              <section class="mx-section">
                <Show
                  when={section.bucket === 'handled'}
                  fallback={<h3 class="mx-section-title">{section.title}</h3>}
                >
                  <button class="mx-section-title mx-toggle" onClick={() => setShowHandled((v) => !v)}>
                    {section.title}
                    <span class="mx-count">{inBucket('handled').length}</span>
                    <svg
                      classList={{ 'is-open': showHandled() }}
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </Show>
                <Show when={section.bucket !== 'handled' || showHandled()}>
                  <For each={inBucket(section.bucket)}>{(thread) => <Row thread={thread} />}</For>
                </Show>
              </section>
            </Show>
          )}
        </For>
      </div>
    </nav>
  )
}

function Dock(props: { thread: Thread }) {
  const [writing, setWriting] = createSignal(false)
  const sender = () => senderOf(props.thread)
  let field: HTMLTextAreaElement | undefined

  createEffect(on(() => props.thread.id, () => setWriting(false)))

  function fit() {
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight, 220)}px`
  }

  const editing = () => props.thread.draft !== undefined || writing()
  const askSI = () => focusChat(`Change my reply to ${firstName(sender().name)}: `)

  let dock!: HTMLDivElement
  const observer = new ResizeObserver(() => dock.parentElement?.style.setProperty('--mx-dock', `${dock.offsetHeight}px`))
  queueMicrotask(() => observer.observe(dock))
  onCleanup(() => observer.disconnect())

  return (
    <div ref={dock} class="mx-dock">
      <Show when={props.thread.bucket === 'handled'}>
        <div class="mx-bar glass-pill">
          <span class="mx-bar-note">
            <Sparkles width="13" height="13" />
            {props.thread.handled}
          </span>
          <button class="mx-pill" onClick={() => restore(props.thread.id)}>
            Move to inbox
          </button>
        </div>
      </Show>

      <Show when={props.thread.bucket !== 'handled'}>
        <Show
          when={editing()}
          fallback={
            <div class="mx-bar glass-pill">
              <Show when={props.thread.done}>
                {(done) => (
                  <span class="mx-bar-note is-done">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                    {done()}
                  </span>
                )}
              </Show>
              <For each={props.thread.choices}>
                {(choice) => (
                  <button class="mx-pill" classList={{ 'is-primary': !!choice.primary }} onClick={() => reply(props.thread.id, choice.reply)}>
                    {choice.label}
                  </button>
                )}
              </For>
              <button
                class="mx-pill"
                onClick={() => {
                  setWriting(true)
                  queueMicrotask(() => field?.focus())
                }}
              >
                Reply
              </button>
              <button class="mx-icon-pill" aria-label="Archive" title="Archive" onClick={() => archive(props.thread.id)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 5h16v4H4zM5 9v10h14V9M10 13h4" />
                </svg>
              </button>
            </div>
          }
        >
          <form
            class="mx-draft glass-pill"
            onSubmit={(e) => {
              e.preventDefault()
              reply(props.thread.id, field?.value ?? '')
              setWriting(false)
            }}
          >
            <div class="mx-draft-head">
              <Show
                when={props.thread.draft !== undefined && !writing()}
                fallback={<span class="mx-draft-label">Reply to {firstName(sender().name)}</span>}
              >
                <span class="mx-draft-label is-si">
                  <Sparkles width="12" height="12" />
                  SI drafted this reply
                </span>
              </Show>
              <button
                type="button"
                class="mx-icon"
                aria-label="Discard"
                onClick={() => {
                  setWriting(false)
                  setDraft(props.thread.id, undefined)
                }}
              >
                <Close width="11" height="11" />
              </button>
            </div>
            <textarea
              ref={(el) => {
                field = el
                queueMicrotask(fit)
              }}
              rows={3}
              placeholder={`Write to ${firstName(sender().name)}`}
              value={props.thread.draft ?? ''}
              onInput={(e) => {
                setDraft(props.thread.id, e.currentTarget.value)
                fit()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit()
              }}
            />
            <div class="mx-draft-actions">
              <button type="submit" class="mx-pill is-primary">
                Send
              </button>
              <button type="button" class="mx-pill" onClick={askSI}>
                Ask SI to change it
              </button>
              <span class="mx-gap" />
              <button type="button" class="mx-pill is-quiet" onClick={() => archive(props.thread.id)}>
                Archive
              </button>
            </div>
          </form>
        </Show>
      </Show>
    </div>
  )
}

function Reader(props: { thread: Thread }) {
  const sender = () => senderOf(props.thread)
  return (
    <>
      <div class="mx-scroll">
        <article class="mx-article">
          <h1 class="mx-subject">{props.thread.subject}</h1>
          <Show when={!props.thread.to}>
            <div class="mx-short">
              <span class="mx-short-icon">
                <Sparkles width="12" height="12" />
              </span>
              <span>
                <b>In short</b> {props.thread.summary}
              </span>
            </div>
          </Show>
          <For each={props.thread.mails}>
            {(mail) => {
              const from = () => (mail.from === 'me' ? { ...ME, colors: ['#3a3a48', '#23232d'] as [string, string] } : mail.from)
              return (
                <section class="mx-mail" classList={{ 'is-mine': mail.from === 'me' }}>
                  <header class="mx-mail-head">
                    <Avatar sender={from()} size={32} />
                    <span class="mx-mail-who">
                      <b>{mail.from === 'me' ? 'You' : from().name}</b>
                      <span>
                        {mail.from === 'me' ? `to ${sender().name}` : from().email}
                        <Show when={mail.via === 'si'}>
                          <span class="mx-via"> · sent by SI</span>
                        </Show>
                      </span>
                    </span>
                    <span class="mx-mail-time">{stamp(mail.at)}</span>
                  </header>
                  <div class="mx-mail-body">
                    <For each={mail.body}>{(paragraph) => <p>{paragraph}</p>}</For>
                  </div>
                </section>
              )
            }}
          </For>
        </article>
      </div>
      <Dock thread={props.thread} />
    </>
  )
}

function Composer() {
  const draft = () => composing()!
  const update = (patch: Partial<{ to: string; subject: string; body: string }>) => setComposing({ ...draft(), ...patch })
  return (
    <div class="mx-scroll">
      <form
        class="mx-compose glass-pill"
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft().to.trim() || !draft().body.trim()) return
          const sent = send(draft().to, draft().subject, draft().body)
          openThread(sent.id)
        }}
      >
        <div class="mx-draft-head">
          <span class="mx-draft-label">New email</span>
          <button type="button" class="mx-icon" aria-label="Discard" onClick={() => setComposing(undefined)}>
            <Close width="11" height="11" />
          </button>
        </div>
        <label class="mx-field">
          <span>To</span>
          <input value={draft().to} placeholder="Name or address" onInput={(e) => update({ to: e.currentTarget.value })} />
        </label>
        <label class="mx-field">
          <span>Subject</span>
          <input value={draft().subject} onInput={(e) => update({ subject: e.currentTarget.value })} />
        </label>
        <textarea
          rows={10}
          placeholder="Write your email, or tell SI what to say"
          value={draft().body}
          onInput={(e) => update({ body: e.currentTarget.value })}
        />
        <div class="mx-draft-actions">
          <button type="submit" class="mx-pill is-primary">
            Send
          </button>
          <button
            type="button"
            class="mx-pill"
            onClick={() => focusChat(draft().to ? `Email ${draft().to} about ` : 'Email ')}
          >
            Ask SI to write it
          </button>
        </div>
      </form>
    </div>
  )
}

export function Mail() {
  const thread = () => threadById(activeId())

  return (
    <Window id="mail" title="Mail" class="mx" frameless>
      <div class="mx-stage">
        <Show when={composing()} fallback={<Show when={thread()}>{(t) => <Reader thread={t()} />}</Show>}>
          <Composer />
        </Show>

        <Inbox />

        <div class="mx-top" data-drag>
          <button class="mx-new glass-pill" aria-label="New email" onClick={() => setComposing({ to: '', subject: '', body: '' })}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
            </svg>
          </button>
        </div>
      </div>
    </Window>
  )
}
