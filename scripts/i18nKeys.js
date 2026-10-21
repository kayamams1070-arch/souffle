/**
 * Collects every translation key used in src/ (static keys and dynamic key families
 * expanded from their real value domains) and checks the locale files.
 *
 *   node scripts/i18nKeys.js            -> report missing / unused keys for fr, nl, en
 *   node scripts/i18nKeys.js --json     -> dump required keys with plural + variables info
 *
 * Also used by src/__tests__/i18n.test.ts so a missing translation fails the test suite.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const TRIGGERS = ['coffee', 'stress', 'boredom', 'after_meal', 'alcohol', 'anger', 'social', 'fatigue', 'night', 'other'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const DEPENDENCE = ['very_low', 'low', 'medium', 'high', 'very_high'];
const OUTCOMES = ['passed', 'partly_passed', 'persisted'];
const INTERVENTIONS = ['breathing', 'workout', 'distraction', 'craving_surf', 'replacement_ritual', 'none'];
const JOURNAL_TYPES = ['craving_overcome', 'workout_done', 'good_day', 'decision', 'gratitude', 'free'];
const MOODS = ['calm', 'tense', 'sad', 'tired', 'irritated', 'ok'];
const LANGS = ['fr', 'nl', 'en'];
const NOTIF = ['workout_reminder', 'encouragement', 'trigger_preparation', 'weekly_summary', 'milestone', 'pact_reminder', 'journal_reminder'];
const DAYS7 = ['0', '1', '2', '3', '4', '5', '6'];

function readIds(file, regex) {
  const text = fs.readFileSync(path.join(SRC, file), 'utf8');
  return [...text.matchAll(regex)].map((m) => m[1]);
}

const EXERCISE_KEYS = readIds('data/exercises.ts', /key: '([a-z_]+)'/g);
const BADGE_KEYS = readIds('data/badges.ts', /key: '([a-z0-9_]+)'/g);
const MILESTONE_KEYS = readIds('data/healthMilestones.ts', /key: '([a-z0-9]+)'/g);
const XP_KEYS = (() => {
  const text = fs.readFileSync(path.join(SRC, 'utils/constants.ts'), 'utf8');
  const block = text.slice(text.indexOf('XP_RULES'), text.indexOf('};', text.indexOf('XP_RULES')));
  return [...block.matchAll(/^\s+([a-z_]+): \d+/gm)].map((m) => m[1]);
})();
const WORKOUT_KEYS = [
  ...LEVELS.flatMap((l) => ['strength', 'cardio', 'mobility'].map((t) => `${l}_${t}`)),
  ...readIds('data/workouts.ts', /key: '(theme_[a-z]+|sos_5min)'/g),
];
const COACH_REPLY_KEYS = [...new Set(readIds('services/coachService.ts', /key: '([a-z_]+)'/g).concat(['no_sport', 'missed_sessions']))];
const COACH_PROMPTS = readIds('services/coachService.ts', /\{ id: '([a-z_]+)', intent:/g);
const FAGERSTROM = [
  ['q1', 4],
  ['q2', 2],
  ['q3', 2],
  ['q4', 4],
  ['q5', 2],
  ['q6', 2],
];

/** Dynamic families: normalized template ("a.*.b") -> list of concrete keys. */
const DYNAMIC = {
  'about.limits.*': ['offline', 'coach', 'community', 'widget', 'notifications'],
  'alternatives.*.text': TRIGGERS,
  'alternatives.*.title': TRIGGERS,
  'badges.*.description': BADGE_KEYS,
  'badges.*.title': BADGE_KEYS,
  'badges.categories.*': ['smoke_free', 'craving', 'sport', 'consistency'],
  'benefits.kinds.*': ['travel', 'purchase', 'hobby', 'savings', 'other'],
  'breathingTest.protocol.*': ['calm', 'march', 'rate', 'exhale'],
  'challenges.kindLabels.*': ['smoke_free_days', 'workouts', 'cravings_overcome'],
  'challenges.kinds.*': ['smoke_free_days', 'workouts', 'cravings_overcome'],
  'challenges.status.*': ['upcoming', 'active', 'completed', 'ended'],
  'coach.actions.*': ['breathing', 'workout', 'distraction', 'surf', 'pact', 'relapse', 'journal', 'rest', 'medical'],
  'coach.prompts.*': COACH_PROMPTS,
  'coach.replies.*.message': COACH_REPLY_KEYS,
  'coach.replies.*.why': COACH_REPLY_KEYS,
  'cough.frequencies.*': ['rare', 'sometimes', 'often', 'constant'],
  'cough.trends.*': ['improving', 'stable', 'worsening'],
  'dashboard.savings.*': ['y1', 'y5', 'y10'],
  'dependence.*': DEPENDENCE,
  'exercises.*.instructions': EXERCISE_KEYS,
  'exercises.*.name': EXERCISE_KEYS,
  'exercises.*.easier': EXERCISE_KEYS,
  'exercises.*.harder': EXERCISE_KEYS,
  'exercises.*.safety': EXERCISE_KEYS,
  'family.share.*': ['days', 'savings', 'workouts', 'cravings', 'why'],
  'forecast.confidence.*': ['low', 'medium', 'high'],
  'forecast.slots.*': ['morning', 'midday', 'afternoon', 'evening', 'night'],
  'health.milestones.*.description': MILESTONE_KEYS,
  'health.milestones.*.title': MILESTONE_KEYS,
  'intensity.*': ['gentle', 'moderate', 'dynamic'],
  'interventions.*': INTERVENTIONS,
  'journal.placeholders.*': JOURNAL_TYPES,
  'journal.types.*': JOURNAL_TYPES,
  'level.*': LEVELS,
  'limitations.*': ['knees', 'back', 'shoulders', 'wrists', 'balance', 'breathing', 'no_jumping', 'pregnancy', 'other'],
  'locations.*': ['home', 'work', 'outside', 'social', 'other'],
  'moods.*': MOODS,
  'onboarding.fagerstrom.*.question': FAGERSTROM.map(([q]) => q),
  'onboarding.fagerstrom.*.a*': FAGERSTROM.flatMap(([q, n]) => Array.from({ length: n }, (_, i) => `${q}.a${i}`)),
  'onboarding.fagerstrom.interpretation.*': DEPENDENCE,
  'onboarding.health.levelHint.*': LEVELS,
  'onboarding.profile.errors.*': ['age', 'range', 'price', 'invalid'],
  'onboarding.welcome.how_*': ['sos', 'sport', 'track', 'kind'],
  'outcomes.*': OUTCOMES,
  'privacy.errors.*': ['sharing_unavailable', 'write_failed', 'print_failed', 'canceled', 'not_json', 'not_souffle', 'newer_version', 'invalid_user', 'read_failed'],
  'program.phases.*.description': ['habit', 'basics', 'progress', 'endurance', 'consolidation', 'autonomy'],
  'program.phases.*.title': ['habit', 'basics', 'progress', 'endurance', 'consolidation', 'autonomy'],
  'program.weeks.w*.goal': Array.from({ length: 12 }, (_, i) => String(i + 1)),
  'program.weeks.w*.hardDay': Array.from({ length: 12 }, (_, i) => String(i + 1)),
  'program.weeks.w*.review': Array.from({ length: 12 }, (_, i) => String(i + 1)),
  'reasons.*': ['family', 'health', 'breath', 'money', 'freedom', 'children', 'other'],
  'relapse.decisionHints.*': ['continue_quit', 'new_quit_date', 'switch_to_reduce', 'reduction_log'],
  'relapse.shield.*': ['cooldown', 'too_old', 'already'],
  'settings.language.*': LANGS,
  'settings.language.native.*': LANGS,
  'settings.notifications.category.*': NOTIF,
  'settings.notifications.categoryHint.*': NOTIF,
  'settings.theme.*': ['system', 'light', 'dark'],
  'sos.breathing.*': ['inhale', 'exhale'],
  'sos.distraction.grounding.*': ['see5', 'touch4', 'hear3', 'smell2', 'taste1'],
  'sos.feedback.message.*': OUTCOMES,
  'sos.feedback.thanks.*': OUTCOMES,
  'streak.freeze.errors.*': ['active', 'too_long', 'past'],
  'streak.freeze.reasons.*': ['illness', 'travel', 'other'],
  'surf.steps.*.text': ['recognize', 'observe', 'breathe', 'evolve', 'choose'],
  'surf.steps.*.title': ['recognize', 'observe', 'breathe', 'evolve', 'choose'],
  'triggers.*': TRIGGERS,
  'weekdays.*': DAYS7,
  'weekdaysShort.*': DAYS7,
  'workouts.*.description': WORKOUT_KEYS,
  'workouts.*.title': WORKOUT_KEYS,
  'xp.*': XP_KEYS,
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });
}

/** Returns the text of the call arguments starting right after "t(". */
function callArgs(text, start) {
  let depth = 1;
  let i = start;
  let quote = null;
  while (i < text.length && depth > 0) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
    } else if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '{' || c === '[') depth += 1;
    else if (c === ')' || c === '}' || c === ']') depth -= 1;
    i += 1;
  }
  return text.slice(start, i - 1);
}

function topLevelObjectKeys(args) {
  const brace = args.indexOf('{');
  if (brace < 0) return [];
  const keys = [];
  let depth = 0;
  let token = '';
  let quote = null;
  for (let i = brace; i < args.length; i += 1) {
    const c = args[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }
    if ('({['.includes(c)) {
      depth += 1;
      token = '';
      continue;
    }
    if (')}]'.includes(c)) {
      if (depth === 1 && /^[A-Za-z_]\w*$/.test(token.trim())) keys.push(token.trim());
      depth -= 1;
      token = '';
      if (depth === 0) break;
      continue;
    }
    if (depth === 1) {
      if (c === ':' || c === ',') {
        if (/^[A-Za-z_]\w*$/.test(token.trim())) keys.push(token.trim());
        token = c === ':' ? '\u0000' : '';
      } else if (token !== '\u0000') token += c;
      if (c === ',' && token === '\u0000') token = '';
    }
  }
  return [...new Set(keys)];
}

function collectKeys() {
  const required = {};
  const unknownTemplates = [];
  const add = (key, info) => {
    const r = (required[key] = required[key] || { plural: false, vars: new Set(), files: new Set() });
    if (info.plural) r.plural = true;
    info.vars.forEach((v) => r.vars.add(v));
    r.files.add(info.file);
  };
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const m of text.matchAll(/\bt\(\s*(['"`])/g)) {
      const quote = m[1];
      const keyStart = m.index + m[0].length;
      const keyEnd = text.indexOf(quote, keyStart);
      const raw = text.slice(keyStart, keyEnd);
      const args = callArgs(text, m.index + m[0].indexOf('(') + 1);
      const rest = args.slice(args.indexOf(raw) + raw.length + 1);
      const vars = topLevelObjectKeys(rest);
      const plural = vars.includes('count');
      const info = { plural, vars, file: rel };
      if (quote === '`' && raw.includes('${')) {
        const pattern = raw.replace(/\$\{[^}]*\}/g, '*');
        const values = DYNAMIC[pattern];
        if (!values) {
          unknownTemplates.push(`${rel}: ${raw}`);
          continue;
        }
        const parts = pattern.split('*');
        for (const v of values) {
          if (parts.length === 2) add(parts[0] + v + parts[1], info);
          else if (pattern === 'onboarding.fagerstrom.*.a*') add(`onboarding.fagerstrom.${v}`, info);
        }
      } else {
        add(raw, info);
      }
    }
  }
  return { required, unknownTemplates };
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

function checkLocale(lang, required) {
  const file = path.join(SRC, 'i18n', 'locales', `${lang}.json`);
  const flat = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
  const missing = [];
  const badVars = [];
  for (const [key, info] of Object.entries(required)) {
    const forms = info.plural ? [`${key}_one`, `${key}_other`] : [key];
    for (const f of forms) {
      const value = flat[f] ?? (info.plural ? undefined : flat[key]);
      if (typeof value !== 'string' || value.trim() === '') {
        missing.push(f);
        continue;
      }
      for (const placeholder of value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
        if (!info.vars.has(placeholder[1])) badVars.push(`${f}: {{${placeholder[1]}}} not passed`);
      }
    }
  }
  const used = new Set(Object.keys(required).flatMap((k) => [k, ...PLURAL_SUFFIXES.map((s) => k + s)]));
  const unused = Object.keys(flat).filter((k) => !used.has(k));
  return { missing, unused, badVars, total: Object.keys(flat).length };
}

module.exports = { collectKeys, checkLocale, flatten, DYNAMIC };

if (require.main === module) {
  const { required, unknownTemplates } = collectKeys();
  if (process.argv.includes('--json')) {
    const out = {};
    for (const [k, v] of Object.entries(required).sort()) out[k] = { plural: v.plural, vars: [...v.vars], files: [...v.files] };
    process.stdout.write(JSON.stringify(out, null, 1));
    process.exit(0);
  }
  console.log(`Keys required: ${Object.keys(required).length}`);
  if (unknownTemplates.length) console.log('Unknown dynamic templates:\n  ' + unknownTemplates.join('\n  '));
  let failed = unknownTemplates.length > 0;
  for (const lang of LANGS) {
    const r = checkLocale(lang, required);
    console.log(`\n[${lang}] ${r.total} strings, ${r.missing.length} missing, ${r.unused.length} unused, ${r.badVars.length} bad placeholders`);
    if (r.missing.length) console.log('  missing: ' + r.missing.slice(0, 40).join(', ') + (r.missing.length > 40 ? ' ...' : ''));
    if (r.unused.length) console.log('  unused: ' + r.unused.slice(0, 40).join(', '));
    if (r.badVars.length) console.log('  ' + r.badVars.slice(0, 20).join('\n  '));
    if (r.missing.length || r.badVars.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}
