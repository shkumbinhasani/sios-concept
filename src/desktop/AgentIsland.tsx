import { createEffect, createSignal, For, on, Show } from 'solid-js'
import { agents, pauseAgent, stopAgent } from './agents'
import { focusChat } from './ChatBar'
import { SandboxIcon } from './SandboxIcon'
import { activeSandbox } from './store'
import './AgentIsland.css'

export function AgentIsland() {
  const [open, setOpen] = createSignal(false)
  const agent = () => agents[activeSandbox()]

  createEffect(on(activeSandbox, () => setOpen(false)))

  const state = () => agent()?.state ?? 'idle'
  const waiting = () => state() === 'waiting'

  return (
    <Show when={agent()}>
      {(a) => (
        <div
          class={`isl is-${state()}${open() || waiting() ? ' is-open' : ''}`}
          style={{ '--a1': a().colors[0], '--a2': a().colors[1], '--p': a().progress }}
        >
          <button class="isl-head" onClick={() => setOpen((v) => !v)} aria-expanded={open()}>
            <span class="isl-face">
              <SandboxIcon id={a().sandbox} size={22} status={false} />
              <Show when={state() === 'working' || state() === 'paused'}>
                <span class="isl-ring" />
              </Show>
            </span>
            <span class="isl-name">{a().name}</span>
            <span class="isl-line">{state() === 'paused' ? `Paused · ${a().line}` : waiting() ? 'Needs your decision' : a().line}</span>
            <Show when={state() === 'working'}>
              <span class="isl-dots">
                <i />
                <i />
                <i />
              </span>
            </Show>
          </button>

          <div class="isl-body">
            <Show when={waiting() && a().question}>
              <div class="isl-question">{a().question}</div>
              <div class="isl-actions">
                <For each={a().actions}>
                  {(action) => (
                    <button classList={{ 'is-primary': !!action.primary }} onClick={() => action.run()}>
                      {action.label}
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={a().steps.length > 0}>
              <ol class="isl-steps">
                <For each={a().steps}>
                  {(step, i) => (
                    <li
                      classList={{
                        'is-done': i() < a().step || state() === 'done',
                        'is-current': i() === a().step && state() !== 'done' && state() !== 'idle' && !waiting(),
                        'is-waiting': i() === a().step && waiting(),
                      }}
                    >
                      <span class="isl-check" />
                      {step}
                    </li>
                  )}
                </For>
              </ol>
            </Show>
            <Show when={a().steps.length === 0}>
              <div class="isl-empty">No task yet. Ask SI to give {a().name} something to do.</div>
            </Show>

            <div class="isl-controls">
              <Show when={state() === 'working' || state() === 'paused'}>
                <button onClick={() => pauseAgent(a().sandbox)}>{state() === 'paused' ? 'Resume' : 'Pause'}</button>
                <button class="is-danger" onClick={() => stopAgent(a().sandbox)}>
                  Stop
                </button>
              </Show>
              <button
                onClick={() => {
                  setOpen(false)
                  focusChat(`${a().name}, `)
                }}
              >
                Talk to {a().name}
              </button>
            </div>
          </div>
        </div>
      )}
    </Show>
  )
}
