import { createSignal, For, type JSX, Show } from 'solid-js'
import {
  closeWindow,
  BOTTOM_SPACE,
  focusedId,
  focusWindow,
  hoveredSandbox,
  isOnStage,
  MIN_HEIGHT,
  MIN_WIDTH,
  dropTarget,
  minimizeWindow,
  createSandbox,
  moveWindowTo,
  NEW_SANDBOX,
  setDraggingWindow,
  setDropTarget,
  setHoveredSandbox,
  type SandboxId,
  sandboxOf,
  setWindowRect,
  switching,
  thumbRect,
  windowLayer,
  safeArea,
  toggleFullscreen,
  toggleMaximize,
  windows,
  type Rect,
  type WindowId,
} from './store'
import { onRestoreFrom, pillId } from './LiveShelf'
import './Window.css'

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
const WIN_RADIUS = 26
const INTERACTIVE = 'button, input, a, select, textarea, [data-no-drag]'

interface WindowProps {
  id: WindowId
  title: string
  toolbar?: JSX.Element
  frameless?: boolean
  pillTitle?: boolean
  reveal?: boolean
  class?: string
  style?: JSX.CSSProperties
  children: JSX.Element
}

export function Window(props: WindowProps) {
  const win = () => windows[props.id]
  const focused = () => focusedId() === props.id
  const onStage = () => isOnStage(props.id)

  const placement = () => {
    const { x, y } = win()
    if (onStage()) {
      if (!switching()) return `translate(${x}px, ${y}px)`
      return `translate(${x}px, ${y}px) perspective(900px) rotateY(0deg) translate(0px, 0px) scale(1)`
    }
    const sandbox = sandboxOf(props.id)
    const thumb = thumbRect(sandbox)
    const tilt = hoveredSandbox() === sandbox ? 9 : 22
    const offsetX = (x - thumb.originX) * thumb.scale
    const offsetY = (y - thumb.originY) * thumb.scale
    return `translate(${thumb.x}px, ${thumb.y}px) perspective(900px) rotateY(${tilt}deg) translate(${offsetX}px, ${offsetY}px) scale(${thumb.scale})`
  }
  const [animating, setAnimating] = createSignal(false)
  const [carrying, setCarrying] = createSignal(false)
  let section!: HTMLElement
  let frame!: HTMLDivElement

  const EASE = 'cubic-bezier(0.25, 0.9, 0.2, 1)'
  const radiusFor = () => (win().fullscreen || win().maximized ? 0 : WIN_RADIUS)
  const inset = (outer: DOMRect, inner: { left: number; top: number; right: number; bottom: number }, r: number) =>
    `inset(${inner.top - outer.top}px ${outer.right - inner.right}px ${outer.bottom - inner.bottom}px ${inner.left - outer.left}px round ${r}px)`

  function reveal(change: () => void, target?: Rect) {
    const from = section.getBoundingClientRect()
    frame.getAnimations().forEach((a) => a.cancel())
    setAnimating(true)
    if (target) {
      const box = { left: target.x, top: target.y, right: target.x + target.w, bottom: target.y + target.h }
      const motion = frame.animate(
        [{ clipPath: inset(from, from, radiusFor()) }, { clipPath: inset(from, box, WIN_RADIUS) }],
        { duration: 340, easing: EASE, fill: 'forwards' },
      )
      motion.onfinish = () => {
        change()
        motion.cancel()
        setAnimating(false)
      }
      return
    }
    change()
    const to = section.getBoundingClientRect()
    const motion = frame.animate([{ clipPath: inset(to, from, WIN_RADIUS) }, { clipPath: inset(to, to, radiusFor()) }], {
      duration: 380,
      easing: EASE,
    })
    motion.onfinish = motion.oncancel = () => setAnimating(false)
  }

  function animate(change: () => void, shrinkTo?: Rect) {
    if (props.reveal) return reveal(change, shrinkTo)
    const from = section.getBoundingClientRect()
    setAnimating(true)
    change()
    const to = section.getBoundingClientRect()
    frame.getAnimations().forEach((a) => a.cancel())
    const motion = frame.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
          clipPath: `inset(0 round ${WIN_RADIUS}px)`,
        },
        { transform: 'none', clipPath: `inset(0 round ${win().fullscreen || win().maximized ? 0 : WIN_RADIUS}px)` },
      ],
      { duration: 380, easing: 'cubic-bezier(0.25, 0.9, 0.2, 1)' },
    )
    motion.onfinish = motion.oncancel = () => setAnimating(false)
  }

  function rectTransform(target: DOMRect, box: DOMRect) {
    return `translate(${target.left - box.left}px, ${target.top - box.top}px) scale(${target.width / box.width}, ${target.height / box.height})`
  }

  function minimize() {
    const from = section.getBoundingClientRect()
    minimizeWindow(props.id)
    requestAnimationFrame(() => {
      const pill = document.getElementById(pillId(props.id))?.getBoundingClientRect()
      if (!pill) return
      frame.getAnimations().forEach((a) => a.cancel())
      frame.style.transformOrigin = '0 0'
      const motion = frame.animate(
        [
          { transform: 'none', opacity: 1, clipPath: `inset(0 round ${WIN_RADIUS}px)` },
          { transform: rectTransform(pill, from), opacity: 0.2, clipPath: `inset(0 round ${(pill.height / 2) * (from.height / pill.height)}px)` },
        ],
        { duration: 420, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' },
      )
      motion.onfinish = () => {
        motion.cancel()
        frame.style.transformOrigin = ''
      }
    })
  }

  onRestoreFrom(props.id, (pill) => {
    frame.getAnimations().forEach((a) => a.cancel())
    const to = section.getBoundingClientRect()
    setAnimating(true)
    const motion = frame.animate(
      [
        { transform: rectTransform(pill, to), opacity: 0.2, clipPath: `inset(0 round ${(pill.height / 2) * (to.height / pill.height)}px)` },
        { transform: 'none', opacity: 1, clipPath: `inset(0 round ${radiusFor()}px)` },
      ],
      { duration: 460, easing: 'cubic-bezier(0.25, 0.9, 0.2, 1)' },
    )
    motion.onfinish = motion.oncancel = () => setAnimating(false)
  })

  function zoom() {
    if (win().fullscreen) return
    animate(() => toggleMaximize(props.id), win().maximized ? win().restore : undefined)
  }

  function fullscreen() {
    animate(() => toggleFullscreen(props.id), win().fullscreen ? win().windowed : undefined)
  }

  const safe = () => (win().fullscreen && onStage() ? safeArea() : { top: 0, right: 0, bottom: 0, left: 0 })

  function track(
    event: PointerEvent,
    onMove: (dx: number, dy: number, e: PointerEvent) => void,
    onEnd?: (e: PointerEvent) => void,
  ) {
    const target = event.currentTarget as HTMLElement
    const startX = event.clientX
    const startY = event.clientY
    target.setPointerCapture(event.pointerId)
    document.body.classList.add('is-interacting')

    const move = (e: PointerEvent) => onMove(e.clientX - startX, e.clientY - startY, e)
    const end = (e: PointerEvent) => {
      onEnd?.(e)
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
      document.body.classList.remove('is-interacting')
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  function startDrag(event: PointerEvent) {
    if (event.button !== 0 || win().fullscreen) return
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return
    event.preventDefault()

    const start: Rect = win().maximized && win().restore ? { ...win().restore! } : { ...win() }
    const grabRatio = (event.clientX - win().x) / win().w
    const wasMaximized = win().maximized
    if (wasMaximized) {
      start.x = event.clientX - start.w * grabRatio
      start.y = 0
    }

    const home: Rect = { x: win().x, y: win().y, w: win().w, h: win().h }
    setCarrying(true)
    let dragged = false

    track(
      event,
      (dx, dy, e) => {
        if (wasMaximized && Math.hypot(dx, dy) < 4) return
        if (!dragged && Math.hypot(dx, dy) > 4) {
          dragged = true
          setDraggingWindow(true)
        }
        const maxY = window.innerHeight - BOTTOM_SPACE - 40
        setWindowRect(props.id, {
          x: Math.min(Math.max(start.x + dx, 80 - start.w), window.innerWidth - 80),
          y: Math.min(Math.max(start.y + dy, 0), maxY),
          w: start.w,
          h: start.h,
        })
        const over = sandboxUnder(e.clientX, e.clientY)
        if (over !== dropTarget()) {
          setDropTarget(over)
          setHoveredSandbox(over)
        }
        if (over) {
          const box = frame.getBoundingClientRect()
          frame.style.transformOrigin = `${e.clientX - box.left}px ${e.clientY - box.top}px`
        }
      },
      () => {
        setCarrying(false)
        setDraggingWindow(false)
        const target = dropTarget()
        setDropTarget(undefined)
        setHoveredSandbox(undefined)
        if (!target) return
        setWindowRect(props.id, wasMaximized ? start : home)
        moveWindowTo(props.id, target === NEW_SANDBOX ? createSandbox() : target)
      },
    )
  }

  function sandboxUnder(x: number, y: number): SandboxId | undefined {
    const thumb = document.elementsFromPoint(x, y).find((el) => el.closest('[data-sandbox]'))
    const id = thumb?.closest<HTMLElement>('[data-sandbox]')?.dataset.sandbox as SandboxId | undefined
    return id && id !== sandboxOf(props.id) ? id : undefined
  }

  function startResize(edge: Edge, event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    focusWindow(props.id)
    const start: Rect = { x: win().x, y: win().y, w: win().w, h: win().h }

    track(event, (dx, dy) => {
      const next = { ...start }
      if (edge.includes('e')) next.w = Math.max(MIN_WIDTH, start.w + dx)
      if (edge.includes('s')) next.h = Math.max(MIN_HEIGHT, start.h + dy)
      if (edge.includes('w')) {
        next.w = Math.max(MIN_WIDTH, start.w - dx)
        next.x = start.x + start.w - next.w
      }
      if (edge.includes('n')) {
        const top = Math.max(0, start.y + dy)
        next.h = Math.max(MIN_HEIGHT, start.y + start.h - top)
        next.y = start.y + start.h - next.h
      }
      setWindowRect(props.id, next)
    })
  }

  const Lights = () => (
    <>
      <button class="win-light win-light-close" aria-label="Close" onClick={() => closeWindow(props.id)}>
        <svg viewBox="0 0 8 8">
          <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
        </svg>
      </button>
      <button class="win-light win-light-min" aria-label="Minimize" onClick={minimize}>
        <svg viewBox="0 0 8 8">
          <path d="M1.2 4h5.6" />
        </svg>
      </button>
      <button
        class="win-light win-light-zoom"
        aria-label={win().fullscreen ? 'Exit full screen' : 'Enter full screen'}
        onClick={fullscreen}
      >
        <svg viewBox="0 0 8 8">
          <path class="fill" d="M2 2h3L2 5zM6 6H3l3-3z" />
        </svg>
      </button>
    </>
  )

  return (
    <section
      ref={section}
      data-window={props.id}
      class={`win ${props.class ?? ''}`}
      classList={{
        'is-focused': focused(),
        'is-offstage': !onStage(),
        'is-hidden': !win().open || win().minimized,
        'is-minimized': win().minimized,
        'is-maximized': win().maximized,
        'is-fullscreen': !!win().fullscreen,
        'is-animating': animating(),
        'is-switching': switching(),
        'is-carried': onStage() && !!dropTarget() && carrying(),
      }}
      style={{
        ...props.style,
        transform: placement(),
        width: `${win().w}px`,
        height: `${win().h}px`,
        'z-index': windowLayer(props.id),
        '--safe-top': `${safe().top}px`,
        '--safe-right': `${safe().right}px`,
        '--safe-bottom': `${safe().bottom}px`,
        '--safe-left': `${safe().left}px`,
      }}
      onPointerDown={() => {
        if (document.activeElement instanceof HTMLIFrameElement) document.activeElement.blur()
        focusWindow(props.id)
      }}
    >
      <div
        ref={frame}
        class="win-frame"
        onPointerDown={(e) => {
          if (props.frameless && (e.target as HTMLElement).closest('[data-drag]')) startDrag(e)
        }}
        onDblClick={(e) => {
          const target = e.target as HTMLElement
          if (props.frameless && target.closest('[data-drag]') && !target.closest(INTERACTIVE)) zoom()
        }}
      >
        <Show
          when={!props.frameless}
          fallback={
            <>
              <Show when={props.pillTitle}>
                <div class="win-pillbar" data-drag>
                  <div class="win-pill-title glass-pill">{props.title}</div>
                </div>
              </Show>
              <div class="win-lights win-lights-floating">
                <Lights />
              </div>
            </>
          }
        >
          <header
            class="win-titlebar"
            onPointerDown={startDrag}
            onDblClick={(e) => {
              if (!(e.target as HTMLElement).closest(INTERACTIVE)) zoom()
            }}
          >
            <div class="win-lights">
              <Lights />
            </div>
            <Show when={props.toolbar} fallback={<div class="win-title">{props.title}</div>}>
              {props.toolbar}
            </Show>
          </header>
        </Show>
        <div class="win-body">{props.children}</div>
      </div>
      <Show when={!win().maximized && !win().fullscreen && onStage()}>
        <For each={EDGES}>
          {(edge) => <div class={`win-edge win-edge-${edge}`} onPointerDown={(e) => startResize(edge, e)} />}
        </For>
      </Show>
    </section>
  )
}
