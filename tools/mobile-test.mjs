import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5200/?forceWebGL=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.screenshot({ path: process.argv[2] + '-landing.png' });
await page.tap('#start');
await page.waitForTimeout(3000);
await page.screenshot({ path: process.argv[2] + '-scroll.png' });
console.log('done');
await browser.close();
