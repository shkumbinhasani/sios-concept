import type { JSX } from 'solid-js'

type IconProps = JSX.SvgSVGAttributes<SVGSVGElement>

function Icon(props: IconProps & { children: JSX.Element }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      {...props}
    />
  )
}

export const ChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
)

export const ChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
)

export const Reload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </Icon>
)

export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const Plus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const Play = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
  </Icon>
)

export const Pause = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <rect x="5.5" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="14" y="4" width="4.5" height="16" rx="1.2" />
  </Icon>
)

export const Next = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="M2 6.2v11.6a.8.8 0 0 0 1.25.66L11.5 12.7V17.8a.8.8 0 0 0 1.25.66l8.7-5.8a.8.8 0 0 0 0-1.32l-8.7-5.8a.8.8 0 0 0-1.25.66v5.1L3.25 5.54A.8.8 0 0 0 2 6.2z" />
  </Icon>
)

export const Previous = (p: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...p}>
    <path d="M22 6.2v11.6a.8.8 0 0 1-1.25.66L12.5 12.7V17.8a.8.8 0 0 1-1.25.66l-8.7-5.8a.8.8 0 0 1 0-1.32l8.7-5.8a.8.8 0 0 1 1.25.66v5.1l8.25-5.76A.8.8 0 0 1 22 6.2z" />
  </Icon>
)

export const Shuffle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6C14.3 16 15.5 17 17.5 17H21" />
    <path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.4M14.3 8.4C15.1 7.5 16.1 7 17.5 7H21" />
    <path d="M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5" />
  </Icon>
)

export const Repeat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11V9a3 3 0 0 1 3-3h13" />
    <path d="M17 3l3 3-3 3" />
    <path d="M20 13v2a3 3 0 0 1-3 3H4" />
    <path d="M7 21l-3-3 3-3" />
  </Icon>
)

export const VolumeLow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" />
  </Icon>
)

export const VolumeHigh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5v5h3.5L11 18.5v-13L6.5 9.5z" fill="currentColor" />
    <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" />
  </Icon>
)

export const Mic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Icon>
)

export const ArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
)

export const Sparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 3l1.8 4.7L17.5 9.5l-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z" fill="currentColor" stroke="none" />
    <path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" stroke="none" />
  </Icon>
)


export const Search = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
)
