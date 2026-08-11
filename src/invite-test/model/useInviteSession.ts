'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { preloadSceneAssets } from '@/shared/lib/useSceneAssets'

import * as api from '../api/client'
import type { Channel, DeliveryStatus, PersonalInviteDetails, SessionResponse } from './types'

const POLL_MS = 2500
const POLL_LIMIT_MS = 120_000

export function useInviteSession(details: PersonalInviteDetails | null) {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [resolvedKey, setResolvedKey] = useState('')
  const [status, setStatus] = useState<DeliveryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [opened, setOpened] = useState<Channel | null>(null)
  const startedAt = useRef(0)
  const detailsKey = details ? JSON.stringify(details) : ''
  const activeSession = resolvedKey === detailsKey ? session : null

  useEffect(() => {
    if (!details?.fullName) return
    let alive = true
    api
      .createSession(details)
      .then(async (data) => {
        // Сначала загружаем и декодируем именно персональные изображения, и
        // только потом отдаём сессию модалке. Так встроенные сертификаты не
        // успевают промелькнуть перед серверными.
        await preloadSceneAssets(data.certificates.map((certificate) => certificate.image))
        if (alive) {
          setResolvedKey(detailsKey)
          setSession(data)
        }
      })
      .catch(() => alive && setSession(null))
    return () => {
      alive = false
    }
  }, [details, detailsKey])

  // Пока клиент в диалоге с менеджером, спрашиваем сервер, дошли ли сертификаты
  useEffect(() => {
    if (status !== 'waiting' || !activeSession) return

    const id = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_LIMIT_MS) {
        setStatus('idle')
        return
      }
      try {
        const next = await api.fetchStatus(activeSession.code)
        if (next.status !== 'idle') {
          setStatus(next.status)
          setError(next.error)
        }
      } catch {
        setStatus('idle')
      }
    }, POLL_MS)

    return () => clearInterval(id)
  }, [status, activeSession])

  const openChat = useCallback(
    (channel: Channel) => {
      const info = activeSession?.channels[channel]
      if (!info?.chatLink) return

      setOpened(channel)
      if (info.autoDelivery) {
        startedAt.current = Date.now()
        setError(null)
        setStatus('waiting')
      }
      window.open(info.chatLink, '_blank', 'noopener,noreferrer')
    },
    [activeSession],
  )

  return { session: activeSession, status, error, opened, openChat }
}
