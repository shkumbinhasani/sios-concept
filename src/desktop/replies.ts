import { currentPage, openPage, showBrowser } from '../apps/browser/state'
import { SITES, titleOf, toUrl } from '../apps/browser/sites'
import { brainstorm } from '../apps/canvas/state'
import { focusWindow, switchSandbox, type SandboxId } from './store'

export interface Reply {
  text: string
  sandbox?: SandboxId
  task?: string
  action?: () => void
}

const searchUrl = (query: string) => `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`
const looksLikeAddress = (text: string) => /^https?:\/\//i.test(text) || /^[^\s]+\.[a-z]{2,}(\/\S*)?$/i.test(text)

function browse(url: string, verb = 'Opened'): Reply {
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

export function replyTo(message: string): Reply {
  const command = browserCommand(message) ?? pageReply(message) ?? canvasReply(message)
  if (command) return command
  const route = ROUTES.find((r) => r.match.test(message))
  if (route) return route.reply
  return FALLBACKS[fallback++ % FALLBACKS.length]
}
