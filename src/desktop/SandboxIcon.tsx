import { Show } from 'solid-js'
import { Laptop, Server, Sparkles } from '../ui/icons'
import { sandboxes, type SandboxId } from './store'
import './SandboxIcon.css'

const GLYPHS = {
  personal: Laptop,
  research: Sparkles,
  build: Server,
}

export function SandboxIcon(props: { id: SandboxId; size?: number; status?: boolean }) {
  const size = () => props.size ?? 40
  const Glyph = GLYPHS[props.id]

  return (
    <span
      class={`sbx-icon sbx-${props.id}`}
      style={{ width: `${size()}px`, height: `${size()}px`, 'border-radius': `${size() * 0.27}px` }}
    >
      <Glyph width={size() * 0.55} height={size() * 0.55} stroke-width="1.9" />
      <Show when={props.status !== false}>
        <span class={`sbx-status is-${sandboxes[props.id].status}`} />
      </Show>
    </span>
  )
}
