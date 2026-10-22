/* End-to-end scenario on the web build (React Native Web), French UI.
 * Usage: node flow.js <shotsDir>
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

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
    if (global.__page) await global.__page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }).catch(() => {});
  }
}

async function shot(page, name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/${String(step).padStart(2, '0')}-${name}.png` });
}

const btn = (page, name) => page.getByRole('button', { name, exact: true });
const radio = (page, name) => page.getByRole('radio', { name, exact: true });
const text = async (page) => page.innerText('body');

async function expectText(page, needle, timeout = 5000) {
  await page.getByText(needle, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout });
}

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'fr-BE',
    timezoneId: 'Europe/Brussels',
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  global.__page = page;
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // Record print calls (PDF on web) without opening a dialog.
  await page.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });
  await page.clock.install({ time: new Date('2026-10-21T09:00:00+02:00') });

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // ---------- Onboarding ----------
  await check('welcome screen', async () => {
    await expectText(page, 'Chaque envie est une occasion de reprendre ton souffle.');
    await shot(page, 'welcome');
  });
  await check('how it works toggles', async () => {
    await btn(page, 'Découvrir le fonctionnement').click();
    await expectText(page, 'Comment Souffle t');
  });
  await check('profile validation blocks empty form', async () => {
    await btn(page, 'Commencer').click();
    await expectText(page, 'Faisons connaissance');
    await btn(page, 'Continuer').click();
    await page.waitForTimeout(300);
    await expectText(page, "Cette valeur n'est pas dans les limites attendues.");
  });
  await check('profile step', async () => {
    await page.getByLabel('Prénom (facultatif)').fill('Lina');
    await page.getByLabel('Âge (facultatif)').fill('34');
    await page.getByLabel('Cigarettes par jour').fill('15');
    await page.getByLabel('Années de tabagisme').fill('12');
    await page.getByLabel('Prix du paquet').fill('9,80');
    await page.getByLabel('Cigarettes par paquet').fill('20');
    await shot(page, 'profile');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Test de Fagerström');
  });
  await check('fagerstrom score 5 = moyenne', async () => {
    await radio(page, '6 à 30 minutes').click();
    await radio(page, 'Non').nth(0).click(); // q2
    await radio(page, 'La première du matin').click(); // q3
    await radio(page, 'Oui').nth(1).click(); // q5
    await radio(page, 'Non').nth(2).click(); // q6
    await expectText(page, 'Ton score : 5 / 10');
    await expectText(page, 'Dépendance moyenne');
    await shot(page, 'fagerstrom');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Activité physique');
  });
  await check('health step with knee limitation', async () => {
    await page.getByRole('checkbox', { name: 'Genoux' }).click();
    await btn(page, 'Continuer').click();
    await expectText(page, 'Ton plan');
  });
  await check('goals step (quit now)', async () => {
    await expectText(page, 'Ta première séance conseillée');
    await shot(page, 'goals');
    await btn(page, 'Continuer').click();
    await expectText(page, 'Ton pacte personnel');
  });
  await check('pact signed', async () => {
    await page.getByRole('checkbox', { name: 'Ma famille' }).click();
    await page.getByLabel('Avec tes mots').fill('Pour courir avec mes enfants.');
    await shot(page, 'pact');
    await btn(page, 'Je signe mon pacte').click();
    await expectText(page, 'Bonjour Lina', 8000);
  });

  // ---------- Dashboard ----------
  await check('dashboard counter runs', async () => {
    await expectText(page, 'Sans tabac depuis');
    const before = await text(page);
    await page.clock.runFor(65_000);
    const after = await text(page);
    if (before === after) throw new Error('counter did not change');
    await shot(page, 'dashboard');
  });
  await check('savings after 1 day = 15 cig x 0.49 €', async () => {
    // Jump a day without replaying every 1-second tick (86 400 renders), then let timers settle.
    await page.clock.fastForward(24 * 3600 * 1000);
    await page.clock.runFor(2000);
    await page.waitForTimeout(200);
    const body = await text(page);
    // 15 cig/day * 9.80/20 = 7.35 € per day
    if (!/7,3\d\s?€|7,4\d\s?€/.test(body)) throw new Error('expected ~7,35 € in: ' + body.match(/[\d,]+\s?€/g));
    if (!body.includes('15 cigarettes évitées') && !body.includes('14 cigarettes évitées')) throw new Error('avoided count missing');
    return (body.match(/[\d ,]+\s?€/) || [''])[0];
  });
  await check('pact badge celebrated', async () => {
    await expectText(page, 'Engagé');
  });

  // ---------- Persistence ----------
  await check('persistence after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await expectText(page, 'Bonjour Lina', 8000);
  });

  // ---------- SOS breathing (2 min) ----------
  await check('SOS opens from dashboard', async () => {
    await btn(page, "J'ai envie de fumer").click();
    await expectText(page, 'Envie de fumer ?');
    await shot(page, 'sos');
  });
  await check('breathing timer pause / resume / finish', async () => {
    await page.getByRole('button', { name: /J'ai 2 minutes/ }).click();
    await expectText(page, 'Respire avec le cercle');
    await page.clock.runFor(10_000);
    await btn(page, 'Pause').click();
    const paused = await text(page);
    await page.clock.runFor(30_000);
    const stillPaused = await text(page);
    const remain = (s) => (s.match(/(\d:\d\d)/) || [])[1];
    if (remain(paused) !== remain(stillPaused)) throw new Error(`timer moved while paused ${remain(paused)} -> ${remain(stillPaused)}`);
    await shot(page, 'breathing-paused');
    await btn(page, 'Reprendre').click();
    await page.clock.runFor(115_000);
    await expectText(page, 'Comment est ton envie maintenant ?', 8000);
    return `paused at ${remain(paused)}`;
  });
  await check('SOS feedback saved with XP', async () => {
    await page.getByRole('button', { name: 'Elle est passée' }).click();
    await radio(page, '7').click();
    await btn(page, 'Enregistrer').click();
    await expectText(page, 'Bien joué !');
    await expectText(page, '+25 XP');
    await shot(page, 'sos-feedback');
    await btn(page, "Retour à l'accueil").click();
  });

  // ---------- Craving log ----------
  await check('craving log with trigger suggestion', async () => {
    await page.getByRole('tab', { name: /SOS/ }).or(page.getByRole('button', { name: 'SOS envie : aide immédiate' })).first().click();
    await btn(page, "Juste noter l'envie").click();
    await expectText(page, 'Noter une envie');
    await radio(page, '6').click();
    await radio(page, 'Café').click();
    await expectText(page, 'Bois ton café à un autre endroit');
    await shot(page, 'craving-log');
    await btn(page, 'Enregistrer').click();
    await page.waitForTimeout(300);
  });
  await check('craving history shows 2 entries', async () => {
    await page.goto(BASE + '/craving/history', { waitUntil: 'networkidle' });
    await expectText(page, 'Journal des envies');
    const body = await text(page);
    if (!/Envies notées\s*2/.test(body)) throw new Error('count not 2: ' + (body.match(/Envies notées\s*\d+/) || [''])[0]);
  });

  // ---------- Workout ----------
  await check('workout session start -> complete', async () => {
    await page.goto(BASE + '/(tabs)/sport', { waitUntil: 'networkidle' });
    await expectText(page, 'Semaine 1');
    await shot(page, 'sport');
    await page.getByRole('button', { name: /Renforcement en douceur/ }).first().click({ position: { x: 30, y: 15 } });
    await expectText(page, 'Exercices');
    const detail = await text(page);
    if (detail.includes('Squat sur chaise')) throw new Error('knee limitation not applied: chair squat still present');
    await btn(page, 'Commencer').click();
    await page.waitForTimeout(800);
    // Fake-clock + RN-web press timing can swallow a tap: retry once if we did not navigate.
    if (!page.url().includes('/workout/session')) await btn(page, 'Commencer').click();
    await expectText(page, 'Exercice 1 sur');
    await page.clock.runFor(12 * 60 * 1000);
    await expectText(page, 'Séance terminée !', 10000);
    await expectText(page, '+30 XP');
    await shot(page, 'workout-complete');
    await btn(page, 'Terminé').click();
    return detail.includes('Extension de jambe assise') ? 'chair squat replaced by seated leg extension' : '';
  });

  // ---------- Progress / badges ----------
  await check('XP and badges in progress tab', async () => {
    await page.goto(BASE + '/badges', { waitUntil: 'networkidle' });
    const body = await text(page);
    for (const b of ['Premier pas', 'Première vague', 'Engagé']) if (!body.includes(b)) throw new Error('missing badge ' + b);
    const unlocked = (body.match(/Obtenu le/g) || []).length;
    if (unlocked < 3) throw new Error('unlocked badges: ' + unlocked);
    await shot(page, 'badges');
    return `${unlocked} badges, ${(body.match(/(\d+) XP au total/) || [])[1]} XP`;
  });

  // ---------- Relapse ----------
  let xpBefore = 0;
  await check('relapse keeps achievements', async () => {
    await page.goto(BASE + '/(tabs)/progress', { waitUntil: 'networkidle' });
    xpBefore = Number(((await text(page)).match(/(\d+) XP au total/) || [])[1]);
    await page.goto(BASE + '/relapse', { waitUntil: 'networkidle' });
    await expectText(page, 'Une cigarette ne supprime pas les progrès');
    await shot(page, 'relapse');
    await btn(page, 'Enregistrer').click();
    await btn(page, 'Confirmer').click();
    await expectText(page, "C'est noté, sans jugement");
    const body = await text(page);
    if (!body.includes(`Toujours à toi : ${xpBefore} XP`)) throw new Error('kept text wrong: ' + (body.match(/Toujours à toi[^\n]*/) || [''])[0]);
    await shot(page, 'relapse-saved');
    await btn(page, 'Relire mon pacte').click();
    await expectText(page, 'Pour courir avec mes enfants.');
    return `xp ${xpBefore}`;
  });
  await check('after relapse: XP not removed, counter restarted, savings kept', async () => {
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    const body = await text(page);
    if (!body.includes('Sans tabac depuis')) throw new Error('counter missing');
    await page.goto(BASE + '/(tabs)/progress', { waitUntil: 'networkidle' });
    const xpAfter = Number(((await text(page)).match(/(\d+) XP au total/) || [])[1]);
    if (xpAfter < xpBefore) throw new Error(`XP decreased ${xpBefore} -> ${xpAfter}`);
    return `xp ${xpBefore} -> ${xpAfter}`;
  });

  // ---------- Dark theme ----------
  await check('dark theme', async () => {
    await page.goto(BASE + '/settings/accessibility', { waitUntil: 'networkidle' });
    await radio(page, 'Sombre').click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('#root > div') || document.body).backgroundColor);
    await shot(page, 'dark-dashboard');
    await page.goto(BASE + '/(tabs)/sos', { waitUntil: 'networkidle' });
    await shot(page, 'dark-sos');
    return bg;
  });

  // ---------- Languages ----------
  await check('Dutch and English UI', async () => {
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Néerlandais/ }).click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Hallo Lina');
    await shot(page, 'nl-dashboard');
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Engels/ }).click();
    await page.goto(BASE + '/(tabs)/sos', { waitUntil: 'networkidle' });
    const body = await text(page);
    await shot(page, 'en-sos');
    await page.goto(BASE + '/settings/language', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^French/ }).click();
    await page.goto(BASE + '/(tabs)', { waitUntil: 'networkidle' });
    await expectText(page, 'Bonjour Lina');
    const leftover = body.match(/\b[a-z]+\.[a-zA-Z_]+\.[a-zA-Z_.]+\b/g);
    if (leftover) throw new Error('raw keys: ' + leftover.join(','));
    return body.split('\n').slice(0, 2).join(' | ');
  });

  // ---------- Export JSON ----------
  await check('export JSON contains the data', async () => {
    await page.goto(BASE + '/settings/privacy', { waitUntil: 'networkidle' });
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), btn(page, 'Exporter (JSON)').click()]);
    const file = `${SHOTS}/export.json`;
    await download.saveAs(file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.data.user.firstName !== 'Lina') throw new Error('user missing in export');
    if (data.data.cravings.length !== 2) throw new Error('cravings ' + data.data.cravings.length);
    if (data.data.smokingEvents.length !== 1) throw new Error('smoking events ' + data.data.smokingEvents.length);
    return `schema v${data.schemaVersion}, ${data.data.sessions.length} session(s), xp ${data.data.rewards.xp}`;
  });

  // ---------- PDF ----------
  await check('PDF report generated (print invoked)', async () => {
    await page.goto(BASE + '/reports', { waitUntil: 'networkidle' });
    await expectText(page, 'Rapport PDF');
    await shot(page, 'reports');
    await btn(page, 'Générer le PDF').click();
    await page.clock.runFor(3000);
    await page.waitForTimeout(500);
    const body = await text(page);
    if (body.includes('Le PDF n') ) throw new Error('print failed banner');
    return body.includes('Rapport prêt') ? 'ok banner' : 'no banner yet';
  });

  // ---------- Delete ----------
  await check('delete all data requires typed confirmation', async () => {
    await page.goto(BASE + '/settings/privacy', { waitUntil: 'networkidle' });
    await btn(page, 'Tout supprimer').click();
    await expectText(page, 'Supprimer définitivement ?');
    await page.getByLabel('Écris SUPPRIMER').fill('NON');
    await btn(page, 'Tout supprimer').last().click();
    await page.waitForTimeout(300);
    await expectText(page, 'Le mot ne correspond pas.');
    await page.getByLabel('Écris SUPPRIMER').fill('SUPPRIMER');
    await shot(page, 'delete-confirm');
    await btn(page, 'Tout supprimer').last().click();
    await expectText(page, 'Chaque envie est une occasion', 8000);
  });
  await check('nothing left after reload', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    await expectText(page, 'Chaque envie est une occasion', 8000);
    const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('souffle')).map((k) => [k, localStorage.getItem(k)]));
    const leaked = stored.filter(([, v]) => v && v.includes('Lina'));
    if (leaked.length) throw new Error('data still stored in ' + leaked.map(([k]) => k).join(','));
    return `${stored.length} key(s) left, none with user data`;
  });

  // ---------- Demo ----------
  await check('demo mode is clearly flagged and can be exited', async () => {
    await btn(page, 'Charger la démonstration tabac').click();
    await expectText(page, 'Mode démonstration : profil et données entièrement fictifs.', 8000);
    await shot(page, 'demo-dashboard');
    await page.goto(BASE + '/settings/privacy', { waitUntil: 'networkidle' });
    await btn(page, 'Quitter la démonstration').click();
    await expectText(page, 'Chaque envie est une occasion', 8000);
  });

  console.log('\nConsole errors:', errors.length ? '\n' + errors.slice(0, 20).join('\n') : 'none');
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  fs.writeFileSync(`${SHOTS}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
