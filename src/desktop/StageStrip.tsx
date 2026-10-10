import { createMemo, For, Show } from 'solid-js'
import { ProgressiveBlur } from '../ui/ProgressiveBlur'
import { SandboxIcon } from './SandboxIcon'
import {
  activeSandbox,
  dropTarget,
  hasFullscreen,
  hoveredSandbox,
  createSandbox,
  draggingWindow,
  isVisible,
  NEW_SANDBOX,
  newSlotRect,
  sandboxOrder,
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
      data-sandbox={props.id}
      classList={{
        'is-hovered': hoveredSandbox() === props.id,
        'is-active': active(),
        'is-drop': dropTarget() === props.id,
      }}
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
      <Show when={!sandbox().windows.some(isVisible)}>
        <span class="stage-empty">Empty</span>
      </Show>
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
      <For each={sandboxOrder()}>{(id) => <Thumb id={id} />}</For>
      <button
        class="stage-new"
        data-sandbox={NEW_SANDBOX}
        classList={{ 'is-slot': draggingWindow(), 'is-drop': dropTarget() === NEW_SANDBOX }}
        style={{
          transform: `translate(${newSlotRect().x}px, ${newSlotRect().y}px)`,
          width: `${newSlotRect().w}px`,
          height: `${newSlotRect().h}px`,
        }}
        aria-label="New sandbox"
        title="New sandbox"
        onClick={() => switchSandbox(createSandbox())}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>New sandbox</span>
      </button>
    </nav>
  )
}
