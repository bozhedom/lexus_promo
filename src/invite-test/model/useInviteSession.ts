'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchCarPhotos } from '@/shared/lib/useCarPhotos'
import { preloadSceneAssets } from '@/shared/lib/useSceneAssets'
import { certificateFace } from '@/widgets/certificate-sheet'

import * as api from '../api/client'
import type { Channel, DeliveryStatus, PersonalInviteDetails, SessionResponse } from './types'

const POLL_MS = 2500
const POLL_LIMIT_MS = 120_000

export interface InviteOwner {
  applicationId?: string | null
  sessionId?: string | null
}

export function useInviteSession(details: PersonalInviteDetails | null, owner?: InviteOwner) {
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
      .createSession(details, owner)
      .then(async (data) => {
        // Кадры пригласительных догружаем до показа модалки: сами карточки
        // рисуются разметкой, и без фотографии они мигнули бы чёрным.
        const car = { brand: details.brand, model: details.model, year: details.year }
        const photos = await fetchCarPhotos()
        await preloadSceneAssets([
          certificateFace('diagnostics', car, photos).photo,
          certificateFace('gift', car, photos).photo,
        ])
        if (alive) {
          setResolvedKey(detailsKey)
          setSession(data)
        }
      })
      .catch(() => alive && setSession(null))
    return () => {
      alive = false
    }
    // `owner` не в зависимостях намеренно: заявка у экрана одна, а новый
    // объект на каждый рендер перезапускал бы выдачу кода.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** Возвращает `true`, если мессенджер действительно открылся. */
  const openChat = useCallback(
    (channel: Channel) => {
      const info = activeSession?.channels[channel]
      if (!info?.chatLink) return false

      setOpened(channel)
      if (info.autoDelivery) {
        startedAt.current = Date.now()
        setError(null)
        setStatus('waiting')
      }
      window.open(info.chatLink, '_blank', 'noopener,noreferrer')
      return true
    },
    [activeSession],
  )

  return { session: activeSession, status, error, opened, openChat }
}
