import Image from 'next/image'
import type { ReactNode } from 'react'

import { NewsSlider } from '@/widgets/news-slider'
import { Divider } from '../Divider'
import styles from './StageLayout.module.scss'

interface StageLayoutProps {
  subtitle: ReactNode
  children: ReactNode
}

// Каркас экранов 2-4: сцена, заголовок «В ЧИСЛЕ ПЕРВЫХ», карточка формы, футер
export function StageLayout({ subtitle, children }: StageLayoutProps) {
  return (
    <div className={styles.page}>
      <section className={styles.stage}>
        <div className={styles.scene} aria-hidden>
          <div className={styles.sceneBox}>
            <span className={styles.smoke} />
          </div>
          <span className={styles.dim} />
        </div>

        <div className={styles.inner}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>получите приглашение</p>
            <h1 className={styles.title}>
              В ЧИСЛЕ <span className={styles.accent}>ПЕРВЫХ</span>
            </h1>
            <Divider className={styles.divider} />
            <p className={styles.subtitle}>{subtitle}</p>
          </header>

          <div className={styles.card}>{children}</div>

          <p className={styles.secure}>
            <Image src="/images/icon-shield.svg" alt="" width={16} height={20} />
            <span>Ваши данные защищены и не передаются третьим лицам</span>
          </p>
        </div>
      </section>

      <NewsSlider />
    </div>
  )
}
