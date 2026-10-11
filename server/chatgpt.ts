import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Connect, Plugin } from 'vite'

const ISSUER = 'https://auth.openai.com'
const AUTHORIZE = `${ISSUER}/api/accounts/authorize`
const TOKEN = `${ISSUER}/api/accounts/oauth/token`
const API = 'https://api.openai.com/v1'
const APP_NAME = 'SI OS'
const PLAN_SCOPE = 'chatgpt.tokens.use.direct'
const SCOPES = `openid profile email offline_access resource.invoke ${PLAN_SCOPE}`
const CALLBACK_PATH = '/auth/callback'
const PREFERRED_PORT = 1455
const SIGN_IN_TIMEOUT = 10 * 60 * 1000
const REFRESH_MARGIN = 60 * 1000
const DIR = join(homedir(), '.config', 'sios')
const ACCOUNT_FILE = join(DIR, 'chatgpt.json')
const HOST_FILE = join(DIR, 'host.json')
const REFRESH_FAILURES = [
  'invalid_grant',
  'invalid_refresh_token',
  'token_expired',
  'refresh_token_expired',
  'refresh_token_invalidated',
  'refresh_token_reused',
]

interface Account {
  email: string
  subject: string
  client_id: string
  ext_agent_host_id: string
  id_token?: string
  access_token?: string
  refresh_token?: string
  expires_at?: number
  scopes?: string[]
  saved_at?: string
}

interface Pending {
  state: string
  nonce: string
  verifier: string
  clientId: string
  redirectUri: string
  listener: Server
  timer: ReturnType<typeof setTimeout>
}

interface ApiError {
  status: number
  code?: string
  message: string
}

let account: Account | undefined
let pending: Pending | undefined
let refreshing: Promise<Account> | undefined
let models: { slug: string; name: string }[] | undefined
let discovery: Promise<{ jwks: ReturnType<typeof createRemoteJWKSet>; revocation: string }> | undefined

const base64url = (bytes: Buffer) => bytes.toString('base64url')
const random = () => base64url(randomBytes(32))

function openid() {
  discovery ??= fetch(`${ISSUER}/.well-known/openid-configuration`)
    .then((r) => r.json() as Promise<{ jwks_uri: string; revocation_endpoint: string }>)
    .then((config) => ({
      jwks: createRemoteJWKSet(new URL(config.jwks_uri)),
      revocation: config.revocation_endpoint,
    }))
  discovery.catch(() => (discovery = undefined))
  return discovery
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return undefined
  }
}

async function writeJson(file: string, value: unknown) {
  await mkdir(DIR, { recursive: true, mode: 0o700 })
  const temp = `${file}.${process.pid}.tmp`
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 })
  await rename(temp, file)
}

async function hostId() {
  const saved = await readJson<{ ext_agent_host_id: string }>(HOST_FILE)
  if (saved?.ext_agent_host_id) return saved.ext_agent_host_id
  const id = `urn:uuid:${randomUUID()}`
  await writeJson(HOST_FILE, { ext_agent_host_id: id })
  return id
}

async function loadAccount() {
  account ??= await readJson<Account>(ACCOUNT_FILE)
  return account
}

async function saveAccount(next: Account) {
  account = next
  await writeJson(ACCOUNT_FILE, next)
}

const canUsePlan = (a?: Account) => !!a?.access_token && !!a.scopes?.includes(PLAN_SCOPE)

function form(body: Record<string, string>) {
  return { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) }
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN, form(body))
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw Object.assign(new Error(String(json.error_description ?? json.error ?? res.statusText)), { code: json.error })
  return json as { access_token: string; refresh_token?: string; id_token?: string; expires_in?: number; scope?: string }
}

function applyTokens(a: Account, tokens: Awaited<ReturnType<typeof tokenRequest>>, scope?: string): Account {
  return {
    ...a,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? a.refresh_token,
    id_token: tokens.id_token ?? a.id_token,
    expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    scopes: (tokens.scope ?? scope)?.split(/[\s+]+/).filter(Boolean) ?? a.scopes,
    saved_at: new Date().toISOString(),
  }
}

function clearTokens(a: Account): Account {
  return { email: a.email, subject: a.subject, client_id: a.client_id, ext_agent_host_id: a.ext_agent_host_id }
}

async function freshAccount() {
  const a = await loadAccount()
  if (!a?.access_token) throw { status: 401, message: 'Not signed in.' } satisfies ApiError
  if (!a.expires_at || a.expires_at - REFRESH_MARGIN > Date.now()) return a
  if (!a.refresh_token) throw { status: 401, message: 'Session expired. Sign in again.' } satisfies ApiError
  refreshing ??= tokenRequest({
    grant_type: 'refresh_token',
    client_id: a.client_id,
    refresh_token: a.refresh_token,
    resource: API,
  })
    .then(async (tokens) => {
      const next = applyTokens(a, tokens)
      await saveAccount(next)
      return next
    })
    .catch(async (error: { code?: string; message?: string }) => {
      if (error.code && REFRESH_FAILURES.includes(error.code)) {
        await saveAccount(clearTokens(a))
        throw { status: 401, code: error.code, message: 'Session expired. Sign in again.' } satisfies ApiError
      }
      throw { status: 503, code: error.code, message: error.message ?? 'Could not renew the session.' } satisfies ApiError
    })
    .finally(() => (refreshing = undefined))
  return refreshing
}

async function listModels(a: Account) {
  if (models) return models
  const res = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${a.access_token}` } })
  if (!res.ok) return []
  const json = (await res.json()) as { models?: { slug: string; display_name: string; visibility?: string }[] }
  models = (json.models ?? []).filter((m) => m.visibility === 'list').map((m) => ({ slug: m.slug, name: m.display_name }))
  return models
}

function listen(port: number) {
  return new Promise<Server>((resolve, reject) => {
    const listener = createServer(handleCallback)
    listener.once('error', reject)
    listener.listen(port, '127.0.0.1', () => resolve(listener))
  })
}

function stopPending() {
  if (!pending) return
  clearTimeout(pending.timer)
  pending.listener.close()
  pending = undefined
}

async function startSignIn() {
  stopPending()
  const listener = await listen(PREFERRED_PORT).catch(() => listen(0))
  const port = (listener.address() as { port: number }).port
  const saved = await loadAccount()
  const state = random()
  const nonce = random()
  const verifier = random()
  const clientId = saved?.client_id ?? 'dynamic_agent_client'
  const redirectUri = `http://127.0.0.1:${port}${CALLBACK_PATH}`
  pending = { state, nonce, verifier, clientId, redirectUri, listener, timer: setTimeout(stopPending, SIGN_IN_TIMEOUT) }

  const params = new URLSearchParams({
    client_id: clientId,
    ext_agent_host_id: saved?.ext_agent_host_id ?? (await hostId()),
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    resource: API,
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge: base64url(createHash('sha256').update(verifier).digest()),
  })
  if (clientId === 'dynamic_agent_client') params.set('agent_name_hint', APP_NAME)
  else {
    if (saved?.id_token) params.set('id_token_hint', saved.id_token)
    if (saved?.email) params.set('login_hint', saved.email)
  }
  return `${AUTHORIZE}?${params}`
}

function page(res: ServerResponse, status: number, title: string, detail: string, ok: boolean) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title>
<body style="margin:0;display:grid;place-items:center;height:100vh;background:#0b0b10;color:#fff;font:15px system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased">
<div style="text-align:center"><div style="font-size:20px;font-weight:600;margin-bottom:6px">${title}</div><div style="opacity:.6">${detail}</div></div>
<script>window.opener&&window.opener.postMessage({type:'si:chatgpt',ok:${ok}},'*');${ok ? 'setTimeout(()=>window.close(),600)' : ''}</script>`)
}

async function handleCallback(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  if (url.pathname !== CALLBACK_PATH) {
    res.writeHead(404).end()
    return
  }
  const attempt = pending
  if (!attempt || url.searchParams.get('state') !== attempt.state) {
    page(res, 400, 'Sign-in expired', 'Start again from SI OS.', false)
    return
  }
  setTimeout(stopPending, 100)

  const error = url.searchParams.get('error')
  if (error) {
    const declined = error === 'access_denied'
    page(res, 400, declined ? 'Sign-in cancelled' : 'Sign-in failed', declined ? 'SI OS was not given access.' : error, false)
    return
  }

  const returned = url.searchParams.get('client_id')
  const registering = attempt.clientId === 'dynamic_agent_client'
  const clientId = registering ? returned : attempt.clientId
  if (!clientId || (!registering && returned && returned !== attempt.clientId)) {
    page(res, 400, 'Sign-in failed', 'OpenAI returned an unexpected client.', false)
    return
  }

  try {
    const tokens = await tokenRequest({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: url.searchParams.get('code') ?? '',
      code_verifier: attempt.verifier,
      redirect_uri: attempt.redirectUri,
      resource: API,
    })
    if (!tokens.id_token) throw new Error('No ID token in the response.')
    const { jwks } = await openid()
    const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: ISSUER, audience: clientId })
    if (payload.nonce !== attempt.nonce) throw new Error('The ID token does not match this sign-in.')

    const saved = await loadAccount()
    if (!registering && saved?.subject && saved.subject !== payload.sub) throw new Error('Signed in as a different account.')
    const next = applyTokens(
      {
        email: String(payload.email ?? ''),
        subject: String(payload.sub),
        client_id: clientId,
        ext_agent_host_id: saved?.ext_agent_host_id ?? (await hostId()),
      },
      tokens,
      url.searchParams.get('scope') ?? undefined,
    )
    models = undefined
    await saveAccount(next)
    page(
      res,
      200,
      canUsePlan(next) ? 'Signed in' : 'Signed in without plan access',
      canUsePlan(next) ? 'You can close this window.' : 'SI OS can’t use your ChatGPT plan until you allow it.',
      true,
    )
  } catch (e) {
    page(res, 400, 'Sign-in failed', e instanceof Error ? e.message : 'Unknown error', false)
  }
}

async function session() {
  const a = await loadAccount()
  if (!a?.access_token) return { available: true, signedIn: false, sharing: false }
  const sharing = canUsePlan(a)
  let model: string | undefined
  if (sharing) {
    try {
      const fresh = await freshAccount()
      model = process.env.SI_MODEL || (await listModels(fresh))[0]?.slug
    } catch (e) {
      const error = e as ApiError
      if (error.status === 401) return { available: true, signedIn: false, sharing: false }
    }
  }
  return { available: true, signedIn: true, email: a.email, sharing, model }
}

async function signOut() {
  stopPending()
  const a = await loadAccount()
  if (!a?.access_token) return { revoked: true }
  let revoked = false
  if (a.refresh_token) {
    try {
      const { revocation } = await openid()
      const res = await fetch(
        revocation,
        form({ token: a.refresh_token, token_type_hint: 'refresh_token', client_id: a.client_id }),
      )
      revoked = res.ok
    } catch {
      revoked = false
    }
  }
  models = undefined
  await saveAccount(clearTokens(a))
  return { revoked }
}

async function apiError(res: Response): Promise<ApiError> {
  const text = await res.text()
  try {
    const json = JSON.parse(text) as { error?: { code?: string; message?: string }; detail?: string }
    return { status: res.status, code: json.error?.code, message: json.error?.message ?? json.detail ?? text }
  } catch {
    return { status: res.status, message: text || res.statusText }
  }
}

async function respond(body: { instructions?: string; input: unknown[]; tools?: unknown[] }) {
  const a = await freshAccount()
  if (!canUsePlan(a)) throw { status: 403, code: 'plan_not_enabled', message: 'ChatGPT plan use is not enabled.' } satisfies ApiError
  const model = process.env.SI_MODEL || (await listModels(a))[0]?.slug
  if (!model) throw { status: 503, message: 'No models are available for this account.' } satisfies ApiError

  const res = await fetch(`${API}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.access_token}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      model,
      instructions: body.instructions,
      input: body.input,
      tools: body.tools,
      store: false,
      stream: true,
    }),
  })
  if (!res.ok || !res.body) throw await apiError(res)

  const decoder = new TextDecoder()
  const items: unknown[] = []
  let buffer = ''
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let end: number
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      const data = raw
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data || data === '[DONE]') continue
      const event = JSON.parse(data) as {
        type: string
        item?: unknown
        output_index?: number
        response?: { output: unknown[]; error?: { code?: string; message?: string }; incomplete_details?: { reason?: string } }
        error?: { code?: string; message?: string }
      }
      if (event.type === 'response.output_item.done') items[event.output_index ?? items.length] = event.item
      if (event.type === 'response.completed') {
        const output = event.response?.output?.length ? event.response.output : items.filter(Boolean)
        return { output, model }
      }
      if (event.type === 'response.failed') {
        const error = event.response?.error
        throw { status: 502, code: error?.code, message: error?.message ?? 'The response failed.' } satisfies ApiError
      }
      if (event.type === 'response.incomplete') {
        throw { status: 502, code: 'incomplete', message: event.response?.incomplete_details?.reason ?? 'The response stopped early.' } satisfies ApiError
      }
      if (event.type === 'error') {
        throw { status: 502, code: event.error?.code, message: event.error?.message ?? 'The response failed.' } satisfies ApiError
      }
    }
  }
  throw { status: 502, code: 'interrupted', message: 'The response stream ended early.' } satisfies ApiError
}

function sameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function send(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(value))
}

async function readBody(req: IncomingMessage) {
  let text = ''
  for await (const chunk of req) text += chunk
  return JSON.parse(text || '{}')
}

const handler: Connect.NextHandleFunction = (req, res, next) => {
  const route = `${req.method} ${(req.url ?? '/').split('?')[0]}`
  const run = async () => {
    if (route === 'GET /session') return send(res, 200, await session())
    if (route === 'GET /signin') {
      res.writeHead(302, { Location: await startSignIn(), 'Cache-Control': 'no-store' })
      return res.end()
    }
    if (!sameOrigin(req) || !req.headers['content-type']?.startsWith('application/json')) return send(res, 403, { error: { message: 'Forbidden' } })
    if (route === 'POST /signout') return send(res, 200, await signOut())
    if (route === 'POST /respond') return send(res, 200, await respond(await readBody(req)))
    next()
  }
  run().catch((e: ApiError | Error) => {
    const error = 'status' in e ? e : { status: 500, message: e.message }
    send(res, error.status, { error: { code: error.code, message: error.message } })
  })
}

export function chatgpt(): Plugin {
  return {
    name: 'si-chatgpt',
    configureServer(server) {
      server.middlewares.use('/api/si', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/si', handler)
    },
  }
}
