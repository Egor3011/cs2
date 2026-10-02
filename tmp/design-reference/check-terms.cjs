const assert = require('node:assert/strict');
const { chromium } = require('/Users/egoraksenov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = 'http://127.0.0.1:5174';
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-01T12:00:00+03:00'));
    await page.goto(base, { waitUntil: 'networkidle' });
    const data = await (await page.request.get(`${base}/api/tournament`)).json();
    assert.equal(data.terms.entryFee, 2000);
    assert.equal(data.terms.registrationClosesAt, '2026-10-08T12:00:00+03:00');
    assert.match(await page.locator('.hero-description').innerText(), /9–11 октября 2026/);
    assert.match(await page.locator('.hero-facts').innerText(), /2\.000 ₽/);
    assert.match(await page.locator('.hero-facts').innerText(), /От 8 команд/);
    assert.equal(await page.getByRole('timer').getAttribute('aria-label'), 'Осталось 7 дней, 0 часов, 0 минут, 0 секунд');
    assert.match(await page.locator('.registration-countdown time').innerText(), /8 октября, 12:00 МСК/);
    await page.locator('#prizes').scrollIntoViewIfNeeded();
    assert.deepEqual(await page.locator('.funding-percent').allTextContents(), ['50%', '25%', '15%', '10%']);
    assert.deepEqual(await page.locator('.funding-amount').allTextContents(), ['8.000 ₽', '4.000 ₽', '2.400 ₽', '1.600 ₽']);
    const teams = page.locator('#funding-team-count');
    assert.equal(await teams.getAttribute('max'), null);
    await teams.fill('16');
    assert.match(await page.locator('.funding-total').innerText(), /32\.000 ₽/);
    assert.deepEqual(await page.locator('.funding-amount').allTextContents(), ['16.000 ₽', '8.000 ₽', '4.800 ₽', '3.200 ₽']);
    await teams.fill('1000');
    assert.match(await page.locator('.funding-total').innerText(), /2\.000\.000 ₽/);
    await teams.fill('7');
    await page.locator('.funding-error').waitFor();
    assert.deepEqual(await page.locator('.funding-amount').allTextContents(), ['—', '—', '—', '—']);
    await teams.fill('8');
    assert.match(await page.locator('.broadcast-note').innerText(), /Гранд-финал и матч за 3 место.*Twitch и на этом сайте/s);
    assert.equal(await page.locator('.schedule-match time').textContent(), 'Расписание уточняется');
    await page.evaluate(() => document.fonts.ready);
    async function revealAll() {
      await page.locator('.site-footer').scrollIntoViewIfNeeded();
      for (const el of await page.locator('.reveal-pending').all()) {
        await el.scrollIntoViewIfNeeded();
        await el.evaluate(e => new Promise(resolve => { const check = () => Number(getComputedStyle(e).opacity) === 1 ? resolve() : requestAnimationFrame(check); check(); }));
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    }
    await revealAll();
    await page.screenshot({ path: 'tmp/design-reference/terms-desktop.png', fullPage: true });
    for (const width of [320, 375, 390, 700, 768, 1024, 1512]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `overflow at ${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await revealAll();
    await page.screenshot({ path: 'tmp/design-reference/terms-mobile.png', fullPage: true });
    await page.getByRole('button', { name: /^Подать заявку/ }).first().click();
    await page.getByRole('textbox', { name: 'Название команды' }).fill('Deadline Check');
    await page.getByRole('textbox', { name: 'Имя капитана' }).fill('Captain');
    await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
    await page.getByRole('textbox', { name: /Discord \/ Telegram/ }).fill('@captain');
    await page.getByRole('checkbox').check();
    let posts = 0;
    await page.route('**/api/registrations', route => {
      if (route.request().method() !== 'POST') return route.continue();
      posts++;
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Регистрация завершена. Новые заявки не принимаются.' }) });
    });
    await page.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
    await page.locator('.registration-panel').getByText('Регистрация завершена', { exact: true }).waitFor();
    assert.equal(posts, 1);
    assert.equal(await page.locator('.registration-panel form').count(), 0);
    await page.clock.setFixedTime(new Date('2026-10-08T11:59:59+03:00'));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('.countdown-clock strong').last().textContent(), '01');
    await page.getByRole('button', { name: /^Подать заявку/ }).first().click();
    await page.getByRole('textbox', { name: 'Название команды' }).waitFor();
    await page.clock.setFixedTime(new Date('2026-10-08T12:00:00+03:00'));
    await page.getByRole('heading', { name: 'Регистрация завершена' }).waitFor();
    assert.equal(await page.getByRole('timer').count(), 0);
    assert.equal(await page.locator('.registration-panel form').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Регистрация закрыта', exact: true }).isDisabled(), true);
    assert.equal(posts, 1, 'No new requests after deadline');
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00+03:00'));
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('timer').count(), 0);
    await page.goto(`${base}/matches/final`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.match-intro time').textContent(), 'Расписание уточняется');
    assert.deepEqual(errors, []);
    console.log('PASS: dates, Moscow cutoff, fees, all payouts, 1,000-team calculation, invalid input, seven responsive widths, broadcast copy, server 403 state, countdown transition and closed reload. No saved test registrations or JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
