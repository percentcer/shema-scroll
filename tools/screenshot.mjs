#!/usr/bin/env node
// Usage: node tools/screenshot.mjs <url> <out.png> [waitMs]
// Captures a screenshot + console output from headless Chromium.
import { chromium } from 'playwright';

const [url = 'http://localhost:5173', out = 'shot.png', waitMs = '2500'] = process.argv.slice(2);

const browser = await chromium.launch({
  args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => console.log(`[console:${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(Number(waitMs));
await page.screenshot({ path: out });
await browser.close();
console.log(`saved ${out}`);
