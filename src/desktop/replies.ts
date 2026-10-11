import { currentPage, openPage, showBrowser } from '../apps/browser/state'
import { SITES, titleOf, toUrl } from '../apps/browser/sites'
import { brainstorm } from '../apps/canvas/state'
import { compose, findChat, openChat, sendFromSI } from '../apps/messages/state'
import { findPerson, findThread, needsYou, openThread, send as sendMail, senderOf, setDraft as setMailDraft, threads } from '../apps/mail/state'
import { createSandbox, focusWindow, openWindow, sandboxOf, switchSandbox, type SandboxId } from './store'

export interface Reply {
  text: string
  sandbox?: SandboxId
  task?: string
  action?: () => void
  open?: { label: string; run: () => void; app?: 'mail' }
}

export const searchUrl = (query: string) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
const looksLikeAddress = (text: string) => /^https?:\/\//i.test(text) || /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(text)

export function browse(url: string, verb = 'Opened'): Reply {
  return {
    text: `${verb} ${titleOf(url).replace(/ — Search$/, '')} in Browser.`,
    action: () => {
      openPage(url, 'si')
      showBrowser()
    },
  }
}

function browserCommand(message: string): Reply | undefined {
  const text = message.trim()
  if (looksLikeAddress(text)) return browse(toUrl(text))

  const search = text.match(/^(?:search|look up|google)\s+(?:for\s+)?(.+)$/i)
  if (search) return browse(searchUrl(search[1]), 'Searched for')

  const open = text.match(/^(?:open|go to|visit|show me|show)\s+(.+)$/i)
  if (open) {
    const target = open[1].replace(/\s+(?:in|on) (?:the )?browser$/i, '').trim()
    const site = SITES.find((s) => s.name.toLowerCase() === target.toLowerCase())
      ?? SITES.find((s) => s.name.toLowerCase().includes(target.toLowerCase()))
    if (site) return browse(site.url)
    if (looksLikeAddress(target)) return browse(toUrl(target))
    return browse(searchUrl(target), 'Searched for')
  }
  return undefined
}

function pageReply(message: string): Reply | undefined {
  if (!/\b(summari[sz]e|tl;?dr|this page|this article|this site)\b/i.test(message)) return undefined
  const page = currentPage()
  const title = page.title.replace(/ — Search$/, '')
  if (!page.host) {
    return { text: 'There is no page open right now. Tell me where to go and I will open it.' }
  }
  return {
    text: `Here is the short version of “${title}” on ${page.host}: the page argues one central idea, backs it with a few key sources, and ends on open questions. Want me to pull out the sources, or have Research go deeper?`,
    sandbox: 'personal',
    task: `Reading ${title}`,
  }
}

const ROUTES: { match: RegExp; reply: Reply }[] = [
  {
    match: /\b(build|test|tests|deploy|server|ci|compile)\b/i,
    reply: {
      text: 'Handing this to Build server. It will pull the latest code and run the full test suite, then wait for your go-ahead before deploying.',
      sandbox: 'build',
      task: 'Running 412 tests',
    },
  },
  {
    match: /\b(research|paper|papers|read|study|find|learn)\b/i,
    reply: {
      text: 'Research is picking this up. It will read the sources, write its findings into Findings.md and ping you when there is something to review.',
      sandbox: 'research',
      task: 'Reading sources',
    },
  },
  {
    match: /\b(music|song|play|playlist)\b/i,
    reply: {
      text: 'Queued up something calm in Music. Want me to keep the volume low while you read?',
      sandbox: 'personal',
      task: 'Queueing music',
    },
  },
]

const FALLBACKS: Reply[] = [
  {
    text: 'I can route that. Research handles reading and summaries, Build server runs code and tests, and Personal is this Mac. You can also type an address or “open Lobsters” to browse.',
  },
  {
    text: 'Both sandboxes are quiet right now. Give me a goal and I will split it between them and report back here.',
  },
]

let fallback = 0

function canvasReply(message: string): Reply | undefined {
  const match = message.match(/\b(?:brainstorm|ideas? for|sketch out|map out)\b\s*(?:about|on|for)?\s*(.*)$/i)
  if (!match) return undefined
  const topic = match[1].trim() || 'agent design'
  return {
    text: `Research is putting ideas on the canvas for “${topic}”. Watch the board — you can move or edit anything it adds.`,
    sandbox: 'research',
    action: () => {
      switchSandbox('research')
      focusWindow('canvas')
      setTimeout(() => brainstorm(topic), 500)
    },
  }
}

function sandboxReply(message: string): Reply | undefined {
  if (!/\b(new|create|make|spin up|start)\b.*\b(sandbox|desktop|workspace)\b/i.test(message)) return undefined
  const named = message.match(/\b(?:for|called|named)\s+(?:the\s+)?(.+?)[.!]?$/i)?.[1]
  const name = named ? named.replace(/^\w/, (c) => c.toUpperCase()) : undefined
  const kind = /\bagent|research|task\b/i.test(message) || named ? 'agent' : 'local'
  const id = createSandbox(name, kind)
  return {
    text: name
      ? `Made a new sandbox for “${name}”. Drag windows into it from the strip, or tell me what it should work on.`
      : 'Made a new empty sandbox. Drag windows into it from the strip, or tell me what it should work on.',
    sandbox: id,
    action: () => switchSandbox(id),
  }
}

const NAME = String.raw`(the team|the group|everyone|team|group|[\p{L}]+)`
const MESSAGE_PATTERNS: { kind: 'tell' | 'ask'; re: RegExp }[] = [
  { kind: 'tell', re: new RegExp(String.raw`^(?:please\s+)?let\s+${NAME}\s+know\s+(?:that\s+)?(.+)$`, 'iu') },
  { kind: 'ask', re: new RegExp(String.raw`^(?:please\s+)?ask\s+${NAME}\s+(.+)$`, 'iu') },
  { kind: 'tell', re: new RegExp(String.raw`^(?:please\s+)?(?:reply|answer|respond)\s+to\s+${NAME}\s+(?:with\s+|saying\s+|that\s+)?(.+)$`, 'iu') },
  { kind: 'tell', re: new RegExp(String.raw`^(?:please\s+)?(?:tell|text|message|msg|send)\s+${NAME}\s+(?:a message\s+)?(?:that\s+)?(.+)$`, 'iu') },
]

export function showChat(id: string) {
  switchSandbox(sandboxOf('messages'))
  openWindow('messages')
  focusWindow('messages')
  openChat(id)
}

function messageReply(message: string): Reply | undefined {
  const text = message.trim()
  for (const { kind, re } of MESSAGE_PATTERNS) {
    const match = text.match(re)
    if (!match) continue
    const chat = findChat(match[1])
    if (!chat) return { text: `I couldn't find “${match[1]}” in Messages. Who should I send it to?` }
    const body = compose(kind, match[2])
    const who = chat.group ? chat.name : chat.name.split(' ')[0]
    return {
      text: `Sent to ${who}: “${body}”`,
      action: () => sendFromSI(chat, body),
      open: { label: `Open chat with ${who}`, run: () => showChat(chat.id) },
    }
  }
  return undefined
}

const WEEKDAYS = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi

function sentence(text: string) {
  const clean = text
    .trim()
    .replace(WEEKDAYS, (d) => d[0].toUpperCase() + d.slice(1).toLowerCase())
    .replace(/^\w/, (c) => c.toUpperCase())
  const question =
    /^(can|could|will|would|do|does|are|is|should)\b/i.test(clean) || /\b(can|could|will|would) (we|you|i)\b/i.test(clean)
  return /[.!?]$/.test(clean) ? clean : `${clean}${question ? '?' : '.'}`
}

function emailFrom(request: string) {
  const [topic, ...rest] = request.split(/,\s*|\s+-\s+|:\s*/)
  const subject = topic.replace(/^(the|my|our)\s+/i, '').replace(/^\w/, (c) => c.toUpperCase())
  if (!rest.length) return { subject: subject.split(/\s+/).slice(0, 6).join(' '), line: sentence(request) }
  const ask = rest
    .join(', ')
    .replace(/\b(he|she|they)\b/gi, 'you')
    .replace(/\b(his|her|their)\b/gi, 'your')
    .replace(/\bit\b/i, topic.trim().replace(/^(my|our)\s+/i, 'the '))
  return { subject, line: sentence(ask) }
}

export function showMail(id?: string) {
  switchSandbox(sandboxOf('mail'))
  openWindow('mail')
  focusWindow('mail')
  if (id) openThread(id)
}

function mailReply(message: string): Reply | undefined {
  const text = message.trim()
  if (/\b(check|show|open|read)\b.*\b(e-?mail|mail|inbox)\b/i.test(text)) {
    const waiting = threads.filter((t) => t.bucket === 'needs' && !t.done)
    const who = waiting.map((t) => senderOf(t).name.split(' ')[0])
    return {
      text: waiting.length
        ? `${needsYou()} ${waiting.length === 1 ? 'email needs' : 'emails need'} you: ${who.join(', ')}. I drafted replies where I could and handled the rest.`
        : 'Your inbox is clear. I handled everything that came in.',
      action: () => showMail(waiting[0]?.id),
    }
  }
  const change = text.match(/^change my reply to ([\p{L}]+):\s*(.+)$/iu)
  if (change) {
    const thread = findThread(change[1])
    if (!thread) return { text: `I couldn't find an email from “${change[1]}”.` }
    const name = senderOf(thread).name.split(' ')[0]
    return {
      text: `Rewrote your reply to ${name}. It's waiting in Mail for you to send.`,
      action: () => {
        setMailDraft(thread.id, `Hi ${name},\n\n${sentence(change[2])}\n\nBest,\nShkumbin`)
        showMail(thread.id)
      },
      open: { label: 'Open in Mail', app: 'mail', run: () => showMail(thread.id) },
    }
  }
  const match = text.match(/^(?:please\s+)?e-?mail\s+([\p{L}.@-]+)\s+(?:about\s+|that\s+|saying\s+)?(.+)$/iu)
  if (!match) return undefined
  const person = findPerson(match[1])
  const name = person?.name.split(' ')[0] ?? match[1]
  const { subject, line } = emailFrom(match[2])
  const body = `Hi ${name},\n\n${line}\n\nBest,\nShkumbin`
  let sentId = ''
  return {
    text: `Emailed ${name} about ${subject.toLowerCase()}.`,
    action: () => {
      sentId = sendMail(person?.email ?? match[1], subject, body, 'si').id
    },
    open: { label: 'Open in Mail', app: 'mail', run: () => showMail(sentId) },
  }
}

export function replyTo(message: string): Reply {
  const command = mailReply(message) ?? messageReply(message) ?? browserCommand(message) ?? pageReply(message) ?? canvasReply(message) ?? sandboxReply(message)
  if (command) return command
  const route = ROUTES.find((r) => r.match.test(message))
  if (route) return route.reply
  return FALLBACKS[fallback++ % FALLBACKS.length]
}
