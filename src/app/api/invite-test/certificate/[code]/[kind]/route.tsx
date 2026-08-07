import { renderCertificate, type CertificateKind } from '@/invite-test/server/certificateImage'
import { getSession } from '@/invite-test/server/store'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ code: string; kind: string }>
}

const KINDS: CertificateKind[] = ['diagnostics', 'gift']

export async function GET(_request: Request, context: RouteContext) {
  const { code, kind: rawKind } = await context.params
  const kind = rawKind.replace(/\.png$/i, '') as CertificateKind
  const session = getSession(code.toUpperCase())
  if (!session || !KINDS.includes(kind)) {
    return new Response('Сертификат не найден', { status: 404 })
  }

  return renderCertificate(kind, session.details, `${kind}-${session.code}.png`)
}
