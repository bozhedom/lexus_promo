import { randomInt } from 'node:crypto'

import { inviteTestEnv } from '../config/env'
import { InviteContentFields, resolveInviteContent } from '../config/certificates'
import type { DeliveryStatus, InviteSession } from '../model/types'

// Сессии живут в памяти процесса: модуль тестовый, ради него не заводим
// коллекцию и миграцию. При перезапуске сервера выданные коды протухают.
const sessions = new Map<string, InviteSession>()

const TTL_MS = 60 * 60 * 1000
const MAX_SESSIONS = 5_000

// Без похожих друг на друга символов: код человек видит и может продиктовать
const ALPHABET = 'ACEFHJKLMNPRTUVWXY34679'

function makeCode(): string {
  let code = ''
  for (let i = 0; i < 10; i += 1) code += ALPHABET[randomInt(ALPHABET.length)]
  return code
}

function sweep() {
  const now = Date.now()
  for (const [code, session] of sessions) {
    if (now - session.createdAt > TTL_MS) sessions.delete(code)
  }
}

export function createSession(fullName: string, fields?: InviteContentFields | null): InviteSession {
  sweep()
  if (sessions.size >= MAX_SESSIONS) sessions.clear()

  let code = makeCode()
  while (sessions.has(code)) code = makeCode()

  const content = resolveInviteContent(fullName, fields)
  const session: InviteSession = {
    code,
    fullName,
    createdAt: Date.now(),
    status: 'idle',
    error: null,
    ...content,
  }
  sessions.set(code, session)
  return session
}

export function getSession(code: string): InviteSession | null {
  const session = sessions.get(code)
  if (!session) return null
  if (Date.now() - session.createdAt > TTL_MS) {
    sessions.delete(code)
    return null
  }
  return session
}

export function setStatus(code: string, status: DeliveryStatus, error: string | null = null) {
  const session = sessions.get(code)
  if (!session) return
  session.status = status
  session.error = error
}

/**
 * Атомарно помечает код как занятый отправкой. Синхронная операция над Map не
 * даёт двум одновременно пришедшим webhook запустить повторную доставку.
 */
export function claimSession(code: string): InviteSession | null {
  const session = getSession(code)
  if (!session || session.status === 'waiting' || session.status === 'sent') return null
  session.status = 'waiting'
  session.error = null
  return session
}

// Telegram присылает идентификатор подключения один раз, когда менеджер
// подключает бота в настройках. Держим его рядом с сессиями.
let businessId = ''

export const setBusinessId = (id: string) => {
  businessId = id
}

export const getBusinessId = (): string => inviteTestEnv.telegram.businessId || businessId
