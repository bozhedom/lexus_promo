'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { Button } from '@/shared/ui'
import { CertificateSheet, CertificateViewer, type CertificateKind } from '@/widgets/certificate-sheet'
import styles from './ExistingCertificateScreen.module.scss'

const CARDS: { kind: CertificateKind; label: string }[] = [
  { kind: 'diagnostics', label: 'Диагностика' },
  { kind: 'gift', label: 'В честь знакомства' },
]

/**
 * Гость с этим номером уже получал пригласительные: показываем ту же пару, что
 * лежит в админке, и говорим, что второй раз оформлять нечего.
 */
export function ExistingCertificateScreen() {
  const router = useRouter()
  const show = useFunnelGuard(
    (data) => Boolean(data.plateNumber && data.certificateCode),
    '/car-number',
  )
  const { data, reset } = useFunnel()
  useScreenView('certificate')
  const [expanded, setExpanded] = useState<CertificateKind | null>(null)

  if (!show) return null

  const brand = data.carBrand ?? 'Lexus'
  const carTitle = [data.carBrand, data.carModel].filter(Boolean).join(' ')
  const amount = data.certificateAmount ?? 1500

  return (
    <main className={styles.screen}>
      <span className={styles.stage} aria-hidden />
      <section className={styles.card} role="dialog" aria-modal="true">
        <button
          type="button"
          className={styles.close}
          onClick={() => router.push('/links')}
          aria-label="Закрыть"
        >
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M16.5 7.5 7.5 16.5M7.5 7.5l9 9" />
          </svg>
        </button>

        {/* Шапка по макету 39:3585: приветствие, имя золотом и строка о том,
            что пригласительные уже выписаны. */}
        <header className={styles.head}>
          <p className={styles.greeting}>С возвращением,</p>
          {data.fullName && <p className={styles.guest}>{data.fullName}</p>}
          <h1>Ваши пригласительные уже готовы</h1>
        </header>

        <div className={styles.cards}>
          {CARDS.map((card) => (
            <button
              type="button"
              className={styles.previewButton}
              key={card.kind}
              onClick={() => setExpanded(card.kind)}
              aria-label={`Открыть пригласительный: ${card.label}`}
            >
              <span className={styles.previewFrame}>
                <CertificateSheet
                  kind={card.kind}
                  brand={brand}
                  name={data.fullName ?? ''}
                  carTitle={carTitle || null}
                  plate={data.plateNumber}
                  amount={amount}
                />
              </span>
              {/* Значок разворота — тот же, что на слайдах: сразу видно, что
                  превью открывается на весь экран. */}
              <span className={styles.zoom} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
                </svg>
              </span>
              <span className={styles.previewLabel}>{card.label}</span>
            </button>
          ))}
        </div>

        <p className={styles.note}>
          Повторно оформлять пригласительные не нужно,
          <br />
          они уже закреплены за Вашим автомобилем
        </p>

        <div className={styles.actions}>
          <Button block onClick={() => router.push('/links')}>Продолжить</Button>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => {
              reset()
              router.push('/car-number')
            }}
          >
            Ввести другой автомобиль
          </button>
        </div>
      </section>

      {expanded && (
        <CertificateViewer
          kind={expanded}
          brand={brand}
          name={data.fullName ?? ''}
          carTitle={carTitle || null}
          plate={data.plateNumber}
          amount={amount}
          onClose={() => setExpanded(null)}
        />
      )}
    </main>
  )
}
