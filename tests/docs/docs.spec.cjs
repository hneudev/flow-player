const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const docs = 'http://127.0.0.1:4320/';
const snippets = ['minimal', 'events', 'styling', 'validation'];

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') page.errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });

const player = page => page.locator('#playground .fp-root');

test('search example: run, pause, step, reset and replacement by a new query', async ({ page }) => {
  await page.goto(docs);
  await expect(page.getByRole('note').filter({ hasText: 'Illustrative simulation.' })).toBeVisible();
  const p = player(page);
  await expect(p).toHaveAttribute('data-status', 'ready');
  await p.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(p).toHaveAttribute('data-status', 'playing');
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(p).toHaveAttribute('data-status', 'paused');
  await p.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(p.locator('.fp-step[aria-current="step"]')).toContainText('2. Request checked');
  await p.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(p).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('.event-log li').first()).toContainText('reset');

  await page.getByLabel('Try a search').fill('keyboard');
  await page.getByRole('button', { name: 'Run search' }).click();
  await expect(p).toHaveAttribute('aria-label', 'Search request for “keyboard”');
  await expect(p).toHaveAttribute('data-status', 'playing');
  await page.getByRole('button', { name: 'Run search' }).click();
  await expect(p).toHaveAttribute('data-status', 'playing');
});

test('publishing example: failure tone, stepping and completion', async ({ page }) => {
  await page.goto(docs);
  await page.getByLabel('Publishing job').check();
  const p = player(page);
  await expect(p).toHaveAttribute('aria-label', 'Publishing a page through a build queue');
  await expect(page.getByLabel('Try a search')).toHaveCount(0);
  await p.locator('.fp-step').nth(3).click();
  await expect(p).toHaveAttribute('data-tone', 'critical');
  await expect(p.locator('.fp-description')).toContainText('Render failed');
  await p.locator('.fp-step').last().click();
  await expect(p).toHaveAttribute('data-status', 'completed');
  await p.getByRole('button', { name: 'Replay' }).click();
  await expect(p).toHaveAttribute('data-status', 'playing');
  await p.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(p).toHaveAttribute('data-status', 'ready');
});

test('displayed snippets match the verified source files and can be copied', async ({ page, browserName, context }) => {
  await page.goto(docs);
  for (const name of snippets) {
    const source = readFileSync(join(__dirname, '../../apps/docs/src/snippets', `${name}.tsx`), 'utf8').trimEnd();
    const block = page.locator('figure.code').filter({ hasText: `${name}.tsx` });
    await expect(block.locator('pre code')).toHaveText(source, { useInnerText: false });
  }
  const copy = page.locator('figure.code').filter({ hasText: 'minimal.tsx' }).getByRole('button');
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await copy.click();
    await expect(copy).toHaveText('Copied');
    const expected = readFileSync(join(__dirname, '../../apps/docs/src/snippets/minimal.tsx'), 'utf8');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  } else {
    // Clipboard permission differs by engine; either outcome must be reported to the reader.
    await copy.click();
    await expect(copy).toHaveText(/^(Copied|Copy failed — select the code)$/);
  }
});

test('both colour schemes pass axe and fit narrow and wide viewports', async ({ page }) => {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(docs);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});
