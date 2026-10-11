import { createSignal } from 'solid-js'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Device {
  id: string
  name: string
  width: number
  height: number
  radius: number
  bezel: { x: number; y: number }
  cutout: 'island' | 'hole' | 'none'
  homeButton?: boolean
  portrait: Insets
  landscape: Insets
}

export const DEVICES: Device[] = [
  {
    id: 'pro',
    name: 'iPhone 16 Pro',
    width: 402,
    height: 874,
    radius: 56,
    bezel: { x: 12, y: 12 },
    cutout: 'island',
    portrait: { top: 62, right: 0, bottom: 34, left: 0 },
    landscape: { top: 0, right: 62, bottom: 21, left: 62 },
  },
  {
    id: 'pixel',
    name: 'Pixel 9',
    width: 412,
    height: 915,
    radius: 44,
    bezel: { x: 10, y: 10 },
    cutout: 'hole',
    portrait: { top: 44, right: 0, bottom: 24, left: 0 },
    landscape: { top: 0, right: 0, bottom: 20, left: 44 },
  },
  {
    id: 'se',
    name: 'iPhone SE',
    width: 375,
    height: 667,
    radius: 0,
    bezel: { x: 16, y: 72 },
    cutout: 'none',
    homeButton: true,
    portrait: { top: 20, right: 0, bottom: 0, left: 0 },
    landscape: { top: 0, right: 0, bottom: 0, left: 0 },
  },
]

export interface PhoneApp {
  id: string
  name: string
  url?: string
  icon?: string
}

const site = (file: string) => `${location.origin}/sites/${file}.html`
const icon = (name: string) => `${location.origin}/sites/icons/${name}.svg`

export const APPS: PhoneApp[] = [
  { id: 'weather', name: 'Weather', url: site('weather'), icon: icon('aurora') },
  { id: 'maps', name: 'Atlas', url: site('atlas'), icon: icon('atlas') },
  { id: 'murmur', name: 'Murmur', url: site('social'), icon: icon('murmur') },
  { id: 'meridian', name: 'Meridian', url: site('journal'), icon: icon('meridian') },
  { id: 'clock', name: 'Clock' },
  { id: 'settings', name: 'Settings' },
]

export const appById = (id?: string) => APPS.find((a) => a.id === id)

const [deviceId, setDeviceId] = createSignal('pro')
const [landscape, setLandscape] = createSignal(false)
const [openApp, setOpenApp] = createSignal<string>()
const [showSafe, setShowSafe] = createSignal(false)

export { deviceId, landscape, openApp, setDeviceId, setLandscape, setOpenApp, setShowSafe, showSafe }

export const device = () => DEVICES.find((d) => d.id === deviceId()) ?? DEVICES[0]
export const insets = (): Insets => (landscape() ? device().landscape : device().portrait)
export const screenSize = () => {
  const d = device()
  return landscape() ? { w: d.height, h: d.width } : { w: d.width, h: d.height }
}

export function nextDevice() {
  const i = DEVICES.findIndex((d) => d.id === deviceId())
  setDeviceId(DEVICES[(i + 1) % DEVICES.length].id)
}
