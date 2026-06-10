const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Capture console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Step 1: Navigate to login page
  console.log('--- Navigating to login page ---');
  await page.goto('http://localhost:7173/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/tmp/qa-login-page.png', fullPage: true });
  console.log('Login page screenshot saved');

  // Check current URL
  console.log('Current URL:', page.url());

  // Step 2: Fill in login form and submit
  const usernameInput = await page.$('input[name="username"], input[type="text"], input[id="username"]');
  const passwordInput = await page.$('input[name="password"], input[type="password"], input[id="password"]');
  
  if (usernameInput && passwordInput) {
    console.log('Found login inputs, filling credentials...');
    await usernameInput.click({ clickCount: 3 });
    await usernameInput.type('giaonhan');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type('123456');

    // Find and click submit button
    const submitBtn = await page.$('button[type="submit"], button.login-btn, button');
    if (submitBtn) {
      console.log('Clicking submit button...');
      await Promise.all([
        submitBtn.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
          console.log('Navigation timeout after login click, checking URL...');
        })
      ]);
    }
  } else {
    console.log('No login form found, may already be logged in or different page structure');
    // Print the page text to understand what we see
    const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page text:', text);
  }

  // Check if we're now logged in
  console.log('URL after login attempt:', page.url());
  await page.screenshot({ path: '/tmp/qa-after-login.png', fullPage: true });

  // Step 3: Navigate to /my-advances
  console.log('--- Navigating to /my-advances ---');
  await page.goto('http://localhost:7173/my-advances', { waitUntil: 'networkidle0', timeout: 15000 });
  
  // Wait a bit for any dynamic content
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Current URL:', page.url());

  // Step 4: Take full-page screenshot
  await page.screenshot({ path: '/tmp/qa-my-advances-fullpage.png', fullPage: true });
  console.log('Full page screenshot saved to /tmp/qa-my-advances-fullpage.png');

  // Step 5: Also capture above-the-fold
  await page.screenshot({ path: '/tmp/qa-my-advances-above-fold.png', fullPage: false });
  console.log('Above-fold screenshot saved to /tmp/qa-my-advances-above-fold.png');

  // Step 6: Extract page text and DOM structure for analysis
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('\n--- PAGE TEXT ---');
  console.log(pageText.substring(0, 3000));

  // Step 7: Get card styling info
  const cardInfo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.advance-card, .card, [class*="card"], [class*="Card"]');
    const results = [];
    cards.forEach((card, i) => {
      const style = window.getComputedStyle(card);
      results.push({
        index: i,
        className: card.className,
        border: style.border,
        borderRadius: style.borderRadius,
        padding: style.padding,
        margin: style.margin,
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        width: style.width,
        fontSize: style.fontSize,
        color: style.color,
      });
    });
    return results;
  });
  console.log('\n--- CARD STYLES ---');
  console.log(JSON.stringify(cardInfo, null, 2));

  // Step 8: Check for any error messages
  console.log('\n--- CONSOLE ERRORS ---');
  if (errors.length > 0) {
    errors.forEach(e => console.log('ERROR:', e));
  } else {
    console.log('No console errors');
  }

  // Step 9: Mobile viewport screenshot
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:7173/my-advances', { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/tmp/qa-my-advances-mobile.png', fullPage: true });
  console.log('\nMobile screenshot saved to /tmp/qa-my-advances-mobile.png');

  await browser.close();
  console.log('\n--- DONE ---');
})();
