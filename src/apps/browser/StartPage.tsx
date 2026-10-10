import { For } from 'solid-js'
import { ArrowUp } from '../../ui/icons'
import { DEMOS, ESSENTIALS, faviconOf } from './sites'
import { go, setEditing } from './state'

export function StartPage() {
  return (
    <div class="web-start">
      <h1 class="web-start-title">Where to?</h1>
      <div class="web-start-section">
        <div class="web-start-label">Made for SI</div>
        <div class="web-start-demos">
          <For each={DEMOS}>
            {(site) => (
              <button class="web-start-demo" onClick={() => go(site.url)}>
                <img src={site.icon} alt="" width="36" height="36" />
                <span>
                  <strong>{site.name}</strong>
                  <small>{site.host}</small>
                </span>
              </button>
            )}
          </For>
        </div>
      </div>
      <div class="web-start-grid">
        <For each={ESSENTIALS}>
          {(site) => (
            <button class="web-start-site" onClick={() => go(site.url)}>
              <span class="web-start-icon">
                <img src={faviconOf(site.url)} alt="" width="28" height="28" />
              </span>
              <span class="web-start-name">{site.name}</span>
            </button>
          )}
        </For>
      </div>
      <button class="web-start-hint" onClick={() => setEditing(true)}>
        <ArrowUp width="14" height="14" />
        Type an address in the bar above, or ask SI below
      </button>
    </div>
  )
}
