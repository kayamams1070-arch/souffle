/* End-to-end scenario: deeper cannabis support (demo, withdrawal companion, nights, social, triggers, coach, use-free days) (web build, French UI).
 * Usage: node flow4.js <shotsDir>
 */
const { chromium } = require('playwright-core');

const SHOTS = process.argv[2];
const BASE = 'http://localhost:8088';
const results = [];
let step = 0;

function log(ok, name, detail = '') {
  results.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    log(true, name, detail || '');
  } catch (e) {
    log(false, name, e.message.split('\n')[0]);
    if (global.__page) await global.__page.screenshot({ path: `${SHOTS}/FAIL4-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }).catch(() => {});
  }
}

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/d${String(step).padStart(2, '0')}-${name}.png` });
}

const btn = (page, name) => page.getByRole('button', { name, exact: true });
const radio = (page, name) => page.getByRole('radio', { name, exact: true });
const text = async (page) => page.innerText('body');

async function expectText(page, needle, timeout = 5000) {
  await page.getByText(needle, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout });
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-BE', timezoneId: 'Europe/Brussels' });
  const page = await ctx.newPage();
  global.__page = page;
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.clock.install({ time: new Date('2026-10-22T09:00:00+02:00') });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await check('welcome offers a tobacco demo and a cannabis demo', async () => {
    await btn(page, 'Charger la démonstration tabac').waitFor({ timeout: 8000 });
    await btn(page, 'Charger la démonstration cannabis').click();
    await expectText(page, 'Bonjour Alex', 8000);
    await expectText(page, 'Mode démonstration : profil et données entièrement fictifs.');
    if ((await text(page)).includes('nouveaux badges')) throw new Error('badge burst on demo load');
    await expectText(page, 'Sans cannabis depuis');
  });

  await check('withdrawal companion shows the current day and phase', async () => {
    // Demo: last joint 10 days ago at 21:15, now 09:00 => day 10, "le manque recule" phase.
    const card = page.getByTestId('withdrawal-companion');
    await card.scrollIntoViewIfNeeded();
    const t = await card.innerText();
    if (!/Ton sevrage · jour 10/.test(t)) throw new Error('day missing: ' + t.slice(0, 80));
    if (!t.includes('Le manque recule')) throw new Error('phase missing');
    if (!t.includes('Ce qui aide maintenant')) throw new Error('tips missing');
    await shot(page, 'companion');
  });

  await check('nights kit opens from the companion with cannabis explanation and sources', async () => {
    await btn(page, 'Nuits difficiles').click();
    await expectText(page, "le cannabis n'aide pas à bien dormir");
    await expectText(page, 'Rêves intenses, cauchemars');
    await expectText(page, 'NHS, "Insomnia"');
    await shot(page, 'nights');
  });

  await check('SOS offers cannabis triggers and the "someone offers" screen', async () => {
    await page.goto(BASE + '/(tabs)/sos', { waitUntil: 'networkidle' });
    await btn(page, 'Préciser mon envie (facultatif)').click();
    await expectText(page, "Pour m'endormir");
    await expectText(page, 'Jeux vidéo ou séries');
    await btn(page, 'On me propose : que répondre ?').click();
    await expectText(page, 'Non, je dors mieux sans.');
    await expectText(page, "Prépare tes réponses pour le moment où on te tend un joint.");
    await shot(page, 'social');
  });

  await check('coach understands an offered joint and sends to the phrases', async () => {
    await page.goto(BASE + '/coach', { waitUntil: 'networkidle' });
    await page.getByRole('radio', { name: "On m'a proposé un joint", exact: true }).click();
    await expectText(page, 'Prépare une phrase simple');
    await btn(page, 'Voir les phrases pour dire non').click();
    await expectText(page, 'Des phrases prêtes à dire');
  });

  await check('reduction with use-free days shows the weekly goal', async () => {
    await page.goto(BASE + '/goal-settings', { waitUntil: 'networkidle' });
    await radio(page, 'Réduction progressive').click();
    await expectText(page, 'Jours sans par semaine');
    await btn(page, 'Enregistrer').click();
    await btn(page, 'Confirmer').click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Jours sans cette semaine');
    if ((await page.getByTestId('withdrawal-companion').count()) !== 0) throw new Error('companion shown in reduction mode');
    await shot(page, 'use-free-days');
  });

  await check('tobacco demo has no withdrawal companion nor cannabis triggers', async () => {
    await page.goto(BASE + '/settings/privacy', { waitUntil: 'networkidle' });
    await btn(page, 'Quitter la démonstration').click();
    await btn(page, 'Charger la démonstration tabac').click();
    await expectText(page, 'Bonjour Sam', 8000);
    if ((await page.getByTestId('withdrawal-companion').count()) !== 0) throw new Error('companion shown for tobacco');
    await page.goto(BASE + '/craving/log', { waitUntil: 'networkidle' });
    await expectText(page, 'Café');
    if ((await text(page)).includes("Pour m'endormir")) throw new Error('cannabis trigger shown for tobacco');
  });

  const failed = results.filter((r) => !r.ok);
  if (errors.length) console.log('Console errors:\n  ' + errors.slice(0, 10).join('\n  '));
  else console.log('Console errors: none');
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
