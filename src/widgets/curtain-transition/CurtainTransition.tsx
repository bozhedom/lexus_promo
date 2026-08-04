'use client'

import { usePathname, useRouter } from 'next/navigation'
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

import styles from './CurtainTransition.module.scss'

// Театральный переход между актами воронки: занавес закрывается, под ним
// происходит навигация, затем занавес открывается уже на новом экране.
const CLOSE_MS = 620
const OPEN_MS = 950
const SETTLE_MS = 140 // пауза «за закрытым занавесом», чтобы новый экран успел отрисоваться
const FAILSAFE_MS = 1600 // если навигация не случилась — всё равно открываем

type Phase = 'idle' | 'closing' | 'closed' | 'opening'

interface StageTransitionValue {
  go: (href: string) => void
  busy: boolean
}

const StageTransitionContext = createContext<StageTransitionValue | null>(null)

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function StageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('idle')
  const target = useRef<string | null>(null)

  const go = useCallback(
    (href: string) => {
      if (target.current) return // переход уже идёт
      if (prefersReducedMotion()) {
        router.push(href)
        return
      }
      target.current = href
      router.prefetch(href)
      setPhase('closing')
    },
    [router],
  )

  // занавес сомкнулся: уходим на новый экран
  useEffect(() => {
    if (phase !== 'closing') return
    const t = setTimeout(() => {
      setPhase('closed')
      if (target.current) router.push(target.current)
    }, CLOSE_MS)
    return () => clearTimeout(t)
  }, [phase, router])

  // новый экран смонтирован: раскрываем занавес
  useEffect(() => {
    if (phase !== 'closed') return
    const arrived = target.current === null || pathname === target.current
    const t = setTimeout(() => setPhase('opening'), arrived ? SETTLE_MS : FAILSAFE_MS)
    return () => clearTimeout(t)
  }, [phase, pathname])

  useEffect(() => {
    if (phase !== 'opening') return
    const t = setTimeout(() => {
      target.current = null
      setPhase('idle')
    }, OPEN_MS)
    return () => clearTimeout(t)
  }, [phase])

  const value = useMemo<StageTransitionValue>(
    () => ({ go, busy: phase !== 'idle' }),
    [go, phase],
  )

  return (
    <StageTransitionContext.Provider value={value}>
      {children}
      <div className={styles.curtain} data-phase={phase} aria-hidden>
        <span className={styles.glow} />
        <span className={`${styles.panel} ${styles.left}`} />
        <span className={`${styles.panel} ${styles.right}`} />
      </div>
    </StageTransitionContext.Provider>
  )
}

/** Навигация «через занавес». Вне провайдера деградирует в обычный router.push. */
export function useStageTransition(): StageTransitionValue {
  const ctx = useContext(StageTransitionContext)
  const router = useRouter()
  const fallback = useMemo<StageTransitionValue>(
    () => ({ go: (href: string) => router.push(href), busy: false }),
    [router],
  )
  return ctx ?? fallback
}
