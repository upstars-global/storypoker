import type { Page, Request, Route, WebSocketRoute } from '@playwright/test'
import type { Database } from '../../../app/lib/database.types'

export const VISUAL_SUPABASE_URL = 'https://visual-fake.supabase.co'
export const VISUAL_SUPABASE_KEY = 'sb_publishable_visual_fake_key'
export const VISUAL_SUPABASE_HOST = new URL(VISUAL_SUPABASE_URL).host
export const VISUAL_SUPABASE_AUTH_STORAGE_KEY = `sb-${new URL(VISUAL_SUPABASE_URL).hostname.split('.')[0]}-auth-token`

const PASSTHROUGH_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)
const QUIET_PERIOD_MS = 150

type PublicTables = Database['public']['Tables']
export type TableName = keyof PublicTables
export type FakeTables = { [K in TableName]: PublicTables[K]['Row'][] }
type Row = Record<string, unknown>

const PRIMARY_KEYS: Record<TableName, string> = {
  rooms: 'id',
  room_state: 'room_id',
  players: 'id',
  round_history: 'id',
  user_profiles: 'user_id',
}

const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

export interface FakeAuthUser {
  id: string
  email: string
}

export interface FakeAuthSession {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  expires_at: number
  user: Row
}

export interface FakeSupabaseOptions {
  tables: FakeTables
  now: string
  appOrigin: string
  authUser: FakeAuthUser | null
  onlinePlayerIds: string[]
}

export interface FakeSupabase {
  readonly tables: FakeTables
  readonly session: FakeAuthSession | null
  readonly unhandled: string[]
  readonly handled: string[]
  readonly presenceTracked: Promise<string>
  idle(): Promise<void>
}

interface ChannelBinding {
  id: number
  event: string
  schema: string
  table?: string
  filter?: string
}

interface JoinedChannel {
  topic: string
  joinRef: string | null
  bindings: ChannelBinding[]
  broadcastSelf: boolean
}

interface SocketState {
  ws: WebSocketRoute
  channels: Map<string, JoinedChannel>
}

type PhoenixMessage = [string | null, string | null, string, string, Row]

function base64Url(value: object | string): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return Buffer.from(text).toString('base64url')
}

export function fakeAuthSession(user: FakeAuthUser, now: string): FakeAuthSession {
  const issuedAt = Math.floor(new Date(now).getTime() / 1000)
  const expiresIn = 10 * 365 * 24 * 60 * 60
  const claims = {
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    iat: issuedAt,
    exp: issuedAt + expiresIn,
  }
  return {
    access_token: `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(claims)}.${base64Url('visual-fake-signature')}`,
    refresh_token: 'visual-fake-refresh-token',
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: issuedAt + expiresIn,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: now,
      phone: '',
      confirmed_at: now,
      last_sign_in_at: now,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: now,
      updated_at: now,
      is_anonymous: false,
    },
  }
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quoted = false
  let current = ''
  for (const char of input) {
    if (char === '"') quoted = !quoted
    if (!quoted && char === '(') depth++
    if (!quoted && char === ')') depth--
    if (!quoted && depth === 0 && char === ',') {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) parts.push(current)
  return parts
}

function unquote(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).replace(/\\"/g, '"') : value
}

function compareCells(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

class UnsupportedQuery extends Error {}

function matchesFilter(row: Row, column: string, expression: string): boolean {
  const negated = expression.startsWith('not.')
  const body = negated ? expression.slice(4) : expression
  const dot = body.indexOf('.')
  if (dot < 0) throw new UnsupportedQuery(`filter ${column}=${expression}`)
  const operator = body.slice(0, dot)
  const raw = body.slice(dot + 1)
  const cell = row[column]
  let result: boolean
  switch (operator) {
    case 'eq':
      result = cell !== null && cell !== undefined && String(cell) === unquote(raw)
      break
    case 'neq':
      result = cell !== null && cell !== undefined && String(cell) !== unquote(raw)
      break
    case 'in': {
      if (!raw.startsWith('(') || !raw.endsWith(')')) throw new UnsupportedQuery(`filter ${column}=${expression}`)
      const values = splitTopLevel(raw.slice(1, -1)).map(unquote)
      result = cell !== null && cell !== undefined && values.includes(String(cell))
      break
    }
    case 'is':
      if (raw === 'null') result = cell === null || cell === undefined
      else if (raw === 'true') result = cell === true
      else if (raw === 'false') result = cell === false
      else throw new UnsupportedQuery(`filter ${column}=${expression}`)
      break
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (cell === null || cell === undefined) {
        result = false
        break
      }
      const numeric = typeof cell === 'number' ? Number(raw) : unquote(raw)
      const order = compareCells(cell, numeric)
      result = operator === 'gt' ? order > 0 : operator === 'gte' ? order >= 0 : operator === 'lt' ? order < 0 : order <= 0
      break
    }
    default:
      throw new UnsupportedQuery(`operator ${operator} in ${column}=${expression}`)
  }
  return negated ? !result : result
}

function matchesOrGroup(row: Row, group: string): boolean {
  if (!group.startsWith('(') || !group.endsWith(')')) throw new UnsupportedQuery(`or=${group}`)
  return splitTopLevel(group.slice(1, -1)).some(condition => {
    const dot = condition.indexOf('.')
    if (dot < 0) throw new UnsupportedQuery(`or=${group}`)
    return matchesFilter(row, condition.slice(0, dot), condition.slice(dot + 1))
  })
}

function filterRows(rows: Row[], params: URLSearchParams): Row[] {
  return rows.filter(row => {
    for (const [key, value] of params) {
      if (RESERVED_PARAMS.has(key)) continue
      if (key === 'or') {
        if (!matchesOrGroup(row, value)) return false
        continue
      }
      if (key === 'and' || key === 'not.or' || key === 'not.and') throw new UnsupportedQuery(`${key}=${value}`)
      if (!matchesFilter(row, key, value)) return false
    }
    return true
  })
}

function orderRows(rows: Row[], order: string | null): Row[] {
  if (!order) return rows
  const terms = order.split(',').map(term => {
    const [column = '', direction = 'asc', nulls] = term.split('.')
    const descending = direction === 'desc'
    const nullsFirst = nulls ? nulls === 'nullsfirst' : descending
    return { column, descending, nullsFirst }
  })
  return [...rows].sort((a, b) => {
    for (const { column, descending, nullsFirst } of terms) {
      const left = a[column]
      const right = b[column]
      const leftNull = left === null || left === undefined
      const rightNull = right === null || right === undefined
      if (leftNull && rightNull) continue
      if (leftNull) return nullsFirst ? -1 : 1
      if (rightNull) return nullsFirst ? 1 : -1
      const result = compareCells(left, right)
      if (result !== 0) return descending ? -result : result
    }
    return 0
  })
}

function projectRows(rows: Row[], select: string | null): Row[] {
  if (!select || select === '*') return rows.map(row => ({ ...row }))
  const columns = select.split(',').map(column => column.trim())
  if (columns.some(column => /[()!:]/.test(column))) throw new UnsupportedQuery(`select=${select}`)
  return rows.map(row => Object.fromEntries(columns.map(column => [column, row[column] ?? null])))
}

function pageRows(rows: Row[], params: URLSearchParams): Row[] {
  const offset = Number(params.get('offset') ?? 0)
  const limit = params.get('limit')
  return rows.slice(offset, limit === null ? undefined : offset + Number(limit))
}

function wantsObject(request: Request): boolean {
  return (request.headers()['accept'] ?? '').startsWith('application/vnd.pgrst.object+json')
}

function preferHeader(request: Request): string {
  return request.headers()['prefer'] ?? ''
}

function parseBody(request: Request): Row[] {
  const body = request.postDataJSON() as Row | Row[] | null
  if (!body) return []
  return Array.isArray(body) ? body : [body]
}

export async function installFakeSupabase(page: Page, options: FakeSupabaseOptions): Promise<FakeSupabase> {
  const tables = options.tables
  const session = options.authUser ? fakeAuthSession(options.authUser, options.now) : null
  const unhandled: string[] = []
  const handled: string[] = []
  const sockets = new Set<SocketState>()
  const trackedPlayerIds = new Set<string>()
  const appOrigin = new URL(options.appOrigin).origin
  let pending = 0
  let lastActivity = Date.now()
  let generatedIds = 0
  let bindingIds = 0
  let resolvePresence: (playerId: string) => void = () => {}
  const presenceTracked = new Promise<string>(resolve => { resolvePresence = resolve })

  function rowsOf(table: TableName): Row[] {
    return tables[table] as unknown as Row[]
  }

  function nextId(): string {
    generatedIds++
    return `f0000000-0000-4000-8000-${String(generatedIds).padStart(12, '0')}`
  }

  function rowDefaults(table: TableName): Row {
    switch (table) {
      case 'rooms':
        return {
          background_opacity: null,
          background_owner_id: null,
          background_updated_at: null,
          background_url: null,
          created_at: options.now,
          name: null,
          slug: null,
        }
      case 'room_state':
        return {
          active_cards: ['1/2', '1', '2', '3', '5', '8', '13', '20', '?', '☕'],
          alarm_minutes: null,
          alarm_muted: null,
          deck_preset: 'scrum',
          paused_at: null,
          paused_elapsed_ms: 0,
          phase: 'voting',
          poll_question: null,
          result_cohorts: null,
          round_started_at: options.now,
        }
      case 'players':
        return {
          id: nextId(),
          created_at: options.now,
          is_moderator: false,
          left_at: null,
          room_id: null,
          shields: [],
          user_id: null,
          vote: null,
        }
      case 'round_history':
        return { id: nextId(), active_cards: null, created_at: options.now, deck_preset: null }
      case 'user_profiles':
        return { avatar_style: 'bottts', avatar_url: null, updated_at: options.now }
    }
  }

  function send(socket: SocketState, message: PhoenixMessage) {
    socket.ws.send(JSON.stringify(message))
  }

  function broadcastChange(table: TableName, type: 'INSERT' | 'UPDATE' | 'DELETE', record: Row | null, oldRecord: Row | null) {
    const subject = record ?? oldRecord ?? {}
    for (const socket of sockets) {
      for (const channel of socket.channels.values()) {
        const ids = channel.bindings
          .filter(binding => binding.schema === 'public' && binding.table === table)
          .filter(binding => binding.event === '*' || binding.event === type)
          .filter(binding => {
            if (!binding.filter) return true
            const match = /^([^=]+)=(.+)$/.exec(binding.filter)
            return match ? matchesFilter(subject, match[1]!, match[2]!) : false
          })
          .map(binding => binding.id)
        if (!ids.length) continue
        send(socket, [null, null, channel.topic, 'postgres_changes', {
          ids,
          data: {
            schema: 'public',
            table,
            commit_timestamp: options.now,
            type,
            columns: [],
            record: record ?? {},
            old_record: oldRecord ?? {},
            errors: null,
          },
        }])
      }
    }
  }

  async function respondRest(route: Route, request: Request, table: TableName, params: URLSearchParams) {
    const method = request.method()
    const rows = rowsOf(table)
    let result: Row[]
    let status = 200
    if (method === 'GET') {
      result = pageRows(orderRows(filterRows(rows, params), params.get('order')), params)
    } else if (method === 'PATCH') {
      const patch = parseBody(request)[0] ?? {}
      const targets = filterRows(rows, params)
      result = targets.map(row => {
        const previous = { ...row }
        Object.assign(row, patch)
        broadcastChange(table, 'UPDATE', { ...row }, previous)
        return row
      })
    } else if (method === 'POST') {
      const upsert = preferHeader(request).includes('resolution=merge-duplicates')
      const key = params.get('on_conflict') ?? PRIMARY_KEYS[table]
      result = parseBody(request).map(input => {
        const existing = upsert ? rows.find(row => row[key] === input[key]) : undefined
        if (existing) {
          const previous = { ...existing }
          Object.assign(existing, input)
          broadcastChange(table, 'UPDATE', { ...existing }, previous)
          return existing
        }
        const created = { ...rowDefaults(table), ...input }
        rows.push(created)
        broadcastChange(table, 'INSERT', { ...created }, null)
        return created
      })
      status = 201
    } else if (method === 'DELETE') {
      const targets = new Set(filterRows(rows, params))
      result = [...targets]
      tables[table] = rows.filter(row => !targets.has(row)) as never
      for (const row of result) broadcastChange(table, 'DELETE', null, { ...row })
    } else {
      throw new UnsupportedQuery(`method ${method}`)
    }

    if (method !== 'GET' && !preferHeader(request).includes('return=representation')) {
      await route.fulfill({ status: 204, body: '' })
      return
    }
    const projected = projectRows(result, params.get('select'))
    if (wantsObject(request)) {
      if (projected.length !== 1) {
        await route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST116',
            details: `The result contains ${projected.length} rows`,
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          }),
        })
        return
      }
      await route.fulfill({ status, contentType: 'application/vnd.pgrst.object+json', body: JSON.stringify(projected[0]) })
      return
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(projected) })
  }

  async function respondAuth(route: Route, request: Request, endpoint: string, params: URLSearchParams): Promise<boolean> {
    const method = request.method()
    if (endpoint === 'user' && method === 'GET') {
      if (session) await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) })
      else await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 401, error_code: 'no_authorization', msg: 'No session' }) })
      return true
    }
    if (endpoint === 'token' && method === 'POST' && params.get('grant_type') === 'refresh_token' && session) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) })
      return true
    }
    if (endpoint === 'logout' && method === 'POST') {
      await route.fulfill({ status: 204, body: '' })
      return true
    }
    return false
  }

  async function respondStorage(route: Route, request: Request, path: string): Promise<boolean> {
    const method = request.method()
    if (method === 'GET' && path.startsWith('object/public/')) {
      await route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG })
      return true
    }
    if ((method === 'POST' || method === 'PUT') && path.startsWith('object/')) {
      const key = path.slice('object/'.length)
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: key, Id: nextId() }) })
      return true
    }
    if (method === 'DELETE' && path.startsWith('object/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return true
    }
    return false
  }

  async function respondSupabase(route: Route, request: Request, url: URL): Promise<boolean> {
    const rest = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname)
    if (rest) {
      const table = rest[1] as TableName
      if (!(table in PRIMARY_KEYS)) return false
      await respondRest(route, request, table, url.searchParams)
      return true
    }
    const auth = /^\/auth\/v1\/(.+)$/.exec(url.pathname)
    if (auth) return respondAuth(route, request, auth[1]!, url.searchParams)
    const storage = /^\/storage\/v1\/(.+)$/.exec(url.pathname)
    if (storage) return respondStorage(route, request, storage[1]!)
    return false
  }

  await page.route(() => true, async (route, request) => {
    const url = new URL(request.url())
    if (url.origin === appOrigin) {
      await route.fallback()
      return
    }
    if (PASSTHROUGH_HOSTS.has(url.host)) {
      await route.continue()
      return
    }
    const label = `${request.method()} ${url.origin}${url.pathname}${url.search}`
    if (url.host !== VISUAL_SUPABASE_HOST) {
      unhandled.push(`external ${label}`)
      await route.abort('blockedbyclient')
      return
    }
    pending++
    lastActivity = Date.now()
    try {
      const served = await respondSupabase(route, request, url)
      if (served) {
        handled.push(label)
      } else {
        unhandled.push(label)
        await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ message: `visual fake: unhandled ${label}` }) })
      }
    } catch (error) {
      unhandled.push(`${label} (${error instanceof Error ? error.message : String(error)})`)
      await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ message: `visual fake: unsupported ${label}` }) })
    } finally {
      pending--
      lastActivity = Date.now()
    }
  })

  function presenceState(): Row {
    const ids = new Set([...options.onlinePlayerIds, ...trackedPlayerIds])
    return Object.fromEntries([...ids].map((playerId, index) => [
      `presence-${playerId}`,
      { metas: [{ phx_ref: `visual-ref-${index}`, playerId }] },
    ]))
  }

  function decodeBinaryBroadcast(buffer: Buffer): { joinRef: string; ref: string; topic: string; event: string; payload: unknown } | null {
    if (buffer.readUInt8(0) !== 3) return null
    const lengths = [1, 2, 3, 4, 5].map(index => buffer.readUInt8(index))
    const encoding = buffer.readUInt8(6)
    let offset = 7
    const [joinRef = '', ref = '', topic = '', event = ''] = lengths.map(length => {
      const text = buffer.subarray(offset, offset + length).toString('utf8')
      offset += length
      return text
    })
    const rest = buffer.subarray(offset)
    const payload = encoding === 1 ? JSON.parse(rest.toString('utf8') || '{}') : rest
    return { joinRef, ref, topic, event, payload }
  }

  function echoBroadcast(socket: SocketState, topic: string, ref: string | null, joinRef: string | null, event: string, payload: unknown) {
    const channel = socket.channels.get(topic)
    if (ref) send(socket, [joinRef, ref, topic, 'phx_reply', { status: 'ok', response: {} }])
    if (channel?.broadcastSelf) send(socket, [null, null, topic, 'broadcast', { type: 'broadcast', event, payload } as Row])
  }

  function handleRealtimeMessage(socket: SocketState, raw: string | Buffer) {
    lastActivity = Date.now()
    if (typeof raw !== 'string') {
      const decoded = decodeBinaryBroadcast(raw)
      if (!decoded) {
        unhandled.push(`realtime binary frame kind ${raw.readUInt8(0)}`)
        return
      }
      echoBroadcast(socket, decoded.topic, decoded.ref || null, decoded.joinRef || null, decoded.event, decoded.payload)
      return
    }
    const [joinRef, ref, topic, event, payload] = JSON.parse(raw) as PhoenixMessage
    const ok = (response: Row = {}) => send(socket, [joinRef, ref, topic, 'phx_reply', { status: 'ok', response }])
    if (topic === 'phoenix' && event === 'heartbeat') {
      ok()
      return
    }
    switch (event) {
      case 'phx_join': {
        const config = (payload.config ?? {}) as { postgres_changes?: Omit<ChannelBinding, 'id'>[]; broadcast?: { self?: boolean } }
        const bindings = (config.postgres_changes ?? []).map(binding => ({ ...binding, id: ++bindingIds }))
        socket.channels.set(topic, { topic, joinRef, bindings, broadcastSelf: config.broadcast?.self === true })
        ok({ postgres_changes: bindings })
        return
      }
      case 'phx_leave':
        socket.channels.delete(topic)
        ok()
        return
      case 'access_token':
        return
      case 'presence': {
        const presenceEvent = payload.event
        if (presenceEvent === 'track') {
          const playerId = (payload.payload as { playerId?: string } | undefined)?.playerId
          ok()
          if (playerId) trackedPlayerIds.add(playerId)
          send(socket, [joinRef, null, topic, 'presence_state', presenceState()])
          if (playerId) resolvePresence(playerId)
          return
        }
        if (presenceEvent === 'untrack') {
          ok()
          return
        }
        break
      }
      case 'broadcast':
        echoBroadcast(socket, topic, ref, joinRef, String(payload.event ?? ''), payload.payload)
        return
    }
    unhandled.push(`realtime ${topic} ${event}`)
  }

  await page.routeWebSocket(() => true, ws => {
    const url = new URL(ws.url())
    if (url.host !== VISUAL_SUPABASE_HOST || !url.pathname.startsWith('/realtime/v1/')) {
      unhandled.push(`websocket ${url.origin}${url.pathname}`)
      void ws.close({ code: 1008, reason: 'visual fake: unrouted websocket' })
      return
    }
    handled.push(`WS ${url.origin}${url.pathname}`)
    const socket: SocketState = { ws, channels: new Map() }
    sockets.add(socket)
    ws.onMessage(message => handleRealtimeMessage(socket, message))
    ws.onClose(() => { sockets.delete(socket) })
  })

  async function idle(): Promise<void> {
    const startedAt = Date.now()
    while (pending > 0 || Date.now() - lastActivity < QUIET_PERIOD_MS) {
      if (Date.now() - startedAt > 10_000) throw new Error(`visual fake: still busy after 10s (${pending} pending)`)
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }

  return {
    get tables() { return tables },
    session,
    unhandled,
    handled,
    presenceTracked,
    idle,
  }
}
