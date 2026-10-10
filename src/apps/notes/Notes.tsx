import { marked } from 'marked'
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'
import { openPage, showBrowser } from '../browser/state'
import { toUrl } from '../browser/sites'
import { editedAt, editedBy, editFindings, findings, lastAdded } from '../../desktop/agents'
import { sandboxes } from '../../desktop/store'
import { Window } from '../../desktop/Window'
import { ProgressiveBlur } from '../../ui/ProgressiveBlur'
import './Notes.css'

type Mode = 'read' | 'edit'

interface Heading {
  id: string
  text: string
  level: number
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')

function ago(time: number, now: number) {
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.round(seconds / 60)}m ago`
}

export function Notes() {
  const [mode, setMode] = createSignal<Mode>('read')
  const [outline, setOutline] = createSignal(true)
  const [current, setCurrent] = createSignal<string>()
  const [now, setNow] = createSignal(Date.now())
  let page!: HTMLDivElement
  let source: HTMLTextAreaElement | undefined

  const timer = setInterval(() => setNow(Date.now()), 5000)
  onCleanup(() => clearInterval(timer))

  const working = () => sandboxes.research.status === 'working'

  const headings = createMemo<Heading[]>(() =>
    marked
      .lexer(findings())
      .filter((token) => token.type === 'heading' && token.depth <= 3)
      .map((token) => {
        const text = (token as { text: string }).text
        return { id: slug(text), text, level: (token as { depth: number }).depth }
      }),
  )

  const html = createMemo(() => {
    const renderer = new marked.Renderer()
    renderer.heading = function ({ tokens, depth, text }) {
      const id = slug(text)
      const fresh = text === lastAdded() ? ' class="is-fresh"' : ''
      return `<h${depth} id="${id}"${fresh}>${this.parser.parseInline(tokens)}</h${depth}>`
    }
    let task = 0
    renderer.checkbox = ({ checked }) =>
      `<input type="checkbox" data-task="${task++}" ${checked ? 'checked' : ''} />`
    return marked.parse(findings(), { renderer, gfm: true, async: false }) as string
  })

  const words = createMemo(() => findings().replace(/[#>*`|\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length)

  createEffect(
    on(lastAdded, (title) => {
      if (!title || mode() !== 'read') return
      queueMicrotask(() => document.getElementById(slug(title))?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }, { defer: true }),
  )

  onMount(() => {
    const onScroll = () => {
      const top = page.getBoundingClientRect().top + 80
      let active: string | undefined
      for (const heading of headings()) {
        const el = page.querySelector(`#${CSS.escape(heading.id)}`)
        if (el && el.getBoundingClientRect().top <= top) active = heading.id
      }
      setCurrent(active ?? headings()[0]?.id)
    }
    page.addEventListener('scroll', onScroll, { passive: true })
    onCleanup(() => page.removeEventListener('scroll', onScroll))
    createEffect(on(html, () => queueMicrotask(onScroll)))
  })

  function onPageClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    if (link) {
      event.preventDefault()
      openPage(toUrl(link.getAttribute('href') ?? ''), 'you')
      showBrowser()
      return
    }
    if (target instanceof HTMLInputElement && target.dataset.task !== undefined) {
      const index = Number(target.dataset.task)
      let seen = -1
      editFindings(
        findings().replace(/^(\s*[-*] )\[( |x)\]/gm, (match, bullet, mark) => {
          seen++
          return seen === index ? `${bullet}[${mark === 'x' ? ' ' : 'x'}]` : match
        }),
      )
    }
  }

  function jump(id: string) {
    if (mode() === 'edit') setMode('read')
    queueMicrotask(() => page.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <Window id="notes" title="Findings.md" class="md" frameless>
      <div class="md-layout" classList={{ 'has-outline': outline() }}>
        <div ref={page} class="md-scroll" classList={{ 'is-hidden': mode() !== 'read' }} onClick={onPageClick}>
          <article class="md-doc" innerHTML={html()} />
          <Show when={working()}>
            <div class="md-writing">
              <span class="md-caret" />
              Research is writing…
            </div>
          </Show>
        </div>

        <Show when={mode() === 'edit'}>
          <textarea
            ref={source}
            class="md-source"
            spellcheck={false}
            value={findings()}
            onInput={(e) => editFindings(e.currentTarget.value)}
          />
        </Show>

        <ProgressiveBlur class="md-edge md-edge-top" edge="top" />
        <ProgressiveBlur class="md-edge md-edge-bottom" />

        <nav class="md-outline glass-pill" aria-label="Outline">
          <div class="md-outline-label">Outline</div>
          <For each={headings()}>
            {(heading) => (
              <button
                class={`md-outline-item level-${heading.level}`}
                classList={{ 'is-current': current() === heading.id, 'is-fresh': heading.text === lastAdded() }}
                onClick={() => jump(heading.id)}
              >
                {heading.text}
              </button>
            )}
          </For>
        </nav>

        <div class="md-status glass-pill">
          <span>
            {words()} words · {Math.max(1, Math.round(words() / 220))} min
          </span>
          <Show when={working()}>
            <span class="md-status-live">
              <i />
              Research is editing
            </span>
          </Show>
        </div>
      </div>

      <div class="md-top" data-drag>
        <button
          class="md-round glass-pill"
          classList={{ 'is-on': outline() }}
          aria-label="Toggle outline"
          onClick={() => setOutline((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 6h16M4 12h10M4 18h13" />
          </svg>
        </button>

        <div class="md-file glass-pill">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
            <path d="M6 3h8l4 4v14H6z" />
            <path d="M14 3v4h4" />
          </svg>
          <span class="md-name">Findings.md</span>
          <span class="md-edited">
            {editedBy()} · {ago(editedAt(), now())}
          </span>
        </div>

        <div class="md-switch glass-pill" role="tablist">
          <button classList={{ 'is-on': mode() === 'read' }} onClick={() => setMode('read')}>
            Read
          </button>
          <button
            classList={{ 'is-on': mode() === 'edit' }}
            onClick={() => {
              setMode('edit')
              queueMicrotask(() => source?.focus())
            }}
          >
            Edit
          </button>
        </div>
      </div>
    </Window>
  )
}
