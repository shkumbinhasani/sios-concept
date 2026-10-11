import { createSignal } from 'solid-js'
import { currentPage, showBrowser, openPage } from '../apps/browser/state'
import { toUrl } from '../apps/browser/sites'
import { brainstorm } from '../apps/canvas/state'
import { chats, findChat, sendFromSI } from '../apps/messages/state'
import { delegate } from './agents'
import { browse, searchUrl, showChat, type Reply } from './replies'
import {
  activeSandbox,
  createSandbox,
  focusWindow,
  openWindow,
  sandboxes,
  sandboxOf,
  sandboxOrder,
  switchSandbox,
  type WindowId,
} from './store'

export interface Session {
  available: boolean
  signedIn: boolean
  sharing: boolean
  email?: string
  model?: string
}

type Item = Record<string, unknown> & { type?: string }

const MAX_ROUNDS = 5
const MAX_TURNS = 10
const USAGE_URL = 'https://chatgpt.com/settings/usage'
const APPS: WindowId[] = ['browser', 'music', 'messages', 'notes', 'canvas', 'terminal', 'monitor', 'simulator']

const [session, setSession] = createSignal<Session>({ available: false, signedIn: false, sharing: false })
export { session }

export async function loadSession() {
  try {
    const res = await fetch('/api/si/session', { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) throw new Error()
    setSession(await res.json())
  } catch {
    setSession({ available: false, signedIn: false, sharing: false })
  }
}

addEventListener('message', (e) => {
  if (e.data?.type === 'si:chatgpt') loadSession()
})

export function signIn() {
  open('/api/si/signin', 'si-chatgpt', 'popup,width=520,height=720')
}

export async function signOut() {
  await fetch('/api/si/signout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  turns = []
  await loadSession()
}

export function manageUsage() {
  open(USAGE_URL, '_blank', 'noopener')
}

const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})

const TOOLS = [
  {
    type: 'namespace',
    name: 'si_messages',
    description: 'Send messages to the user’s contacts in the Messages app.',
    tools: [
      {
        type: 'function',
        name: 'send_message',
        description:
          'Send a message to a contact or group on the user’s behalf. Write the text in the user’s own voice, first person, as they would text it.',
        parameters: object({
          to: { type: 'string', description: 'Contact first name or group name, e.g. "Ana" or "team".' },
          text: { type: 'string', description: 'The exact message to send.' },
        }),
      },
    ],
  },
  {
    type: 'namespace',
    name: 'si_browser',
    description: 'The SI OS browser.',
    tools: [
      {
        type: 'function',
        name: 'open_page',
        description: 'Open a web address in the browser.',
        parameters: object({ url: { type: 'string', description: 'An address such as "lobste.rs" or a full URL.' } }),
      },
      {
        type: 'function',
        name: 'search_web',
        description: 'Search the web and show the results in the browser.',
        parameters: object({ query: { type: 'string' } }),
      },
      {
        type: 'function',
        name: 'current_page',
        description: 'Get the title and address of the page open in the browser.',
        parameters: object({}),
      },
    ],
  },
  {
    type: 'namespace',
    name: 'si_desktop',
    description: 'Sandboxes, agents and apps in SI OS.',
    tools: [
      {
        type: 'function',
        name: 'delegate',
        description:
          'Hand a task to an agent. "build" runs code, tests and deploys on the build server. "research" reads sources and writes findings to Findings.md.',
        parameters: object({
          agent: { type: 'string', enum: ['build', 'research'] },
          task: { type: 'string', description: 'A short label for the task, under 6 words.' },
        }),
      },
      {
        type: 'function',
        name: 'brainstorm',
        description: 'Have the Research agent put ideas on the infinite canvas about a topic.',
        parameters: object({ topic: { type: 'string' } }),
      },
      {
        type: 'function',
        name: 'create_sandbox',
        description: 'Create a new empty sandbox (desktop) and switch to it.',
        parameters: object({ name: { type: 'string' } }),
      },
      {
        type: 'function',
        name: 'open_app',
        description: 'Open and focus an app window, switching to the sandbox it lives in.',
        parameters: object({ app: { type: 'string', enum: APPS } }),
      },
    ],
  },
]

function instructions() {
  const page = currentPage()
  const desks = sandboxOrder()
    .map((id) => `- ${id}: ${sandboxes[id].name} (${sandboxes[id].host}), ${sandboxes[id].status}, "${sandboxes[id].activity}"`)
    .join('\n')
  return `You are SI, the assistant built into SI OS, a desktop operating system run by a super intelligence.
The user talks to you from the chat bar at the bottom of the screen. You act on the computer with your tools instead of explaining how to do things.

How to answer:
- Reply in one or two short, plain sentences. No markdown, lists, headings or emoji.
- When the user asks you to do something you have a tool for, call the tool, then say briefly what you did.
- When the user asks you to tell, ask or reply to someone, send the message with si_messages.send_message. Turn requests like "ask Ana if she wants coffee" into a natural text such as "Do you want coffee?".
- Hand coding, testing and deploying to the build agent, and reading or research to the research agent.
- If something fails, say so plainly.

Sandboxes:
${desks}
Active sandbox: ${activeSandbox()}

Chats in Messages: ${chats.map((c) => c.name).join(', ')}
Browser page: ${page.host ? `${page.title} (${page.url})` : 'start page'}`
}

function run(name: string, args: Record<string, string>, reply: Partial<Reply>): unknown {
  switch (name) {
    case 'send_message': {
      const chat = findChat(args.to)
      if (!chat) return { error: `No chat named "${args.to}".`, chats: chats.map((c) => c.name) }
      sendFromSI(chat, args.text)
      const who = chat.group ? chat.name : chat.name.split(' ')[0]
      reply.open = { label: `Open chat with ${who}`, run: () => showChat(chat.id) }
      return { sent: true, to: chat.name }
    }
    case 'open_page':
      browse(toUrl(args.url)).action?.()
      return { opened: toUrl(args.url) }
    case 'search_web':
      openPage(searchUrl(args.query), 'si')
      showBrowser()
      return { searched: args.query }
    case 'current_page':
      return currentPage()
    case 'delegate': {
      const started = delegate(args.agent, args.task)
      reply.sandbox = args.agent
      return started ? { started: true } : { started: false, reason: `${sandboxes[args.agent].name} is already busy.` }
    }
    case 'brainstorm':
      switchSandbox('research')
      focusWindow('canvas')
      setTimeout(() => brainstorm(args.topic), 500)
      reply.sandbox = 'research'
      return { started: true }
    case 'create_sandbox': {
      const id = createSandbox(args.name, 'agent')
      switchSandbox(id)
      reply.sandbox = id
      return { created: id }
    }
    case 'open_app': {
      const app = args.app as WindowId
      if (!APPS.includes(app)) return { error: `Unknown app "${args.app}".` }
      switchSandbox(sandboxOf(app))
      openWindow(app)
      focusWindow(app)
      return { opened: app }
    }
  }
  return { error: `Unknown tool "${name}".` }
}

let turns: Item[][] = []

export function resetConversation() {
  turns = []
}

const withoutId = ({ id: _id, ...item }: Item) => item

function textOf(output: Item[]) {
  return output
    .filter((item) => item.type === 'message')
    .flatMap((item) => (item.content as { type: string; text?: string }[]) ?? [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('')
    .trim()
}

class AiError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

async function call(input: Item[]) {
  const res = await fetch('/api/si/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions: instructions(), input, tools: TOOLS }),
  })
  const json = await res.json().catch(() => ({ error: { message: res.statusText } }))
  if (!res.ok) throw new AiError(json.error?.message ?? 'Request failed.', json.error?.code)
  return json.output as Item[]
}

function failure(error: unknown): Reply {
  const code = error instanceof AiError ? error.code : undefined
  if (code === 'subscription_sharing_usage_limit_exceeded') {
    return { text: 'You’ve reached the usage limit SI OS has on your ChatGPT plan.', open: { label: 'Manage usage', run: manageUsage } }
  }
  if (code === 'subscription_sharing_user_not_eligible') {
    return { text: 'This ChatGPT account can’t share its plan with apps. It needs Plus or Pro.' }
  }
  if (error instanceof AiError && /sign in/i.test(error.message)) {
    loadSession()
    return { text: 'Your ChatGPT session ended. Sign in again to keep using it.' }
  }
  return { text: `Something went wrong talking to ChatGPT: ${error instanceof Error ? error.message : 'unknown error'}` }
}

export async function think(prompt: string): Promise<Reply> {
  const turn: Item[] = [{ role: 'user', content: prompt }]
  const reply: Partial<Reply> = {}
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const output = (await call([...turns.flat(), ...turn])).filter((item) => item.type !== 'reasoning').map(withoutId)
      turn.push(...output)
      const calls = output.filter((item) => item.type === 'function_call')
      if (!calls.length) {
        turns = [...turns, turn].slice(-MAX_TURNS)
        return { text: textOf(output) || 'Done.', ...reply }
      }
      for (const item of calls) {
        let result: unknown
        try {
          result = run(String(item.name).split(".").pop()!, JSON.parse(String(item.arguments || '{}')), reply)
        } catch (e) {
          result = { error: e instanceof Error ? e.message : 'Tool failed.' }
        }
        turn.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify(result) })
      }
    }
    return { text: 'That took more steps than I expected. Here is where I got to.', ...reply }
  } catch (error) {
    const failed = failure(error)
    return { ...reply, ...failed, open: failed.open ?? reply.open }
  }
}
