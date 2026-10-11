import { createSignal } from 'solid-js'
import { createStore, produce } from 'solid-js/store'

export type Bucket = 'needs' | 'fyi' | 'handled'

export interface Sender {
  name: string
  email: string
  colors: [string, string]
}

export interface Mail {
  from: Sender | 'me'
  at: number
  body: string[]
  via?: 'si'
}

export interface Choice {
  label: string
  reply: string
  primary?: boolean
}

export interface Thread {
  id: string
  subject: string
  bucket: Bucket
  summary: string
  tag?: string
  unread: boolean
  mails: Mail[]
  draft?: string
  choices?: Choice[]
  handled?: string
  done?: string
  to?: Sender
}

export const ME = { name: 'Shkumbin Hasani', email: 'shkumbin@si.os' }

const minutes = (n: number) => Date.now() - n * 60000
const hours = (n: number) => minutes(n * 60)

const people = {
  ana: { name: 'Ana Krasniqi', email: 'ana@krasniqi.studio', colors: ['#ff8a5c', '#ff3d6e'] },
  leo: { name: 'Leo Marín', email: 'leo@meridian.si', colors: ['#5ac8fa', '#3d5afe'] },
  mei: { name: 'Mei Chen', email: 'mei@si.os', colors: ['#4ce38a', '#0e9f6e'] },
  tomas: { name: 'Tomás Berg', email: 'tomas@si.os', colors: ['#ffd34d', '#ff7a00'] },
  lena: { name: 'Lena Vogel', email: 'lena.vogel@northwind.vc', colors: ['#c86bff', '#6a2bff'] },
  landlord: { name: 'Arben Gashi', email: 'arben.gashi@mail.com', colors: ['#8e9aaf', '#55607a'] },
  github: { name: 'GitHub', email: 'noreply@github.com', colors: ['#3a3a44', '#16161c'] },
  stripe: { name: 'Stripe', email: 'receipts@stripe.com', colors: ['#7a73ff', '#4b3fe0'] },
  airline: { name: 'Pegasus Airlines', email: 'booking@flypgs.com', colors: ['#ffb340', '#ff8a00'] },
  figma: { name: 'Figma', email: 'news@figma.com', colors: ['#ff6a7f', '#a259ff'] },
  bank: { name: 'Raiffeisen', email: 'alerts@raiffeisen-kosovo.com', colors: ['#ffe14d', '#e0b800'] },
} satisfies Record<string, Sender>

const [threads, setThreads] = createStore<Thread[]>([
  {
    id: 'lena',
    subject: 'Follow-up after Tuesday — next steps',
    bucket: 'needs',
    summary: 'Wants a 30-minute call with the partners next week and your latest metrics before it.',
    tag: 'Reply drafted',
    unread: true,
    mails: [
      {
        from: people.lena,
        at: minutes(38),
        body: [
          'Hi Shkumbin,',
          'Thanks again for the demo on Tuesday. The partners were impressed, especially by how the main chat hands work to the sandboxes.',
          'We’d love to set up a 30-minute call with the full partnership next week. Could you also send over your latest usage numbers and the retention chart you mentioned before then?',
          'Best,\nLena',
        ],
      },
    ],
    draft:
      'Hi Lena,\n\nGreat to hear. Next Tuesday or Wednesday afternoon works for me, so pick whichever suits the partners. I’ll send the usage numbers and the retention chart by Friday.\n\nBest,\nShkumbin',
  },
  {
    id: 'ana',
    subject: 'Launch dinner Thursday?',
    bucket: 'needs',
    summary: 'Asks if you can make the launch dinner on Thursday at 8 at Liburnia.',
    tag: 'Thu · 20:00',
    unread: true,
    mails: [
      {
        from: people.ana,
        at: hours(2),
        body: [
          'Hey!',
          'We’re doing a small dinner for the launch on Thursday at 8, at Liburnia. Just the team and a few friends. Can you make it? I need numbers by tomorrow.',
          'Ana',
        ],
      },
    ],
    choices: [
      { label: 'I’ll be there', reply: 'Count me in for Thursday at 8. Looking forward to it!', primary: true },
      { label: 'Can’t make it', reply: 'I’m so sorry, I can’t make it on Thursday. Have a great launch, let’s celebrate soon.' },
    ],
  },
  {
    id: 'landlord',
    subject: 'Heating repair — need access Friday',
    bucket: 'needs',
    summary: 'The plumber needs to get into the flat on Friday between 10 and 12.',
    tag: 'Reply drafted',
    unread: false,
    mails: [
      {
        from: people.landlord,
        at: hours(5),
        body: [
          'Hello Shkumbin,',
          'The plumber can come on Friday between 10:00 and 12:00 to fix the heating. Will you be home, or should I use my key?',
          'Regards,\nArben',
        ],
      },
    ],
    draft: 'Hi Arben,\n\nThanks for sorting this. I won’t be home on Friday, so please use your key.\n\nBest,\nShkumbin',
  },
  {
    id: 'leo',
    subject: 'Meridian piece is live',
    bucket: 'fyi',
    summary: 'The Meridian article on SI OS went live this morning; nothing for you to do.',
    unread: true,
    mails: [
      {
        from: people.leo,
        at: hours(3),
        body: [
          'The piece is up! Thanks for the time last week. It’s already the most-read story on the site this morning.',
          'meridian.si/stories/an-os-for-a-super-intelligence',
          'Leo',
        ],
      },
    ],
  },
  {
    id: 'github',
    subject: '[sios-concept] Build passed on main',
    bucket: 'fyi',
    summary: 'All 412 tests passed on main after the last merge.',
    unread: false,
    mails: [
      {
        from: people.github,
        at: hours(6),
        body: ['All checks have passed on main.', '412 tests · 38.2s · build #412'],
      },
    ],
  },
  {
    id: 'flight',
    subject: 'Your booking PC 4321 · Prishtina → Berlin',
    bucket: 'fyi',
    summary: 'Flight to Berlin on 24 Oct at 07:10, seat 14A. Check-in opens 22 Oct.',
    tag: '24 Oct',
    unread: false,
    mails: [
      {
        from: people.airline,
        at: hours(26),
        body: [
          'Thank you for booking with Pegasus.',
          'PC 4321 · Prishtina (PRN) 07:10 → Berlin (BER) 10:55 · 24 October',
          'Seat 14A · 1 cabin bag',
          'Online check-in opens 48 hours before departure.',
        ],
      },
    ],
  },
  {
    id: 'stripe',
    subject: 'Your receipt from Cloudflare',
    bucket: 'handled',
    summary: 'Receipt for $25.00. Filed under Receipts.',
    handled: 'Filed under Receipts',
    unread: false,
    mails: [{ from: people.stripe, at: hours(4), body: ['Cloudflare Workers Paid · $25.00', 'Paid with Visa •••• 4242'] }],
  },
  {
    id: 'figma',
    subject: 'What’s new in Figma this month',
    bucket: 'handled',
    summary: 'Monthly product newsletter. Archived.',
    handled: 'Archived newsletter',
    unread: false,
    mails: [{ from: people.figma, at: hours(9), body: ['Here’s everything we shipped this month.'] }],
  },
  {
    id: 'bank',
    subject: 'Card payment of €42.80',
    bucket: 'handled',
    summary: 'Card payment at Liburnia matched to your budget. Nothing unusual.',
    handled: 'Checked, nothing unusual',
    unread: false,
    mails: [{ from: people.bank, at: hours(20), body: ['A payment of €42.80 was made with your card at LIBURNIA PRISHTINE.'] }],
  },
])

const [activeId, setActiveId] = createSignal('lena')
const [composing, setComposing] = createSignal<{ to: string; subject: string; body: string } | undefined>()

export { activeId, composing, people, setComposing, threads }

export const threadById = (id: string) => threads.find((t) => t.id === id)
export const inBucket = (bucket: Bucket) => threads.filter((t) => t.bucket === bucket)
export const needsYou = () => threads.filter((t) => t.bucket === 'needs' && !t.done).length

export function senderOf(thread: Thread): Sender {
  const first = thread.mails.find((m) => m.from !== 'me')?.from
  if (first && first !== 'me') return first
  return thread.to ?? { ...ME, colors: ['#3a3a48', '#23232d'] }
}

export function openThread(id: string) {
  setActiveId(id)
  setComposing(undefined)
  setThreads((t) => t.id === id, 'unread', false)
}

export function setDraft(id: string, text: string | undefined) {
  setThreads((t) => t.id === id, 'draft', text)
}

export function reply(id: string, text: string, via?: 'si') {
  const body = text.trim()
  if (!body) return
  setThreads(
    (t) => t.id === id,
    produce((t) => {
      t.mails.push({ from: 'me', at: Date.now(), body: body.split(/\n{2,}/), via })
      t.draft = undefined
      t.choices = undefined
      if (t.bucket === 'needs') t.done = via === 'si' ? 'SI replied for you' : 'Replied'
      t.tag = undefined
    }),
  )
}

export function archive(id: string) {
  setThreads(
    (t) => t.id === id,
    produce((t) => {
      t.bucket = 'handled'
      t.handled = 'Archived by you'
      t.done = undefined
    }),
  )
}

export function restore(id: string) {
  setThreads(
    (t) => t.id === id,
    produce((t) => {
      t.bucket = 'fyi'
      t.handled = undefined
    }),
  )
}

export function send(to: string, subject: string, body: string, via?: 'si') {
  const known = Object.values(people).find(
    (p) => p.email === to.toLowerCase() || p.name.toLowerCase().startsWith(to.toLowerCase()),
  )
  const id = `sent-${Date.now()}`
  const recipient: Sender = known ?? { name: to, email: to.includes('@') ? to : `${to.toLowerCase()}@mail.com`, colors: ['#8e9aaf', '#55607a'] }
  setThreads(
    produce((list) => {
      list.unshift({
        id,
        subject: subject.trim() || 'No subject',
        bucket: 'fyi',
        summary: body.trim().split(/\n{2,}/).find((p) => !/^(hi|hey|hello|dear)\b/i.test(p) && !/^best,/i.test(p)) ?? body.trim(),
        unread: false,
        done: 'Sent',
        mails: [{ from: 'me', at: Date.now(), body: body.trim().split(/\n{2,}/), via }],
        to: recipient,
      })
    }),
  )
  return { id, to: recipient }
}

export function findThread(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return (
    threads.find((t) => t.id === q) ??
    threads.find((t) => senderOf(t).name.toLowerCase().split(' ')[0] === q) ??
    threads.find((t) => senderOf(t).name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
  )
}

export function findPerson(query: string) {
  const q = query.trim().toLowerCase()
  return Object.values(people).find((p) => p.name.toLowerCase().split(' ')[0] === q || p.email === q)
}
