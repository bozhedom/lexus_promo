import { NextResponse, type NextRequest } from 'next/server'

/**
 * Шлюз перед админкой. До формы входа Payload гость не доходит: сначала
 * браузер спрашивает отдельные логин и пароль (HTTP Basic), и только пройдя
 * их, посетитель вообще узнаёт, что по этому адресу что-то есть.
 *
 * Пароль шлюза живёт только в переменных окружения и с паролем менеджера в
 * админке не совпадает — подобрать нужно оба. Заодно закрыт REST Payload
 * (`/payload-api`), через который заявки и сертификаты читаются в обход
 * интерфейса.
 *
 * Без заполненных ADMIN_GATE_USER и ADMIN_GATE_PASSWORD на проде админка не
 * открывается вовсе: незакрытую панель лучше не поднимать по недосмотру.
 */

const GATE_COOKIE = 'admin_gate'
const GATE_TTL = 60 * 60 * 12 // полсмены: к утру вход спрашивается заново

/**
 * Загрузки Payload остаются открытыми: по этим ссылкам страницы воронки берут
 * кадры и слайды, а GREEN-API скачивает картинки пригласительных, чтобы
 * отправить их гостю. Закрытые — пригласительные не доходят.
 */
const isPublicUpload = (pathname: string) => /^\/payload-api\/[^/]+\/file\//.test(pathname)

const encoder = new TextEncoder()

/** Сравнение без ранних выходов: время ответа не подсказывает длину совпадения. */
function equals(a: string, b: string): boolean {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return diff === 0
}

/**
 * Метка пройденного шлюза. Считается от самих логина и пароля, поэтому смена
 * пароля в переменных разом обнуляет все выданные метки, а подделать её, не
 * зная пароля, нельзя.
 */
async function gateToken(user: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${user}:${password}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('admin-gate:v1'))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Логин и пароль из заголовка `Authorization: Basic`. */
function basicCredentials(header: string | null): { user: string; password: string } | null {
  if (!header?.startsWith('Basic ')) return null
  try {
    const decoded = atob(header.slice(6))
    const separator = decoded.indexOf(':')
    if (separator < 0) return null
    return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) }
  } catch {
    return null
  }
}

/**
 * Адрес гостя. За nginx настоящий адрес приходит заголовком, поэтому берём
 * первый элемент цепочки X-Forwarded-For.
 */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() ?? ''
}

const NO_INDEX = { 'X-Robots-Tag': 'noindex, nofollow' }

/** Адреса нет — так админка не отвечает даже тем, что она здесь есть. */
const notFound = () => new NextResponse(null, { status: 404, headers: NO_INDEX })

const challenge = () =>
  new NextResponse('Требуется авторизация', {
    status: 401,
    headers: {
      ...NO_INDEX,
      // realm без названия проекта: подсказывать, что за дверью, незачем
      'WWW-Authenticate': 'Basic realm="Restricted", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicUpload(pathname)) return NextResponse.next()

  const user = process.env.ADMIN_GATE_USER?.trim()
  const password = process.env.ADMIN_GATE_PASSWORD?.trim()

  if (!user || !password) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        'Админка закрыта: заполните ADMIN_GATE_USER и ADMIN_GATE_PASSWORD.',
        { status: 503, headers: { ...NO_INDEX, 'Content-Type': 'text/plain; charset=utf-8' } },
      )
    }
    // Локально шлюз не мешает: разработка идёт без лишнего пароля.
    return NextResponse.next()
  }

  // Необязательный список адресов: заполнен — с чужого адреса админки просто
  // нет, и пароль шлюза подбирать не с чего.
  const allowed = (process.env.ADMIN_ALLOWED_IPS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (allowed.length > 0 && !allowed.includes(clientIp(request))) return notFound()

  const token = await gateToken(user, password)

  const cookie = request.cookies.get(GATE_COOKIE)?.value
  if (cookie && equals(cookie, token)) return NextResponse.next()

  const credentials = basicCredentials(request.headers.get('authorization'))
  if (!credentials) return challenge()
  if (!equals(credentials.user, user) || !equals(credentials.password, password)) {
    return challenge()
  }

  // Метка в куке: браузер не обязан прикладывать Basic к запросам, которые
  // админка шлёт из скриптов, а без них интерфейс не работает.
  const response = NextResponse.next()
  response.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: GATE_TTL,
  })
  return response
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/payload-api/:path*'],
}
