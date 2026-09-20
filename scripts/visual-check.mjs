import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:5173';
const OUT = '/Users/admin/Desktop/SEROX/.claude/screenshots';

const pages = [
  ['/', 'dashboard'],
  ['/live', 'live-monitoring'],
  ['/mission', 'mission-control'],
  ['/map', 'map-tracking'],
  ['/analytics', 'analytics'],
  ['/history', 'historical'],
  ['/alerts', 'alerts'],
  ['/health', 'device-health'],
  ['/export', 'data-export'],
  ['/settings', 'settings'],
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

// 1. Login screen
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/00-login.png` });
console.log('✓ login page screenshot');

// 2. Log in
await page.fill('#username', 'admin');
await page.fill('#password', 'sorex2026');
await page.click('button[type="submit"]');
await page.waitForURL('**/');
await page.waitForTimeout(3500); // let WebSocket snapshot + charts hydrate
await page.screenshot({ path: `${OUT}/01-dashboard.png` });
console.log('✓ dashboard — logged in');

// 3. Remaining pages
for (const [path, name] of pages.slice(1)) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${name}`);
}

console.log('\nConsole errors:', consoleErrors.length ? consoleErrors.slice(0, 8) : 'none');

await browser.close();