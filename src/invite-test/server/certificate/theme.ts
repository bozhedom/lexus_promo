import { CERT_LAYOUT } from '@/widgets/certificate-sheet/layout'

/**
 * Пригласительный как картинка для мессенджеров. Композиция и все размеры —
 * те же, что у экранного `CertificateSheet`: кадр 360×640 из макета, увеличенный
 * втрое. Гость сравнивает пришедшее в чат с тем, что видел в модалке, поэтому
 * расхождений быть не должно.
 */
export const CERT_SCALE = 3
export const CERT_WIDTH = CERT_LAYOUT.width * CERT_SCALE
export const CERT_HEIGHT = CERT_LAYOUT.height * CERT_SCALE

/** Размер из макета в пикселях картинки. */
export const u = (value: number) => value * CERT_SCALE

export const GOLD_RULE = '#d6cca6'
export const GOLD_LINE = '#7b7254'
export const GOLD_WARM = '#e0c7a9'

export const centered = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  textAlign: 'center' as const,
}
