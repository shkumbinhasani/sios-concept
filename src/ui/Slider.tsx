import { createSignal } from 'solid-js'
import './Slider.css'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  onCommit?: (value: number) => void
  label: string
  class?: string
}

export function Slider(props: SliderProps) {
  const [dragging, setDragging] = createSignal(false)
  let track!: HTMLDivElement

  function valueAt(clientX: number) {
    const rect = track.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  }

  function start(event: PointerEvent) {
    if (event.button !== 0) return
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    setDragging(true)
    props.onChange(valueAt(event.clientX))

    const move = (e: PointerEvent) => props.onChange(valueAt(e.clientX))
    const end = (e: PointerEvent) => {
      setDragging(false)
      props.onCommit?.(valueAt(e.clientX))
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }

    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  function nudge(event: KeyboardEvent) {
    const delta = event.key === 'ArrowRight' ? 0.05 : event.key === 'ArrowLeft' ? -0.05 : 0
    if (!delta) return
    event.preventDefault()
    const next = Math.min(1, Math.max(0, props.value + delta))
    props.onChange(next)
    props.onCommit?.(next)
  }

  return (
    <div
      class={`slider ${props.class ?? ''}`}
      classList={{ 'is-dragging': dragging() }}
      role="slider"
      tabIndex={0}
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(props.value * 100)}
      onPointerDown={start}
      onKeyDown={nudge}
      data-no-drag
    >
      <div ref={track} class="slider-track">
        <div class="slider-fill" style={{ width: `${props.value * 100}%` }} />
      </div>
    </div>
  )
}
