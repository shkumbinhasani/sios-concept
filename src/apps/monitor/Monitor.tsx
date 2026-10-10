import { createSignal, For, onCleanup } from 'solid-js'
import { buildLoad } from '../../desktop/agents'
import { Window } from '../../desktop/Window'
import './Monitor.css'

const CORES = 8
const HISTORY = 32

function sample(load: number) {
  return Math.min(1, Math.max(0.03, load + (Math.random() - 0.5) * 0.35))
}

export function Monitor() {
  const [cores, setCores] = createSignal(Array.from({ length: CORES }, () => sample(buildLoad())))
  const [history, setHistory] = createSignal(Array.from({ length: HISTORY }, () => sample(buildLoad())))

  const timer = setInterval(() => {
    setCores(Array.from({ length: CORES }, () => sample(buildLoad())))
    setHistory((h) => [...h.slice(1), sample(buildLoad())])
  }, 700)
  onCleanup(() => clearInterval(timer))

  const average = () => cores().reduce((a, b) => a + b, 0) / CORES

  return (
    <Window id="monitor" title="Activity" class="mo" frameless pillTitle>
      <div class="mo-body">
        <div class="mo-head">
          <div>
            <div class="mo-label">CPU</div>
            <div class="mo-value">{Math.round(average() * 100)}%</div>
          </div>
          <div class="mo-host">build-01.si · 8 cores</div>
        </div>
        <div class="mo-cores">
          <For each={cores()}>
            {(value) => (
              <div class="mo-core">
                <div class="mo-core-fill" style={{ transform: `scaleY(${value})` }} />
              </div>
            )}
          </For>
        </div>
        <div class="mo-label">Last 20 seconds</div>
        <div class="mo-history">
          <For each={history()}>{(value) => <div class="mo-tick" style={{ transform: `scaleY(${value})` }} />}</For>
        </div>
      </div>
    </Window>
  )
}
