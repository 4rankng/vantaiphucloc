import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chromePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((candidate) => candidate && existsSync(candidate))

test('hides and restores the client list without losing the selected pricing workspace', {
  timeout: 20_000,
  skip: chromePath ? false : 'Chrome or Chromium is not installed',
}, async (t) => {
  const server = await createServer({ root: frontendRoot, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  t.after(() => server.close())

  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' })
  t.after(() => browser.close())

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${server.resolvedUrls.local[0]}tests/route-pricing-client-list.html`, { waitUntil: 'networkidle0' })

  const toggle = 'button[aria-controls="route-pricing-client-list"]'
  await page.waitForSelector(toggle)
  assert.ok(await page.$('#route-pricing-client-list'))
  assert.equal(await page.$eval(toggle, element => element.getAttribute('aria-expanded')), 'true')
  assert.match(await page.$eval(toggle, element => element.textContent || ''), /Ẩn danh sách chủ hàng/)

  const widthWithList = await page.$eval('[data-route-pricing-workspace]', element => element.getBoundingClientRect().width)
  await page.click(toggle)
  await page.waitForFunction(() => document.querySelector('#route-pricing-client-list') === null)

  assert.equal(await page.$eval(toggle, element => element.getAttribute('aria-expanded')), 'false')
  assert.match(await page.$eval(toggle, element => element.textContent || ''), /Hiện danh sách chủ hàng/)
  assert.match(await page.$eval('h2', element => element.textContent || ''), /HẢI AN/)
  const widthWithoutList = await page.$eval('[data-route-pricing-workspace]', element => element.getBoundingClientRect().width)
  assert.ok(widthWithoutList > widthWithList + 200)

  await page.keyboard.press('Enter')
  await page.waitForSelector('#route-pricing-client-list')
  assert.equal(await page.$eval(toggle, element => element.getAttribute('aria-expanded')), 'true')
})

test('shows a retryable load error instead of claiming that pricing data is empty', {
  timeout: 20_000,
  skip: chromePath ? false : 'Chrome or Chromium is not installed',
}, async (t) => {
  const server = await createServer({ root: frontendRoot, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } })
  await server.listen()
  t.after(() => server.close())

  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' })
  t.after(() => browser.close())

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(`${server.resolvedUrls.local[0]}tests/route-pricing-client-list.html?error=1`, { waitUntil: 'networkidle0' })

  assert.match(await page.$eval('body', element => element.innerText), /Không thể tải bảng giá cước/)
  assert.match(await page.$eval('body', element => element.innerText), /Thử lại/)
  assert.doesNotMatch(await page.$eval('body', element => element.innerText), /Chưa có cước tuyến nào/)

  await page.locator('::-p-text(Thử lại)').click()
  assert.equal(await page.$eval('body', element => element.dataset.retried), 'true')
})
