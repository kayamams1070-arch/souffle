/* End-to-end scenario: cannabis profile, then switch to "tobacco and cannabis" (web build, French UI).
 * Usage: node flow3.js <shotsDir>
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
    if (global.__page) await global.__page.screenshot({ path: `${SHOTS}/FAIL3-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }).catch(() => {});
  }
}

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/c${String(step).padStart(2, '0')}-${name}.png` });
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
  await page.clock.install({ time: new Date('2026-10-21T09:00:00+02:00') });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  await check('profile: choosing cannabis shows cannabis fields only', async () => {
    await btn(page, 'Commencer').click();
    await expectText(page, 'Faisons connaissance');
    await radio(page, 'Cannabis').click();
    await page.getByLabel('Joints par jour').waitFor();
    if ((await page.getByLabel('Cigarettes par jour').count()) !== 0) throw new Error('tobacco fields still visible');
    await page.getByLabel('Prénom (facultatif)').fill('Sam');
    await page.getByLabel('Joints par jour').fill('4');
    await page.getByLabel("Années d'usage").fill('6');
    await page.getByLabel('Grammes par joint').fill('0,25');
    await page.getByLabel('Prix du gramme').fill('10');
    await radio(page, 'Oui').click();
    await expectText(page, 'contient aussi de la nicotine');
    await shot(page, 'profile-cannabis');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Ta consommation de cannabis');
  });

  await check('CUDIT-R: q1 prefilled from daily use, score 14 = possible disorder', async () => {
    // q1 is prefilled with "4 fois par semaine ou plus" (4 points) because joints/day >= 1.
    await radio(page, '3 ou 4 heures').click(); // q2 = 2
    // q3..q7 share the same 5 answers; "Jamais" also exists in q1 (index 0) and q8.
    const opt = (name, n) => page.getByRole('radio', { name, exact: true }).nth(n).click();
    await opt('Environ 1 fois par semaine', 0); // q3 = 3
    await opt('Jamais', 2); // q4 = 0
    await opt("Moins d'1 fois par mois", 2); // q5 = 1
    await opt('Environ 1 fois par mois', 3); // q6 = 2
    await opt('Jamais', 5); // q7 = 0
    await radio(page, 'Oui, mais pas au cours des 6 derniers mois').click(); // q8 = 2
    // 4 + 2 + 3 + 0 + 1 + 2 + 0 + 2 = 14
    await expectText(page, 'Ton score : 14/32');
    await expectText(page, "Trouble lié à l'usage possible");
    await shot(page, 'cudit');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Activité physique');
  });

  await check('goals and pact', async () => {
    await btn(page, 'Continuer').click();
    await expectText(page, 'Ton plan');
    // 4 joints × 0,25 g × 10 € = 10 € per day -> 300 € per month.
    await expectText(page, '300');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Ton pacte personnel');
    await page.getByRole('checkbox', { name: 'Ma santé' }).click();
    await btn(page, 'Je signe mon pacte').click();
    await expectText(page, 'Bonjour Sam', 8000);
  });

  await check('dashboard uses cannabis wording and cannabis timeline', async () => {
    await expectText(page, 'Sans cannabis depuis');
    await page.clock.fastForward(2 * 24 * 3600 * 1000);
    await page.clock.runFor(61_000);
    await page.waitForTimeout(300);
    const body = await text(page);
    if (body.includes('Sans tabac')) throw new Error('tobacco wording left');
    if (!/20,0\d\s?€|20\s?€/.test(body)) throw new Error('expected 20 € after 2 days, got ' + body.match(/[\d,]+\s?€/g));
    if (!body.includes('8 joints évités')) throw new Error('avoided joints missing');
    await expectText(page, 'Les jours les plus durs');
    await shot(page, 'dashboard-cannabis');
  });

  await check('help screen lists cannabis lines and the mixing note', async () => {
    await page.goto(BASE + '/help', { waitUntil: 'networkidle' });
    await expectText(page, 'Arrêter le cannabis');
    await expectText(page, 'Infor-Drogues & Addictions');
    await expectText(page, '02 227 52 52');
    await expectText(page, 'Drogues Info Service');
    await expectText(page, 'manque de nicotine');
    if ((await text(page)).includes('Tabacstop')) throw new Error('tobacco lines shown to a cannabis-only profile');
    await shot(page, 'help-cannabis');
  });

  await check('logging a joint keeps achievements and deducts its price', async () => {
    await page.goto(BASE + '/relapse', { waitUntil: 'networkidle' });
    await expectText(page, 'Un joint ne supprime pas les progrès');
    await btn(page, 'Enregistrer').click();
    await btn(page, 'Confirmer').click();
    await expectText(page, "C'est noté, sans jugement");
    await page.goto(BASE + '/health/benefits', { waitUntil: 'networkidle' });
    await expectText(page, 'pour les joints que tu as notés');
  });

  await check('switching to "tobacco and cannabis" in the profile', async () => {
    await page.goto(BASE + '/edit-profile', { waitUntil: 'networkidle' });
    await radio(page, 'Les deux').click();
    await page.getByLabel('Cigarettes par jour').fill('10');
    await page.getByLabel('Années de tabagisme').fill('8');
    await page.getByLabel('Prix du paquet').fill('10');
    await btn(page, 'Enregistrer').click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Sans tabac ni cannabis depuis');
    await shot(page, 'dashboard-both');
  });

  await check('mixed profile: choose cigarette or joint when logging', async () => {
    await page.goto(BASE + '/relapse', { waitUntil: 'networkidle' });
    await expectText(page, "Qu'as-tu fumé ?");
    await radio(page, 'Cigarette').click();
    await btn(page, 'Enregistrer').click();
    await btn(page, 'Confirmer').click();
    await expectText(page, "C'est noté, sans jugement");
  });

  await check('help screen shows tobacco and cannabis lines for a mixed profile', async () => {
    await page.goto(BASE + '/help', { waitUntil: 'networkidle' });
    await expectText(page, 'Arrêter le tabac');
    await expectText(page, 'Tabacstop');
    await expectText(page, 'Arrêter le cannabis');
  });

  await check('cannabis wording in Dutch and English', async () => {
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Néerlandais/ }).click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Hallo Sam', 6000);
    const nl = await text(page);
    if (!/cannabis/i.test(nl)) throw new Error('no cannabis wording in Dutch');
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Engels/ }).click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Tobacco- and cannabis-free for', 6000);
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^French/ }).click();
  });

  await check('persistence after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Sans tabac ni cannabis depuis', 8000);
  });

  await check('no console errors', async () => {
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
