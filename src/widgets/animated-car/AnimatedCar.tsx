import styles from './AnimatedCar.module.scss'

/**
 * Сцена стартового экрана: занавес, а за ним автомобиль с зажжёнными фарами.
 *
 * Фото вписано как `object-fit: cover`, но размеры коробки посчитаны в CSS явно,
 * поэтому световые слои держатся ровно на фарах при любом соотношении сторон.
 */
export function AnimatedCar() {
  return (
    <div className={styles.scene} aria-hidden>
      <div className={styles.box}>
        <picture>
          <source
            media="(min-width: 1400px) and (orientation: landscape)"
            srcSet="/images/lexus-front-desktop@2x.webp"
          />
          <source
            media="(min-width: 768px) and (orientation: landscape)"
            srcSet="/images/lexus-front-desktop.png"
          />
          <img
            className={styles.photo}
            src="/images/lexus-front.jpg"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>

        {/* свет ровно из фар: конус в дыму, ореол и блик на линзе */}
        <div className={`${styles.lamp} ${styles.lampLeft}`}>
          <span className={styles.beam} />
          <span className={styles.halo} />
          <span className={styles.flare} />
        </div>
        <div className={`${styles.lamp} ${styles.lampRight}`}>
          <span className={styles.beam} />
          <span className={styles.halo} />
          <span className={styles.flare} />
        </div>

        {/* световое пятно на полу перед машиной */}
        <span className={styles.floor} />
      </div>

      <span className={styles.haze} />
      <span className={styles.vignette} />
    </div>
  )
}
