'use client'

import Image from 'next/image'
import type { CSSProperties, TouchEvent as ReactTouchEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import styles from './NewsSlider.module.scss'

interface Slide {
  src: string
  caption: string
  /** свои размеры кадра: в развороте показываем фото целиком, без обрезки */
  w: number
  h: number
  /** первая карточка: адрес с маркером поверх фото */
  address?: string
}

const SLIDES: Slide[] = [
  {
    src: '/images/gallery-map.jpg',
    caption: 'Современный сервисный центр',
    address: 'Снеговая, 1 стр.7',
    w: 1280,
    h: 963,
  },
  { src: '/images/gallery-2.webp', caption: 'Премиальный уровень обслуживания', w: 1024, h: 769 },
  { src: '/images/gallery-3.webp', caption: 'Комфорт для каждого гостя', w: 1024, h: 1024 },
  { src: '/images/gallery-1.webp', caption: 'Технологии и инновации', w: 1024, h: 576 },
  { src: '/images/gallery-map.jpg', caption: 'Собственная территория и парковка', w: 1280, h: 963 },
]

// Галерея автоцентра в футере экранов 2-4. На мобиле свайп с точками,
// на десктопе стрелки: мышью горизонтальную ленту не прокрутить.
// Тап по карточке разворачивает кадр на весь экран.
export function NewsSlider() {
  const railRef = useRef<HTMLUListElement>(null)
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
    setActive(Math.max(0, Math.min(SLIDES.length - 1, i)))
    setAtStart(rail.scrollLeft <= 2)
    setAtEnd(rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2)
  }, [])

  // ширина карточек тянется от вьюпорта: после ресайза стрелки надо пересчитать
  useEffect(() => {
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [sync])

  const goTo = (i: number) => {
    const rail = railRef.current
    const target = rail?.children[i] as HTMLElement | undefined
    if (!rail || !target) return
    rail.scrollTo({ left: target.offsetLeft - rail.offsetLeft, behavior: 'smooth' })
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
    rail.scrollBy({ left: dir * step * page, behavior: 'smooth' })
  }

  // ── разворот кадра ────────────────────────────────────────────────────────
  // Через <dialog>: он живёт в верхнем слое, поэтому его не режут ни
  // overflow ленты, ни трансформы занавеса между экранами.
  const dlgRef = useRef<HTMLDialogElement>(null)
  const [opened, setOpened] = useState<number | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const [drag, setDrag] = useState({ dx: 0, dy: 0, live: false })

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

  // страница под развёрнутым кадром не должна ехать
  useEffect(() => {
    if (opened === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [opened])

  const close = () => {
    // возвращаемся к тому кадру, который смотрели
    if (opened !== null) goTo(opened)
    setOpened(null)
  }

  const step = (to: 1 | -1) =>
    setOpened((i) => (i === null ? i : (i + to + SLIDES.length) % SLIDES.length))

  // Кадр едет за пальцем. Это и есть самый понятный намёк, что его можно
  // листать: подсказку текстом человек не читает, а сдвинувшееся фото видит.
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    const from = swipe.current
    if (!from) return
    const t = e.touches[0]
    setDrag({ dx: t.clientX - from.x, dy: Math.max(0, t.clientY - from.y), live: true })
  }

  const stageStyle = drag.live
    ? {
        transform: `translate(${drag.dx}px, ${drag.dy}px)`,
        // чем дальше тянут вниз, тем прозрачнее: понятно, что кадр закроется
        opacity: 1 - Math.min(drag.dy / 420, 0.45),
        transition: 'none',
      }
    : undefined

  const shown = opened === null ? null : SLIDES[opened]

  return (
    <section className={styles.wrap}>
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

          <ul className={styles.rail} ref={railRef} onScroll={sync}>
            {SLIDES.map((s, i) => (
              <li className={styles.slide} key={`${s.src}-${i}`}>
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
                    sizes="(max-width: 767px) 80vw, 320px"
                    loading={i < 2 ? 'eager' : 'lazy'}
                  />
                  {s.address && (
                    <span className={styles.address}>
                      <Image src="/images/icon-marker.svg" alt="" width={30} height={38} />
                      <span>{s.address}</span>
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
          {SLIDES.map((s, i) => (
            <button
              key={`${s.src}-dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={s.caption}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
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
              swipe.current = { x: t.clientX, y: t.clientY }
            }}
            onTouchMove={onTouchMove}
            onTouchEnd={(e) => {
              const from = swipe.current
              swipe.current = null
              setDrag({ dx: 0, dy: 0, live: false })
              if (!from) return
              const t = e.changedTouches[0]
              const dx = t.clientX - from.x
              const dy = t.clientY - from.y
              // в сторону, следующий кадр; вниз, закрыть
              if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1)
              else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close()
            }}
          >
            <div className={styles.lightBar}>
              <span className={styles.counter}>
                {(opened ?? 0) + 1} / {SLIDES.length}
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
              {/* Все кадры лежат стопкой и переключаются прозрачностью. Так
                  переход идёт в обе стороны сразу, а не только у нового кадра,
                  и уходящее фото не пропадает рывком. */}
              {SLIDES.map((s, i) => (
                <div
                  key={`${s.src}-${i}`}
                  className={styles.frame}
                  data-active={i === opened || undefined}
                  aria-hidden={i === opened ? undefined : true}
                  // пропорцию берём из данных, а не из картинки: у части фото
                  // исходник узкий, и по нему кадр выходил меньше остальных
                  style={{ '--r': s.w / s.h } as CSSProperties}
                >
                  <Image
                    className={styles.frameImg}
                    src={s.src}
                    alt={i === opened ? s.caption : ''}
                    fill
                    sizes="(max-width: 767px) 94vw, 82vw"
                    loading="eager"
                  />
                </div>
              ))}
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
