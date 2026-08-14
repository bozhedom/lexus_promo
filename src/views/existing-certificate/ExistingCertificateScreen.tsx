'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, ReactNode } from 'react'

import { deliveryHint } from '@/invite-test/model/deliveryHint'
import { useInviteSession } from '@/invite-test/model/useInviteSession'
import type { Channel, PersonalInviteDetails } from '@/invite-test/model/types'
import { MessengerButton } from '@/invite-test/ui/MessengerButton'
import { useScreenView } from '@/shared/analytics'
import { useFunnel, useFunnelGuard } from '@/shared/lib/funnel'
import { CertificateSheet, CertificateViewer, type CertificateKind } from '@/widgets/certificate-sheet'
import styles from './ExistingCertificateScreen.module.scss'

const CARDS: { kind: CertificateKind; label: ReactNode }[] = [
  {
    kind: 'diagnostics', label: (
      <>
        Диагностика
        <br />
        ходовой части
      </>
    ),
  },
  { kind: 'gift', label: 'Замена масла' },
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
  const { data, track } = useFunnel()
  useScreenView('certificate')
  const [expanded, setExpanded] = useState<CertificateKind | null>(null)

  const brand = data.carBrand ?? 'Lexus'
  // Модель и год нужны не только подписи: по ним подбирается кадр автомобиля,
  // и без них вернувшийся гость видел на пригласительном чужую машину.
  const model = data.carModel ?? null
  const year = data.carYear ?? null
  const carTitle = [data.carBrand, data.carModel].filter(Boolean).join(' ')
  const amount = data.certificateAmount ?? 1500

  // Заявка осталась в прошлом заходе: её идентификатор сюда не приезжает, и
  // сохранённые в админке картинки этой сессии не принадлежат. Пригласительные
  // рисуются по запросу — по коду выданной сессии.
  const details = useMemo<PersonalInviteDetails | null>(() => {
    const fullName = (data.fullName ?? '').trim()
    if (!show || !fullName) return null
    return {
      fullName,
      brand,
      model: model ?? '',
      year,
      plate: (data.plateNumber ?? '').toUpperCase(),
      amount,
    }
  }, [show, data.fullName, brand, model, year, data.plateNumber, amount])

  // Заявка осталась за прошлой сессией браузера, поэтому сервер находит номера
  // выдачи по коду — печатать их на кадре со слов клиента нельзя.
  const delivery = useInviteSession(details, { certificateCode: data.certificateCode })

  if (!show) return null

  // Мессенджер открывается в соседней вкладке, а сайт возвращается к началу:
  // выписывать этому гостю больше нечего, и вернувшись из чата он попадает на
  // первый экран, а не на повторное сообщение о выданных пригласительных.
  const send = (channel: Channel) => {
    if (!delivery.openChat(channel)) return
    track('outbound_click', { id: `messenger_${channel}` })
    router.push('/')
  }

  const message = deliveryHint(delivery)

  return (
    <main className={styles.screen}>
      <span className={styles.stage} aria-hidden />
      <section className={styles.card} role="dialog" aria-modal="true">
        

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
                  model={model}
                  year={year}
                  name={data.fullName ?? ''}
                  carTitle={carTitle || null}
                  plate={data.plateNumber}
                  amount={amount}
                  serial={data.certificateSerials?.[card.kind]}
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

        {/* Забрать пригласительные вернувшийся гость может там же, где и все
            остальные — в своём мессенджере. Отдельной кнопки «продолжить»
            больше нет: ушёл в чат — под ним открывается тот же экран команды,
            что и у гостя, который только что прошёл воронку. */}
        <p className={styles.or}>
          <span />
          отправить в мессенджер
          <span />
        </p>

        <div className={styles.messengers}>
          <MessengerButton
            icon="/invite-test/icon-max.png"
            label="MAX"
            disabled={!delivery.session?.channels.max.enabled}
            onClick={() => send('max')}
          />
          <MessengerButton
            icon="/invite-test/icon-telegram.png"
            label="Telegram"
            disabled={!delivery.session?.channels.telegram.enabled}
            onClick={() => send('telegram')}
          />
          <MessengerButton
            icon="/invite-test/icon-whatsapp.svg"
            label="W"
            ariaLabel="WhatsApp"
            disabled={!delivery.session?.channels.whatsapp.enabled}
            onClick={() => send('whatsapp')}
          />
        </div>

        {message && (
          <p className={delivery.status === 'failed' ? styles.error : styles.hint}>{message}</p>
        )}
      </section>

      {expanded && (
        <CertificateViewer
          kind={expanded}
          brand={brand}
          model={model}
          year={year}
          name={data.fullName ?? ''}
          carTitle={carTitle || null}
          plate={data.plateNumber}
          amount={amount}
          serial={data.certificateSerials?.[expanded]}
          onClose={() => setExpanded(null)}
        />
      )}
    </main>
  )
}
