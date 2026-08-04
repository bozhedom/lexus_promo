'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'

// UI-поле в карточке: отметка, что гость воспользовался пригласительным.
export function RedeemButton() {
  const { id } = useDocumentInfo()
  const redeemedField = useFormFields(([fields]) => fields?.redeemedAt?.value)
  const [busy, setBusy] = useState(false)
  const [localRedeemed, setLocalRedeemed] = useState<string | null>(null)

  const redeemed = localRedeemed ?? (typeof redeemedField === 'string' ? redeemedField : null)

  const redeem = async () => {
    if (!id || busy) return
    if (!window.confirm('Отметить, что гость воспользовался пригласительным? Отменить нельзя.')) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/certificates/${id}/redeem`, { method: 'POST' })
      const json = (await res.json()) as { redeemedAt?: string; error?: string }
      if (res.ok && json.redeemedAt) setLocalRedeemed(json.redeemedAt)
      else window.alert(json.error ?? 'Не удалось отметить')
    } catch {
      window.alert('Ошибка сети')
    } finally {
      setBusy(false)
    }
  }

  // сертификат ещё не сохранён, отмечать нечего
  if (!id) return null

  return (
    <div style={{ margin: '12px 0 4px' }}>
      {redeemed ? (
        <p style={{ margin: 0, color: 'var(--theme-success-500, #2e8b57)' }}>
          Гость воспользовался {new Date(redeemed).toLocaleString('ru-RU')}
        </p>
      ) : (
        <>
          <button
            type="button"
            className="btn btn--style-primary btn--size-small"
            onClick={redeem}
            disabled={busy}
          >
            {busy ? 'Отмечаем…' : 'Гость воспользовался'}
          </button>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--theme-elevation-500)' }}>
            Нажмите, когда гость приедет и получит подарок. Повторно применить пригласительный
            будет нельзя.
          </p>
        </>
      )}
    </div>
  )
}

export default RedeemButton
