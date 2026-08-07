'use client'

import Image from 'next/image'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import styles from './NewsSlider.module.scss'
import { fetchPromoSlides, type PromoSlideDto } from '@/shared/api/promo'
import { useSceneAssets } from '@/shared/lib/useSceneAssets'

interface LightboxDrag {
  dx: number
  dy: number
  live: boolean
  animating: boolean
}

const IDLE_DRAG: LightboxDrag = { dx: 0, dy: 0, live: false, animating: false }

const DEFAULT_SLIDES: PromoSlideDto[] = [
  {
    id: 'service-center',
    src: '/images/redesign/service-center.webp',
    mobileSrc: '/images/redesign/service-center-mobile-test.webp',
    caption: 'Современный сервисный центр',
    address: 'Снеговая, 1 · «Таксопарк»',
  },
  { id: 'gallery-2', src: '/images/gallery-2.webp', mobileSrc: '/images/gallery-2-mobile-test.webp', caption: 'Премиальный уровень обслуживания' },
  { id: 'gallery-3', src: '/images/gallery-3.webp', mobileSrc: '/images/gallery-3-mobile-test.webp', caption: 'Комфорт для каждого гостя' },
  { id: 'gallery-1', src: '/images/gallery-1.webp', mobileSrc: '/images/gallery-1-mobile-test.webp', caption: 'Технологии и инновации' },
  { id: 'gallery-map', src: '/images/gallery-map.jpg', mobileSrc: '/images/gallery-map-mobile-test.webp', caption: 'Собственная территория и парковка' },
]

// Галерея автоцентра в футере экранов 2-4. На мобиле свайп с точками,
// на десктопе стрелки: мышью горизонтальную ленту не прокрутить.
// Тап по карточке разворачивает кадр на весь экран.
export function NewsSlider() {
  const [slides, setSlides] = useState<PromoSlideDto[]>(DEFAULT_SLIDES)
  const assetsReady = useSceneAssets(
    [...new Set(slides.flatMap((slide) => [slide.src, slide.mobileSrc]))],
  )
  const railRef = useRef<HTMLUListElement>(null)
  const motionRef = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const first = rail.firstElementChild as HTMLElement | null
    if (!first) return
    const step = first.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || '0')
    const i = Math.round(rail.scrollLeft / (step || 1))
    setActive(Math.max(0, Math.min(slides.length - 1, i)))
    setAtStart(rail.scrollLeft <= 2)
    setAtEnd(rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2)
  }, [slides.length])

  useEffect(() => {
    let active = true
    fetchPromoSlides()
      .then((configured) => {
        if (active && configured.length > 0) setSlides(configured)
      })
      .catch(() => {
        // До первого заполнения админки и при временной недоступности БД
        // остаются встроенные стартовые слайды.
      })
    return () => { active = false }
  }, [])

  // ширина карточек тянется от вьюпорта: после ресайза стрелки надо пересчитать
  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync])

  useEffect(
    () => () => {
      if (motionRef.current !== null) cancelAnimationFrame(motionRef.current)
    },
    [],
  )

  const stopRailMotion = () => {
    if (motionRef.current !== null) {
      cancelAnimationFrame(motionRef.current)
      motionRef.current = null
    }
    railRef.current?.removeAttribute('data-moving')
  }

  // Нативный smooth-scroll вместе со scroll-snap на мобильных делал два
  // последовательных рывка: сначала прокрутку, затем дополнительное
  // прилипание. Двигаем ленту сами к уже рассчитанной snap-позиции.
  const animateRail = (left: number) => {
    const rail = railRef.current
    if (!rail) return
    stopRailMotion()
    const from = rail.scrollLeft
    const to = Math.max(0, Math.min(left, rail.scrollWidth - rail.clientWidth))
    const distance = to - from
    if (Math.abs(distance) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rail.scrollLeft = to
      return
    }

    const started = performance.now()
    const duration = Math.min(620, Math.max(380, 360 + Math.abs(distance) * 0.28))
    rail.dataset.moving = ''
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2
      rail.scrollLeft = from + distance * eased
      if (progress < 1) motionRef.current = requestAnimationFrame(tick)
      else {
        motionRef.current = null
        rail.removeAttribute('data-moving')
      }
    }
    motionRef.current = requestAnimationFrame(tick)
  }

  const goTo = (i: number) => {
    const rail = railRef.current
    const target = rail?.children[i] as HTMLElement | undefined
    if (!rail || !target) return
    const centered = window.matchMedia('(max-width: 768px)').matches
    const left = target.offsetLeft - rail.offsetLeft - (centered ? (rail.clientWidth - target.offsetWidth) / 2 : 0)
    animateRail(left)
  }

  // на десктопе шагаем видимым экраном карточек, а не по одной
  const nudge = (dir: 1 | -1) => {
    const rail = railRef.current
    if (!rail) return
    const first = rail.firstElementChild as HTMLElement | null
    const step = first
      ? first.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || '0')
      : rail.clientWidth
    const page = Math.max(1, Math.floor(rail.clientWidth / step))
    goTo(Math.max(0, Math.min(slides.length - 1, active + dir * page)))
  }

  // ── разворот кадра ────────────────────────────────────────────────────────
  // Через <dialog>: он живёт в верхнем слое, поэтому его не режут ни
  // overflow ленты, ни трансформы занавеса между экранами.
  const dlgRef = useRef<HTMLDialogElement>(null)
  const [opened, setOpened] = useState<number | null>(null)
  const swipe = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [drag, setDrag] = useState<LightboxDrag>(IDLE_DRAG)
  const lightboxOpen = opened !== null

  useEffect(() => {
    const d = dlgRef.current
    if (!d) return
    if (opened === null) {
      if (d.open) d.close()
    } else if (!d.open) {
      d.showModal()
    }
  }, [opened])

  // страховка: если кадр закрыли мимо нашего состояния, подтягиваем состояние.
  // Слушаем нативно, событие close не всплывает и делегирование React его теряет.
  useEffect(() => {
    const d = dlgRef.current
    if (!d) return
    const sink = () => setOpened(null)
    d.addEventListener('close', sink)
    return () => d.removeEventListener('close', sink)
  }, [])

  useEffect(
    () => () => {
      if (gestureTimer.current) clearTimeout(gestureTimer.current)
    },
    [],
  )

  // страница под развёрнутым кадром не должна ехать
  useEffect(() => {
    if (!lightboxOpen) return
    const scrollY = window.scrollY
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top = prev.top
      document.body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [lightboxOpen])

  const close = () => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    gestureTimer.current = null
    setDrag(IDLE_DRAG)
    // возвращаемся к тому кадру, который смотрели
    if (opened !== null) goTo(opened)
    setOpened(null)
  }

  const step = (to: 1 | -1) =>
    setOpened((i) => (i === null ? i : (i + to + slides.length) % slides.length))

  const settleGesture = () => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    setDrag({ ...IDLE_DRAG, animating: true })
    gestureTimer.current = setTimeout(() => {
      gestureTimer.current = null
      setDrag(IDLE_DRAG)
    }, 300)
  }

  const dismissGesture = (fromDy: number) => {
    if (gestureTimer.current) clearTimeout(gestureTimer.current)
    setDrag({ dx: 0, dy: Math.max(window.innerHeight, fromDy + 280), live: false, animating: true })
    gestureTimer.current = setTimeout(() => {
      gestureTimer.current = null
      close()
    }, 280)
  }

  // Горизонтальный жест только выбирает соседний кадр. Саму сцену за пальцем
  // не тянем: при мгновенной смене это давало заметный скачок назад.
  // Вертикальный жест остаётся живым — им окно можно мягко закрыть вниз.
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    const from = swipe.current
    if (!from) return
    const t = e.touches[0]
    const rawDx = t.clientX - from.x
    const rawDy = t.clientY - from.y
    if (!from.axis) {
      if (Math.max(Math.abs(rawDx), Math.abs(rawDy)) < 8) return
      from.axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'x' : 'y'
    }
    e.preventDefault()
    if (from.axis === 'y') {
      // Вверх кадр двигается с сопротивлением, вниз следует за пальцем.
      const resisted = rawDy < 0 ? rawDy * 0.16 : rawDy
      setDrag({ dx: 0, dy: resisted, live: true, animating: false })
    }
  }

  const stageStyle = drag.live || drag.animating
    ? {
        transform: `translate(${drag.dx}px, ${drag.dy}px)`,
        opacity: drag.animating && drag.dy > 300
          ? 0
          : 1 - Math.min(Math.max(drag.dy, Math.abs(drag.dx) * 0.35) / 520, 0.42),
        transition: drag.live
          ? 'none'
          : 'transform 280ms cubic-bezier(0.2, 0.72, 0.2, 1), opacity 220ms ease',
      }
    : undefined

  const shown = opened === null ? null : slides[opened] ?? null
  const frameSlot = (index: number): 'previous' | 'current' | 'next' | null => {
    if (opened === null) return null
    if (index === opened) return 'current'
    if (index === (opened - 1 + slides.length) % slides.length) return 'previous'
    if (index === (opened + 1) % slides.length) return 'next'
    return null
  }

  return (
    <section className={styles.wrap} data-ready={assetsReady}>
      <div className={styles.panel}>
        <h2 className={styles.heading}>
          <span className={styles.line} />
          <span className={styles.title}>Ваш новый автоцентр</span>
          <span className={styles.line} />
        </h2>

        <div className={styles.viewport}>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Предыдущие фотографии"
          />

          <ul
            className={styles.rail}
            ref={railRef}
            onScroll={sync}
            onPointerDown={stopRailMotion}
            onWheel={stopRailMotion}
          >
            {slides.map((s, i) => (
              <li
                className={styles.slide}
                data-active={i === active || undefined}
                key={s.id}
              >
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => setOpened(i)}
                  aria-label={`Открыть фото: ${s.caption}`}
                >
                  <Image
                    className={styles.img}
                    src={s.src}
                    alt={s.caption}
                    width={628}
                    height={356}
                    sizes="(max-width: 768px) 100vw, 320px"
                    loading={i < 2 ? 'eager' : 'lazy'}
                  />
                  {s.address && (
                    <span className={styles.address}>
                      <Image src="/images/icon-marker.svg" alt="" width={30} height={38} />
                      {/* в макете адрес идёт в две строки, разделитель «·» и
                          есть точка переноса */}
                      {s.address.split('·').map((part) => (
                        <span key={part}>{part.trim()}</span>
                      ))}
                    </span>
                  )}
                  {/* уголки, а не плюс: плюс читается как «добавить» */}
                  <span className={styles.zoom} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 4H6a2 2 0 0 0-2 2v3M15 4h3a2 2 0 0 1 2 2v3M9 20H6a2 2 0 0 1-2-2v-3M15 20h3a2 2 0 0 0 2-2v-3" />
                    </svg>
                  </span>
                </button>
                <p className={styles.caption}>{s.caption}</p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Следующие фотографии"
          />
        </div>

        <div className={styles.dots} role="tablist" aria-label="Фотографии автоцентра">
          {slides.map((s, i) => (
            <button
              key={`${s.id}-dot`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={s.caption}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* На мобиле кадр всегда один, поэтому подпись в макете общая и стоит
            под точками. На десктопе в ленте несколько карточек сразу, там
            подписи остаются у каждой. */}
        <p className={styles.activeCaption}>{slides[active]?.caption}</p>
      </div>

      <dialog
        ref={dlgRef}
        className={styles.lightbox}
        aria-label="Фотографии автоцентра"
        // Esc: закрываем сами, чтобы лента тоже доехала до нужного кадра.
        // На onClose не опираемся, событие не всплывает и до React доходит не всегда.
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        // клик по фону, а не по самому кадру, закрывает разворот
        onClick={(e) => {
          if (e.target === dlgRef.current) close()
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
      >
        {shown && (
          <div
            className={styles.lightInner}
            onTouchStart={(e) => {
              const t = e.touches[0]
              swipe.current = { x: t.clientX, y: t.clientY, axis: null }
            }}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => {
              const from = swipe.current
              swipe.current = null
              if (!from) return
              const t = e.changedTouches[0]
              const dx = t.clientX - from.x
              const dy = t.clientY - from.y
              if (from.axis === 'x' && Math.abs(dx) > 55) {
                step(dx < 0 ? 1 : -1)
                setDrag(IDLE_DRAG)
              } else if (from.axis === 'x') {
                setDrag(IDLE_DRAG)
              } else if (from.axis === 'y' && dy > 110) {
                dismissGesture(dy)
              } else {
                settleGesture()
              }
            }}
            onTouchCancel={() => {
              const horizontal = swipe.current?.axis === 'x'
              swipe.current = null
              if (horizontal) setDrag(IDLE_DRAG)
              else settleGesture()
            }}
          >
            <div className={styles.lightBar}>
              <span className={styles.counter}>
                {(opened ?? 0) + 1} / {slides.length}
              </span>
              <button
                type="button"
                className={styles.close}
                onClick={close}
                aria-label="Закрыть"
              />
            </div>

            <div className={styles.stage} style={stageStyle} data-drag={drag.live || undefined}>
              <button
                type="button"
                className={`${styles.lightArrow} ${styles.lightPrev}`}
                onClick={() => step(-1)}
                aria-label="Предыдущее фото"
              />
              {slides.map((s, i) => {
                const slot = frameSlot(i)
                if (!slot) return null
                return (
                  <button
                    type="button"
                    key={`${s.id}-frame`}
                    className={styles.frame}
                    data-slot={slot}
                    aria-label={
                      slot === 'current'
                        ? s.caption
                        : `${slot === 'previous' ? 'Предыдущее' : 'Следующее'} фото: ${s.caption}`
                    }
                    tabIndex={slot === 'current' ? -1 : 0}
                    onClick={() => {
                      if (slot === 'previous') step(-1)
                      if (slot === 'next') step(1)
                    }}
                  >
                    <Image
                      className={`${styles.frameImg} ${styles.frameImgDesktop}`}
                      src={s.src}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 82vw, 72vw"
                      loading="eager"
                    />
                    <Image
                      className={`${styles.frameImg} ${styles.frameImgMobile}`}
                      src={s.mobileSrc}
                      alt=""
                      fill
                      sizes="100vw"
                      loading="eager"
                    />
                  </button>
                )
              })}
              <button
                type="button"
                className={`${styles.lightArrow} ${styles.lightNext}`}
                onClick={() => step(1)}
                aria-label="Следующее фото"
              />
            </div>

            <p className={styles.lightCaption}>{shown.caption}</p>
          </div>
        )}
      </dialog>
    </section>
  )
}
