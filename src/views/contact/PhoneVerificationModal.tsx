'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { maskPhone } from '@/features/save-contact'
import { useMediaQuery } from '@/shared/lib/useMediaQuery'
import { Loader } from '@/shared/ui'
import { DigitKeypad } from '@/shared/ui/Keypad'
import styles from './ContactScreen.module.scss'

const LENGTH = 6

interface PhoneVerificationModalProps {
  phone: string
  retryAfter: number
  devCode?: string
  busy: boolean
  error: string
  onVerify: (code: string) => void
  onResend: () => void
  onClose: () => void
}

export function PhoneVerificationModal({
  phone,
  retryAfter,
  devCode,
  busy,
  error,
  onVerify,
  onResend,
  onClose,
}: PhoneVerificationModalProps) {
  // Код хранится по ячейкам: тап ставит каретку в нужную, «Стереть» убирает
  // ровно один символ. То же поведение, что у поля госномера.
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''))
  const [caret, setCaret] = useState(0)
  const [seconds, setSeconds] = useState(retryAfter)
  const inputRef = useRef<HTMLInputElement>(null)
  const slotsRef = useRef<HTMLSpanElement>(null)

  // На телефоне печатает своя клавиатура. Системная здесь не нужна и вредна:
  // на фокусе iOS подтягивает страницу и меняет масштаб, а модалка съезжает.
  const touch = useMediaQuery('(hover: none) and (pointer: coarse)')
  const [padOpen, setPadOpen] = useState(false)
  const [padPrimed, setPadPrimed] = useState(false)

  // Модалка открывается ровно ради ввода кода, поэтому клавиатуру поднимаем
  // сразу — как это сделала бы системная при автофокусе. Тип указателя
  // известен только на клиенте, поэтому решение принимаем в первом же рендере
  // после гидратации, а не в эффекте.
  if (touch && !padPrimed) {
    setPadPrimed(true)
    setPadOpen(true)
  }

  const code = digits.join('')

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])


  // код собран целиком — проверяем сразу, отдельной кнопки в макете нет
  useEffect(() => {
    if (code.length === LENGTH && digits.every(Boolean)) onVerify(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const write = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const pressKey = (ch: string) => {
    if (busy || caret >= LENGTH) return
    write(caret, ch)
    setCaret(Math.min(caret + 1, LENGTH))
  }

  const erase = () => {
    if (busy) return
    if (caret > 0) {
      write(caret - 1, '')
      setCaret(caret - 1)
    }
  }

  // Каретка не уходит дальше первой пустой ячейки: иначе в коде остались бы
  // пропуски. Внутри набранной части её можно ставить куда угодно.
  const focusAt = (index: number) => {
    if (busy) return
    let limit = 0
    while (limit < LENGTH && digits[limit]) limit += 1
    setCaret(Math.min(index, limit, LENGTH - 1))
    if (touch) setPadOpen(true)
    else inputRef.current?.focus()
  }

  // тап по строке ячеек: каретка встаёт в ближайшую
  const pickSlot = (e: React.PointerEvent) => {
    e.preventDefault()
    const cells = Array.from(slotsRef.current?.children ?? []) as HTMLElement[]
    let nearest = 0
    let best = Infinity
    cells.forEach((el, i) => {
      const box = el.getBoundingClientRect()
      const distance = Math.abs(e.clientX - (box.left + box.width / 2))
      if (distance < best) {
        best = distance
        nearest = i
      }
    })
    focusAt(nearest)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      erase()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      setCaret((c) => Math.min(LENGTH, Math.max(0, c + (e.key === 'ArrowLeft' ? -1 : 1))))
      return
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      pressKey(e.key)
    }
  }

  // Автозаполнение из СМС приходит одной строкой
  const onAutofill = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, LENGTH)
    if (!clean) return
    setDigits(Array.from({ length: LENGTH }, (_, i) => clean[i] ?? ''))
    setCaret(clean.length)
  }

  const caretVisible = touch ? padOpen : true

  return (
    <>
      <div
        className={styles.verifyOverlay}
        data-pad={(touch && padOpen) || undefined}
        role="presentation"
        onPointerDown={() => !busy && onClose()}
      >
      <section
        className={styles.verifyModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-verification-title"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.verifyClose}
          aria-label="Закрыть"
          onClick={onClose}
          disabled={busy}
        >
          ×
        </button>

        <h2 id="phone-verification-title">Введите код из СМС</h2>
        <p>Отправили на {maskPhone(phone)}</p>

        <div
          className={styles.codeField}
          data-invalid={Boolean(error) || undefined}
          onPointerDown={pickSlot}
        >
          <span className={styles.codeSlots} ref={slotsRef}>
            {digits.map((digit, index) => (
              <i key={index} data-filled={Boolean(digit) || undefined} data-caret={caretVisible && caret === index ? true : undefined}>
                {digit || ' '}
              </i>
            ))}
          </span>
          <input
            ref={inputRef}
            className={styles.codeInput}
            value={code}
            inputMode={touch ? 'none' : 'numeric'}
            autoComplete="one-time-code"
            maxLength={LENGTH}
            readOnly={touch || busy}
            disabled={busy}
            aria-label="Шестизначный код из СМС"
            onKeyDown={onKeyDown}
            onChange={(event) => onAutofill(event.target.value)}
          />
        </div>

        <div className={styles.verifyStatus} aria-live="polite">
          {busy ? <Loader label="Проверяем код" /> : error || null}
        </div>

        {seconds > 0 ? (
          <p className={styles.resendHint}>Запросить код повторно через {seconds} сек.</p>
        ) : (
          <button type="button" className={styles.resendButton} onClick={onResend} disabled={busy}>
            Запросить код повторно
          </button>
        )}

        {devCode && <p className={styles.devCode}>Код для локальной разработки: {devCode}</p>}
        </section>
      </div>

      {/* Клавиатура портируется в body, но в дереве React остаётся соседом
          затемнения, а не его потомком: события портала всплывают по дереву
          компонентов, и внутри затемнения нажатие на клавишу закрывало бы
          модалку его же обработчиком. */}
      {touch &&
        padOpen &&
        createPortal(
          <DigitKeypad
            hint="Код из СМС"
            label="Клавиатура для кода из СМС"
            onKey={pressKey}
            onErase={erase}
            onDone={() => setPadOpen(false)}
            canErase={Boolean(code)}
          />,
          document.body,
        )}
    </>
  )
}
