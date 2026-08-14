'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { Channel, ChannelInfo } from '@/invite-test/model/types'
import { MessengerButton } from '@/invite-test/ui/MessengerButton'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { flowRoutes } from '@/shared/lib/flow'
import { Loader } from '@/shared/ui'
import { formatPlateLine } from '@/widgets/certificate-sheet'
import styles from './BookingScreen.module.scss'

type Channels = Record<Channel, ChannelInfo>

/**
 * Запись на сервис — вторая ветка воронки: гость приходит сюда с первого
 * экрана по «Рассчитать и записаться», вводит номер и подтверждает автомобиль
 * теми же экранами, что и за пригласительным.
 *
 * Пригласительные здесь не выписываются: гость сразу выбирает мессенджер и
 * уходит туда с готовым текстом — автомобиль и отмеченные работы уже в
 * сообщении, дальше время встречи назначает менеджер. Макета у экрана пока нет
 * — свёрстан он теми же карточкой и рядом кнопок, что и остальные окна воронки.
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
  const [error, setError] = useState('')

  const car = [data.carBrand, data.carModel, data.carYear].filter(Boolean).join(' ')
  const plate = data.plateNumber ?? ''
  const services = data.services ?? []

  // Ссылки на диалоги собирает сервер: в них уже подставлен текст с
  // автомобилем и работами, чтобы менеджер не переспрашивал. Запрос уходит
  // сразу — выбор мессенджера и есть единственное действие на экране.
  useEffect(() => {
    if (!show) return
    let active = true
    fetch('/api/booking/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car, plate, services }),
    })
      .then(async (res) => {
        const body = (await res.json()) as { channels?: Channels; message?: string }
        if (!res.ok || !body.channels) throw new Error()
        if (!active) return
        setOpening(body.message ?? '')
        setChannels(body.channels)
      })
      .catch(() => {
        if (active) setError('Не удалось открыть мессенджеры, попробуйте ещё раз')
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  // Разговор продолжается в чате, а сайт возвращается к началу — так же, как
  // после отправки пригласительных.
  const send = (channel: Channel) => {
    const info = channels?.[channel]
    if (!info?.chatLink) return
    // Там, где текст в ссылку не подставить, кладём его в буфер обмена, чтобы
    // гостю осталось вставить и отправить.
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

        {/* Гость видит, что именно уйдёт менеджеру: работы он отмечал экраном
            раньше, а формулировку менеджер правит в админке. */}
        {services.length > 0 && (
          <ul className={styles.services}>
            {services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        )}

        <p className={styles.or}>
          <span />
          выберите мессенджер
          <span />
        </p>

        {channels ? (
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
        ) : (
          !error && (
            <div className={styles.messengersLoading} role="status">
              <Loader label="Открываем мессенджеры" />
            </div>
          )
        )}

        {error && <p className={styles.error}>{error}</p>}
      </section>
    </main>
  )
}
