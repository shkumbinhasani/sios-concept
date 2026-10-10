export interface Track {
  title: string
  artist: string
  album: string
  duration: number
  colors: [string, string, string]
}

export const TRACKS: Track[] = [
  {
    title: 'Recursive Self',
    artist: 'Latent Choir',
    album: 'Emergence',
    duration: 222,
    colors: ['#ff6b3d', '#c2185b', '#2a0b2e'],
  },
  {
    title: 'Gradient Descent',
    artist: 'Weights & Measures',
    album: 'Loss Landscapes',
    duration: 255,
    colors: ['#3dd6ff', '#3d5afe', '#0a1033'],
  },
  {
    title: 'Attention Is All',
    artist: 'The Transformers',
    album: 'Self-Attention',
    duration: 188,
    colors: ['#b8ff5c', '#00a884', '#06231d'],
  },
  {
    title: 'Alignment',
    artist: 'Kore',
    album: 'Values',
    duration: 301,
    colors: ['#ffd34d', '#ff7a00', '#2b1400'],
  },
  {
    title: 'Night Shift Inference',
    artist: 'Weights & Measures',
    album: 'Loss Landscapes',
    duration: 216,
    colors: ['#d68cff', '#5b2bff', '#140a2e'],
  },
  {
    title: 'Context Window',
    artist: 'Latent Choir',
    album: 'Emergence',
    duration: 267,
    colors: ['#ff8fb1', '#ff3d6e', '#2e0a16'],
  },
]
