import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { sandboxes, setSandboxStatus, type SandboxId } from './store'

export interface TerminalLine {
  id: number
  kind: 'prompt' | 'out' | 'ok' | 'warn'
  text: string
}

let lineIds = 0

const line = (kind: TerminalLine['kind'], text: string): TerminalLine => ({ id: ++lineIds, kind, text })

const [terminal, setTerminal] = createStore<TerminalLine[]>([
  line('prompt', 'si@build-01:~/os$ make test'),
  line('out', 'Compiling 214 modules'),
  line('ok', '✓ 412 tests passed in 38.2s'),
  line('prompt', 'si@build-01:~/os$'),
])

const INITIAL_FINDINGS = `# Superintelligence: key ideas

> Notes compiled by the **Research** agent. Open questions are marked ❓ and sources are listed at the end.

## Progress

- [x] Read the Wikipedia overview
- [x] Read *Superintelligence* (Bostrom, 2014), chapters 1–8
- [ ] Compare takeoff scenarios
- [ ] Draft a one-page brief for Ana

## Orthogonality thesis

Intelligence and final goals are **independent axes**. A very capable system can pursue almost any goal, so being smart does not by itself make a system *want* good things.

## Instrumental convergence

Most final goals imply the same sub-goals:

1. Keep running
2. Gather resources
3. Avoid having the goal changed

| Sub-goal | Why it helps almost any goal | Why it worries people |
| --- | --- | --- |
| Self-preservation | You cannot reach a goal if you are switched off | Resists shutdown |
| Resources | More compute and money help with nearly everything | Competes with people |
| Goal integrity | A changed goal is a failed goal | Resists correction |

## Sources

- [Superintelligence — Wikipedia](https://en.wikipedia.org/wiki/Superintelligence)
- [Recursive self-improvement — Wikipedia](https://en.wikipedia.org/wiki/Recursive_self-improvement)
- [Meridian: The quiet arrival](https://meridian.si)
`

const RESEARCH_SECTIONS = [
  `## Takeoff speed

A **slow takeoff** gives years to adjust: institutions, laws and safety work can keep pace. A **fast takeoff** could go from human-level to far beyond it in days, leaving no time to correct mistakes.`,
  `## Recursive self-improvement

A system that can improve its own design could compound its gains. Each improvement makes the next one easier — the core of the *intelligence explosion* argument.

\`\`\`text
capability(n + 1) = capability(n) × (1 + improvement rate)
\`\`\``,
  `## Open questions

- ❓ Do alignment methods that work on today's models keep working as capability grows?
- ❓ Can we measure takeoff speed early enough to act on it?`,
]

const [findings, setFindings] = createSignal(INITIAL_FINDINGS)
const [lastAdded, setLastAdded] = createSignal<string>()
const [editedAt, setEditedAt] = createSignal(Date.now() - 2 * 60 * 1000)
const [editedBy, setEditedBy] = createSignal<'Research' | 'You'>('Research')

export { editedAt, editedBy, findings, lastAdded }

export function editFindings(markdown: string) {
  setFindings(markdown)
  setEditedAt(Date.now())
  setEditedBy('You')
}

function appendSection(section: string) {
  const doc = findings()
  const sources = doc.indexOf('\n## Sources')
  const next = sources >= 0 ? `${doc.slice(0, sources)}\n${section}\n${doc.slice(sources)}` : `${doc.trimEnd()}\n\n${section}\n`
  setFindings(next)
  setLastAdded(section.match(/^## (.+)$/m)?.[1])
  setEditedAt(Date.now())
  setEditedBy('Research')
}

const [buildLoad, setBuildLoad] = createSignal(0.18)

export { buildLoad, terminal }

const BUILD_SCRIPT: [TerminalLine['kind'], string][] = [
  ['prompt', 'si@build-01:~/os$ git pull && make test'],
  ['out', 'Already up to date.'],
  ['out', 'Compiling 214 modules'],
  ['out', '  ▸ desktop/window  ▸ desktop/chat  ▸ apps/music'],
  ['out', 'Running 412 tests across 8 workers'],
  ['out', '  window manager ........ 96 passed'],
  ['out', '  chat ................. 128 passed'],
  ['warn', '  apps/browser ........... 1 flaky, retried'],
  ['out', '  apps ................. 187 passed'],
  ['ok', '✓ 412 tests passed in 41.7s'],
  ['prompt', 'si@build-01:~/os$'],
]

const running = new Set<SandboxId>()

function runBuild(task: string) {
  setSandboxStatus('build', 'working', task)
  setBuildLoad(0.85)
  setTerminal((lines) => lines.slice(0, -1))
  BUILD_SCRIPT.forEach(([kind, text], i) => {
    setTimeout(() => setTerminal((lines) => [...lines, line(kind, text)]), 450 * (i + 1))
  })
  setTimeout(() => {
    setBuildLoad(0.2)
    setSandboxStatus('build', 'waiting', '412 passed · ready to deploy')
    running.delete('build')
  }, 450 * (BUILD_SCRIPT.length + 1))
}

function runResearch(task: string) {
  setSandboxStatus('research', 'working', task)
  RESEARCH_SECTIONS.forEach((section, i) => {
    setTimeout(() => appendSection(section), 1800 * (i + 1))
  })
  setTimeout(() => {
    setSandboxStatus('research', 'waiting', `${RESEARCH_SECTIONS.length} new sections to review`)
    running.delete('research')
  }, 1800 * RESEARCH_SECTIONS.length + 600)
}

function runPersonal(task: string) {
  setSandboxStatus('personal', 'working', task)
  setTimeout(() => {
    setSandboxStatus('personal', 'idle', 'Reading and music')
    running.delete('personal')
  }, 2400)
}

export function delegate(id: SandboxId, task: string) {
  if (running.has(id)) return false
  running.add(id)
  if (id === 'build') runBuild(task)
  else if (id === 'research') runResearch(task)
  else runPersonal(task)
  return true
}

export function isBusy(id: SandboxId) {
  return sandboxes[id].status === 'working'
}
