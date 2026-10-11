import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { loadSession, manageUsage, session, signIn, signOut } from './ai'
import './ChatGPTAccount.css'

export function ChatGPTAccount() {
  const [menu, setMenu] = createSignal(false)
  let root!: HTMLDivElement

  onMount(() => {
    loadSession()
    const close = (e: PointerEvent) => {
      if (!root.contains(e.target as Node)) setMenu(false)
    }
    addEventListener('pointerdown', close)
    onCleanup(() => removeEventListener('pointerdown', close))
  })

  const initial = () => (session().email?.[0] ?? '?').toUpperCase()

  return (
    <Show when={session().available}>
      <div ref={root} class="gpt-account">
        <Show
          when={session().signedIn}
          fallback={
            <button class="gpt-signin glass-pill" onClick={signIn}>
              Continue with ChatGPT
            </button>
          }
        >
          <button
            class="gpt-me glass-pill"
            classList={{ 'is-limited': !session().sharing, 'is-open': menu() }}
            aria-label="ChatGPT account"
            onClick={() => setMenu((v) => !v)}
          >
            <span class="gpt-avatar">{initial()}</span>
          </button>
          <Show when={menu()}>
            <div class="gpt-menu glass-pill">
              <div class="gpt-menu-head">
                <span class="gpt-avatar is-large">{initial()}</span>
                <span class="gpt-menu-who">
                  <span class="gpt-menu-email">{session().email}</span>
                  <span class="gpt-menu-plan" classList={{ 'is-off': !session().sharing }}>
                    {session().sharing ? 'Using ChatGPT plan' : 'Plan use not allowed'}
                  </span>
                </span>
              </div>
              <Show
                when={session().sharing}
                fallback={
                  <button class="gpt-menu-item is-primary" onClick={signIn}>
                    Allow plan use
                  </button>
                }
              >
                <button class="gpt-menu-item is-primary" onClick={manageUsage}>
                  Manage usage
                </button>
              </Show>
              <button
                class="gpt-menu-item"
                onClick={() => {
                  setMenu(false)
                  signOut()
                }}
              >
                Sign out
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </Show>
  )
}
