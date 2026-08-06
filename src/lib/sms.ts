interface SmsRuResponse {
  status?: string
  status_code?: number
  sms?: Record<string, { status?: string; status_code?: number; status_text?: string }>
}

export interface SmsDelivery {
  mode: 'sms' | 'development'
  devCode?: string
}

export function isSmsRuAccepted(json: unknown, recipient: string): boolean {
  if (!json || typeof json !== 'object') return false
  const response = json as SmsRuResponse
  const item = response.sms?.[recipient]
  return response.status === 'OK' && response.status_code === 100 && item?.status_code === 100
}

/** Отправляет одноразовый код через SMS.ru. Без ключа код доступен только в dev/test. */
export async function sendPhoneVerificationCode(phone: string, code: string): Promise<SmsDelivery> {
  const apiId = process.env.SMS_RU_API_ID
  if (!apiId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS_RU_API_ID is not configured')
    }
    return { mode: 'development', devCode: code }
  }

  const recipient = phone.replace(/\D/g, '')
  const body = new URLSearchParams({
    api_id: apiId,
    to: recipient,
    msg: `Код подтверждения Lexus: ${code}`,
    json: '1',
  })
  if (process.env.SMS_RU_FROM) body.set('from', process.env.SMS_RU_FROM)

  const response = await fetch('https://sms.ru/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok || !isSmsRuAccepted(await response.json(), recipient)) {
    throw new Error('SMS provider rejected the message')
  }
  return { mode: 'sms' }
}
