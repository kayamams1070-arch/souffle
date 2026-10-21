/* Second end-to-end scenario: reduction goal, remaining SOS tools, secondary screens. */
const { chromium } = require('playwright-core');
const fs = require('fs');

const SHOTS = process.argv[2];
const BASE = 'http://localhost:8088';
const results = [];
let step = 0;
let page;

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ ok: true, name });
    console.log(`PASS ${name}${detail ? ' :: ' + detail : ''}`);
  } catch (e) {
    results.push({ ok: false, name, detail: e.message });
    console.log(`FAIL ${name} :: ${e.message.split('\n')[0]}`);
    await page.screenshot({ path: `${SHOTS}/FAIL2-${name.replace(/[^a-z0-9]+/gi, '_')}.png` }).catch(() => {});
  }
}
async function shot(name) {
  step += 1;
  await page.screenshot({ path: `${SHOTS}/b${String(step).padStart(2, '0')}-${name}.png` });
}
const btn = (name) => page.getByRole('button', { name, exact: true });
const radio = (name) => page.getByRole('radio', { name, exact: true });
const body = () => page.innerText('body');
const see = (t, timeout = 6000) => page.getByText(t, { exact: false }).filter({ visible: true }).first().waitFor({ state: 'visible', timeout }).catch(() => { throw new Error('text not found: ' + t); });
async function tap(locator) {
  // RN-web press handling relies on short timers: advance the fake clock after each tap,
  // and retry (max 2 more times) only if neither the URL nor the screen changed.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const url = page.url();
    const before = await body();
    await locator.click();
    await page.clock.runFor(300);
    await page.waitForTimeout(300);
    if (page.url() !== url || (await body()) !== before) return;
  }
}
const go = (path) => page.goto(BASE + path, { waitUntil: 'networkidle' });

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-BE', timezoneId: 'Europe/Brussels', acceptDownloads: true });
  page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.clock.install({ time: new Date('2026-10-21T08:00:00+02:00') });
  await go('/');

  // ---------- Reduction onboarding ----------
  await check('onboarding with reduction goal', async () => {
    await tap(btn('Commencer'));
    await page.getByLabel('Cigarettes par jour').fill('20');
    await page.getByLabel('Années de tabagisme').fill('5');
    await page.getByLabel('Prix du paquet').fill('10');
    await page.getByLabel('Cigarettes par paquet').fill('20');
    await radio('Réduction progressive').click(); await page.clock.runFor(300);
    await tap(btn('Continuer'));
    await see('Test de Fagerström');
    for (const a of ['Après 60 minutes', 'N\'importe quelle autre']) await radio(a).click(); await page.clock.runFor(300);
    await radio('Non').nth(0).click(); await page.clock.runFor(300);
    await radio('Non').nth(1).click(); await page.clock.runFor(300);
    await radio('Non').nth(2).click(); await page.clock.runFor(300);
    await see('Ton score : 1 / 10');
    await see('Dépendance très faible');
    await tap(btn('Continuer'));
    await see('Activité physique');
    await tap(btn('Continuer'));
    await see('Ton plan'); 
    await see('Maximum par jour');
    await see('Objectif : 15 par jour');
    await see('nettement plus importants avec un arrêt complet');
    await shot('reduce-goal');
    await tap(btn('Continuer'));
    await see('Ton pacte personnel');
    await page.getByRole('checkbox', { name: 'Ma santé' }).click(); await page.clock.runFor(300);
    await page.getByLabel('Ta signature').fill('M.');
    await tap(btn('Je signe mon pacte'));
    await see('Aujourd\'hui', 8000);
  });
  await check('reduction dashboard has no smoke-free counter', async () => {
    const b = await body();
    if (b.includes('Sans tabac depuis')) throw new Error('misleading smoke-free counter shown');
    if (!b.includes('/ 15')) throw new Error('target not shown');
    await shot('reduce-dashboard');
  });
  await check('log cigarettes in reduction mode', async () => {
    await tap(btn('Noter une cigarette'));
    await see('Noter chaque cigarette permet de suivre');
    await btn('Augmenter : Nombre de cigarettes').click(); await page.clock.runFor(300);
    await btn('Augmenter : Nombre de cigarettes').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await tap(btn('Confirmer'));
    await see('Cigarette notée');
    await go('/(tabs)');
    const b = await body();
    if (!/\n3\n\/ 15/.test(b) && !b.includes('3\n/ 15')) throw new Error('today count not 3: ' + b.slice(0, 300));
    return 'today 3 / 15';
  });

  // ---------- SOS workout 5 min ----------
  await check('SOS 5-minute workout runs to the end', async () => {
    await go('/(tabs)/sos');
    await tap(page.getByRole('button', { name: /J'ai 5 minutes/ }));
    await see('Mini-séance de 5 minutes');
    await tap(btn('Commencer'));
    await see('Exercice 1 sur 6');
    await shot('sos-workout');
    await page.clock.runFor(5 * 60 * 1000 + 5000);
    await see('Comment est ton envie maintenant ?', 8000);
    await page.getByRole('button', { name: 'Elle a diminué' }).click(); await page.clock.runFor(300);
    await radio('8').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await see("C'est déjà un vrai progrès");
  });

  // ---------- Distraction ----------
  await check('distraction number game is playable', async () => {
    await go('/(tabs)/sos');
    await tap(page.getByRole('button', { name: /Me changer les idées/ }));
    await see('Change d\'idée');
    await radio('Chiffres').click(); await page.clock.runFor(300);
    for (let n = 1; n <= 16; n += 1) await page.getByRole('button', { name: String(n), exact: true }).click(); await page.clock.runFor(300);
    await see('Terminé en');
    await shot('distraction-numbers');
    await radio('Ancrage 5-4-3-2-1').click(); await page.clock.runFor(300);
    for (const s of ['5 choses que tu vois', '4 choses que tu peux toucher', '3 sons que tu entends', '2 odeurs que tu perçois', '1 goût dans ta bouche']) await page.getByRole('switch', { name: s }).click(); await page.clock.runFor(300);
    await see('Ton attention est revenue');
    await tap(btn('Terminer'));
    await see('Comment est ton envie maintenant ?');
    await page.getByRole('button', { name: 'Elle est passée' }).click(); await page.clock.runFor(300);
    await radio('5').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await see('Bien joué !');
  });

  // ---------- Craving surf ----------
  await check('craving surf 3 minutes with 5 steps', async () => {
    await go('/(tabs)/sos');
    await tap(btn('Craving surf guidé (3 min)'));
    await see('Étape 1 sur 5');
    await see('Reconnaître');
    await page.clock.runFor(75_000);
    await see('Étape 3 sur 5');
    await shot('surf');
    await page.clock.runFor(110_000);
    await see('Comment est ton envie maintenant ?', 8000);
  });

  // ---------- Coach ----------
  await check('coach understands and proposes actions', async () => {
    await go('/coach');
    await page.getByLabel('Ton message').fill("J'ai envie de fumer après le café");
    await tap(btn('Envoyer'));
    await see('Change le rituel');
    await see('Voir la séance proposée');
    await page.getByLabel('Ton message').fill('blablabla');
    await tap(btn('Envoyer'));
    await see('Je ne suis pas sûr d\'avoir compris');
    await page.getByLabel('Ton message').fill("j'ai mal au genou");
    await tap(btn('Envoyer'));
    await see('pas d\'exercice maintenant');
    await shot('coach');
  });

  // ---------- Journal, sleep, cough ----------
  await check('journal victory gives XP once', async () => {
    await go('/journal');
    await radio('Bonne journée').click(); await page.clock.runFor(300);
    await page.getByLabel('Ton texte').fill('Une journée calme et sans excès.');
    await tap(btn('Enregistrer'));
    await see('Enregistré ! +10 XP');
  });
  await check('sleep entry and history', async () => {
    await go('/health/sleep');
    await radio('4').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await see('Moyenne de tes 7 dernières nuits');
  });
  await check('cough entry with medical caution', async () => {
    await go('/health/cough');
    await see('consulte un professionnel de santé');
    await radio('3').click(); await page.clock.runFor(300);
    await radio('Parfois').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await see('Enregistré.');
    await see('Historique');
  });

  // ---------- Challenges, family ----------
  await check('local challenge with computed progress', async () => {
    await go('/challenges');
    await see('Défis locaux');
    await tap(btn('Créer le défi'));
    await see('En cours');
    await shot('challenges');
  });
  await check('family share is a voluntary text, no invitation', async () => {
    await go('/family');
    await see('Aucune invitation n\'est envoyée');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }), tap(btn('Partager ce récapitulatif'))]);
    const p = `${SHOTS}/recap.txt`;
    await dl.saveAs(p);
    const txt = fs.readFileSync(p, 'utf8');
    if (txt.includes('jours sans tabac')) throw new Error('smoke-free days shown in reduction mode');
    return txt.split('\n')[0];
  });

  // ---------- Breathing test ----------
  await check('breathing test protocol saved', async () => {
    await go('/health/breathing-test');
    await see("Ce test n'est pas médical");
    await tap(btn('Commencer le test'));
    await page.clock.runFor(31_000);
    await tap(btn('Commencer'));
    await page.clock.runFor(31_000);
    await see('Effort ressenti');
    await radio('2').first().click(); await page.clock.runFor(300);
    await radio('3').nth(1).click(); await page.clock.runFor(300);
    await tap(btn('Continuer'));
    await see('Il ne s\'agit pas de tenir le plus longtemps possible');
    await tap(btn('Enregistrer'));
    await see('Test enregistré');
  });

  // ---------- Export / import roundtrip ----------
  await check('import restores an exported file', async () => {
    await go('/settings/privacy');
    const [dl] = await Promise.all([page.waitForEvent('download'), tap(btn('Exporter (JSON)'))]);
    const p = `${SHOTS}/export2.json`;
    await dl.saveAs(p);
    const exported = JSON.parse(fs.readFileSync(p, 'utf8'));
    // Change data, then import the file back.
    await go('/journal');
    await page.getByLabel('Ton texte').fill('Entrée ajoutée après l\'export');
    await tap(btn('Enregistrer'));
    await go('/settings/privacy');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), (async () => {
      await tap(btn('Importer un fichier'));
      await tap(btn('Importer un fichier').last());
    })()]);
    await chooser.setFiles(p);
    await see('Import terminé.');
    await go('/journal');
    const b = await body();
    if (b.includes('Entrée ajoutée après l\'export')) throw new Error('import did not replace data');
    return `${exported.data.cravings.length} cravings, ${exported.data.entries.length} entries restored`;
  });

  // ---------- Accessibility ----------
  await check('extra-large text and high contrast', async () => {
    await go('/settings/accessibility');
    await radio('Très grande').click(); await page.clock.runFor(300);
    await page.getByRole('switch', { name: 'Contraste élevé' }).click(); await page.clock.runFor(300);
    await go('/(tabs)');
    await shot('xlarge-contrast');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error('horizontal overflow with large text');
  });

  // ---------- Shield on a real streak (quit goal) ----------
  await check('shield protects a running streak', async () => {
    await go('/goal-settings');
    await radio('Arrêt complet').click(); await page.clock.runFor(300);
    await radio('Maintenant').click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await tap(btn('Confirmer'));
    await page.clock.runFor(3 * 24 * 3600 * 1000);
    await go('/(tabs)');
    await see('Série');
    const b1 = await body();
    const streak = Number((b1.match(/Série\n(\d+) jours?/) || [])[1]);
    if (!(streak >= 2)) throw new Error('streak ' + streak);
    await go('/relapse');
    await page.getByRole('switch', { name: 'Utiliser mon bouclier' }).click(); await page.clock.runFor(300);
    await tap(btn('Enregistrer'));
    await see('ton bouclier protégera ta série');
    await tap(btn('Confirmer'));
    await see('Ton bouclier a protégé ta série');
    await go('/relapse');
    await see('Ce jour est déjà protégé.');
    await shot('shield-used');
    return `streak ${streak} kept`;
  });

  console.log('\nConsole errors:', errors.length ? '\n' + errors.slice(0, 15).join('\n') : 'none');
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
