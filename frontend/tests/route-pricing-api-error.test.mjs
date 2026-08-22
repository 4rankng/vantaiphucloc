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

test('rejects a failed route-pricing request instead of resolving an empty dataset', {
  timeout: 20_000,
  skip: chromePath ? false : 'Chrome or Chromium is not installed',
}, async (t) => {
  const server = await createServer({
    root: frontendRoot,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'route-pricing-api-error-test-endpoint',
      configureServer(devServer) {
        devServer.middlewares.use('/api/v1/route-pricings', (_request, response) => {
          response.statusCode = 503
          response.setHeader('Content-Type', 'application/json')
          response.end(JSON.stringify({ detail: 'Dịch vụ bảng giá tạm thời không khả dụng' }))
        })
      },
    }],
  })
  await server.listen()
  t.after(() => server.close())

  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' })
  t.after(() => browser.close())

  const page = await browser.newPage()
  await page.goto(`${server.resolvedUrls.local[0]}tests/route-pricing-api-error.html`, { waitUntil: 'networkidle0' })

  assert.equal(await page.$eval('body', element => element.dataset.requestState), 'rejected')
})
