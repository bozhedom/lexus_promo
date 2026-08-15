'use client'

import Image from 'next/image'

import { useSceneAssets } from '@/shared/lib/useSceneAssets'

import { Lightbox } from './Lightbox'
import { usePromoSlides } from './slides'
import { useLightbox } from './useLightbox'
import { useRail } from './useRail'
import styles from './NewsSlider.module.scss'

// Галерея автоцентра в футере экранов 2-4. На мобиле свайп с точками,
// на десктопе стрелки: мышью горизонтальную ленту не прокрутить.
// Тап по карточке разворачивает кадр на весь экран.
interface NewsSliderProps {
  hideActiveCaption?: boolean
  /** Экран собран в один viewport: галерея тянется на весь остаток высоты. */
  fillViewport?: boolean
}

export function NewsSlider({ hideActiveCaption = false, fillViewport = false }: NewsSliderProps) {
  const slides = usePromoSlides()
  const assetsReady = useSceneAssets([
    ...new Set(slides.flatMap((slide) => [slide.src, slide.mobileSrc])),
  ])
  const { railRef, active, atStart, atEnd, sync, stopMotion, goTo, nudge } = useRail(slides.length)
  const lightbox = useLightbox(slides.length, goTo)
  const { dialogRef, touchHandlers } = lightbox

  return (
    <section
      className={styles.wrap}
      data-ready={assetsReady}
      data-hide-active-caption={hideActiveCaption || undefined}
      data-fill={fillViewport || undefined}
    >
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
            onPointerDown={stopMotion}
            onWheel={stopMotion}
          >
            {slides.map((slide, index) => (
              <li
                className={styles.slide}
                data-active={index === active || undefined}
                key={slide.id}
              >
                <button
                  type="button"
                  className={styles.card}
                  onClick={() => lightbox.open(index)}
                  aria-label={`Открыть фото: ${slide.caption}`}
                >
                  <Image
                    className={styles.img}
                    src={slide.src}
                    alt={slide.caption}
                    width={628}
                    height={356}
                    sizes="(max-width: 768px) 100vw, 320px"
                    loading={index < 2 ? 'eager' : 'lazy'}
                  />
                  {slide.address && (
                    <span className={styles.address}>
                      <Image src="/images/icon-marker.svg" alt="" width={30} height={38} />
                      {/* в макете адрес идёт в две строки, разделитель «·» и
                          есть точка переноса */}
                      {slide.address.split('·').map((part) => (
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
                <p className={styles.caption}>{slide.caption}</p>
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
          {slides.map((slide, index) => (
            <button
              key={`${slide.id}-dot`}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={slide.caption}
              className={`${styles.dot} ${index === active ? styles.dotActive : ''}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>

        {/* На мобиле кадр всегда один, поэтому подпись в макете общая и стоит
            под точками. На десктопе в ленте несколько карточек сразу, там
            подписи остаются у каждой. */}
        {!hideActiveCaption && (
          <p className={styles.activeCaption}>{slides[active]?.caption}</p>
        )}
      </div>

      <Lightbox
        dialogRef={dialogRef}
        slides={slides}
        opened={lightbox.opened}
        onClose={lightbox.close}
        onStep={lightbox.step}
        dragging={lightbox.dragging}
        stageStyle={lightbox.stageStyle}
        frameSlot={lightbox.frameSlot}
        touchHandlers={touchHandlers}
      />
    </section>
  )
}
