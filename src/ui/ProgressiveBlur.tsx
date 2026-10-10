import { For, type JSX } from 'solid-js'
import './ProgressiveBlur.css'

const BLURS = [1, 2, 4, 8, 16, 32]

type Edge = 'bottom' | 'left' | 'top'

const towards = (edge: Edge) => (edge === 'left' ? 'to left' : edge === 'top' ? 'to top' : 'to bottom')
const across = (edge: Edge) => (edge === 'left' ? 'to bottom' : 'to right')

function edgeMask(index: number, edge: Edge) {
  const step = 100 / (BLURS.length + 1)
  const start = index * step
  const rise = (index + 1) * step
  const hold = (index + 2) * step
  const end = (index + 3) * step
  if (index >= BLURS.length - 2) return `linear-gradient(${towards(edge)}, transparent ${start}%, #000 ${rise}%)`
  return `linear-gradient(${towards(edge)}, transparent ${start}%, #000 ${rise}%, #000 ${hold}%, transparent ${end}%)`
}

function sideMask(fade: number, edge: Edge) {
  return `linear-gradient(${across(edge)}, transparent, #000 ${fade}%, #000 ${100 - fade}%, transparent)`
}

function maskStyle(mask: string, fade: number, edge: Edge): JSX.CSSProperties {
  const masks = fade > 0 ? `${mask}, ${sideMask(fade, edge)}` : mask
  return {
    'mask-image': masks,
    '-webkit-mask-image': masks,
    'mask-composite': 'intersect',
    '-webkit-mask-composite': 'source-in',
  }
}

interface ProgressiveBlurProps {
  class?: string
  edge?: Edge
  sideFade?: number
}

export function ProgressiveBlur(props: ProgressiveBlurProps) {
  const fade = () => props.sideFade ?? 0
  const edge = () => props.edge ?? 'bottom'

  return (
    <div class={`pblur pblur-${edge()} ${props.class ?? ''}`} aria-hidden="true">
      <For each={BLURS}>
        {(blur, i) => (
          <div
            class="pblur-layer"
            style={{
              'backdrop-filter': `blur(${blur}px)`,
              '-webkit-backdrop-filter': `blur(${blur}px)`,
              ...maskStyle(edgeMask(i(), edge()), fade(), edge()),
            }}
          />
        )}
      </For>
      <div class="pblur-tint" style={maskStyle('linear-gradient(#000, #000)', fade(), edge())} />
    </div>
  )
}
