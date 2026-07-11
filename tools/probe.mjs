import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  localStorage.setItem('bmc.progress.v1', JSON.stringify({
    touchedWords: [], versesCompleted: [], paragraphsCompleted: [],
    quizDone: true, celebrated: true,
  }));
});
await page.goto('http://localhost:5199/?forceWebGL=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
await page.click('#start');
await page.waitForTimeout(2500);
const all = await page.evaluate(() => window.__shema.wordIds());
const p3 = all.filter((i) => i.startsWith('p3'));
for (const id of p3) {
  const p = await page.evaluate((i) => window.__shema.wordScreenPos(i), id);
  if (!p) { console.log('NO POS', id); continue; }
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.waitForTimeout(140);
}
await page.waitForTimeout(800);
const touched = await page.evaluate(() => window.__shema.touched());
const missing = p3.filter((i) => !touched.includes(i));
console.log('p3 words:', p3.length, 'missing:', missing);
await page.screenshot({ path: '/home/deck/.claude/jobs/c3e7efba/tmp/probe-p3.png' });
await browser.close();
