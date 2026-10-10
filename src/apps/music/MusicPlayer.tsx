import { createSignal, For, onCleanup, Show } from 'solid-js'
import { Window } from '../../desktop/Window'
import { Next, Pause, Play, Previous, Repeat, Shuffle, VolumeHigh, VolumeLow } from '../../ui/icons'
import { Slider } from '../../ui/Slider'
import { TRACKS, type Track } from './tracks'
import './MusicPlayer.css'

const TICK = 250

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Artwork(props: { track: Track; class?: string }) {
  return (
    <div
      class={`mu-art ${props.class ?? ''}`}
      style={{
        '--c1': props.track.colors[0],
        '--c2': props.track.colors[1],
        '--c3': props.track.colors[2],
      }}
    >
      <div class="mu-art-ring" />
    </div>
  )
}

export function MusicPlayer() {
  const [index, setIndex] = createSignal(0)
  const [position, setPosition] = createSignal(64)
  const [scrub, setScrub] = createSignal<number | null>(null)
  const [playing, setPlaying] = createSignal(false)
  const [shuffle, setShuffle] = createSignal(false)
  const [repeat, setRepeat] = createSignal(false)
  const [volume, setVolume] = createSignal(0.7)

  const track = () => TRACKS[index()]
  const shown = () => scrub() ?? position()

  function play(i: number) {
    setIndex(i)
    setPosition(0)
    setPlaying(true)
  }

  function next() {
    if (shuffle()) {
      const others = TRACKS.map((_, i) => i).filter((i) => i !== index())
      return play(others[Math.floor(Math.random() * others.length)])
    }
    const last = index() === TRACKS.length - 1
    if (last && !repeat()) {
      setIndex(0)
      setPosition(0)
      setPlaying(false)
      return
    }
    play((index() + 1) % TRACKS.length)
  }

  function previous() {
    if (position() > 3) return setPosition(0)
    play((index() - 1 + TRACKS.length) % TRACKS.length)
  }

  const timer = setInterval(() => {
    if (!playing() || scrub() !== null) return
    const nextPosition = position() + TICK / 1000
    if (nextPosition >= track().duration) next()
    else setPosition(nextPosition)
  }, TICK)
  onCleanup(() => clearInterval(timer))

  const upNext = () => TRACKS.map((t, i) => ({ track: t, i })).filter(({ i }) => i !== index())

  return (
    <Window
      id="music"
      title="Music"
      frameless
      class="mu"
      style={{
        '--c1': track().colors[0],
        '--c2': track().colors[1],
        '--c3': track().colors[2],
      }}
    >
      <div class="mu-backdrop" />
      <div class="mu-drag" data-drag />
      <div class="mu-content">
        <div class="mu-stage" classList={{ 'is-playing': playing() }}>
          <Artwork track={track()} class="mu-art-large" />
        </div>
        <div class="mu-info">
          <div class="mu-title">{track().title}</div>
          <div class="mu-artist">
            {track().artist} — {track().album}
          </div>
        </div>

        <div class="mu-progress">
          <Slider
            label="Playback position"
            value={shown() / track().duration}
            onChange={(v) => setScrub(v * track().duration)}
            onCommit={(v) => {
              setPosition(v * track().duration)
              setScrub(null)
            }}
          />
          <div class="mu-times">
            <span>{formatTime(shown())}</span>
            <span>-{formatTime(track().duration - shown())}</span>
          </div>
        </div>

        <div class="mu-controls">
          <button
            class="mu-btn mu-btn-small"
            classList={{ 'is-active': shuffle() }}
            aria-label="Shuffle"
            aria-pressed={shuffle()}
            onClick={() => setShuffle((v) => !v)}
          >
            <Shuffle width="17" height="17" />
          </button>
          <button class="mu-btn" aria-label="Previous" onClick={previous}>
            <Previous width="26" height="26" />
          </button>
          <button class="mu-btn mu-btn-play" aria-label={playing() ? 'Pause' : 'Play'} onClick={() => setPlaying((v) => !v)}>
            <Show when={playing()} fallback={<Play width="34" height="34" />}>
              <Pause width="34" height="34" />
            </Show>
          </button>
          <button class="mu-btn" aria-label="Next" onClick={next}>
            <Next width="26" height="26" />
          </button>
          <button
            class="mu-btn mu-btn-small"
            classList={{ 'is-active': repeat() }}
            aria-label="Repeat"
            aria-pressed={repeat()}
            onClick={() => setRepeat((v) => !v)}
          >
            <Repeat width="17" height="17" />
          </button>
        </div>

        <div class="mu-volume">
          <VolumeLow width="14" height="14" />
          <Slider label="Volume" value={volume()} onChange={setVolume} />
          <VolumeHigh width="16" height="16" />
        </div>

        <div class="mu-queue">
          <div class="mu-queue-heading">Up Next</div>
          <div class="mu-queue-list">
            <For each={upNext()}>
              {({ track: item, i }) => (
                <button class="mu-row" onDblClick={() => play(i)} onClick={(e) => e.detail === 0 && play(i)}>
                  <Artwork track={item} class="mu-art-small" />
                  <span class="mu-row-text">
                    <span class="mu-row-title">{item.title}</span>
                    <span class="mu-row-artist">{item.artist}</span>
                  </span>
                  <span class="mu-row-time">{formatTime(item.duration)}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </Window>
  )
}
