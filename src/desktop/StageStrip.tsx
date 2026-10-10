import { createMemo, For } from 'solid-js'
import { ProgressiveBlur } from '../ui/ProgressiveBlur'
import { SandboxIcon } from './SandboxIcon'
import {
  activeSandbox,
  hasFullscreen,
  hoveredSandbox,
  SANDBOX_ORDER,
  sandboxes,
  setHoveredSandbox,
  switchSandbox,
  thumbRect,
  stage,
  type SandboxId,
} from './store'
import './StageStrip.css'

function Thumb(props: { id: SandboxId }) {
  const active = () => activeSandbox() === props.id
  const rect = createMemo<ReturnType<typeof thumbRect>>((last) => (active() && last ? last : thumbRect(props.id)))
  const sandbox = () => sandboxes[props.id]

  return (
    <button
      class="stage-thumb"
      classList={{ 'is-hovered': hoveredSandbox() === props.id, 'is-active': active() }}
      tabIndex={active() ? -1 : 0}
      aria-hidden={active()}
      style={{
        transform: `translate(${rect().x}px, ${rect().y}px)`,
        width: `${rect().w}px`,
        height: `${rect().h}px`,
      }}
      aria-label={`${sandbox().name}: ${sandbox().activity}`}
      onPointerEnter={() => setHoveredSandbox(props.id)}
      onPointerLeave={() => setHoveredSandbox(undefined)}
      onClick={() => switchSandbox(props.id)}
    >
      <span class="stage-badge">
        <SandboxIcon id={props.id} size={Math.round(Math.min(46, Math.max(32, rect().w * 0.2)))} />
      </span>
      <span class="stage-tip">
        <strong>{sandbox().name}</strong>
        <span>{sandbox().activity}</span>
      </span>
    </button>
  )
}

export function StageStrip() {
  return (
    <nav class="stage-strip" aria-label="Sandboxes">
      <div
        class="stage-blur"
        classList={{ 'is-visible': hasFullscreen(activeSandbox()) }}
        style={{ width: `${stage().left + 48}px` }}
      >
        <ProgressiveBlur class="stage-blur-layers" edge="left" sideFade={6} />
      </div>
      <For each={SANDBOX_ORDER}>{(id) => <Thumb id={id} />}</For>
    </nav>
  )
}
