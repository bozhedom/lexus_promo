'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { Button } from '@/shared/ui'
import {
  CertificateSheet,
  CertificateViewer,
  formatPlateLine,
  type CertificateKind,
} from '@/widgets/certificate-sheet'
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
      <section className={styles.card}>
        <p className={styles.eyebrow}>С возвращением</p>

        {data.fullName && <p className={styles.guest}>{data.fullName}</p>}

        <h1>Ваши пригласительные<br />уже готовы</h1>

        <p className={styles.lead}>
          Мы нашли их по номеру {formatPlateLine(data.plateNumber ?? '')}
        </p>

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
              <span className={styles.previewLabel}>{card.label}</span>
            </button>
          ))}
        </div>

        <p className={styles.note}>
          Повторно оформлять приглашение не нужно: пригласительные уже закреплены за этим
          автомобилем. Покажите код {data.certificateCode} администратору автоцентра.
        </p>

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
