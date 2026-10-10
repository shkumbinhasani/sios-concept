export interface Site {
  name: string
  url: string
}

export interface DemoSite extends Site {
  host: string
  path: string
  icon: string
}

export const HOME = 'https://en.wikipedia.org/wiki/Superintelligence'

const demo = (name: string, host: string, file: string): DemoSite => ({
  name,
  host,
  path: `/sites/${file}.html`,
  url: `${location.origin}/sites/${file}.html`,
  icon: `${location.origin}/sites/icons/${host.split('.')[0]}.svg`,
})

export const DEMOS: DemoSite[] = [
  demo('Aurora Weather', 'aurora.si', 'weather'),
  demo('Meridian', 'meridian.si', 'journal'),
  demo('Atlas', 'atlas.si', 'atlas'),
  demo('Murmur', 'murmur.si', 'social'),
]

const demoFor = (url: string) => DEMOS.find((d) => url.startsWith(d.url))

export const ESSENTIALS: Site[] = [
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page' },
  { name: 'Lobsters', url: 'https://lobste.rs' },
  { name: 'YouTube', url: 'https://www.youtube.com/embed/aircAruvnKk' },
  { name: 'Excalidraw', url: 'https://excalidraw.com' },
  { name: 'Maps', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.16,51.49,-0.08,51.53&layer=mapnik' },
  { name: 'Desmos', url: 'https://www.desmos.com/calculator' },
]

export const START_TABS = [DEMOS[0].url, HOME, DEMOS[1].url]

export const SITES: Site[] = [...DEMOS, ...ESSENTIALS]

const NAMES: Record<string, string> = {
  'lobste.rs': 'Lobsters',
  'zen-browser.app': 'Zen Browser',
  'excalidraw.com': 'Excalidraw',
  'openstreetmap.org': 'OpenStreetMap',
  'desmos.com': 'Desmos Calculator',
  'youtube.com': 'YouTube',
}

export function hostOf(url: string) {
  const site = demoFor(url)
  if (site) return site.host
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function titleOf(url: string) {
  const site = demoFor(url)
  if (site) return site.name
  try {
    const parsed = new URL(url)
    const host = hostOf(url)
    if (host.endsWith('wikipedia.org')) {
      const search = parsed.searchParams.get('search')
      if (search) return `${search} — Search`
      const page = parsed.pathname.replace(/^\/wiki\//, '')
      return page && page !== 'Main_Page' ? decodeURIComponent(page).replace(/_/g, ' ') : 'Wikipedia'
    }
    return NAMES[host] ?? host
  } catch {
    return url
  }
}

export function faviconOf(url: string) {
  const site = demoFor(url)
  if (site) return site.icon
  return `https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=64`
}

export function toUrl(input: string) {
  const text = input.trim()
  const site = DEMOS.find((d) => d.host === text.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''))
  if (site) return site.url
  if (/^https?:\/\//i.test(text)) return text
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(text)}`
}
