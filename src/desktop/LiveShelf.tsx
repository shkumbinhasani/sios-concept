import { For, type JSX, Match, Show, Switch } from 'solid-js'
import { activeTab, pageTitle, urlOf } from '../apps/browser/state'
import { faviconOf } from '../apps/browser/sites'
import { agentCursor, items } from '../apps/canvas/state'
import { chats, contacts as people, lastIn, ME, totalUnread } from '../apps/messages/state'
import { Artwork, next, playing, progress, setPlaying, track } from '../apps/music/MusicPlayer'
import { Next, Pause, Play } from '../ui/icons'
import { buildLoad, terminal } from './agents'
import { activeSandbox, minimizedIn, openWindow, sandboxes, type WindowId } from './store'
import './LiveShelf.css'

export const pillId = (id: WindowId) => `pill-${id}`

const restorers = new Map<WindowId, (rect: DOMRect) => void>()

export function onRestoreFrom(id: WindowId, fn: (rect: DOMRect) => void) {
  restorers.set(id, fn)
}

const ICONS: Record<WindowId, { color: string; glyph: JSX.Element }> = {
  browser: { color: 'linear-gradient(180deg, #5ac8fa, #0a6cff)', glyph: <circle cx="12" cy="12" r="8" /> },
  music: { color: 'linear-gradient(180deg, #ff6a7f, #fa233b)', glyph: <path d="M9 18V6l10-2v12" /> },
  messages: {
    color: 'linear-gradient(180deg, #5af08a, #13b34e)',
    glyph: <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />,
  },
  notes: { color: 'linear-gradient(180deg, #c86bff, #6a2bff)', glyph: <path d="M7 4h7l4 4v12H7zM14 4v4h4" /> },
  canvas: { color: 'linear-gradient(180deg, #ffd34d, #ff8a00)', glyph: <path d="M4 4h16v11l-5 5H4z" /> },
  terminal: { color: 'linear-gradient(180deg, #3a3a44, #16161c)', glyph: <path d="M5 8l4 4-4 4M12 16h7" /> },
  monitor: { color: 'linear-gradient(180deg, #4ce38a, #0e9f6e)', glyph: <path d="M4 18V9M9 18V5M14 18v-6M19 18v-9" /> },
}

function AppIcon(props: { id: WindowId }) {
  return (
    <span class="live-icon" style={{ background: ICONS[props.id].color }}>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {ICONS[props.id].glyph}
      </svg>
    </span>
  )
}

function Text(props: { title: string; detail?: string; live?: boolean }) {
  return (
    <span class="live-text">
      <span class="live-title">{props.title}</span>
      <Show when={props.detail}>
        <span class="live-detail" classList={{ 'is-live': props.live }}>
          {props.detail}
        </span>
      </Show>
    </span>
  )
}

function Content(props: { id: WindowId }) {
  const stop = (e: Event) => e.stopPropagation()
  return (
    <Switch>
      <Match when={props.id === 'music'}>
        <span class="live-art">
          <Artwork track={track()} />
          <span class="live-ring" style={{ '--p': progress() }} />
        </span>
        <Text title={track().title} detail={track().artist} />
        <span class="live-controls">
          <button aria-label={playing() ? 'Pause' : 'Play'} onPointerDown={stop} onClick={(e) => (stop(e), setPlaying((v) => !v))}>
            <Show when={playing()} fallback={<Play width="14" height="14" />}>
              <Pause width="14" height="14" />
            </Show>
          </button>
          <button aria-label="Next" onPointerDown={stop} onClick={(e) => (stop(e), next())}>
            <Next width="14" height="14" />
          </button>
        </span>
      </Match>
      <Match when={props.id === 'messages'}>
        <span class="live-badged">
          <AppIcon id="messages" />
          <Show when={totalUnread() > 0}>
            <span class="live-count">{totalUnread()}</span>
          </Show>
        </span>
        <Text
          title={(() => {
            const typing = chats.find((c) => c.typing)
            return typing ? `${typing.name}` : 'Messages'
          })()}
          detail={(() => {
            const typing = chats.find((c) => c.typing)
            if (typing) return 'typing…'
            const unread = [...chats].filter((c) => c.unread > 0).sort((a, b) => (lastIn(b.id)?.at ?? 0) - (lastIn(a.id)?.at ?? 0))[0]
            if (!unread) return 'No new messages'
            const last = lastIn(unread.id)
            const who = last && last.from !== ME ? people[last.from].name.split(' ')[0] : unread.name
            return `${who}: ${last?.text ?? (last?.voice ? 'Voice message' : 'Photo')}`
          })()}
          live={chats.some((c) => c.typing)}
        />
      </Match>
      <Match when={props.id === 'terminal'}>
        <AppIcon id="terminal" />
        <Text
          title={sandboxes.build.status === 'working' ? 'Running tests' : 'zsh'}
          detail={terminal[terminal.length - 1]?.text.replace(/^si@build-01:~\/os\$\s*/, '$ ') || '$'}
          live={sandboxes.build.status === 'working'}
        />
        <Show when={sandboxes.build.status === 'working'}>
          <span class="live-spinner" />
        </Show>
      </Match>
      <Match when={props.id === 'monitor'}>
        <AppIcon id="monitor" />
        <Text title="Activity" detail={`CPU ${Math.round(buildLoad() * 100)}%`} live={buildLoad() > 0.5} />
      </Match>
      <Match when={props.id === 'browser'}>
        <span class="live-icon live-favicon">
          <img src={faviconOf(urlOf(activeTab()))} alt="" width="16" height="16" />
        </span>
        <Text title={pageTitle(urlOf(activeTab()))} detail="Browser" />
      </Match>
      <Match when={props.id === 'canvas'}>
        <AppIcon id="canvas" />
        <Text
          title="Canvas"
          detail={agentCursor.visible ? 'Research is adding notes' : `${items.filter((i) => i.kind === 'note').length} notes`}
          live={agentCursor.visible}
        />
      </Match>
      <Match when={props.id === 'notes'}>
        <AppIcon id="notes" />
        <Text
          title="Findings.md"
          detail={sandboxes.research.status === 'working' ? 'Research is writing' : 'Markdown'}
          live={sandboxes.research.status === 'working'}
        />
      </Match>
    </Switch>
  )
}

export function LiveShelf() {
  const pills = () => minimizedIn(activeSandbox())
  const compact = () => pills().length > 2

  return (
    <div class="live-shelf" classList={{ 'is-compact': compact() }}>
      <For each={pills()}>
        {(id) => (
          <button
            id={pillId(id)}
            class={`live-pill live-${id} glass-pill`}
            aria-label={`Restore ${id}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              openWindow(id)
              restorers.get(id)?.(rect)
            }}
          >
            <Content id={id} />
          </button>
        )}
      </For>
    </div>
  )
}
