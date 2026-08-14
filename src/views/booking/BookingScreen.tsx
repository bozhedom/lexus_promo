'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { Channel, ChannelInfo } from '@/invite-test/model/types'
import { MessengerButton } from '@/invite-test/ui/MessengerButton'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { flowRoutes } from '@/shared/lib/flow'
import { Button, Loader } from '@/shared/ui'
import { formatPlateLine } from '@/widgets/certificate-sheet'
import styles from './BookingScreen.module.scss'

type Channels = Record<Channel, ChannelInfo>

/**
 * Запись на сервис — вторая ветка воронки: гость приходит сюда с первого
 * экрана по «Рассчитать и записаться», вводит номер и подтверждает автомобиль
 * теми же экранами, что и за пригласительным.
 *
 * Пригласительные здесь не выписываются: «Записаться» открывает мессенджеры с
 * готовым текстом про автомобиль, дальше время встречи назначает менеджер.
 * Макета у экрана пока нет — свёрстан он теми же карточкой и рядом кнопок, что
 * и остальные окна воронки.
 */
export function BookingScreen() {
  const router = useRouter()
  const show = useFunnelGuard(
    (data) => Boolean(data.applicationId && data.carBrand),
    flowRoutes('booking').plate,
  )
  const { data, track } = useFunnel()
  useScreenView('booking')

  const [channels, setChannels] = useState<Channels | null>(null)
  const [opening, setOpening] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const car = [data.carBrand, data.carModel, data.carYear].filter(Boolean).join(' ')
  const plate = data.plateNumber ?? ''

  // Ссылки на диалоги собирает сервер: в них уже подставлен текст с
  // автомобилем гостя, чтобы менеджер не переспрашивал.
  const openMessengers = async () => {
    if (channels || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/booking/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ car, plate }),
      })
      const body = (await res.json()) as { channels?: Channels; message?: string }
      if (!res.ok || !body.channels) throw new Error()
      track('cta_click', { id: 'booking' })
      setOpening(body.message ?? '')
      setChannels(body.channels)
    } catch {
      setError('Не удалось открыть мессенджеры, попробуйте ещё раз')
    } finally {
      setLoading(false)
    }
  }

  // Разговор продолжается в чате, а сайт возвращается к началу — так же, как
  // после отправки пригласительных.
  const send = (channel: Channel) => {
    const info = channels?.[channel]
    if (!info?.chatLink) return
    // В MAX текст в чужой диалог не подставить — кладём его в буфер обмена,
    // чтобы гостю осталось вставить и отправить.
    if (!info.prefilled && opening) navigator.clipboard?.writeText(opening).catch(() => undefined)
    window.open(info.chatLink, '_blank', 'noopener,noreferrer')
    track('outbound_click', { id: `booking_${channel}` })
    router.push('/')
  }

  if (!show) return null

  return (
    <main className={styles.screen}>
      <span className={styles.stage} aria-hidden />

      <section className={styles.card}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Запись на сервис</p>
          {car && <p className={styles.car}>{car}</p>}
          {plate && <p className={styles.plate}>{formatPlateLine(plate)}</p>}
        </header>

        <p className={styles.note}>
          Подберём время и рассчитаем работы
          <br />
          для Вашего автомобиля
        </p>

        {!channels && (
          <Button block onClick={openMessengers} disabled={loading}>
            {loading ? <Loader label="Открываем" /> : 'Записаться'}
          </Button>
        )}

        {channels && (
          <>
            <p className={styles.or}>
              <span />
              выберите мессенджер
              <span />
            </p>

            <div className={styles.messengers}>
              <MessengerButton
                icon="/invite-test/icon-max.png"
                label="MAX"
                disabled={!channels.max.enabled}
                onClick={() => send('max')}
              />
              <MessengerButton
                icon="/invite-test/icon-telegram.png"
                label="Telegram"
                disabled={!channels.telegram.enabled}
                onClick={() => send('telegram')}
              />
              <MessengerButton
                icon="/invite-test/icon-whatsapp.svg"
                label="W"
                ariaLabel="WhatsApp"
                disabled={!channels.whatsapp.enabled}
                onClick={() => send('whatsapp')}
              />
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}
      </section>
    </main>
  )
}
