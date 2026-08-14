import { randomInt } from 'node:crypto'

import { inviteTestEnv } from '../config/env'
import {
  InviteContentFields,
  personalCertificates,
  replyText,
  resolveInviteContent,
} from '../config/certificates'
import type { DeliveryStatus, InviteSession, PersonalInviteDetails } from '../model/types'

// Сессии живут в памяти процесса: ради них не заводим коллекцию и миграцию.
// При перезапуске сервера выданные коды протухают.
//
// Храним на globalThis, а не в модульной переменной: и в dev с горячей
// перезагрузкой, и при раздельной сборке маршрутов модуль загружается не один
// раз, и тогда выдавший код обработчик и читающий его вебхук смотрят в разные
// Map — код «не находится» сразу после выдачи.
const globalStore = globalThis as typeof globalThis & {
  __invitePromoSessions?: Map<string, InviteSession>
  __invitePromoBusinessId?: string
}

const sessions: Map<string, InviteSession> = (globalStore.__invitePromoSessions ??= new Map())

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

export function createSession(
  fullName: string,
  fields?: InviteContentFields | null,
  personal?: PersonalInviteDetails | null,
): InviteSession {
  sweep()
  if (sessions.size >= MAX_SESSIONS) sessions.clear()

  let code = makeCode()
  while (sessions.has(code)) code = makeCode()

  const content = resolveInviteContent(fullName, fields)
  const details: PersonalInviteDetails = personal ?? {
    fullName,
    brand: 'Lexus',
    model: '',
    year: null,
    plate: '',
    amount: 1500,
  }
  const session: InviteSession = {
    code,
    fullName,
    createdAt: Date.now(),
    status: 'idle',
    error: null,
    ...content,
    certificates: fields?.certificates?.length ? content.certificates : personalCertificates(code),
    deliveryText: fields?.deliveryText?.trim()
      ? content.deliveryText
      : replyText(fullName, details, fields?.deliveryTemplate),
    details,
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
// подключает бота в настройках. Держим его рядом с сессиями, по той же причине
// на globalThis.
export const setBusinessId = (id: string) => {
  globalStore.__invitePromoBusinessId = id
}

export const getBusinessId = (): string =>
  inviteTestEnv.telegram.businessId || globalStore.__invitePromoBusinessId || ''
