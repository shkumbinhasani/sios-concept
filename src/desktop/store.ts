import { createMemo, createRoot, createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

export type WindowId = 'browser' | 'music' | 'messages' | 'notes' | 'canvas' | 'terminal' | 'monitor' | 'simulator'
export type SandboxId = string
export type SandboxKind = 'local' | 'agent' | 'remote'
export type SandboxStatus = 'idle' | 'working' | 'waiting'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface WindowState extends Rect {
  z: number
  open: boolean
  minimized: boolean
  maximized: boolean
  fullscreen?: boolean
  minimizedAt?: number
  moved?: boolean
  restore?: Rect
  windowed?: Rect
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Sandbox {
  id: SandboxId
  name: string
  kind: SandboxKind
  host: string
  status: SandboxStatus
  activity: string
  windows: WindowId[]
  tint?: number
}

export const BOTTOM_SPACE = 96
export const THUMB_LEFT = 28
export const SWITCH_DURATION = 560
export const MIN_WIDTH = 320
export const MIN_HEIGHT = 240

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const [viewport, setViewport] = createSignal({ w: window.innerWidth, h: window.innerHeight })

export function thumbWidth() {
  return Math.round(clamp(viewport().w * 0.105, 150, 260))
}

export function stage() {
  const left = THUMB_LEFT + thumbWidth() + 36
  return { left, w: viewport().w - left, h: viewport().h - BOTTOM_SPACE }
}

function place(rect: Rect, z: number): WindowState {
  return { ...rect, x: Math.round(rect.x), y: Math.round(rect.y), z, open: true, minimized: false, maximized: false }
}

function defaultLayout(): Record<WindowId, Rect> {
  const { left, w: sw, h: sh } = stage()

  const browserW = clamp(sw * 0.7, 760, 1640)
  const browserH = clamp(sh * 0.84, 420, 1040)
  const musicW = clamp(sw * 0.2, 320, 400)
  const musicH = clamp(sh * 0.8, 520, 780)
  const personalW = browserW + musicW - 90
  const personalX = left + (sw - personalW) / 2

  const canvasW = clamp(sw * 0.66, 640, 1500)
  const canvasH = clamp(sh * 0.86, 420, 1040)
  const notesW = clamp(sw * 0.34, 420, 680)
  const notesH = clamp(sh * 0.74, 400, 900)
  const researchW = canvasW + notesW - 120
  const researchX = left + Math.max(16, (sw - researchW) / 2)

  const terminalW = clamp(sw * 0.5, 520, 1100)
  const terminalH = clamp(sh * 0.62, 340, 760)
  const monitorW = clamp(sw * 0.24, 340, 440)
  const monitorH = clamp(sh * 0.42, 300, 420)
  const buildW = terminalW + monitorW - 80
  const simH = clamp(sh * 0.9, 480, 960)
  const simW = clamp(simH * 0.62, 420, 620)
  const buildX = left + Math.max(16, (sw - (buildW + 24 + simW)) / 2)
  const simX = Math.min(buildX + buildW + 24, left + sw - simW - 16)
  const buildY = (sh - terminalH) / 2

  return {
    browser: { x: personalX, y: (sh - browserH) / 2, w: browserW, h: browserH },
    messages: {
      x: left + (sw - clamp(sw * 0.62, 760, 1180)) / 2,
      y: (sh - clamp(sh * 0.84, 460, 900)) / 2,
      w: clamp(sw * 0.62, 760, 1180),
      h: clamp(sh * 0.84, 460, 900),
    },
    music: { x: personalX + browserW - 90, y: (sh - musicH) / 2 + 28, w: musicW, h: musicH },
    canvas: { x: researchX + notesW - 120, y: (sh - canvasH) / 2, w: canvasW, h: canvasH },
    notes: { x: researchX, y: (sh - notesH) / 2 + 36, w: notesW, h: notesH },
    terminal: { x: buildX, y: buildY, w: terminalW, h: terminalH },
    simulator: { x: simX, y: (sh - simH) / 2, w: simW, h: simH },
    monitor: { x: buildX + terminalW - 80, y: buildY + terminalH * 0.28, w: monitorW, h: monitorH },
  }
}

const initial = defaultLayout()
const [windows, setWindows] = createStore<Record<WindowId, WindowState>>({
  browser: place(initial.browser, 1),
  music: place(initial.music, 2),
  messages: { ...place(initial.messages, 7), minimized: true, minimizedAt: 0 },
  notes: place(initial.notes, 3),
  canvas: place(initial.canvas, 4),
  terminal: place(initial.terminal, 5),
  monitor: place(initial.monitor, 6),
  simulator: place(initial.simulator, 8),
})

let lastStage = stage()

window.addEventListener('resize', () => {
  setViewport({ w: window.innerWidth, h: window.innerHeight })
  const next = stage()
  const sx = next.w / lastStage.w
  const sy = next.h / lastStage.h
  const from = lastStage
  const defaults = defaultLayout()
  setWindows(
    produce((all) => {
      for (const [id, win] of Object.entries(all) as [WindowId, WindowState][]) {
        if (win.fullscreen) {
          Object.assign(win, { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight })
          continue
        }
        if (win.maximized) {
          Object.assign(win, { x: next.left, y: 0, w: next.w, h: next.h })
          continue
        }
        if (!win.moved) {
          const rect = defaults[id]
          Object.assign(win, { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) })
          continue
        }
        win.x = Math.round(next.left + (win.x - from.left) * sx)
        win.y = Math.round(win.y * sy)
        win.w = Math.round(Math.max(MIN_WIDTH, win.w * sx))
        win.h = Math.round(Math.max(MIN_HEIGHT, win.h * sy))
      }
    }),
  )
  lastStage = next
})

const [sandboxes, setSandboxes] = createStore<Record<SandboxId, Sandbox>>({
  personal: {
    id: 'personal',
    name: 'Personal',
    kind: 'local',
    host: 'This Mac',
    status: 'idle',
    activity: 'Reading and music',
    windows: ['browser', 'music', 'messages'],
  },
  research: {
    id: 'research',
    name: 'Research',
    kind: 'agent',
    host: 'Sub-agent',
    status: 'idle',
    activity: 'Waiting for a task',
    windows: ['canvas', 'notes'],
  },
  build: {
    id: 'build',
    name: 'Build server',
    kind: 'remote',
    host: 'build-01.si',
    status: 'idle',
    activity: 'Last build passed',
    windows: ['terminal', 'monitor', 'simulator'],
  },
})

const [sandboxOrder, setSandboxOrder] = createSignal<SandboxId[]>(['personal', 'research', 'build'])

export const NEW_SANDBOX = '__new'

const [draggingWindow, setDraggingWindow] = createSignal(false)

export { draggingWindow, sandboxOrder, setDraggingWindow }

let sandboxCount = 0

export function createSandbox(name?: string, kind: SandboxKind = 'local') {
  const n = ++sandboxCount
  const id = `sandbox-${n}`
  setSandboxes(id, {
    id,
    name: name?.trim() || `Desktop ${n + 1}`,
    kind,
    host: kind === 'agent' ? 'Sub-agent' : kind === 'remote' ? 'Remote' : 'This Mac',
    status: 'idle',
    activity: 'Empty',
    windows: [],
    tint: (n - 1) % 5,
  })
  setSandboxOrder((list) => [...list, id])
  return id
}

const [activeSandbox, setActiveSandbox] = createSignal<SandboxId>('personal')
const [hoveredSandbox, setHoveredSandbox] = createSignal<SandboxId>()
const [switching, setSwitching] = createSignal(false)
const [dropTarget, setDropTarget] = createSignal<SandboxId>()
const [previousSandbox, setPreviousSandbox] = createSignal<SandboxId>()

let topZ = 8

export { dropTarget, setDropTarget }

export function moveWindowTo(id: WindowId, target: SandboxId) {
  const from = sandboxOf(id)
  if (from === target) return
  setSandboxes(from, 'windows', (list) => list.filter((w) => w !== id))
  setSandboxes(target, 'windows', (list) => [...list, id])
  setWindows(id, { minimized: false, z: ++topZ })
  pruneSandboxes()
}

function pruneSandboxes() {
  const doomed = sandboxOrder().filter(
    (id) => id !== activeSandbox() && sandboxes[id].windows.length === 0 && sandboxes[id].status === 'idle',
  )
  if (!doomed.length) return
  setSandboxOrder((list) => list.filter((id) => !doomed.includes(id)))
  setSandboxes(
    produce((all) => {
      for (const id of doomed) delete all[id]
    }),
  )
}

export { activeSandbox, hoveredSandbox, previousSandbox, sandboxes, setHoveredSandbox, switching, windows }

const LAYER = { stage: 1000, incoming: 40000, outgoing: 45000, strip: 50000 }

export function windowLayer(id: WindowId) {
  const z = windows[id].z
  const sandbox = sandboxOf(id)
  if (sandbox === activeSandbox()) return z + (switching() ? LAYER.incoming : LAYER.stage)
  if (switching() && sandbox === previousSandbox()) return z + LAYER.outgoing
  return z + LAYER.strip
}

export function offstageSandboxes() {
  return sandboxOrder().filter((id) => id !== activeSandbox())
}

function groupBounds(id: SandboxId): Rect {
  const shown = sandboxes[id].windows.filter(isVisible).map((w) => windows[w])
  if (!shown.length) {
    const { left, w, h } = stage()
    return { x: left, y: 0, w, h }
  }
  const x = Math.min(...shown.map((r) => r.x))
  const y = Math.min(...shown.map((r) => r.y))
  const right = Math.max(...shown.map((r) => r.x + r.w))
  const bottom = Math.max(...shown.map((r) => r.y + r.h))
  return { x, y, w: right - x, h: bottom - y }
}

const NEW_SLOT_BUTTON = 40

function stripLayout() {
  const width = thumbWidth()
  const list = offstageSandboxes()
  const slotH = draggingWindow() ? width * 0.56 : NEW_SLOT_BUTTON
  const measure = (fit: number) => {
    const maxHeight = width * 0.8 * fit
    const gap = clamp(width * 0.32, 52, 84) * fit
    const boxes = list.map((sandbox) => {
      const bounds = groupBounds(sandbox)
      const scale = Math.min((width * fit) / bounds.w, maxHeight / bounds.h)
      return { bounds, scale, w: bounds.w * scale, h: bounds.h * scale }
    })
    const total = boxes.reduce((sum, box) => sum + box.h + gap, 0) + slotH * Math.max(fit, 0.8)
    return { boxes, gap, total }
  }
  let layout = measure(1)
  const room = stage().h - 32
  if (layout.total > room) layout = measure(Math.max(0.45, room / layout.total))
  let y = (stage().h - layout.total) / 2
  const rects = new Map<SandboxId, ReturnType<typeof rectFor>>()
  function rectFor(box: (typeof layout.boxes)[number], top: number) {
    return { x: THUMB_LEFT, y: top, w: box.w, h: box.h, scale: box.scale, originX: box.bounds.x, originY: box.bounds.y }
  }
  list.forEach((id, i) => {
    const box = layout.boxes[i]
    rects.set(id, rectFor(box, y))
    y += box.h + layout.gap
  })
  const slot = { x: THUMB_LEFT, y, w: draggingWindow() ? width : NEW_SLOT_BUTTON, h: slotH }
  return { rects, slot }
}

export function thumbRect(id: SandboxId) {
  const layout = stripLayout()
  const rect = layout.rects.get(id)
  if (rect) return rect
  const width = thumbWidth()
  return { x: THUMB_LEFT, y: stage().h / 2, w: width, h: width * 0.6, scale: width / stage().w, originX: stage().left, originY: 0 }
}

export function newSlotRect() {
  return stripLayout().slot
}

export function sandboxOf(id: WindowId) {
  return sandboxOrder().find((s) => sandboxes[s].windows.includes(id))!
}

export function isOnStage(id: WindowId) {
  return sandboxOf(id) === activeSandbox()
}

export function isVisible(id: WindowId) {
  return windows[id].open && !windows[id].minimized
}

export const focusedId = createRoot(() =>
  createMemo<WindowId | undefined>(() => {
    let best: WindowId | undefined
    for (const id of sandboxes[activeSandbox()].windows) {
      if (!isVisible(id)) continue
      if (!best || windows[id].z > windows[best].z) best = id
    }
    return best
  }),
)

export function focusWindow(id: WindowId) {
  if (focusedId() === id && windows[id].z === topZ) return
  setWindows(id, 'z', ++topZ)
}

export function openWindow(id: WindowId) {
  setWindows(id, { open: true, minimized: false, z: ++topZ })
}

export function closeWindow(id: WindowId) {
  setWindows(id, { open: false, minimized: false })
}

let minimizedCount = 0

export function minimizeWindow(id: WindowId) {
  setWindows(id, { minimized: true, minimizedAt: ++minimizedCount })
}

export function minimizedIn(sandbox: SandboxId) {
  return sandboxes[sandbox].windows
    .filter((id) => windows[id].open && windows[id].minimized)
    .sort((a, b) => (windows[a].minimizedAt ?? 0) - (windows[b].minimizedAt ?? 0))
}

export function setWindowRect(id: WindowId, rect: Partial<Rect>) {
  setWindows(id, { ...rect, maximized: false, moved: true })
}

export function toggleMaximize(id: WindowId) {
  setWindows(
    id,
    produce((win) => {
      if (win.maximized && win.restore) {
        Object.assign(win, win.restore)
        win.maximized = false
        win.restore = undefined
        return
      }
      win.restore = { x: win.x, y: win.y, w: win.w, h: win.h }
      const { left, w, h } = stage()
      win.x = left
      win.y = 0
      win.w = w
      win.h = h
      win.maximized = true
    }),
  )
}

export const AGENT_SANDBOXES = ['research', 'build']

export function safeArea(): Insets {
  const top = AGENT_SANDBOXES.includes(activeSandbox()) ? 52 : 0
  return { top, right: 0, bottom: BOTTOM_SPACE, left: stage().left }
}

export function toggleFullscreen(id: WindowId) {
  setWindows(
    id,
    produce((win) => {
      if (win.fullscreen) {
        Object.assign(win, win.windowed ?? defaultLayout()[id])
        win.fullscreen = false
        win.windowed = undefined
        return
      }
      win.windowed = { x: win.x, y: win.y, w: win.w, h: win.h }
      Object.assign(win, { x: 0, y: 0, w: viewport().w, h: viewport().h, fullscreen: true })
    }),
  )
  focusWindow(id)
}

export function hasFullscreen(sandbox: SandboxId) {
  return sandboxes[sandbox].windows.some((id) => windows[id].fullscreen && isVisible(id))
}

export function setSandboxStatus(id: SandboxId, status: SandboxStatus, activity: string) {
  setSandboxes(id, { status, activity })
}

let switchTimer: ReturnType<typeof setTimeout> | undefined

export function switchSandbox(id: SandboxId) {
  if (id === activeSandbox()) return
  setSwitching(true)
  setHoveredSandbox(undefined)
  setPreviousSandbox(activeSandbox())
  setActiveSandbox(id)
  pruneSandboxes()
  clearTimeout(switchTimer)
  switchTimer = setTimeout(() => setSwitching(false), SWITCH_DURATION)
}
