import { createEffect, For, on } from 'solid-js'
import { terminal } from '../../desktop/agents'
import { Window } from '../../desktop/Window'
import './Terminal.css'

export function Terminal() {
  let screen!: HTMLDivElement

  createEffect(
    on(
      () => terminal.length,
      () => (screen.scrollTop = screen.scrollHeight),
      { defer: true },
    ),
  )

  return (
    <Window id="terminal" title="si@build-01 — zsh" class="tm" frameless pillTitle>
      <div ref={screen} class="tm-screen">
        <For each={terminal}>{(line) => <div class={`tm-line tm-${line.kind}`}>{line.text}</div>}</For>
        <span class="tm-cursor" />
      </div>
    </Window>
  )
}
