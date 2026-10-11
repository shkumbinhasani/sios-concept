import { createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { focusWindow, sandboxes, setSandboxStatus, switchSandbox, type SandboxId } from './store'

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

export interface AgentAction {
  label: string
  primary?: boolean
  run: () => void
}

export interface Agent {
  sandbox: SandboxId
  name: string
  colors: [string, string]
  steps: string[]
  step: number
  progress: number
  line: string
  state: 'idle' | 'working' | 'paused' | 'waiting' | 'done'
  question?: string
  actions?: AgentAction[]
}

export interface AgentPost {
  agent: SandboxId
  text: string
  actions?: AgentAction[]
}

const [agents, setAgents] = createStore<Record<string, Agent>>({
  research: {
    sandbox: 'research',
    name: 'Research',
    colors: ['#c86bff', '#6a2bff'],
    steps: [],
    step: 0,
    progress: 0,
    line: 'Waiting for a task',
    state: 'idle',
  },
  build: {
    sandbox: 'build',
    name: 'Build agent',
    colors: ['#4ce38a', '#0e9f6e'],
    steps: [],
    step: 0,
    progress: 0,
    line: 'Last build passed',
    state: 'idle',
  },
})

export { agents }

const postListeners = new Set<(post: AgentPost) => void>()
export function onAgentPost(fn: (post: AgentPost) => void) {
  postListeners.add(fn)
  return () => postListeners.delete(fn)
}
function post(p: AgentPost) {
  postListeners.forEach((fn) => fn(p))
}

const cancelled = new Set<SandboxId>()

class Stopped extends Error {}

async function wait(id: SandboxId, ms: number) {
  let left = ms
  while (left > 0) {
    if (cancelled.has(id)) throw new Stopped()
    await new Promise((r) => setTimeout(r, 100))
    if (agents[id].state !== 'paused') left -= 100
  }
  if (cancelled.has(id)) throw new Stopped()
}

function begin(id: SandboxId, steps: string[], task: string) {
  cancelled.delete(id)
  setAgents(id, { steps, step: 0, progress: 0, line: task, state: 'working', question: undefined, actions: undefined })
  setSandboxStatus(id, 'working', task)
}

function stepTo(id: SandboxId, step: number, line: string) {
  setAgents(id, { step, line, progress: step / agents[id].steps.length })
  setSandboxStatus(id, 'working', line)
}

function ask(id: SandboxId, question: string, actions: AgentAction[]) {
  setAgents(id, { state: 'waiting', question, actions, line: question, progress: 1 })
  setSandboxStatus(id, 'waiting', question)
  post({ agent: id, text: question, actions })
}

function finish(id: SandboxId, line: string, text?: string, actions?: AgentAction[]) {
  setAgents(id, { state: 'done', line, progress: 1, step: agents[id].steps.length, question: undefined, actions: undefined })
  setSandboxStatus(id, 'idle', line)
  running.delete(id)
  if (text) post({ agent: id, text, actions })
}

export function pauseAgent(id: SandboxId) {
  const a = agents[id]
  if (a.state === 'working') {
    setAgents(id, 'state', 'paused')
    setSandboxStatus(id, 'waiting', `Paused · ${a.line}`)
  } else if (a.state === 'paused') {
    setAgents(id, 'state', 'working')
    setSandboxStatus(id, 'working', a.line)
  }
}

export function stopAgent(id: SandboxId) {
  cancelled.add(id)
  setAgents(id, { state: 'idle', line: 'Stopped', question: undefined, actions: undefined, progress: 0 })
  setSandboxStatus(id, 'idle', 'Stopped by you')
  running.delete(id)
  setBuildLoad(0.2)
}

export function pauseAll() {
  const anyWorking = Object.values(agents).some((a) => a.state === 'working')
  for (const a of Object.values(agents)) {
    if (anyWorking ? a.state === 'working' : a.state === 'paused') pauseAgent(a.sandbox)
  }
}

const running = new Set<SandboxId>()

async function runBuild(task: string) {
  const steps = ['Pull latest code', 'Compile 214 modules', 'Run 412 tests', 'Approve deploy']
  begin('build', steps, task)
  setBuildLoad(0.85)
  setTerminal((lines) => lines.slice(0, -1))
  const at = [0, 2, 4, 9]
  try {
    for (let i = 0; i < BUILD_SCRIPT.length; i++) {
      const s = at.lastIndexOf(at.filter((x) => x <= i).at(-1)!)
      if (at.includes(i)) stepTo('build', s, steps[s] + '…')
      if (i >= 5 && i <= 8) setAgents('build', 'line', `Running tests · ${Math.round(((i - 4) / 5) * 412)} of 412`)
      await wait('build', 450)
      const [kind, text] = BUILD_SCRIPT[i]
      setTerminal((lines) => [...lines, line(kind, text)])
    }
  } catch (e) {
    if (e instanceof Stopped) return
    throw e
  }
  setBuildLoad(0.2)
  stepTo('build', 3, 'Waiting for your approval')
  ask('build', 'All 412 tests passed. Deploy build 412 to production?', [
    { label: 'Deploy', primary: true, run: () => void deploy() },
    { label: 'Not now', run: () => finish('build', 'Deploy skipped · 412 passed') },
  ])
}

async function deploy() {
  if (agents.build.state !== 'waiting') return
  setAgents('build', { state: 'working', question: undefined, actions: undefined, line: 'Deploying to production…' })
  setSandboxStatus('build', 'working', 'Deploying to production…')
  setTerminal((lines) => [...lines, line('prompt', 'si@build-01:~/os$ make deploy')])
  try {
    await wait('build', 900)
    setTerminal((lines) => [...lines, line('out', 'Uploading 15 assets to sios.shkumbinhsn.com')])
    await wait('build', 900)
    setTerminal((lines) => [...lines, line('ok', '✓ Deployed build 412'), line('prompt', 'si@build-01:~/os$')])
  } catch (e) {
    if (e instanceof Stopped) return
    throw e
  }
  finish('build', 'Deployed build 412', 'Build 412 is live on sios.shkumbinhsn.com.')
}

async function runResearch(task: string) {
  const steps = ['Find sources', 'Read 3 papers', 'Write findings', 'Ready for review']
  begin('research', steps, task)
  try {
    stepTo('research', 0, 'Finding sources…')
    await wait('research', 1200)
    for (let i = 0; i < 3; i++) {
      stepTo('research', 1, `Reading paper ${i + 1} of 3…`)
      setAgents('research', 'progress', (1 + i / 3) / steps.length)
      await wait('research', 900)
    }
    for (let i = 0; i < RESEARCH_SECTIONS.length; i++) {
      stepTo('research', 2, `Writing section ${i + 1} of ${RESEARCH_SECTIONS.length}…`)
      setAgents('research', 'progress', (2 + i / RESEARCH_SECTIONS.length) / steps.length)
      await wait('research', 900)
      appendSection(RESEARCH_SECTIONS[i])
    }
  } catch (e) {
    if (e instanceof Stopped) return
    throw e
  }
  finish('research', `${RESEARCH_SECTIONS.length} new sections to review`, `I read 3 papers and wrote ${RESEARCH_SECTIONS.length} new sections into Findings.md.`, [
    {
      label: 'Open Findings.md',
      primary: true,
      run: () => {
        switchSandbox('research')
        focusWindow('notes')
      },
    },
  ])
  setSandboxStatus('research', 'waiting', `${RESEARCH_SECTIONS.length} new sections to review`)
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
  if (id === 'build') void runBuild(task)
  else if (id === 'research') void runResearch(task)
  else runPersonal(task)
  return true
}

export function isBusy(id: SandboxId) {
  return sandboxes[id].status === 'working'
}
