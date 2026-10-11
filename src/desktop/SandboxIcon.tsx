import { createUniqueId, Match, Show, Switch } from 'solid-js'
import { sandboxes, type SandboxId } from './store'
import './SandboxIcon.css'

function squircle(size = 64, inset = 0.5, exponent = 5, steps = 128) {
  const r = size / 2 - inset
  const c = size / 2
  const points: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    const x = c + r * Math.sign(cos) * Math.abs(cos) ** (2 / exponent)
    const y = c + r * Math.sign(sin) * Math.abs(sin) ** (2 / exponent)
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

const SHAPE = squircle()

function Personal(props: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#6fd0ff" />
          <stop offset="1" stop-color="#1d6cf2" />
        </linearGradient>
        <linearGradient id={`${props.id}-bezel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="1" stop-color="#d9e2ee" />
        </linearGradient>
        <linearGradient id={`${props.id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#3b2a8f" />
          <stop offset="0.55" stop-color="#7a3dff" />
          <stop offset="1" stop-color="#ff8a6b" />
        </linearGradient>
      </defs>
      <path d={SHAPE} fill={`url(#${props.id}-bg)`} />
      <g filter={`url(#${props.id}-drop)`}>
        <path d="M26 41h12l1.6 7H24.4z" fill={`url(#${props.id}-bezel)`} />
        <rect x="21" y="47" width="22" height="3.2" rx="1.6" fill="#eef3fa" />
        <rect x="12.5" y="16" width="39" height="27" rx="4" fill={`url(#${props.id}-bezel)`} />
        <rect x="15" y="18.5" width="34" height="20" rx="2" fill={`url(#${props.id}-screen)`} />
        <path d="M15 33c8-5 15 2 22-3s9-4 12-3v9.5a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2z" fill="#ff6fae" opacity="0.55" />
      </g>
    </>
  )
}

function Research(props: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${props.id}-bg`} cx="0.3" cy="0.2" r="1">
          <stop offset="0" stop-color="#4a3ad6" />
          <stop offset="0.6" stop-color="#1e1460" />
          <stop offset="1" stop-color="#0c0830" />
        </radialGradient>
        <radialGradient id={`${props.id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ff7ab0" stop-opacity="0.9" />
          <stop offset="0.45" stop-color="#8b5cff" stop-opacity="0.6" />
          <stop offset="0.75" stop-color="#3dd6ff" stop-opacity="0.35" />
          <stop offset="1" stop-color="#3dd6ff" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={`${props.id}-star`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="1" stop-color="#e6dcff" />
        </linearGradient>
      </defs>
      <path d={SHAPE} fill={`url(#${props.id}-bg)`} />
      <circle cx="31" cy="33" r="22" fill={`url(#${props.id}-glow)`} />
      <g filter={`url(#${props.id}-drop)`} fill={`url(#${props.id}-star)`}>
        <path d="M29 13c1.4 8.3 4.4 11.6 12.6 13.4-8.2 1.8-11.2 5.1-12.6 13.4-1.4-8.3-4.4-11.6-12.6-13.4C24.6 24.6 27.6 21.3 29 13z" />
        <path d="M44 36c.7 3.9 2.1 5.4 6 6.3-3.9.9-5.3 2.4-6 6.3-.7-3.9-2.1-5.4-6-6.3 3.9-.9 5.3-2.4 6-6.3z" />
      </g>
    </>
  )
}

function Build(props: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5b5b66" />
          <stop offset="1" stop-color="#1b1b21" />
        </linearGradient>
        <linearGradient id={`${props.id}-unit`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f4f5f8" />
          <stop offset="1" stop-color="#b9bdc8" />
        </linearGradient>
      </defs>
      <path d={SHAPE} fill={`url(#${props.id}-bg)`} />
      <g filter={`url(#${props.id}-drop)`}>
        <rect x="13" y="16" width="38" height="14" rx="3.5" fill={`url(#${props.id}-unit)`} />
        <rect x="13" y="34" width="38" height="14" rx="3.5" fill={`url(#${props.id}-unit)`} />
      </g>
      <g fill="#6e7380">
        <rect x="27" y="21.5" width="18" height="2" rx="1" />
        <rect x="27" y="25" width="12" height="2" rx="1" />
        <rect x="27" y="39.5" width="18" height="2" rx="1" />
        <rect x="27" y="43" width="12" height="2" rx="1" />
      </g>
      <circle cx="19.5" cy="23" r="2.6" fill="#32e36b" />
      <circle cx="19.5" cy="41" r="2.6" fill="#32e36b" />
      <circle cx="19.5" cy="23" r="5" fill="#32e36b" opacity="0.25" />
    </>
  )
}

const TINTS: [string, string][] = [
  ['#5ee7d0', '#0f9b8e'],
  ['#ffb36b', '#f05a28'],
  ['#ff8fc4', '#d6246e'],
  ['#9aa8ff', '#4337d6'],
  ['#c6f36b', '#3fa52b'],
]

function Generic(props: { id: string; tint: number; kind: string }) {
  const [top, bottom] = TINTS[props.tint % TINTS.length]
  return (
    <>
      <defs>
        <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color={top} />
          <stop offset="1" stop-color={bottom} />
        </linearGradient>
      </defs>
      <path d={SHAPE} fill={`url(#${props.id}-bg)`} />
      <g filter={`url(#${props.id}-drop)`} fill="#fff">
        <Switch
          fallback={
            <>
              <rect x="15" y="15" width="15" height="15" rx="4" />
              <rect x="34" y="15" width="15" height="15" rx="4" opacity="0.85" />
              <rect x="15" y="34" width="15" height="15" rx="4" opacity="0.85" />
              <rect x="34" y="34" width="15" height="15" rx="4" opacity="0.7" />
            </>
          }
        >
          <Match when={props.kind === 'agent'}>
            <path d="M30 14c1.4 8.3 4.4 11.6 12.6 13.4-8.2 1.8-11.2 5.1-12.6 13.4-1.4-8.3-4.4-11.6-12.6-13.4C25.6 25.6 28.6 22.3 30 14z" />
            <path d="M44 36c.7 3.9 2.1 5.4 6 6.3-3.9.9-5.3 2.4-6 6.3-.7-3.9-2.1-5.4-6-6.3 3.9-.9 5.3-2.4 6-6.3z" />
          </Match>
          <Match when={props.kind === 'remote'}>
            <rect x="13" y="17" width="38" height="12" rx="3.5" />
            <rect x="13" y="35" width="38" height="12" rx="3.5" />
          </Match>
        </Switch>
      </g>
    </>
  )
}

export function SandboxIcon(props: { id: SandboxId; size?: number; status?: boolean }) {
  const size = () => props.size ?? 40
  const uid = createUniqueId()
  const status = () => sandboxes[props.id]?.status ?? 'idle'

  return (
    <span class="sbx-icon" classList={{ 'is-small': size() < 30 }} style={{ width: `${size()}px`, height: `${size()}px` }}>
      <svg viewBox="0 0 64 64" width={size()} height={size()} aria-hidden="true">
        <defs>
          <filter id={`${uid}-drop`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3" />
          </filter>
          <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.35" />
            <stop offset="0.45" stop-color="#fff" stop-opacity="0.04" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-edge`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.45" />
            <stop offset="0.5" stop-color="#fff" stop-opacity="0.08" />
            <stop offset="1" stop-color="#fff" stop-opacity="0.18" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <path d={SHAPE} />
          </clipPath>
        </defs>
        <g clip-path={`url(#${uid}-clip)`}>
          <Switch
            fallback={
              <Generic id={uid} tint={sandboxes[props.id]?.tint ?? 0} kind={sandboxes[props.id]?.kind ?? 'local'} />
            }
          >
            <Match when={props.id === 'personal'}>
              <Personal id={uid} />
            </Match>
            <Match when={props.id === 'research'}>
              <Research id={uid} />
            </Match>
            <Match when={props.id === 'build'}>
              <Build id={uid} />
            </Match>
          </Switch>
          <path d={SHAPE} fill={`url(#${uid}-gloss)`} />
          <path d={SHAPE} fill="none" stroke={`url(#${uid}-edge)`} stroke-width={size() < 30 ? 2.4 : 1.6} />
        </g>
      </svg>
      <Show when={props.status !== false && status() !== 'idle'}>
        <span class={`sbx-badge is-${status()}`}>
          <Show when={status() === 'waiting'}>!</Show>
        </span>
      </Show>
    </span>
  )
}
