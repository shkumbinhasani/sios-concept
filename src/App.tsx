import { onCleanup, onMount } from 'solid-js'
import { Browser } from './apps/browser/Browser'
import { Canvas } from './apps/canvas/Canvas'
import { Monitor } from './apps/monitor/Monitor'
import { Mail } from './apps/mail/Mail'
import { Messages } from './apps/messages/Messages'
import { MusicPlayer } from './apps/music/MusicPlayer'
import { Notes } from './apps/notes/Notes'
import { Simulator } from './apps/simulator/Simulator'
import { Terminal } from './apps/terminal/Terminal'
import { ChatBar } from './desktop/ChatBar'
import { StageStrip } from './desktop/StageStrip'
import { focusWindow, type WindowId } from './desktop/store'
import './App.css'

function App() {
  onMount(() => {
    const focusFrameWindow = () =>
      setTimeout(() => {
        const active = document.activeElement
        if (!(active instanceof HTMLIFrameElement)) return
        const id = active.closest<HTMLElement>('[data-window]')?.dataset.window
        if (id) focusWindow(id as WindowId)
      })
    window.addEventListener('blur', focusFrameWindow)
    onCleanup(() => window.removeEventListener('blur', focusFrameWindow))
  })

  return (
    <main class="desktop" onContextMenu={(e) => e.preventDefault()}>
      <Browser />
      <MusicPlayer />
      <Messages />
      <Mail />
      <Canvas />
      <Notes />
      <Terminal />
      <Monitor />
      <Simulator />
      <StageStrip />
      <ChatBar />
    </main>
  )
}

export default App
