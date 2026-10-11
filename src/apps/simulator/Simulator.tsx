import { createEffect, createSignal, For, Match, on, onCleanup, onMount, Show, Switch } from 'solid-js'
import { Window } from '../../desktop/Window'
import { Search } from '../../ui/icons'
import {
  APPS,
  appById,
  device,
  insets,
  landscape,
  nextDevice,
  openApp,
  screenSize,
  setLandscape,
  setOpenApp,
  setShowSafe,
  showSafe,
  type PhoneApp,
} from './state'
import './Simulator.css'

const DOCK = ['weather', 'maps', 'murmur', 'settings']
const GRID = ['meridian', 'clock']

function useClock() {
  const [now, setNow] = createSignal(new Date())
  const timer = setInterval(() => setNow(new Date()), 10000)
  onCleanup(() => clearInterval(timer))
  return now
}

function NativeIcon(props: { id: string }) {
  return (
    <Switch>
      <Match when={props.id === 'settings'}>
        <svg viewBox="0 0 64 64" class="ph-native-icon">
          <defs>
            <linearGradient id="ph-settings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#b8bcc6" />
              <stop offset="1" stop-color="#6b7080" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#ph-settings)" />
          <circle cx="32" cy="32" r="17" fill="none" stroke="#e9ebf0" stroke-width="7" stroke-dasharray="6 4.6" />
          <circle cx="32" cy="32" r="10" fill="#4b4f5c" stroke="#e9ebf0" stroke-width="3" />
        </svg>
      </Match>
      <Match when={props.id === 'clock'}>
        <svg viewBox="0 0 64 64" class="ph-native-icon">
          <rect width="64" height="64" fill="#111" />
          <circle cx="32" cy="32" r="24" fill="#fff" />
          <path d="M32 32V16M32 32l10 6" stroke="#111" stroke-width="3" stroke-linecap="round" />
          <path d="M32 32L20 44" stroke="#ff9500" stroke-width="1.6" stroke-linecap="round" />
          <circle cx="32" cy="32" r="2.4" fill="#ff9500" />
        </svg>
      </Match>
    </Switch>
  )
}

function AppIcon(props: { app: PhoneApp; size?: number }) {
  return (
    <span class="ph-icon" style={{ width: `${props.size ?? 60}px`, height: `${props.size ?? 60}px` }}>
      <Show when={props.app.icon} fallback={<NativeIcon id={props.app.id} />}>
        <img src={props.app.icon} alt="" />
      </Show>
    </span>
  )
}

function StatusBar(props: { light?: boolean }) {
  const now = useClock()
  return (
    <div class="ph-status" classList={{ 'is-light': props.light }}>
      <span class="ph-time">{now().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')}</span>
      <span class="ph-status-right">
        <svg viewBox="0 0 18 12" width="17" height="11" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" width="15" height="11" fill="currentColor">
          <path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .7 10.4 10.4 0 0 0 .8 3.6L2 4.9a8.5 8.5 0 0 1 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.7 6.7 0 0 0 8 4.3a6.7 6.7 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3zm0 3.5c.5 0 .9.2 1.2.5L8 11.5 6.8 10.1c.3-.3.7-.5 1.2-.5z" />
        </svg>
        <span class="ph-battery">
          <i />
        </span>
      </span>
    </div>
  )
}

function ClockApp() {
  const now = useClock()
  return (
    <div class="ph-clock">
      <div class="ph-clock-time">{now().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="ph-clock-date">{now().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div class="ph-clock-list">
        <For
          each={[
            ['Prishtina', 0],
            ['London', -1],
            ['New York', -6],
            ['Tokyo', 7],
          ]}
        >
          {([city, offset]) => (
            <div class="ph-clock-row">
              <span>
                <b>{city}</b>
                <small>{offset === 0 ? 'Local' : `${Number(offset) > 0 ? '+' : ''}${offset} h`}</small>
              </span>
              <span class="ph-clock-city">
                {new Date(now().getTime() + Number(offset) * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function SettingsApp() {
  const i = () => insets()
  return (
    <div class="ph-settings">
      <h1>Settings</h1>
      <div class="ph-group">
        <div class="ph-row">
          <span>Device</span>
          <span class="ph-value">{device().name}</span>
        </div>
        <div class="ph-row">
          <span>Screen</span>
          <span class="ph-value">
            {screenSize().w} × {screenSize().h} pt
          </span>
        </div>
        <button class="ph-row" onClick={() => setLandscape((v) => !v)}>
          <span>Orientation</span>
          <span class="ph-value">{landscape() ? 'Landscape' : 'Portrait'}</span>
        </button>
      </div>
      <div class="ph-caption">SAFE AREA</div>
      <div class="ph-group">
        <For each={['top', 'right', 'bottom', 'left'] as const}>
          {(side) => (
            <div class="ph-row">
              <span>{side[0].toUpperCase() + side.slice(1)}</span>
              <span class="ph-value">{i()[side]} pt</span>
            </div>
          )}
        </For>
        <button class="ph-row" onClick={() => setShowSafe((v) => !v)}>
          <span>Show safe areas</span>
          <span class="ph-switch" classList={{ 'is-on': showSafe() }}>
            <i />
          </span>
        </button>
      </div>
      <div class="ph-caption ph-note">
        Pages made for SI receive these insets with the si-safe-area protocol, the same way they do in the desktop browser.
      </div>
    </div>
  )
}

export function Simulator() {
  const [fit, setFit] = createSignal(0.6)
  const [query, setQuery] = createSignal('')
  const frames = new Map<string, HTMLIFrameElement>()
  const layers = new Map<string, HTMLDivElement>()
  const iconEls = new Map<string, HTMLElement>()
  let stage!: HTMLDivElement
  let screen!: HTMLDivElement
  let holder!: HTMLDivElement

  const frameSize = () => {
    const d = device()
    const { w, h } = screenSize()
    const bx = landscape() ? d.bezel.y : d.bezel.x
    const by = landscape() ? d.bezel.x : d.bezel.y
    return { w: w + bx * 2, h: h + by * 2, bx, by }
  }

  onMount(() => {
    const measure = () => {
      const f = frameSize()
      const top = parseFloat(getComputedStyle(stage).paddingTop)
      setFit(Math.max(0.2, Math.min((stage.clientWidth - 48) / f.w, (stage.clientHeight - top - 28) / f.h, 1)))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    createEffect(on(frameSize, measure))

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'si:hello') return
      for (const frame of frames.values()) if (frame.contentWindow === event.source) post(frame)
    }
    window.addEventListener('message', onMessage)
    onCleanup(() => {
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    })
  })

  function post(frame: HTMLIFrameElement) {
    frame.contentWindow?.postMessage({ type: 'si:safe-area', insets: insets() }, '*')
  }

  createEffect(() => {
    insets()
    for (const frame of frames.values()) post(frame)
  })

  createEffect(() => {
    const on = showSafe()
    for (const frame of frames.values()) {
      try {
        frame.contentDocument?.documentElement.toggleAttribute('data-si-show-safe', on)
      } catch {
        continue
      }
    }
  })

  function iconBox(id: string) {
    const icon = iconEls.get(id)
    if (!icon) return undefined
    const s = screen.getBoundingClientRect()
    const r = icon.getBoundingClientRect()
    const scale = s.width / screenSize().w
    return { x: (r.left - s.left) / scale, y: (r.top - s.top) / scale, w: r.width / scale, h: r.height / scale }
  }

  function zoom(id: string, opening: boolean) {
    const layer = layers.get(id)
    const box = iconBox(id)
    if (!layer || !box) return
    const { w, h } = screenSize()
    const small = `translate(${box.x}px, ${box.y}px) scale(${box.w / w}, ${box.h / h})`
    const frames = [
      { transform: small, borderRadius: `${(14 * w) / box.w}px`, opacity: 0.4 },
      { transform: 'none', borderRadius: `${device().radius}px`, opacity: 1 },
    ]
    return layer.animate(opening ? frames : [...frames].reverse(), {
      duration: opening ? 420 : 360,
      easing: 'cubic-bezier(0.25, 0.9, 0.2, 1)',
      fill: opening ? 'none' : 'forwards',
    })
  }

  function launch(id: string) {
    if (openApp() === id) return
    setOpenApp(id)
    queueMicrotask(() => zoom(id, true))
  }

  function goHome() {
    const id = openApp()
    if (!id) return
    const motion = zoom(id, false)
    if (!motion) return setOpenApp(undefined)
    motion.onfinish = () => {
      setOpenApp(undefined)
      motion.cancel()
    }
  }

  function rotate() {
    setLandscape((v) => !v)
    holder.animate([{ transform: `rotate(${landscape() ? 90 : -90}deg)` }, { transform: 'none' }], {
      duration: 480,
      easing: 'cubic-bezier(0.25, 0.9, 0.2, 1)',
    })
  }

  function search(e: SubmitEvent) {
    e.preventDefault()
    const q = query().trim().toLowerCase()
    const match = APPS.find((a) => a.name.toLowerCase().startsWith(q) || a.id.startsWith(q))
    setQuery('')
    if (q && match) launch(match.id)
  }

  const i = () => insets()

  return (
    <Window id="simulator" title="Simulator" class="sim" frameless>
      <div ref={stage} class="sim-stage">
        <div class="sim-top" data-drag>
          <button class="sim-device glass-pill" title="Switch device" onClick={nextDevice}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="6" y="2.5" width="12" height="19" rx="3" />
              <path d="M10.5 5h3" stroke-linecap="round" />
            </svg>
            {device().name}
          </button>
          <div class="sim-tools glass-pill">
            <button aria-label="Home" title="Home" onClick={goHome}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round">
                <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />
              </svg>
            </button>
            <button aria-label="Rotate" title={landscape() ? 'Rotate to portrait' : 'Rotate to landscape'} classList={{ 'is-on': landscape() }} onClick={rotate}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="9" width="11" height="11" rx="2" />
                <path d="M13 4a7 7 0 0 1 7 7M20 11l-2-2M20 11l2-2" />
              </svg>
            </button>
            <button
              aria-label="Show safe areas"
              title="Show safe areas"
              classList={{ 'is-on': showSafe() }}
              onClick={() => setShowSafe((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 2.5">
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
            </button>
          </div>
        </div>

        <div ref={holder} class="sim-holder" style={{ width: `${frameSize().w * fit()}px`, height: `${frameSize().h * fit()}px` }}>
          <div
            class={`sim-body sim-${device().id}`}
            classList={{ 'is-landscape': landscape() }}
            style={{
              width: `${frameSize().w}px`,
              height: `${frameSize().h}px`,
              padding: `${frameSize().by}px ${frameSize().bx}px`,
              'border-radius': `${device().radius ? device().radius + frameSize().bx : 46}px`,
              scale: `${fit()}`,
            }}
          >
            <div
              ref={screen}
              class="ph-screen"
              style={{
                width: `${screenSize().w}px`,
                height: `${screenSize().h}px`,
                'border-radius': `${device().radius}px`,
                '--st': `${i().top}px`,
                '--sr': `${i().right}px`,
                '--sb': `${i().bottom}px`,
                '--sl': `${i().left}px`,
              }}
            >
              <div class="ph-home" classList={{ 'is-behind': !!openApp() }}>
                <Show when={!landscape() || device().cutout === 'none'}>
                  <StatusBar light />
                </Show>
                <div class="ph-home-body">
                  <div class="ph-widget">
                    <span class="ph-widget-city">Prishtina</span>
                    <span class="ph-widget-temp">18°</span>
                    <span class="ph-widget-cond">☀️ Clear sunset</span>
                    <span class="ph-widget-range">H 21° L 9°</span>
                  </div>
                  <div class="ph-grid">
                    <For each={GRID}>
                      {(id) => (
                        <button class="ph-app" onClick={() => launch(id)}>
                          <span ref={(el) => iconEls.set(id, el)}>
                            <AppIcon app={appById(id)!} />
                          </span>
                          <span class="ph-label">{appById(id)!.name}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
                <form class="ph-search" onSubmit={search}>
                  <Search width="14" height="14" />
                  <input placeholder="Search or ask SI" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
                </form>
                <div class="ph-dock">
                  <For each={DOCK}>
                    {(id) => (
                      <button class="ph-app" aria-label={appById(id)!.name} onClick={() => launch(id)}>
                        <span ref={(el) => iconEls.set(id, el)}>
                          <AppIcon app={appById(id)!} />
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </div>

              <For each={APPS}>
                {(app) => (
                  <div
                    ref={(el) => layers.set(app.id, el)}
                    class="ph-layer"
                    classList={{ 'is-open': openApp() === app.id, 'is-native': !app.url }}
                  >
                    <Show
                      when={app.url}
                      fallback={
                        <>
                          <Show when={!landscape() || device().cutout === 'none'}>
                            <StatusBar light />
                          </Show>
                          <Show when={app.id === 'clock'} fallback={<SettingsApp />}>
                            <ClockApp />
                          </Show>
                        </>
                      }
                    >
                      <iframe
                        ref={(el) => frames.set(app.id, el)}
                        src={app.url}
                        title={app.name}
                        onLoad={(e) => {
                          post(e.currentTarget)
                          try {
                            e.currentTarget.contentDocument?.documentElement.toggleAttribute('data-si-show-safe', showSafe())
                          } catch {
                            return
                          }
                        }}
                      />
                      <Show when={!landscape() || device().cutout === 'none'}>
                        <StatusBar light={app.id !== 'meridian'} />
                      </Show>
                    </Show>
                  </div>
                )}
              </For>

              <Show when={showSafe()}>
                <div class="ph-safe" />
              </Show>

              <Show when={device().cutout === 'island'}>
                <div class="ph-island" />
              </Show>
              <Show when={device().cutout === 'hole'}>
                <div class="ph-hole" />
              </Show>
              <Show when={!device().homeButton}>
                <button class="ph-indicator" aria-label="Go home" onClick={goHome} classList={{ 'is-dark': openApp() === 'meridian' }} />
              </Show>
            </div>
            <Show when={device().homeButton}>
              <button class="ph-home-button" aria-label="Home button" onClick={goHome} />
            </Show>
          </div>
        </div>
      </div>
    </Window>
  )
}
