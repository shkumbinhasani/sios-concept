<img src="assets/icon.svg" width="64" height="64" alt="">

# SI OS — concept

A concept for an operating system built around a super intelligence: what a desktop could look like if one main AI ran the machine and handed work to specialised agents. It runs in the browser and is meant to be opened full screen.

Everything here is a prototype. The agents, replies and app data are scripted; nothing calls a real model.

## Ideas it explores

- **Sandboxes in a Stage Manager–style strip.** Each group of windows is a sandbox: this machine, a sub-agent, or a remote server. The strip shows them live, with an icon and a status dot (working, waiting for you, idle).
- **One main chat.** The bar at the bottom talks to the main agent, which routes each message to a quick action, an app, or a sandbox's agent.
- **Safe areas on the desktop.** Fullscreen apps draw under the strip and the chat but keep their content clear of them. Web pages can opt in with a small `postMessage` protocol (`public/sites/si-safe-area.js`).
- **Apps designed for the OS.** A browser where the page is nearly everything, a Markdown viewer the research agent writes into, an infinite canvas the agent brainstorms on, a terminal and activity monitor for the remote server, and music.
- **Demo sites that respect the safe area:** a weather app, a magazine, a map and a social network, under `public/sites/`.

## Run it

```sh
bun install
bun dev
```

Then open the printed address and make the window full screen. Try typing in the chat: `open atlas`, `brainstorm agent safety`, `run the tests on the build server`, `research takeoff speeds`.

Built with SolidJS and Vite. Chromium-based browsers show it best.
