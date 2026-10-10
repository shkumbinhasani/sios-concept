import { createEffect, createSignal, For, type JSX, on, onCleanup, onMount, Show } from 'solid-js'
import { focusedId, safeArea, windows } from '../../desktop/store'
import { Window } from '../../desktop/Window'
import { Sparkles } from '../../ui/icons'
import {
  addItem,
  agentCursor,
  camera,
  flying,
  INK_COLORS,
  items,
  NOTE_COLORS,
  removeItem,
  selected,
  setCamera,
  setInsets,
  setSelected,
  setTool,
  setViewport,
  toWorld,
  tool,
  updateItem,
  zoomAt,
  zoomToFit,
  type Item,
  type Tool,
} from './state'
import './Canvas.css'

const TOOLS: { id: Tool; label: string; key: string; icon: JSX.Element }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: <path d="M5 3l14 8-6 1.5L10 19z" /> },
  { id: 'hand', label: 'Hand', key: 'H', icon: <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-5.5a1.5 1.5 0 0 1 3 0V11m0-4a1.5 1.5 0 0 1 3 0v6c0 4-2.5 7-6.5 7S5 18 4 15.5l-1-2.5a1.5 1.5 0 0 1 2.7-1.2L8 15" /> },
  { id: 'note', label: 'Sticky note', key: 'N', icon: <path d="M4 4h16v11l-5 5H4zM15 20v-5h5" /> },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: <rect x="4" y="5" width="16" height="14" rx="2" /> },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: <ellipse cx="12" cy="12" rx="8.5" ry="7" /> },
  { id: 'text', label: 'Text', key: 'T', icon: <path d="M5 6V4h14v2M12 4v16M9 20h6" /> },
  { id: 'pen', label: 'Pen', key: 'P', icon: <path d="M4 20c3-1 4-4 7-7l6-6a2 2 0 0 0-3-3l-6 6c-3 3-6 4-7 7zM14 6l4 4" /> },
]

const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  note: { w: 180, h: 140 },
  rect: { w: 220, h: 140 },
  ellipse: { w: 200, h: 140 },
  text: { w: 260, h: 44 },
}

const pathData = (points: [number, number][]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

export function Canvas() {
  const [editing, setEditing] = createSignal<number>()
  const [spaceHeld, setSpaceHeld] = createSignal(false)
  const [panning, setPanning] = createSignal(false)
  let view!: HTMLDivElement

  const local = (e: { clientX: number; clientY: number }) => {
    const r = view.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  createEffect(() => {
    const safe = windows.canvas.fullscreen ? safeArea() : { top: 0, right: 0, bottom: 0, left: 0 }
    const full = !!windows.canvas.fullscreen
    setInsets({ top: safe.top + 52, right: safe.right + (full ? 64 : 0), bottom: safe.bottom + (full ? 0 : 64), left: safe.left })
  })

  createEffect(
    on(
      () => [windows.canvas.x, windows.canvas.y, !!windows.canvas.fullscreen, windows.canvas.maximized] as const,
      (now, before) => {
        if (!before || (now[2] === before[2] && now[3] === before[3])) return
        setCamera({ x: camera.x + before[0] - now[0], y: camera.y + before[1] - now[1] })
      },
    ),
  )

  const effectiveTool = () => (spaceHeld() ? 'hand' : tool())
  const selectedItem = () => items.find((i) => i.id === selected())

  function track(e: PointerEvent, onMove: (e: PointerEvent) => void, onUp?: (e: PointerEvent) => void) {
    view.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => onMove(ev)
    const up = (ev: PointerEvent) => {
      view.removeEventListener('pointermove', move)
      view.removeEventListener('pointerup', up)
      view.removeEventListener('pointercancel', up)
      onUp?.(ev)
    }
    view.addEventListener('pointermove', move)
    view.addEventListener('pointerup', up)
    view.addEventListener('pointercancel', up)
  }

  function pan(e: PointerEvent) {
    const start = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }
    setPanning(true)
    track(
      e,
      (ev) => setCamera({ x: start.cx + ev.clientX - start.x, y: start.cy + ev.clientY - start.y }),
      () => setPanning(false),
    )
  }

  function move(e: PointerEvent, target: Item) {
    const start = { x: e.clientX, y: e.clientY, ix: target.x, iy: target.y }
    track(e, (ev) =>
      updateItem(target.id, (it) => {
        it.x = start.ix + (ev.clientX - start.x) / camera.z
        it.y = start.iy + (ev.clientY - start.y) / camera.z
      }),
    )
  }

  function resize(e: PointerEvent, target: Item) {
    const start = { x: e.clientX, y: e.clientY, w: target.w, h: target.h }
    track(e, (ev) =>
      updateItem(target.id, (it) => {
        it.w = Math.max(40, start.w + (ev.clientX - start.x) / camera.z)
        it.h = Math.max(30, start.h + (ev.clientY - start.y) / camera.z)
      }),
    )
  }

  function create(e: PointerEvent, kind: 'note' | 'rect' | 'ellipse' | 'text') {
    const p = toWorld(local(e).x, local(e).y)
    const size = DEFAULT_SIZE[kind]
    const color = kind === 'note' ? NOTE_COLORS[items.length % NOTE_COLORS.length] : INK_COLORS[kind === 'text' ? 0 : 2]
    if (kind === 'note' || kind === 'text') {
      const id = addItem({ kind, x: p.x - size.w / 2, y: p.y - size.h / 2, ...size, color })
      setSelected(id)
      setTool('select')
      setEditing(id)
      return
    }
    const id = addItem({ kind, x: p.x, y: p.y, w: 0, h: 0, color })
    setSelected(id)
    track(
      e,
      (ev) => {
        const q = toWorld(local(ev).x, local(ev).y)
        updateItem(id, (it) => {
          it.x = Math.min(p.x, q.x)
          it.y = Math.min(p.y, q.y)
          it.w = Math.abs(q.x - p.x)
          it.h = Math.abs(q.y - p.y)
        })
      },
      () => {
        updateItem(id, (it) => {
          if (it.w < 12 && it.h < 12) Object.assign(it, { x: p.x - size.w / 2, y: p.y - size.h / 2, ...size })
        })
        setTool('select')
      },
    )
  }

  function draw(e: PointerEvent) {
    const p = toWorld(local(e).x, local(e).y)
    const id = addItem({ kind: 'path', x: p.x, y: p.y, w: 0, h: 0, color: INK_COLORS[1], points: [[0, 0]] })
    track(
      e,
      (ev) => {
        const q = toWorld(local(ev).x, local(ev).y)
        updateItem(id, (it) => it.points!.push([q.x - it.x, q.y - it.y]))
      },
      () =>
        updateItem(id, (it) => {
          const xs = it.points!.map(([x]) => x)
          const ys = it.points!.map(([, y]) => y)
          const minX = Math.min(...xs)
          const minY = Math.min(...ys)
          it.points = it.points!.map(([x, y]) => [x - minX, y - minY])
          it.x += minX
          it.y += minY
          it.w = Math.max(...xs) - minX
          it.h = Math.max(...ys) - minY
        }),
    )
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Element
    if (target.closest('textarea')) return
    e.preventDefault()
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const current = effectiveTool()
    if (e.button === 1 || current === 'hand') return pan(e)
    if (e.button !== 0) return
    if (current === 'select') {
      const id = Number(target.closest<Element>('[data-id]')?.getAttribute('data-id'))
      const hit = items.find((i) => i.id === id)
      if (!hit) {
        setSelected(undefined)
        setEditing(undefined)
        return pan(e)
      }
      if (editing() !== hit.id) setEditing(undefined)
      setSelected(hit.id)
      if (target.closest('.cv-handle')) return resize(e, hit)
      return move(e, hit)
    }
    if (current === 'pen') return draw(e)
    create(e, current)
  }

  function onDblClick(e: MouseEvent) {
    const target = e.target as Element
    const id = Number(target.closest<Element>('[data-id]')?.getAttribute('data-id'))
    const hit = items.find((i) => i.id === id)
    if (hit && hit.kind !== 'path') {
      setSelected(hit.id)
      setEditing(hit.id)
      return
    }
    if (!hit) {
      const p = toWorld(local(e).x, local(e).y)
      const nid = addItem({ kind: 'text', x: p.x - 130, y: p.y - 22, ...DEFAULT_SIZE.text, color: INK_COLORS[0] })
      setSelected(nid)
      setEditing(nid)
    }
  }

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => setViewport({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(view)

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = local(e)
      if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, Math.exp(-Math.max(-40, Math.min(40, e.deltaY)) * 0.01))
      else setCamera({ x: camera.x - e.deltaX, y: camera.y - e.deltaY })
    }
    view.addEventListener('wheel', onWheel, { passive: false })

    const typing = (e: KeyboardEvent) => (e.target as HTMLElement).closest('input, textarea, [contenteditable]')
    const onKey = (e: KeyboardEvent) => {
      if (focusedId() !== 'canvas' || typing(e)) return
      if (e.key === ' ') {
        e.preventDefault()
        setSpaceHeld(true)
        return
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selected()) return removeItem(selected()!)
      if (e.key === 'Escape') return setSelected(undefined)
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        return zoomToFit()
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const next = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase())
      if (next) setTool(next.id)
    }
    const onKeyUp = (e: KeyboardEvent) => e.key === ' ' && setSpaceHeld(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)

    requestAnimationFrame(() => zoomToFit())

    onCleanup(() => {
      observer.disconnect()
      view.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKeyUp)
    })
  })

  const gridStep = () => {
    let step = 24 * camera.z
    while (step < 12) step *= 4
    return step
  }

  function zoomBy(factor: number) {
    const r = view.getBoundingClientRect()
    zoomAt(r.width / 2, r.height / 2, factor)
  }

  function recolor(color: string) {
    const id = selected()
    if (id) updateItem(id, (it) => (it.color = color))
  }

  return (
    <Window id="canvas" title="Canvas — Agents brainstorm" class="cv" frameless pillTitle reveal>
      <div
        ref={view}
        class={`cv-view tool-${effectiveTool()}`}
        classList={{ 'is-panning': panning() }}
        style={{
          '--z': camera.z,
          'background-size': `${gridStep()}px ${gridStep()}px`,
          'background-position': `${camera.x}px ${camera.y}px`,
        }}
        onPointerDown={onPointerDown}
        onDblClick={onDblClick}
      >
        <div
          class="cv-world"
          classList={{ 'is-flying': flying() }}
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})` }}
        >
          <svg class="cv-ink">
            <For each={items.filter((i) => i.kind === 'path')}>
              {(it) => (
                <g transform={`translate(${it.x} ${it.y})`} data-id={it.id}>
                  <path class="cv-ink-hit" d={pathData(it.points!)} />
                  <path
                    class="cv-ink-line"
                    classList={{ 'is-selected': selected() === it.id }}
                    d={pathData(it.points!)}
                    stroke={it.color}
                  />
                </g>
              )}
            </For>
          </svg>

          <For each={items.filter((i) => i.kind !== 'path')}>
            {(it) => (
              <div
                data-id={it.id}
                class={`cv-item cv-${it.kind}`}
                classList={{ 'is-fresh': !!it.fresh, 'is-si': it.by === 'si' }}
                style={{
                  left: `${it.x}px`,
                  top: `${it.y}px`,
                  width: `${it.w}px`,
                  height: `${it.h}px`,
                  '--c': it.color,
                }}
              >
                <Show
                  when={editing() === it.id}
                  fallback={<div class="cv-text-body">{it.text || (it.kind === 'text' ? 'Text' : '')}</div>}
                >
                  <textarea
                    ref={(el) => queueMicrotask(() => el.focus())}
                    class="cv-edit"
                    value={it.text}
                    onInput={(e) => updateItem(it.id, (x) => (x.text = e.currentTarget.value))}
                    onBlur={() => setEditing(undefined)}
                    onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
                  />
                </Show>
                <Show when={it.by === 'si' && it.kind === 'note'}>
                  <span class="cv-si-badge">
                    <Sparkles width="10" height="10" />
                  </span>
                </Show>
              </div>
            )}
          </For>

          <Show when={selectedItem()}>
            {(it) => (
              <div
                class="cv-selection"
                style={{ left: `${it().x}px`, top: `${it().y}px`, width: `${it().w}px`, height: `${it().h}px` }}
              >
                <Show when={it().kind !== 'path'}>
                  <div class="cv-handle" data-id={it().id} />
                </Show>
              </div>
            )}
          </Show>

          <div
            class="cv-agent"
            classList={{ 'is-visible': agentCursor.visible }}
            style={{ left: `${agentCursor.x}px`, top: `${agentCursor.y}px` }}
          >
            <div class="cv-agent-inner">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M4 3l15 8.5-6.5 1.6L9.5 20z" fill="#b48cff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
              <span>{agentCursor.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cv-zoom glass-pill">
        <button aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
          −
        </button>
        <button class="cv-zoom-value" aria-label="Zoom to fit" onClick={zoomToFit}>
          {Math.round(camera.z * 100)}%
        </button>
        <button aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
          +
        </button>
      </div>

      <div class="cv-dock">
        <Show when={selectedItem() && selectedItem()!.kind !== 'text'}>
          <div class="cv-colors glass-pill">
            <For each={selectedItem()!.kind === 'note' ? NOTE_COLORS : INK_COLORS}>
              {(color) => (
                <button
                  class="cv-swatch"
                  classList={{ 'is-on': selectedItem()?.color === color }}
                  style={{ background: color }}
                  aria-label="Colour"
                  onClick={() => recolor(color)}
                />
              )}
            </For>
          </div>
        </Show>
        <div class="cv-tools glass-pill">
          <For each={TOOLS}>
            {(t) => (
              <button
                class="cv-tool"
                classList={{ 'is-on': effectiveTool() === t.id }}
                title={`${t.label} (${t.key})`}
                aria-label={t.label}
                onClick={() => setTool(t.id)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  {t.icon}
                </svg>
              </button>
            )}
          </For>
        </div>
      </div>
    </Window>
  )
}
