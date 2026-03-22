/**
 * Debug script: minimal test to understand why React doesn't hydrate on copros page
 */
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = join(__dirname, '..', 'out');
const PORT = 3457;
const BASE = `http://localhost:${PORT}`;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

const server = createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.endsWith('/')) url += 'index.html';
  let filePath = join(OUT_DIR, url);
  if (!existsSync(filePath) && !extname(filePath)) {
    const wi = join(OUT_DIR, url, 'index.html');
    if (existsSync(wi)) filePath = wi;
  }
  if (!existsSync(filePath)) {
    const segs = url.split('/').filter(Boolean);
    if (segs.length >= 3 && segs[1] === 'copro') {
      const idx = join(OUT_DIR, segs[0], 'copro', 'index.html');
      if (existsSync(idx)) filePath = idx;
    }
  }
  if (!existsSync(filePath)) {
    const locale = url.split('/')[1];
    const idx = join(OUT_DIR, locale, 'index.html');
    filePath = existsSync(idx) ? idx : join(OUT_DIR, 'index.html');
  }
  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server on ${BASE}`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1280,900', '--no-first-run', '--no-default-browser-check', '--auto-open-devtools-for-tabs'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // Capture ALL console messages
  page.on('console', (msg) => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));
  page.on('requestfailed', (req) => console.log(`[REQ FAIL] ${req.url()}`));

  console.log('\n=== Test 1: Fresh page to /fr/copros/ (no session) ===');
  await page.goto(`${BASE}/fr/copros/`, { waitUntil: 'networkidle0', timeout: 20000 });

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await page.evaluate(() => ({
      el: document.querySelectorAll('*').length,
      spin: !!document.querySelector('.animate-spin'),
      url: window.location.href,
      bodyLen: document.body?.innerText?.trim().length || 0,
      nextF: typeof self.__next_f !== 'undefined' ? self.__next_f.length : -1,
      scripts: document.querySelectorAll('script').length,
    }));
    console.log(`  ${i+1}s: el=${s.el} spin=${s.spin} url=${s.url} nextF=${s.nextF} scripts=${s.scripts} bodyLen=${s.bodyLen}`);
    if (s.url.includes('/login') || (!s.spin && s.bodyLen > 20)) break;
  }

  // Now login
  console.log('\n=== Navigating to login ===');
  await page.goto(`${BASE}/fr/login/`, { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));
  await page.type('input[name="email"]', 'gestionnaire.e2e@gmail.com');
  await page.type('input[name="password"]', 'TestPass123!');
  await (await page.$('button[type="submit"]')).click();

  // Wait for navigation
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 25000 }).catch(() => {});
  console.log(`After login: ${page.url()}`);

  console.log('\n=== Test 2: Same page after login (should be at /copros) ===');
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await page.evaluate(() => ({
      el: document.querySelectorAll('*').length,
      spin: !!document.querySelector('.animate-spin'),
      url: window.location.href,
      bodyLen: document.body?.innerText?.trim().length || 0,
      nextF: typeof self.__next_f !== 'undefined' ? self.__next_f.length : -1,
      scripts: document.querySelectorAll('script').length,
    }));
    console.log(`  ${i+1}s: el=${s.el} spin=${s.spin} nextF=${s.nextF} scripts=${s.scripts} bodyLen=${s.bodyLen}`);
    if (!s.spin && s.bodyLen > 20) break;
  }

  console.log('\n=== Test 3: Open NEW page to /fr/copros/ ===');
  const page2 = await browser.newPage();
  page2.on('console', (msg) => { if (msg.type() === 'error') console.log(`[P2 CONSOLE ERROR] ${msg.text()}`); });
  page2.on('pageerror', (err) => console.log(`[P2 PAGE ERROR] ${err.message}`));
  await page2.goto(`${BASE}/fr/copros/`, { waitUntil: 'networkidle0', timeout: 20000 });

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const s = await page2.evaluate(() => ({
      el: document.querySelectorAll('*').length,
      spin: !!document.querySelector('.animate-spin'),
      url: window.location.href,
      bodyLen: document.body?.innerText?.trim().length || 0,
      nextF: typeof self.__next_f !== 'undefined' ? self.__next_f.length : -1,
      scripts: document.querySelectorAll('script').length,
    }));
    console.log(`  ${i+1}s: el=${s.el} spin=${s.spin} nextF=${s.nextF} scripts=${s.scripts} bodyLen=${s.bodyLen}`);
    if (!s.spin && s.bodyLen > 20) break;
  }

  console.log('\nDone. Close browser to exit.');
  // Keep browser open for manual inspection
  await new Promise(r => setTimeout(r, 60000));
  await browser.close();
  server.close();
});
