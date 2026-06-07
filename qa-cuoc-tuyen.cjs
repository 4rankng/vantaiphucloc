const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  await page.goto('http://localhost:5174/accountant/settings/cuoc-tuyen', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('ketoan');
    await inputs[1].type('admin123');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));
    await page.goto('http://localhost:5174/accountant/settings/cuoc-tuyen', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
  }

  await page.screenshot({ path: '/tmp/qa-cuoc-tuyen.png' });

  // Check card widths
  const info = await page.evaluate(() => {
    const cards = document.querySelectorAll('.rounded-xl');
    return Array.from(cards).slice(0, 10).map(c => ({
      width: Math.round(c.getBoundingClientRect().width),
      text: c.innerText.substring(0, 60),
    }));
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
