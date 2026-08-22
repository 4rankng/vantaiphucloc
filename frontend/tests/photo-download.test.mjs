import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
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

test('Tải về follows the native attachment link when synthetic anchor clicks are blocked', {
  timeout: 20_000,
  skip: chromePath ? false : 'Chrome or Chromium is not installed',
}, async (t) => {
  let requestedPath = null
  const server = await createServer({
    root: frontendRoot,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'photo-download-test-endpoint',
      configureServer(devServer) {
        devServer.middlewares.use('/api/v1/photos/download', (request, response) => {
          requestedPath = new URL(request.url, 'http://test.local').searchParams.get('path')
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/octet-stream')
          response.setHeader('Content-Disposition', 'attachment; filename="container.jpg"')
          response.end('downloaded image bytes')
        })
      },
    }],
  })
  await server.listen()
  t.after(() => server.close())

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
  })
  t.after(() => browser.close())

  const page = await browser.newPage()
  const downloadDir = await mkdtemp(path.join(os.tmpdir(), 'phucloc-photo-download-'))
  t.after(() => rm(downloadDir, { recursive: true, force: true }))
  const cdp = await page.createCDPSession()
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
    eventsEnabled: true,
  })
  await page.goto(`${server.resolvedUrls.local[0]}tests/photo-download.html`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('[aria-label="Tải về"]')
  await page.evaluate(() => {
    HTMLAnchorElement.prototype.click = () => undefined
  })

  const downloadCompleted = new Promise((resolve, reject) => {
    cdp.on('Browser.downloadProgress', (event) => {
      if (event.state === 'completed') resolve()
      if (event.state === 'canceled') reject(new Error('Download was canceled'))
    })
  })

  await page.click('[aria-label="Tải về"]')
  await Promise.race([
    downloadCompleted,
    new Promise((_, reject) => setTimeout(() => reject(new Error('No image was downloaded')), 2_000)),
  ])

  assert.equal(requestedPath, '/photos/2026/08/22/container.jpg')
  assert.equal(await readFile(path.join(downloadDir, 'container.jpg'), 'utf8'), 'downloaded image bytes')
})
