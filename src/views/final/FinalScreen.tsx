'use client'

import clsx from 'clsx'
import Image from 'next/image'

import { useScreenView } from '@/shared/analytics'
import { useFunnel } from '@/shared/lib/funnel'
import { Divider } from '@/shared/ui'
import { OUTBOUND_LINKS } from '@/shared/config/links'
import styles from './FinalScreen.module.scss'

// Экран 6, итоговый: подтверждение и ссылки на сервисы автоцентра
export function FinalScreen() {
  const { track } = useFunnel()
  useScreenView('final')

  return (
    <main className={styles.screen}>
      <div className={styles.scene} aria-hidden>
        <div className={styles.sceneBox} />
        <span className={styles.dim} />
      </div>

      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.saved}>
            Персональный пригласительный{' '}
            <span className={styles.accent}>сохранен у нас в базе</span> на Ваше имя, автомобиль и
            телефон.
          </p>
          <Divider className={styles.divider} />
          <h1 className={styles.invite}>
            Ждем <span className={styles.accent}>Вас в гости!</span>
          </h1>
        </header>

        <div className={styles.body}>
          <ul className={styles.links}>
            {OUTBOUND_LINKS.map((l) => (
              <li key={l.id}>
                <a
                  className={clsx(styles.link, l.accent && styles.linkAccent)}
                  href={l.href}
                  target={l.external ? '_blank' : undefined}
                  rel={l.external ? 'noopener noreferrer' : undefined}
                  data-link-id={l.id}
                  onClick={() => track('outbound_click', { id: l.id, url: l.href })}
                >
                  <Image className={styles.icon} src={l.icon} alt="" width={24} height={24} />
                  <span className={styles.label}>{l.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <aside className={styles.person}>
            <span className={styles.personText}>
              <span className={styles.role}>
                АвтоСекретарь
                <Image
                  className={styles.heart}
                  src="/images/heart-sketch.svg"
                  alt=""
                  width={54}
                  height={48}
                />
              </span>
              <span className={styles.personName}>«Любовь»</span>
            </span>
            <Image
              className={styles.photo}
              src="/images/secretary-head.webp"
              alt="АвтоСекретарь Любовь"
              width={392}
              height={540}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
