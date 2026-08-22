import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const selectorTimeout = 10_000
const image = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#26372f"/>
    <rect x="180" y="190" width="1240" height="520" rx="28" fill="#d8d3c6"/>
    <path d="M220 250h1160M220 650h1160" stroke="#405a4c" stroke-width="20"/>
  </svg>
`)

async function openViewer(t, { src = '/test-image', viewport = { width: 390, height: 844, isMobile: true, hasTouch: true }, delay = 0, failFirst = false, reducedMotion = false } = {}) {
  let requests = 0
  const server = await createServer({
    root: frontendRoot,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{
      name: 'photo-lightbox-test-image',
      configureServer(devServer) {
        devServer.middlewares.use('/test-image', (_request, response) => {
          const isImageRequest = _request.headers['sec-fetch-dest'] === 'image'
          if (isImageRequest) requests += 1
          const send = () => {
            if (failFirst && isImageRequest && requests === 1) {
              response.statusCode = 503
              response.end('image unavailable')
              return
            }
            response.statusCode = 200
            response.setHeader('Content-Type', 'image/svg+xml')
            response.end(image)
          }
          if (delay > 0) setTimeout(send, delay)
          else send()
        })
      },
    }],
  })
  await server.listen()
  t.after(() => server.close())

  const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new' })
  t.after(() => browser.close())

  const page = await browser.newPage()
  await page.setViewport(viewport)
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  const touchSession = await page.createCDPSession()
  const url = new URL('tests/photo-lightbox.html', server.resolvedUrls.local[0])
  url.searchParams.set('src', src)
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' })

  return { page, requests: () => requests, touchSession }
}

async function dispatchTouch(session, type, touchPoints) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints })
}

function scaleFromTransform(transform) {
  const match = transform.match(/scale\(([^)]+)\)/)
  return match ? Number(match[1]) : 1
}

function translateFromTransform(transform) {
  const match = transform.match(/translate3d\(([^p]+)px, ([^p]+)px/)
  return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 }
}

test('shows a calm loading state until the photo is ready', async (t) => {
  const { page } = await openViewer(t, { delay: 350 })

  await page.waitForSelector('[role="status"]', { timeout: selectorTimeout })
  assert.match(await page.$eval('[role="status"]', (element) => element.textContent || ''), /Đang tải ảnh/)
  assert.equal(await page.$eval('img', (element) => getComputedStyle(element).opacity), '0')

  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })
  assert.equal(await page.$('[role="status"]'), null)
  await page.waitForFunction(() => getComputedStyle(document.querySelector('img')).opacity === '1', { timeout: selectorTimeout })
  assert.equal(await page.$eval('img', (element) => getComputedStyle(element).opacity), '1')
})

test('offers an in-place retry when the photo cannot be loaded', async (t) => {
  const { page, requests } = await openViewer(t, { failFirst: true })

  await page.waitForSelector('[role="alert"]', { timeout: selectorTimeout })
  assert.match(await page.$eval('[role="alert"]', (element) => element.textContent || ''), /Không tải được ảnh/)

  await page.locator('::-p-text(Thử tải lại)').click()
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })
  assert.equal(requests(), 2)
})

test('keeps mobile actions clear of system chrome with full touch targets', async (t) => {
  const { page } = await openViewer(t)
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })

  for (const label of ['Tải về', 'Đóng']) {
    const box = await page.$eval(`[aria-label="${label}"]`, (element) => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
    assert.ok(box.width >= 48, `${label} width was ${box.width}px`)
    assert.ok(box.height >= 48, `${label} height was ${box.height}px`)
  }
})

test('pinch zoom and pan follow touch input without dismissing the viewer', async (t) => {
  const { page, touchSession } = await openViewer(t)
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })

  await dispatchTouch(touchSession, 'touchStart', [{ x: 145, y: 422 }, { x: 245, y: 422 }])
  await dispatchTouch(touchSession, 'touchMove', [{ x: 90, y: 422 }, { x: 300, y: 422 }])
  await dispatchTouch(touchSession, 'touchEnd', [])

  const pinchedTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.ok(scaleFromTransform(pinchedTransform) > 2)
  assert.equal(await page.$eval('body', (element) => element.dataset.viewerClosed || ''), '')

  await dispatchTouch(touchSession, 'touchStart', [{ x: 195, y: 422 }])
  await dispatchTouch(touchSession, 'touchMove', [{ x: 1_195, y: 1_422 }])
  await dispatchTouch(touchSession, 'touchEnd', [])

  const pannedTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.notEqual(pannedTransform, pinchedTransform)
  const translation = translateFromTransform(pannedTransform)
  assert.ok(Math.abs(translation.x) < 300)
  assert.ok(Math.abs(translation.y) < 500)
  assert.equal(await page.$eval('body', (element) => element.dataset.viewerClosed || ''), '')
})

test('double tap zooms the photo and a backdrop tap closes it', async (t) => {
  const { page, touchSession } = await openViewer(t)
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })

  for (let index = 0; index < 2; index += 1) {
    await dispatchTouch(touchSession, 'touchStart', [{ x: 195, y: 422 }])
    await dispatchTouch(touchSession, 'touchEnd', [])
  }

  const transform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.ok(scaleFromTransform(transform) > 2)

  for (let index = 0; index < 2; index += 1) {
    await dispatchTouch(touchSession, 'touchStart', [{ x: 195, y: 422 }])
    await dispatchTouch(touchSession, 'touchEnd', [])
  }
  const resetTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.equal(scaleFromTransform(resetTransform), 1)

  await dispatchTouch(touchSession, 'touchStart', [{ x: 195, y: 760 }])
  await dispatchTouch(touchSession, 'touchEnd', [])
  assert.equal(await page.$eval('body', (element) => element.dataset.viewerClosed), 'true')
})

test('supports wheel zoom, viewport rotation, reset, and Escape on desktop', async (t) => {
  const { page } = await openViewer(t, {
    viewport: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  })
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })

  await page.mouse.move(720, 450)
  await page.mouse.wheel({ deltaY: -500 })
  await page.waitForFunction(() => {
    const transform = document.querySelector('img[data-viewer-image-state="ready"]')?.style.transform || ''
    const match = transform.match(/scale\(([^)]+)\)/)
    return match ? Number(match[1]) > 2 : false
  }, { timeout: selectorTimeout })
  const zoomedTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.ok(scaleFromTransform(zoomedTransform) > 2)
  assert.ok(scaleFromTransform(zoomedTransform) <= 5)

  await page.setViewport({ width: 900, height: 1440, isMobile: false, hasTouch: false })
  const rotatedTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.ok(scaleFromTransform(rotatedTransform) >= 1)
  assert.ok(scaleFromTransform(rotatedTransform) <= 5)

  await page.keyboard.press('0')
  const resetTransform = await page.$eval('img[data-viewer-image-state="ready"]', (element) => element.style.transform)
  assert.equal(scaleFromTransform(resetTransform), 1)

  await page.keyboard.press('Escape')
  assert.equal(await page.$eval('body', (element) => element.dataset.viewerClosed), 'true')
})

test('removes transform motion when reduced motion is requested', async (t) => {
  const { page } = await openViewer(t, { reducedMotion: true })
  await page.waitForSelector('img[data-viewer-image-state="ready"]', { timeout: selectorTimeout })

  const transitionDuration = await page.$eval('img[data-viewer-image-state="ready"]', (element) => getComputedStyle(element).transitionDuration)
  assert.equal(transitionDuration, '0s')
})
