import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { setSandboxStatus } from '../../desktop/store'

export type Tool = 'select' | 'hand' | 'note' | 'rect' | 'ellipse' | 'text' | 'pen'
export type Kind = 'note' | 'rect' | 'ellipse' | 'text' | 'path'

export interface Item {
  id: number
  kind: Kind
  x: number
  y: number
  w: number
  h: number
  color: string
  text: string
  points?: [number, number][]
  by: 'you' | 'si'
  fresh?: boolean
}

export interface Camera {
  x: number
  y: number
  z: number
}

export const NOTE_COLORS = ['#ffe27a', '#ffb3c7', '#a8d8ff', '#b8f0b0', '#d8c2ff']
export const INK_COLORS = ['#f2f2f7', '#ff7ab0', '#8b7bff', '#30d158', '#ffd60a']
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

let ids = 0

const item = (part: Partial<Item> & Pick<Item, 'kind' | 'x' | 'y' | 'w' | 'h'>): Item => ({
  id: ++ids,
  color: NOTE_COLORS[0],
  text: '',
  by: 'you',
  ...part,
})

const [items, setItems] = createStore<Item[]>([
  item({ kind: 'text', x: 0, y: -40, w: 560, h: 56, color: INK_COLORS[0], text: 'SI OS — how should agents show their work?' }),
  item({ kind: 'rect', x: -30, y: 40, w: 640, h: 300, color: INK_COLORS[2], text: 'Visibility' }),
  item({ kind: 'note', x: 10, y: 90, w: 180, h: 140, color: NOTE_COLORS[0], text: 'Live thumbnails in the strip' }),
  item({ kind: 'note', x: 210, y: 110, w: 180, h: 140, color: NOTE_COLORS[2], text: 'Status dot: working / waiting / idle' }),
  item({ kind: 'note', x: 410, y: 90, w: 180, h: 140, color: NOTE_COLORS[3], text: 'Every agent post is labelled' }),
  item({ kind: 'ellipse', x: 140, y: 420, w: 300, h: 150, color: INK_COLORS[1], text: 'Trust' }),
  item({
    kind: 'path',
    x: 290,
    y: 340,
    w: 0,
    h: 0,
    color: INK_COLORS[1],
    points: [
      [0, 0],
      [-8, 30],
      [-2, 62],
      [0, 80],
    ],
  }),
])

const [camera, setCamera] = createStore<Camera>({ x: 120, y: 140, z: 1 })
const [tool, setTool] = createSignal<Tool>('select')
const [selected, setSelected] = createSignal<number>()
const [flying, setFlying] = createSignal(false)
const [viewport, setViewport] = createSignal({ w: 1000, h: 700 })
const [insets, setInsets] = createSignal({ top: 52, right: 0, bottom: 64, left: 0 })
const [agentCursor, setAgentCursor] = createStore({ x: 0, y: 0, visible: false, label: 'Research' })

export {
  agentCursor,
  camera,
  flying,
  items,
  selected,
  setCamera,
  setInsets,
  setItems,
  setSelected,
  setTool,
  setViewport,
  tool,
  viewport,
}

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export function zoomAt(px: number, py: number, factor: number) {
  const z = clampZoom(camera.z * factor)
  const wx = (px - camera.x) / camera.z
  const wy = (py - camera.y) / camera.z
  setCamera({ z, x: px - wx * z, y: py - wy * z })
}

export function toWorld(px: number, py: number) {
  return { x: (px - camera.x) / camera.z, y: (py - camera.y) / camera.z }
}

export function addItem(part: Partial<Item> & Pick<Item, 'kind' | 'x' | 'y' | 'w' | 'h'>) {
  const next = item(part)
  setItems(items.length, next)
  return next.id
}

export function updateItem(id: number, fn: (item: Item) => void) {
  setItems((i) => i.id === id, produce(fn))
}

export function removeItem(id: number) {
  setItems((list) => list.filter((i) => i.id !== id))
  if (selected() === id) setSelected(undefined)
}

export function bounds(list: Item[] = items) {
  if (!list.length) return { x: 0, y: 0, w: 1, h: 1 }
  const xs = list.flatMap((i) => [i.x, i.x + i.w])
  const ys = list.flatMap((i) => [i.y, i.y + i.h])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function flyTo(box: { x: number; y: number; w: number; h: number }, padding = 80, maxZoom = 1.2) {
  const view = viewport()
  const safe = insets()
  const w = view.w - safe.left - safe.right
  const h = view.h - safe.top - safe.bottom
  const z = clampZoom(Math.min((w - padding * 2) / box.w, (h - padding * 2) / box.h, maxZoom))
  setFlying(true)
  setCamera({
    z,
    x: safe.left + w / 2 - (box.x + box.w / 2) * z,
    y: safe.top + h / 2 - (box.y + box.h / 2) * z,
  })
  setTimeout(() => setFlying(false), 650)
}

export function zoomToFit() {
  flyTo(bounds())
}

const IDEAS = [
  'Agents narrate before acting',
  'Undo for every agent action',
  'Ask before spending money',
  'Daily digest from SI',
  'Pause all agents button',
  'Show sources inline',
]

let brainstorming = false

export function brainstorm(topic: string) {
  if (brainstorming) return
  brainstorming = true
  setSandboxStatus('research', 'working', `Brainstorming ${topic}`)
  const box = bounds()
  const startX = box.x + box.w + 120
  const startY = box.y + 20
  const spots = IDEAS.map((_, i) => ({ x: startX + (i % 3) * 200, y: startY + Math.floor(i / 3) * 170 }))

  flyTo({ x: box.x, y: box.y, w: box.w + 760, h: Math.max(box.h, 420) })
  setAgentCursor({ x: startX - 60, y: startY - 60, visible: true })

  const added: number[] = []
  spots.forEach((spot, i) => {
    setTimeout(() => setAgentCursor({ x: spot.x + 150, y: spot.y + 110 }), 700 + i * 900)
    setTimeout(() => {
      added.push(
        addItem({
          kind: 'note',
          x: spot.x,
          y: spot.y,
          w: 180,
          h: 140,
          color: NOTE_COLORS[(i + 1) % NOTE_COLORS.length],
          text: IDEAS[i],
          by: 'si',
          fresh: true,
        }),
      )
    }, 1150 + i * 900)
  })

  setTimeout(() => {
    setAgentCursor('visible', false)
    setItems((i) => added.includes(i.id), 'fresh', false)
    setSandboxStatus('research', 'waiting', `${IDEAS.length} ideas on the canvas`)
    zoomToFit()
    brainstorming = false
  }, 1400 + IDEAS.length * 900)
}
