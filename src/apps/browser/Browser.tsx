import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { safeArea, windows } from '../../desktop/store'
import { Window } from '../../desktop/Window'
import { ChevronLeft, ChevronRight, Close, Plus, Reload, Sparkles } from '../../ui/icons'
import { faviconOf, hostOf, SITES, titleOf, toUrl } from './sites'
import { StartPage } from './StartPage'
import {
  activeId,
  activeTab,
  closeTab,
  editing,
  go,
  isStart,
  newTab,
  overview,
  pageHost,
  pageTitle,
  registerFrame,
  reload,
  select,
  setEditing,
  setLoaded,
  setOverview,
  setPageInsets,
  step,
  tabs,
  urlOf,
} from './state'
import './Browser.css'

const GRID_PADDING = 40
const GRID_TOP = 72
const GRID_GAP = 28
const LABEL_SPACE = 34
const TOOLBAR_SPACE = 52

export function Browser() {
  const [area, setArea] = createSignal({ w: 1000, h: 700 })
  let pages!: HTMLDivElement

  onMount(() => {
    const observer = new ResizeObserver(([entry]) =>
      setArea({ w: entry.contentRect.width, h: entry.contentRect.height }),
    )
    observer.observe(pages)
    onCleanup(() => observer.disconnect())
  })

  const insets = () => (windows.browser.fullscreen ? safeArea() : { top: 0, right: 0, bottom: 0, left: 0 })

  createEffect(() => {
    const safe = insets()
    setPageInsets({ top: safe.top + TOOLBAR_SPACE, right: safe.right, bottom: safe.bottom, left: safe.left })
  })

  const columns = () => (tabs.length + 1 <= 4 ? 2 : 3)

  function cell(index: number) {
    const { w, h } = area()
    const safe = insets()
    const cols = columns()
    const rows = Math.ceil((tabs.length + 1) / cols)
    const usableW = w - safe.left - safe.right - GRID_PADDING * 2
    const usableH = h - safe.top - safe.bottom - GRID_TOP - GRID_PADDING
    const byWidth = (usableW - GRID_GAP * (cols - 1)) / cols / w
    const byHeight = (usableH - (GRID_GAP + LABEL_SPACE) * rows) / rows / h
    const scale = Math.max(0.1, Math.min(byWidth, byHeight))
    const cardW = w * scale
    const cardH = h * scale
    const gridW = cardW * cols + GRID_GAP * (cols - 1)
    const col = index % cols
    const row = Math.floor(index / cols)
    return {
      x: safe.left + GRID_PADDING + (usableW - gridW) / 2 + col * (cardW + GRID_GAP),
      y: safe.top + GRID_TOP + row * (cardH + GRID_GAP + LABEL_SPACE),
      w: cardW,
      h: cardH,
      scale,
    }
  }

  const page = () => activeTab()
  const url = () => urlOf(page())

  const [draft, setDraft] = createSignal('')
  let field: HTMLInputElement | undefined

  createEffect(() => {
    if (!editing()) return
    setDraft(isStart(url()) ? '' : url())
    queueMicrotask(() => {
      field?.focus()
      field?.select()
    })
  })

  const suggestions = () => {
    const query = draft().trim().toLowerCase()
    const open = tabs.map((t) => urlOf(t)).filter((u) => !isStart(u)).map((u) => ({ name: titleOf(u), url: u }))
    const all = [...open, ...SITES].filter((s, i, list) => list.findIndex((o) => o.url === s.url) === i)
    if (!query || query === url().toLowerCase()) return all.slice(0, 6)
    return all
      .filter((s) => s.name.toLowerCase().includes(query) || hostOf(s.url).includes(query))
      .slice(0, 6)
  }

  function navigate(target: string) {
    go(target)
    setEditing(false)
  }

  return (
    <Window id="browser" title="Browser" class="web" frameless>
      <div ref={pages} class="web-pages" classList={{ 'is-overview': overview() }}>
        <For each={tabs}>
          {(tab, index) => {
            const isActive = () => tab.id === activeId()
            const place = () => {
              if (!overview() && isActive()) return 'translate(0px, 0px) scale(1)'
              const c = cell(index())
              return `translate(${c.x}px, ${c.y}px) scale(${c.scale})`
            }
            return (
              <div
                class="web-page"
                classList={{ 'is-active': isActive(), 'is-start': isStart(urlOf(tab)), 'is-aware': tab.aware }}
                style={{ transform: place() }}
                onClick={() => overview() && select(tab.id)}
              >
                <Show
                  when={!isStart(urlOf(tab))}
                  fallback={<StartPage />}
                >
                  <iframe
                    ref={(el) => registerFrame(tab.id, el)}
                    class="web-frame"
                    src={urlOf(tab)}
                    title={pageTitle(urlOf(tab))}
                    onLoad={() => setLoaded(tab.id)}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                </Show>
              </div>
            )
          }}
        </For>

        <Show when={overview()}>
          <For each={tabs}>
            {(tab, index) => {
              const c = () => cell(index())
              return (
                <div class="web-card-label" style={{ left: `${c().x}px`, top: `${c().y + c().h + 10}px`, width: `${c().w}px` }}>
                  <Show when={!isStart(urlOf(tab))}>
                    <img src={faviconOf(urlOf(tab))} alt="" width="14" height="14" />
                  </Show>
                  <span class="web-card-title">{pageTitle(urlOf(tab))}</span>
                  <Show when={tab.openedBySI}>
                    <span class="web-card-si" title="Opened by SI">
                      <Sparkles width="11" height="11" />
                    </span>
                  </Show>
                  <button class="web-card-close" aria-label="Close tab" onClick={() => closeTab(tab.id)}>
                    <Close width="11" height="11" />
                  </button>
                </div>
              )
            }}
          </For>
          <button
            class="web-card-new"
            style={{
              left: `${cell(tabs.length).x}px`,
              top: `${cell(tabs.length).y}px`,
              width: `${cell(tabs.length).w}px`,
              height: `${cell(tabs.length).h}px`,
            }}
            onClick={newTab}
          >
            <Plus width="22" height="22" />
            New tab
          </button>
        </Show>
      </div>

      <div class="web-progress" classList={{ 'is-loading': page().loading && !overview() }} />

      <div class="web-top" data-drag>
        <Show
          when={!overview()}
          fallback={
            <div class="web-capsule web-capsule-overview">
              <span>
                {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
              </span>
            </div>
          }
        >
          <div class="web-capsule">
            <button class="web-btn" aria-label="Back" disabled={page().index === 0} onClick={() => step(-1)}>
              <ChevronLeft width="15" height="15" />
            </button>
            <button
              class="web-btn"
              aria-label="Forward"
              disabled={page().index === page().history.length - 1}
              onClick={() => step(1)}
            >
              <ChevronRight width="15" height="15" />
            </button>
            <Show
              when={editing()}
              fallback={
                <button class="web-site" onClick={() => setEditing(true)}>
                  <Show when={!isStart(url())} fallback={<Sparkles width="13" height="13" />}>
                    <img src={faviconOf(url())} alt="" width="14" height="14" />
                  </Show>
                  <span>{isStart(url()) ? 'Search or enter address' : pageHost(url())}</span>
                </button>
              }
            >
              <form
                class="web-address"
                onSubmit={(e) => {
                  e.preventDefault()
                  const query = draft().trim()
                  if (!query) return
                  const lower = query.toLowerCase()
                  const match = suggestions().find(
                    (site) => site.name.toLowerCase().startsWith(lower) || hostOf(site.url).startsWith(lower),
                  )
                  navigate(match && !query.includes('/') ? match.url : toUrl(query))
                }}
              >
                <input
                  ref={field}
                  value={draft()}
                  spellcheck={false}
                  autocomplete="off"
                  placeholder="Search or enter address"
                  onInput={(e) => setDraft(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
                  onBlur={() => setEditing(false)}
                />
              </form>
            </Show>
            <button class="web-btn" aria-label="Reload" disabled={isStart(url())} onClick={reload}>
              <Reload width="13" height="13" />
            </button>
          </div>
          <Show when={editing()}>
            <div class="web-suggest">
              <For each={suggestions()}>
                {(site) => (
                  <button class="web-suggest-item" onPointerDown={(e) => e.preventDefault()} onClick={() => navigate(site.url)}>
                    <img src={faviconOf(site.url)} alt="" width="16" height="16" />
                    <span class="web-suggest-name">{site.name}</span>
                    <span class="web-suggest-host">{hostOf(site.url)}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>

        <button
          class="web-tabs-btn"
          classList={{ 'is-on': overview() }}
          aria-label={overview() ? 'Done' : 'Show tabs'}
          onClick={() => setOverview((v) => !v)}
        >
          <Show when={!overview()} fallback="Done">
            <span class="web-tabs-count">{tabs.length}</span>
          </Show>
        </button>
      </div>
    </Window>
  )
}
