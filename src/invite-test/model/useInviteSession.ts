'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import * as api from '../api/client'
import type { Channel, DeliveryStatus, SessionResponse } from './types'

const POLL_MS = 2500
const POLL_LIMIT_MS = 120_000

export function useInviteSession(fullName: string) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [status, setStatus] = useState<DeliveryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [opened, setOpened] = useState<Channel | null>(null)
  const startedAt = useRef(0)

  useEffect(() => {
    let alive = true
    api
      .createSession(fullName)
      .then((data) => alive && setSession(data))
      .catch(() => alive && setSession(null))
    return () => {
      alive = false
    }
  }, [fullName])

  // Пока клиент в диалоге с менеджером, спрашиваем сервер, дошли ли сертификаты
  useEffect(() => {
    if (status !== 'waiting' || !session) return

    const id = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_LIMIT_MS) {
        setStatus('idle')
        return
      }
      try {
        const next = await api.fetchStatus(session.code)
        if (next.status !== 'idle') {
          setStatus(next.status)
          setError(next.error)
        }
      } catch {
        setStatus('idle')
      }
    }, POLL_MS)

    return () => clearInterval(id)
  }, [status, session])

  const openChat = useCallback(
    (channel: Channel) => {
      const info = session?.channels[channel]
      if (!info?.chatLink) return

      setOpened(channel)
      if (info.autoDelivery) {
        startedAt.current = Date.now()
        setError(null)
        setStatus('waiting')
      }
      window.open(info.chatLink, '_blank', 'noopener,noreferrer')
    },
    [session],
  )

  return { session, status, error, opened, openChat }
}
