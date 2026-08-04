import { NextRequest, NextResponse } from 'next/server'

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Читает JSON-тело. sendBeacon может отправлять text/plain или Blob без
 * content-type, поэтому парсим текст вручную.
 */
export async function readJsonBody(req: NextRequest): Promise<unknown | null> {
  try {
    const text = await req.text()
    if (!text || text.length > 100_000) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Ханипот: скрытое поле формы. Заполнено: значит бот. */
export function isHoneypotTripped(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.length > 0
}
