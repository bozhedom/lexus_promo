import { toPng } from 'html-to-image'

// Рендерит DOM-узел карточки в PNG и сохраняет файл.
// На мобильных сначала пробуем системный «Поделиться», иначе скачивание.
export async function saveTicket(
  node: HTMLElement,
  filename: string,
  certificateId?: string,
): Promise<'shared' | 'downloaded'> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#000000',
  })

  const blob = await (await fetch(dataUrl)).blob()
  // копию кладём в админку, но воронку этим не задерживаем
  if (certificateId) void uploadCopy(certificateId, blob, filename)

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
  }

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    try {
      const file = new File([blob], filename, { type: 'image/png' })
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file] })
        return 'shared'
      }
    } catch {
      // пользователь отменил шеринг или он не поддержан: падаем в скачивание
    }
  }

  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
  return 'downloaded'
}

async function uploadCopy(id: string, blob: Blob, filename: string): Promise<void> {
  try {
    const body = new FormData()
    body.append('file', blob, filename)
    await fetch(`/api/certificates/${id}/image`, { method: 'POST', body })
  } catch {
    // картинка в админке приятна, но не критична
  }
}
