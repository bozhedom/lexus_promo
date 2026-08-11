/**
 * Заводит или сбрасывает пользователя админки по данным из .env.
 *
 * Пароль хранится только в .env (он в .gitignore): в репозиторий он не
 * попадает, а вспомнить его можно, не заглядывая в базу.
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

const payload = await getPayload({ config })
const existing = await payload.find({
  collection: 'users',
  where: { email: { equals: email } },
  limit: 1,
})

if (existing.docs.length > 0) {
  await payload.update({
    collection: 'users',
    id: existing.docs[0].id,
    data: { password },
  })
  console.log(`Пароль обновлён: ${email}`)
} else {
  await payload.create({ collection: 'users', data: { email, password } })
  console.log(`Пользователь создан: ${email}`)
}

process.exit(0)
