'use client'

import { useRouter } from 'next/navigation'

import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { Button } from '@/shared/ui'
import styles from './ExistingCertificateScreen.module.scss'

const rubles = new Intl.NumberFormat('ru-RU')

export function ExistingCertificateScreen() {
  const router = useRouter()
  const show = useFunnelGuard(
    (data) => Boolean(data.plateNumber && data.certificateCode && data.certificateAmount),
    '/car-number',
  )
  const { data, reset } = useFunnel()
  useScreenView('certificate')

  if (!show) return null

  const vehicle = [data.carBrand, data.carModel, data.carYear].filter(Boolean).join(' ')
  const expires = data.certificateExpiresAt
    ? new Intl.DateTimeFormat('ru-RU').format(new Date(data.certificateExpiresAt))
    : null

  return (
    <main className={styles.screen}>
      <span className={styles.stage} aria-hidden />
      <section className={styles.card}>
        <p className={styles.eyebrow}>С возвращением</p>
        <h1>Ваш сертификат<br />уже готов</h1>
        <span className={styles.divider} aria-hidden />
        <p className={styles.lead}>Мы нашли сохранённый пригласительный для этого автомобиля</p>

        <div className={styles.vehicle}>
          <strong>{data.plateNumber}</strong>
          {vehicle && <span>{vehicle}</span>}
        </div>

        <div className={styles.certificate}>
          <small>Сертификат</small>
          <strong>{rubles.format(data.certificateAmount ?? 0)} ₽</strong>
          <code>{data.certificateCode}</code>
          {expires && <span>Действует до {expires}</span>}
        </div>

        <p className={styles.note}>Повторно оформлять приглашение не нужно — покажите этот код администратору автоцентра.</p>

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
    </main>
  )
}
