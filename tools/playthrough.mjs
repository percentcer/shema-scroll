#!/usr/bin/env node
// Automated end-to-end playthrough: landing → tutorial → verse 1 → meaning
// card → Baruch Shem → trace all of P1 → paragraph card → quiz → celebration.
import { chromium } from 'playwright';

const shots = process.argv[2] ?? '/tmp/playthrough';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

const state = async () => await page.evaluate(() => window.__shema?.state()?.name);
const shot = (name) => page.screenshot({ path: `${shots}-${name}.png` });

await page.goto('http://localhost:5199/?forceWebGL=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// Beat 0: landing → start
await page.fill('#bdate', '2026-11-14');
await page.click('#start');
await page.waitForTimeout(2500);
console.log('after start:', await state());

// Beat 1-2: touch all six words of verse 1 (dwell so scrub+touch registers)
const v4 = ['p1v4w1', 'p1v4w2', 'p1v4w3', 'p1v4w4', 'p1v4w5', 'p1v4w6'];
for (const id of v4) {
  const p = await page.evaluate((i) => window.__shema.wordScreenPos(i), id);
  if (!p) { console.log('no pos for', id); continue; }
  await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.waitForTimeout(320);
}
await page.waitForTimeout(1400);
console.log('after verse 1:', await state());
await shot('card0');

// Meaning card 0 → Baruch Shem
await page.click('#meaning #next');
await page.waitForTimeout(900);
console.log('after card0:', await state());
await shot('baruch-shem');
await page.click('#bshem #on');
await page.waitForTimeout(700);
console.log('after baruch shem:', await state());

// Beat 3: trace the rest of P1
const rest = await page.evaluate(() => window.__shema.wordIds());
for (const id of rest.filter((i) => !i.startsWith('p1v4'))) {
  const p = await page.evaluate((i) => window.__shema.wordScreenPos(i), id);
  if (!p) continue;
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.waitForTimeout(150);
}
await page.waitForTimeout(1600);
console.log('after tracing all:', await state());
await shot('card-p1');

// Paragraph card → quiz
await page.click('#meaning #next');
await page.waitForTimeout(800);
console.log('quiz state:', await state());
await shot('quiz1');

// Q1: tap-word — tap the correct word (e-CHAD)
const q1 = await page.evaluate(() => window.__shema.wordScreenPos('p1v4w6'));
await page.mouse.move(q1.x + 40, q1.y - 40, { steps: 3 });
await page.mouse.move(q1.x, q1.y, { steps: 6 });
await page.waitForTimeout(2200);
console.log('after q1:', await state());
await shot('quiz2');

// Q2 + Q3: choice quizzes — pick the right answers
for (const q of [2, 3]) {
  await page.click('#quiz .quiz-opts button[data-i="0"]');
  await page.waitForTimeout(2200);
  console.log(`after q${q}:`, await state());
}
await shot('celebration');
console.log('final:', await state());
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
