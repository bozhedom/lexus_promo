'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { initAnalytics, track as trackEvent } from '@/shared/analytics/tracker'
import type { EventName } from '@/shared/analytics/event-names'
import { captureUtm, clearFunnel, getSessionId, loadFunnel, saveFunnel } from './session'
import type { FunnelData, Utm } from './types'

interface FunnelContextValue {
  data: FunnelData
  ready: boolean
  sessionId: string
  utm: Utm
  update: (patch: Partial<FunnelData>) => void
  reset: () => void
  track: (name: EventName, payload?: Record<string, unknown>) => void
}

const FunnelContext = createContext<FunnelContextValue | null>(null)

export function FunnelProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FunnelData>({})
  const [ready, setReady] = useState(false)
  const sessionIdRef = useRef('')
  const utmRef = useRef<Utm>({})
  const appIdRef = useRef<string | undefined>(undefined)

  // клиентская инициализация: восстановление прогресса + session id + utm
  useEffect(() => {
    sessionIdRef.current = getSessionId()
    utmRef.current = captureUtm()
    const restored = loadFunnel()
    appIdRef.current = restored.applicationId
    setData(restored)
    initAnalytics(sessionIdRef.current)
    setReady(true)
  }, [])

  // держим актуальный applicationId для трекера
  useEffect(() => {
    appIdRef.current = data.applicationId
  }, [data.applicationId])

  const track = useCallback(
    (name: EventName, payload?: Record<string, unknown>) =>
      trackEvent(name, appIdRef.current, payload),
    [],
  )

  const update = useCallback((patch: Partial<FunnelData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch }
      saveFunnel(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    clearFunnel()
    setData({})
  }, [])

  const value = useMemo<FunnelContextValue>(
    () => ({
      data,
      ready,
      sessionId: sessionIdRef.current,
      utm: utmRef.current,
      update,
      reset,
      track,
    }),
    [data, ready, update, reset, track],
  )

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
}

export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext)
  if (!ctx) throw new Error('useFunnel вызван вне FunnelProvider')
  return ctx
}

/**
 * Guard: пускает на шаг только если выполнено условие allowed(data).
 * Пока данные не восстановлены из sessionStorage (ready=false): ничего не
 * решаем, чтобы не сделать ложный редирект на первом рендере.
 * Возвращает true, когда экран можно показывать.
 */
export function useFunnelGuard(
  allowed: (d: FunnelData) => boolean,
  redirectTo: string,
): boolean {
  const { data, ready } = useFunnel()
  const router = useRouter()
  const ok = allowed(data)

  useEffect(() => {
    if (ready && !ok) router.replace(redirectTo)
  }, [ready, ok, redirectTo, router])

  return ready && ok
}
