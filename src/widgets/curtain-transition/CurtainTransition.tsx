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

import { preloadSceneAssets } from '@/shared/lib/useSceneAssets'
import styles from './CurtainTransition.module.scss'

// Театральный переход между актами воронки: занавес закрывается, под ним
// происходит навигация, затем занавес открывается уже на новом экране.
const CLOSE_MS = 480
const NAVIGATE_MS = 310 // маршрут меняется ещё во время закрытия и готовится за тканью
const OPEN_MS = 680
const SETTLE_MS = 24
const FAILSAFE_MS = 900

const COMMON_STAGE_ASSETS = [
  '/images/curtain-left.webp',
  '/images/curtain-right.webp',
  '/images/redesign/form-stage.webp',
  '/images/redesign/form-stage-hands.webp',
  '/images/redesign/reception.webp',
  '/images/redesign/gold-dust.webp',
  '/images/redesign/invite-center.webp',
  '/images/redesign/invite-car.webp',
  '/images/redesign/invite-team.webp',
  '/images/redesign/service-center.webp',
  '/images/gallery-1.webp',
  '/images/gallery-2.webp',
  '/images/gallery-3.webp',
  '/images/gallery-map.jpg',
] as const

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

  // После первого кадра тихо готовим изображения следующих шагов: при переходе
  // фон уже в памяти и не догоняет текст. Приоритет низкий — эти кадры нужны
  // на следующем экране, а не на том, который человек читает сейчас.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      // Сначала отдаём канал стартовой сцене; остальные изображения начинаем
      // после window.load и короткой паузы, чтобы они не конкурировали с ней.
      timer = setTimeout(() => void preloadSceneAssets(COMMON_STAGE_ASSETS, 'low'), 420)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      if (timer) clearTimeout(timer)
    }
  }, [])

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
    const navigation = setTimeout(() => {
      if (target.current) router.push(target.current)
    }, NAVIGATE_MS)
    const closed = setTimeout(() => {
      setPhase('closed')
    }, CLOSE_MS)
    return () => {
      clearTimeout(navigation)
      clearTimeout(closed)
    }
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
