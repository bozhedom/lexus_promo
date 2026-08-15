import Image from 'next/image'
import type { CSSProperties, RefObject, TouchEventHandler } from 'react'

import type { PromoSlideDto } from '@/shared/api/promo'

import styles from './NewsSlider.module.scss'

interface LightboxProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  slides: PromoSlideDto[]
  opened: number | null
  onClose: () => void
  onStep: (to: 1 | -1) => void
  dragging: boolean
  stageStyle?: CSSProperties
  frameSlot: (index: number) => 'previous' | 'current' | 'next' | null
  touchHandlers: {
    onTouchStart: TouchEventHandler<HTMLDivElement>
    onTouchMove: TouchEventHandler<HTMLDivElement>
    onTouchEnd: TouchEventHandler<HTMLDivElement>
    onTouchCancel: TouchEventHandler<HTMLDivElement>
  }
}

export function Lightbox({
  dialogRef,
  slides,
  opened,
  onClose,
  onStep,
  dragging,
  stageStyle,
  frameSlot,
  touchHandlers,
}: LightboxProps) {
  const shown = opened === null ? null : slides[opened] ?? null

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-label="Фотографии автоцентра"
      // Esc: закрываем сами, чтобы лента тоже доехала до нужного кадра.
      // На onClose не опираемся, событие не всплывает и до React доходит не всегда.
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // клик по фону, а не по самому кадру, закрывает разворот
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onStep(1)
        if (e.key === 'ArrowLeft') onStep(-1)
      }}
    >
      {shown && (
        <div className={styles.lightInner} {...touchHandlers}>
          <div className={styles.lightBar}>
            <span className={styles.counter}>
              {(opened ?? 0) + 1} / {slides.length}
            </span>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть" />
          </div>

          <div className={styles.stage} style={stageStyle} data-drag={dragging || undefined}>
            <button
              type="button"
              className={`${styles.lightArrow} ${styles.lightPrev}`}
              onClick={() => onStep(-1)}
              aria-label="Предыдущее фото"
            />
            {slides.map((slide, index) => {
              const slot = frameSlot(index)
              if (!slot) return null
              return (
                <button
                  type="button"
                  key={`${slide.id}-frame`}
                  className={styles.frame}
                  data-slot={slot}
                  aria-label={
                    slot === 'current'
                      ? slide.caption
                      : `${slot === 'previous' ? 'Предыдущее' : 'Следующее'} фото: ${slide.caption}`
                  }
                  tabIndex={slot === 'current' ? -1 : 0}
                  onClick={() => {
                    if (slot === 'previous') onStep(-1)
                    if (slot === 'next') onStep(1)
                  }}
                >
                  <Image
                    className={`${styles.frameImg} ${styles.frameImgDesktop}`}
                    src={slide.src}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 82vw, 72vw"
                    loading="eager"
                  />
                  <Image
                    className={`${styles.frameImg} ${styles.frameImgMobile}`}
                    src={slide.mobileSrc}
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
              onClick={() => onStep(1)}
              aria-label="Следующее фото"
            />
          </div>

          <p className={styles.lightCaption}>{shown.caption}</p>
        </div>
      )}
    </dialog>
  )
}
