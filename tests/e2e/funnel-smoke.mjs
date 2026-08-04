import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = process.env.QA_OUT || '/tmp/promo-e2e-shots'
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://127.0.0.1:3000'

const W = +(process.argv[2] || 1440)
const H = +(process.argv[3] || 800)
const TAG = process.argv[4] || `${W}`

const IGNORE = /webpack-hmr|Failed to load resource.*favicon|_next\/static\/chunks\/.*hot-update/i

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${TAG}_${name}.png` })
}

const metrics = async (label) => {
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src),
    lowres: [...document.images]
      .filter((i) => !/\.svg/.test(i.currentSrc || i.src))
      .map((i) => {
        const r = i.getBoundingClientRect()
        return { src: (i.currentSrc || i.src).split('/').pop().slice(0, 34), nw: i.naturalWidth, nh: i.naturalHeight, w: Math.round(r.width), h: Math.round(r.height) }
      })
      .filter((i) => i.w > 2 && (i.nw + 1 < i.w || i.nh + 1 < i.h)),
  }))
  const bad = []
  if (m.sw > m.cw) bad.push(`H-OVERFLOW ${m.sw}>${m.cw}`)
  if (m.broken.length) bad.push(`BROKEN ${JSON.stringify(m.broken)}`)
  if (m.lowres.length) bad.push(`LOWRES ${JSON.stringify(m.lowres)}`)
  console.log(`  ${label.padEnd(14)} ${bad.length ? '✗ ' + bad.join(' | ') : 'ok'}`)
  return bad.length === 0
}

let ok = true
console.log(`\n=== ${TAG} (${W}x${H}) ===`)

// 1 — приветствие
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2400)
await shot('1-welcome')
ok = (await metrics('welcome')) && ok

// переход через занавес
await page.getByRole('button', { name: /Получить приглашение/i }).click()
await page.waitForTimeout(420)
await shot('1b-curtain')
await page.waitForURL('**/car-number', { timeout: 15000 })
await page.waitForTimeout(1800)

// 2 — номер
await shot('2-plate')
ok = (await metrics('plate')) && ok

await page.getByLabel('Госномер').fill('А555АА')
await page.getByLabel('Регион').fill('125')
await page.waitForTimeout(200)
await shot('2b-plate-filled')
await page.getByRole('button', { name: /Определить автомобиль/i }).click()
await page.waitForURL('**/car-info', { timeout: 30000 })

// 3 — определение авто
await page.waitForTimeout(600)
await shot('3-loading')
await page
  .getByRole('button', { name: /Это мой автомобиль|Далее/i })
  .first()
  .waitFor({ timeout: 30000 })
await page.waitForTimeout(600)
await shot('3a-found')
ok = (await metrics('car-info')) && ok

// ручной ввод — 3b / 3c
const notMine = page.getByRole('button', { name: /Это не мой автомобиль/i })
if (await notMine.count()) {
  await notMine.click()
  await page.waitForTimeout(600)
}
// марка/модель/год — свой список вместо системного select, поэтому выбираем
// пункт кликом, а не selectOption
const choose = async (field, option) => {
  await page.getByRole('combobox', { name: field }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
  await page.waitForTimeout(250)
}

await page.getByLabel('Марка').waitFor({ timeout: 20000 })
await shot('3b-manual')
ok = (await metrics('manual-brand')) && ok
await choose('Марка', 'Lexus')
await choose('Модель', 'RX')
await shot('3b-manual-filled')
await page.getByRole('button', { name: /^Далее$/ }).click()
await page.waitForTimeout(600)
await shot('3c-year')
ok = (await metrics('manual-year')) && ok
await choose('Год', '2022')
await page.getByLabel('Госномер').fill('А555АА125')
await page.waitForTimeout(250)
await shot('3c-year-filled')
await page.getByRole('button', { name: /Подтвердить/i }).click()

await page.waitForURL('**/personal', { timeout: 30000 })
await page.waitForTimeout(900)

// 4 — контакты
await shot('4-personal')
ok = (await metrics('personal')) && ok
await page.getByLabel('Как к вам обращаться').fill('Иван Александрович')
await page.getByLabel('Номер телефона').fill('+7 (999) 666-00-12')
await page.locator('input[type=checkbox]').click()
await page.waitForTimeout(250)
await shot('4b-personal-filled')
await page.getByRole('button', { name: /Получить пригласительный/i }).click()

await page.waitForURL('**/certificate', { timeout: 30000 })
await page.getByRole('button', { name: /Скачать пригласительный/i }).waitFor({ timeout: 40000 })
await page.waitForTimeout(1600)

// 5 — пригласительный
await shot('5-certificate')
ok = (await metrics('certificate')) && ok

await page.getByRole('button', { name: /Скачать пригласительный/i }).click()
await page.waitForURL('**/links', { timeout: 40000 })
await page.waitForTimeout(1800)

// 6 — итоговый
await shot('6-links')
ok = (await metrics('links')) && ok

// клики по всем внешним ссылкам должны быть живыми
const dead = await page.evaluate(() =>
  [...document.querySelectorAll('a[data-link-id]')]
    .filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#')
    .map((a) => a.dataset.linkId),
)
if (dead.length) console.log(`  links          ! заглушки href="#": ${dead.join(', ')}`)

console.log(`  console errors: ${errors.length ? JSON.stringify(errors.slice(0, 4)) : 0}`)
console.log(ok && !errors.length ? `=== ${TAG}: PASS ===` : `=== ${TAG}: CHECK ===`)

await browser.close()
