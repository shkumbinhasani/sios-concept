import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { focusWindow, openWindow, switchSandbox } from '../../desktop/store'
import { HOME, hostOf, START_TABS, titleOf } from './sites'

export const START_URL = 'si://start'

export interface Tab {
  id: number
  history: string[]
  index: number
  loading: boolean
  openedBySI: boolean
  aware: boolean
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

let ids = 0

const makeTab = (url: string, openedBySI = false): Tab => ({
  id: ++ids,
  history: [url],
  index: 0,
  loading: url !== START_URL,
  openedBySI,
  aware: false,
})

const [tabs, setTabs] = createStore<Tab[]>(START_TABS.map((url) => makeTab(url)))
const [activeId, setActiveId] = createSignal(tabs[0].id)
const [overview, setOverview] = createSignal(false)
const [editing, setEditing] = createSignal(false)
const frames = new Map<number, HTMLIFrameElement>()
let insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

function postInsets(id: number) {
  frames.get(id)?.contentWindow?.postMessage({ type: 'si:safe-area', insets }, '*')
}

export function setPageInsets(next: Insets) {
  insets = next
  for (const tab of tabs) if (tab.aware) postInsets(tab.id)
}

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'si:hello') return
  for (const [id, frame] of frames) {
    if (frame.contentWindow !== event.source) continue
    setTabs((t) => t.id === id, 'aware', true)
    postInsets(id)
  }
})

export { activeId, editing, overview, setEditing, setOverview, tabs }

export const urlOf = (tab: Tab) => tab.history[tab.index]
export const isStart = (url: string) => url === START_URL
export const pageTitle = (url: string) => (isStart(url) ? 'Start' : titleOf(url))
export const pageHost = (url: string) => (isStart(url) ? '' : hostOf(url))

export function activeTab() {
  return tabs.find((t) => t.id === activeId()) ?? tabs[0]
}

export function registerFrame(id: number, frame: HTMLIFrameElement) {
  frames.set(id, frame)
}

function updateActive(fn: (tab: Tab) => void) {
  setTabs((t) => t.id === activeId(), produce(fn))
}

export function go(url: string) {
  updateActive((tab) => {
    tab.history = [...tab.history.slice(0, tab.index + 1), url]
    tab.index = tab.history.length - 1
    tab.loading = !isStart(url)
    tab.aware = false
  })
}

export function step(delta: number) {
  updateActive((tab) => {
    tab.index = Math.min(tab.history.length - 1, Math.max(0, tab.index + delta))
    tab.loading = !isStart(urlOf(tab))
    tab.aware = false
  })
}

export function reload() {
  const tab = activeTab()
  const frame = frames.get(tab.id)
  if (!frame || isStart(urlOf(tab))) return
  updateActive((t) => {
    t.loading = true
    t.aware = false
  })
  frame.src = urlOf(tab)
}

export function select(id: number) {
  setActiveId(id)
  setOverview(false)
}

export function newTab() {
  const tab = makeTab(START_URL)
  setTabs(tabs.length, tab)
  select(tab.id)
  setEditing(true)
}

export function closeTab(id: number) {
  frames.delete(id)
  if (tabs.length === 1) {
    const tab = makeTab(START_URL)
    setTabs([tab])
    setActiveId(tab.id)
    return
  }
  const index = tabs.findIndex((t) => t.id === id)
  const next = tabs[index + 1] ?? tabs[index - 1]
  setTabs((list) => list.filter((t) => t.id !== id))
  if (id === activeId()) setActiveId(next.id)
}

export function setLoaded(id: number) {
  setTabs((t) => t.id === id, 'loading', false)
}

export function openPage(url: string, by: 'you' | 'si' = 'you') {
  const existing = tabs.find((t) => urlOf(t) === url)
  if (existing) {
    select(existing.id)
  } else if (isStart(urlOf(activeTab()))) {
    go(url)
    updateActive((tab) => (tab.openedBySI = by === 'si'))
  } else {
    const tab = makeTab(url, by === 'si')
    setTabs(tabs.length, tab)
    select(tab.id)
  }
  setOverview(false)
}

export function showBrowser() {
  switchSandbox('personal')
  openWindow('browser')
  focusWindow('browser')
}

export function currentPage() {
  const url = urlOf(activeTab())
  return { url, title: pageTitle(url), host: pageHost(url) }
}

export { HOME }
