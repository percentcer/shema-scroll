// Verify audio logic headlessly: click play, watch karaoke word events; then scrub.
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR ' + e.message));
await page.goto('http://localhost:5199/?forceWebGL=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.click('#play');
await page.waitForTimeout(9000); // ~verse 1 + start of verse 2
const karaoke = logs.filter((l) => l.includes('[karaoke]'));
console.log('karaoke events in 9s:', karaoke.length);
console.log(karaoke.slice(0, 10).join('\n'));
await page.click('#play'); // pause
await page.waitForTimeout(300);
// scrub sweep across line 2
await page.mouse.move(1000, 200, { steps: 5 });
await page.mouse.move(300, 200, { steps: 40 });
await page.waitForTimeout(700);
const enters = logs.filter((l) => l.includes('[pointer] enter'));
console.log('pointer enters:', enters.length);
const errs = logs.filter((l) => l.startsWith('PAGEERROR'));
console.log(errs.length ? errs.join('\n') : 'no page errors');
await browser.close();
