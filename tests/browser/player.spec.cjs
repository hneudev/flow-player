const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page }) => {
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('[flow-player]')) page.errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.errors).toEqual([]); });
const first = page => page.locator('#first .fp-root');

test('SSR and hydration, instance IDs, keyboard step controls and events', async ({ page, request }) => {
  const html = await (await request.get('/?initial=1')).text();
  expect(html).toContain('aria-current="step"');
  await page.goto('/?initial=1');
  const player = first(page);
  await expect(player.locator('.fp-step[aria-current="step"]')).toHaveCount(1);
  const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  const next = player.getByRole('button', { name: 'Next', exact: true });
  await next.focus(); await page.keyboard.press('Enter');
  await expect(player.locator('.fp-step[aria-current="step"]')).toContainText('3.');
  await page.keyboard.press('Enter');
  await expect(player.getByRole('button', { name: 'Replay' })).toBeFocused();
  await expect(player).toHaveAttribute('data-status', 'completed');
  await expect.poll(() => page.evaluate(() => window.events.filter(e => e.type === 'complete').length)).toBe(1);
  await page.getByRole('button', { name: 'Handle reset' }).click();
  await expect(player).toHaveAttribute('data-status', 'ready');
  await expect(player.locator('.fp-node[data-state="completed"]')).toHaveCount(0);
});

test('play, pause, resume, reset, replacement and unmount', async ({ page }) => {
  await page.goto('/'); const player = first(page);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player).toHaveAttribute('data-status', 'playing');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  const selected = await player.locator('.fp-step[aria-current="step"]').innerText();
  await page.waitForTimeout(1000); // Deliberately spans a dwell to verify paused timers stay stopped.
  await expect(player.locator('.fp-step[aria-current="step"]')).toHaveText(selected);
  await player.getByRole('button', { name: 'Resume' }).click();
  await expect(player).toHaveAttribute('data-status', 'completed', { timeout: 6000 });
  await player.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(player).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Replace flow' }).click();
  await expect(player).toHaveAttribute('data-status', 'ready');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle player' }).click();
  const count = await page.evaluate(() => window.events.length);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.events.length)).toBe(count);
});

test('narrow container on wide page, both root sizes, directions and themes', async ({ page }) => {
  for (const small of ['0', '1']) {
    await page.goto(`/?narrow=1${small === '1' ? '&small=1&reset=1' : ''}`);
    for (const scheme of ['light', 'dark']) {
      await page.getByLabel('Scheme').selectOption(scheme);
      const player = first(page);
      await expect(player).toHaveAttribute('data-color-scheme', scheme);
      const boxes = await player.locator('.fp-node').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().top));
      expect(boxes[1]).toBeGreaterThan(boxes[0]);
      await expect(player.locator('.fp-arrow').first()).toHaveCSS('rotate', '90deg');
      await expect(player.locator('.fp-edge[data-direction="backward"] .fp-arrow').first()).toHaveText('←');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await player.getByRole('button', { name: 'Play', exact: true }).evaluate(n => n.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      const results = await new AxeBuilder({ page }).include('.fp-root').analyze();
      expect(results.violations).toEqual([]);
    }
  }
  await page.goto('/');
  await expect(first(page).locator('.fp-arrow').first()).toHaveCSS('rotate', 'none');
  const box = await first(page).locator('.fp-node').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().left));
  expect(box[1]).toBeGreaterThan(box[0]);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion suppresses autoplay, allows explicit playback and reacts live', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?auto=1'); const player = first(page);
  await expect(player).toHaveAttribute('data-status', 'ready');
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(player).toHaveAttribute('data-status', 'playing');
  await expect(player.locator('.fp-edge[data-state="active"] .fp-arrow').first()).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(player).toHaveAttribute('data-status', 'paused');
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(player.getByRole('button', { name: 'Resume' })).toBeVisible();
});

test('independent instances, publishing trace and invalid fallback recovery', async ({ page }) => {
  await page.goto('/');
  const second = page.locator('#second .fp-root');
  await second.locator('.fp-step').nth(3).click();
  await expect(second).toHaveAttribute('data-tone', 'critical');
  await expect(first(page)).toHaveAttribute('data-status', 'ready');
  await expect(second.locator('.fp-description')).toContainText(/fail/i);
  await page.getByRole('button', { name: 'Invalid flow', exact: true }).click();
  await expect(first(page)).toContainText('This flow could not be displayed.');
  await expect.poll(() => page.evaluate(() => window.events.filter(e => e.type === 'invalid').length)).toBe(1);
  await page.getByRole('button', { name: 'Replace flow' }).click();
  await expect(first(page)).toHaveAttribute('data-status', 'ready');
});

test('Tab and Space operate the controls with the player focus style over a host reset', async ({ page }) => {
  await page.goto('/?small=1&reset=1');
  const player = first(page);
  const play = player.getByRole('button', { name: 'Play', exact: true });
  // Tab from the last fixture control into the player: the first stop is its primary command.
  await page.getByRole('button', { name: 'Toggle player' }).focus();
  await page.keyboard.press('Tab');
  await expect(play).toBeFocused();
  await expect(play).toHaveCSS('outline-style', 'solid');
  await expect(play).toHaveCSS('outline-width', '3px');
  await expect(play).not.toHaveCSS('outline-color', 'rgb(255, 0, 0)');
  // Disabled boundary commands are skipped; Next is reachable and operable with Space.
  await page.keyboard.press('Tab');
  await expect(player.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(player).toHaveAttribute('data-status', 'paused');
  await expect(player.locator('.fp-step[aria-current="step"]')).toContainText('1.');
  // Previous is now enabled (it returns to ready), so it is the next stop backwards.
  await page.keyboard.press('Shift+Tab');
  await expect(player.getByRole('button', { name: 'Previous', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(player.getByRole('button', { name: 'Resume' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(player).toHaveAttribute('data-status', 'playing');
  await page.keyboard.press('Space');
  await expect(player).toHaveAttribute('data-status', 'paused');
  // Connector text names the direction in words, not with an arrow glyph.
  await expect(player.locator('.fp-edge .fp-sr-only').first()).toHaveText(/^Search query, Search the library to Handle the request, (Active|Completed)$/);
  await expect(player.locator('.fp-edge[data-direction="backward"] .fp-sr-only').first()).toHaveText(/^Results, Handle the request to Search the library, (Next|Active)$/);
});
