import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { chatgpt } from './server/chatgpt.ts'

export default defineConfig({
  plugins: [solid(), chatgpt()],
})
