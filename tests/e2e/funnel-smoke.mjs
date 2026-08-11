// Прогон всей воронки в браузере: ввод номера и кода идут через собственные
// экранные клавиатуры, поэтому сценарий кликает по их клавишам, а не печатает.
// Запуск: npm run e2e -- [ширина] [высота] [метка] [номер]
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = process.env.QA_OUT || '/tmp/promo-e2e-shots'
fs.mkdirSync(OUT, { recursive: true })
const BASE = 'http://127.0.0.1:3000'

const W = +(process.argv[2] || 360)
const H = +(process.argv[3] || 800)
const TAG = process.argv[4] || `${W}x${H}`
const L = 'АВЕКМНОРСТУХ'
const rnd = (n) => Math.floor(Math.random() * n)
const PLATE =
  process.argv[5] ||
  `${L[rnd(12)]}${rnd(10)}${rnd(10)}${rnd(10)}${L[rnd(12)]}${L[rnd(12)]}`

const IGNORE = /webpack-hmr|favicon|hot-update|Download the React DevTools/i

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && !IGNORE.test(m.text()) && errors.push(m.text()))
page.on('pageerror', (e) => !IGNORE.test(String(e)) && errors.push(String(e)))
page.on('response', async (response) => {
  if (response.status() < 400 || !response.url().includes('/api/')) return
  console.log(`  API ${response.status()} ${response.url()} ${await response.text().catch(() => '')}`)
})

const shot = async (name) => page.screenshot({ path: `${OUT}/${TAG}_${name}.png` })

const check = async (label, { allowScroll = false } = {}) => {
  await page
    .waitForFunction(() => [...document.images].every((image) => image.loading === 'lazy' || image.complete), null, {
      timeout: 10000,
    })
    .catch(() => undefined)
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    sh: document.documentElement.scrollHeight,
    ch: document.documentElement.clientHeight,
    broken: [...document.images]
      .filter((i) => i.loading !== 'lazy' && i.complete && !i.naturalWidth)
      .map((i) => i.src.slice(-60)),
  }))
  const bad = []
  if (m.sw > m.cw) bad.push(`H-OVERFLOW ${m.sw}>${m.cw}`)
  if (!allowScroll && m.sh > m.ch + 1) bad.push(`V-OVERFLOW ${m.sh}>${m.ch}`)
  if (m.broken.length) bad.push(`BROKEN ${JSON.stringify(m.broken)}`)
  const scroll = m.sh > m.ch + 1 ? `scroll +${m.sh - m.ch}` : 'fits'
  console.log(`  ${label.padEnd(16)} ${scroll.padEnd(12)} ${bad.length ? '✗ ' + bad.join(' | ') : 'ok'}`)
  return bad.length === 0
}

const pad = (ch) => page.locator('[data-keypad] button', { hasText: new RegExp(`^${ch}$`) }).first()
const type = async (text) => {
  for (const ch of text) {
    await pad(ch).click()
    await page.waitForTimeout(60)
  }
}

let ok = true
console.log(`\n=== ${TAG} ===`)

// 1 — приветствие
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
await shot('1-welcome')
ok = (await check('welcome')) && ok

await page.getByRole('button', { name: /Получить приглашение/i }).click()
await page.waitForURL('**/car-number', { timeout: 20000 })
await page.waitForTimeout(1500)
await shot('2-plate')
ok = (await check('plate')) && ok

// 2 — номер через свою клавиатуру
await page.locator('[aria-label="Госномер"]').first().waitFor()
await page.locator('div[class*="mainBlock"]').first().click()
await page.locator('[data-keypad]').waitFor({ timeout: 5000 })
await shot('2b-keypad')
// Регион уже стоит (125) и каретка в него не перескакивает: набираем только
// основную часть, как это делает человек.
await type(PLATE)
await page.waitForTimeout(200)
await shot('2c-filled')
await page.locator('[data-keypad] button', { hasText: 'Готово' }).click()
await page.waitForTimeout(300)

await page.getByRole('button', { name: /Определить автомобиль/i }).click()
await page.waitForTimeout(700)
await shot('2d-loading')
await page.waitForURL('**/car-info', { timeout: 40000 })
await page.waitForTimeout(1500)
await shot('3-car-info')

// 3 — найдено или ручной ввод
const mine = page.getByRole('button', { name: /Это мой автомобиль/i })
if (await mine.count()) {
  ok = (await check('car-info')) && ok
  await mine.click()
} else {
  ok = (await check('car-info', { allowScroll: true })) && ok
  const choose = async (field, option) => {
    await page.getByRole('combobox', { name: field }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
    await page.waitForTimeout(200)
  }
  await choose('Марка', 'Lexus')
  await choose('Модель', 'RX')
  await choose('Год', '2022')
  await page.waitForTimeout(200)
  await shot('3b-manual')
  ok = (await check('manual', { allowScroll: true })) && ok
  await page.getByRole('button', { name: /Подтвердить/i }).click()
}

await page.waitForURL('**/personal', { timeout: 30000 })
await page.waitForTimeout(1400)
await shot('4-personal')
ok = (await check('personal')) && ok

// 4 — имя и отчество
await page.getByRole('textbox', { name: 'Имя' }).fill('Иван')
await page.getByRole('textbox', { name: 'Отчество' }).fill('Сергеевич')
await page.locator('input[type=checkbox]').click()
await page.waitForTimeout(200)
await shot('4b-filled')
await page.getByRole('button', { name: /Оформить приглашение/i }).click()

// 5 — пригласительные: выданы сразу, возврата назад с этого шага нет
const claim = page.getByRole('dialog', { name: 'Ваши персональные пригласительные' })
await claim.waitFor({ timeout: 40000 })
await page.waitForTimeout(1200)
await shot('5-claim')
ok = (await check('claim')) && ok

await claim.getByRole('button', { name: /Открыть пригласительный/i }).first().click()
const certificateViewer = page.getByRole('dialog', { name: 'Пригласительный сертификат' })
await certificateViewer.waitFor({ timeout: 10000 })
// Пригласительный рисуется разметкой: ждём сам кадр и загрузку его картинок.
await certificateViewer.locator('[class*="CertificateSheet_sheet"]').waitFor({ timeout: 10000 })
await page.waitForFunction(
  () =>
    [...document.querySelectorAll('[aria-label="Пригласительный сертификат"] img')].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  null,
  { timeout: 15000 },
)
await page.waitForTimeout(150)
await shot('5a-certificate')
ok = (await check('certificate')) && ok

// крестик закрывает только сам пригласительный, модалка выдачи остаётся
await certificateViewer.getByRole('button', { name: 'Закрыть сертификат' }).click()
await page.waitForTimeout(400)
if (!(await claim.isVisible())) {
  ok = false
  console.log('  claim-after-close  ✗ модалка выдачи закрылась вместе с сертификатом')
} else {
  console.log('  claim-after-close  ok')
}
await shot('5b-claim-after-close')

console.log(`  console errors: ${errors.length ? JSON.stringify(errors.slice(0, 3)) : 0}`)
console.log(ok && !errors.length ? `=== ${TAG}: PASS ===` : `=== ${TAG}: CHECK ===`)
await browser.close()
