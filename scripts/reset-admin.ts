/**
 * Делает аккаунт из .env единственным аккаунтом админки.
 *
 * Панель общая на автоцентр: один логин на всех, пароль лежит в .env сервера
 * (он в .gitignore) — вспомнить его можно, не заглядывая в базу, а забытые
 * личные аккаунты не остаются висеть открытой дверью. Все остальные
 * пользователи удаляются.
 *
 *   npm run admin:reset
 */
import { getPayload } from 'payload'
import config from '@payload-config'

const email = process.env.PAYLOAD_ADMIN_EMAIL?.trim()
const password = process.env.PAYLOAD_ADMIN_PASSWORD?.trim()

if (!email || !password) {
  console.error('Заполните PAYLOAD_ADMIN_EMAIL и PAYLOAD_ADMIN_PASSWORD в .env')
  process.exit(1)
}

if (password.length < 12) {
  console.error('Пароль короче 12 символов. Сгенерировать: openssl rand -base64 24')
  process.exit(1)
}

const payload = await getPayload({ config })

const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
})

let id: string
if (existing.docs.length > 0) {
  id = String(existing.docs[0]!.id)
  await payload.update({ collection: 'users', id, data: { password } })
  console.log(`Пароль обновлён: ${email}`)
} else {
  const created = await payload.create({ collection: 'users', data: { email, password } })
  id = String(created.id)
  console.log(`Пользователь создан: ${email}`)
}

// Пять неудачных входов запирают аккаунт на четверть часа. Пароль только что
// сменили — держать запертым уже незачем.
await payload
  .unlock({ collection: 'users', data: { email, password }, overrideAccess: true })
  .catch(() => {})

const others = await payload.find({
  collection: 'users',
  where: { id: { not_equals: id } },
  limit: 100,
})

if (others.docs.length > 0) {
  await payload.delete({ collection: 'users', where: { id: { not_equals: id } } })
  console.log(`Удалены прежние аккаунты: ${others.docs.map((doc) => doc.email).join(', ')}`)
} else {
  console.log('Других аккаунтов нет')
}

process.exit(0)
