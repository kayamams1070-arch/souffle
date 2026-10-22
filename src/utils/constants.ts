import type { XpEventType } from '@/types';

export const APP_NAME = 'Souffle';
export const APP_VERSION = '1.0.0';
/**
 * Persisted schema version. History:
 * 1 - initial schema
 * 2 - user.savingsStartDate pinned (savings never reset by a new quit date / goal switch)
 */
export const SCHEMA_VERSION = 2;

/** Centralized XP rules. Each event id is rewarded at most once (see rewardService). */
export const XP_RULES: Record<XpEventType, number> = {
  workout_completed: 30,
  craving_overcome: 15,
  journal_entry: 5,
  victory: 10,
  milestone: 50,
  breathing_test: 10,
  sos_completed: 10,
  relapse_recovery: 20,
};

/** Craving-journal timers (seconds). */
export const SOS_BREATHING_SECONDS = 120;
export const SOS_WORKOUT_SECONDS = 300;
export const CRAVING_SURF_SECONDS = 180;

/** Breathing pattern for the 2-minute guide (comfortable, no breath holding). */
export const BREATH_PATTERN = { inhaleSeconds: 4, exhaleSeconds: 6 };

/** Minimum observations before the craving forecast says anything. */
export const FORECAST_MIN_CRAVINGS = 8;

/** Level unlock rules for the training program. */
export const LEVEL_UNLOCK = {
  intermediate: { minWorkouts: 6, minDistinctWeeks: 2 },
  advanced: { minWorkouts: 18, minDistinctWeeks: 5 },
};

export const PROGRAM_WEEKS = 12;

export const STORAGE_PREFIX = 'souffle';

/** Public health references used for the health timelines (checked October 2026). */
export const HEALTH_SOURCES: Record<string, { label: string; url: string; substance: 'tobacco' | 'cannabis' }> = {
  who: {
    label: 'WHO, "Tobacco: Health benefits of smoking cessation"',
    url: 'https://www.who.int/news-room/q-a-detail/health-benefits-of-smoking-cessation',
    substance: 'tobacco',
  },
  nhs: {
    label: 'NHS Wales 111, "Quit smoking timeline"',
    url: 'https://111.wales.nhs.uk/livewell/quitsmokingtimeline/',
    substance: 'tobacco',
  },
  budney: {
    label: 'Budney et al. 2003, "The time course and significance of cannabis withdrawal", J Abnorm Psychol 112(3)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/12943018/',
    substance: 'cannabis',
  },
  rch: {
    label: 'Royal Children\'s Hospital Melbourne, clinical guideline "Cannabis withdrawal syndrome"',
    url: 'https://www.rch.org.au/clinicalguide/guideline_index/Cannabis_withdrawal_syndrome/',
    substance: 'cannabis',
  },
  bonnet: {
    label: 'Bonnet & Preuss 2017, "The cannabis withdrawal syndrome: current insights", Subst Abuse Rehabil 8',
    url: 'https://www.dovepress.com/the-cannabis-withdrawal-syndrome-current-insights-peer-reviewed-fulltext-article-SAR',
    substance: 'cannabis',
  },
  lee: {
    label: 'Lee et al. 2014 (NIDA), sleep and dreams during cannabis abstinence, Am J Addict 23(3)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3986824/',
    substance: 'cannabis',
  },
  jellinek: {
    label: 'Jellinek, "Stop or cut back on cannabis"',
    url: 'https://www.jellinek.nl/en/alcohol-drugs-behavior/cannabis/stop-or-cut-back-on-cannabis/',
    substance: 'cannabis',
  },
  santefr: {
    label: 'Santé.fr, "Cannabis : quels effets sur la santé ?"',
    url: 'https://www.sante.fr/agir-pour-ma-sante/prevenir-addictions/cannabis',
    substance: 'cannabis',
  },
  frank: {
    label: 'FRANK (UK government), "Cannabis", mixing cannabis with tobacco',
    url: 'https://www.talktofrank.com/drug/cannabis',
    substance: 'cannabis',
  },
};

/** Sources behind the cannabis support content (withdrawal companion, nights, social). Checked October 2026. */
export interface SupportSource {
  label: string;
  url: string;
  substance: 'tobacco' | 'cannabis' | 'all';
}

const SUPPORT: Record<string, SupportSource> = {
  ncsct: {
    label: 'NCSCT (UK), "Smoking cessation and cannabis use: a guide for stop smoking practitioners" (2025, revised 2026)',
    url: 'https://www.ncsct.co.uk/library/view/pdf/NCSCT-cannabis-2025-v2.pdf',
    substance: 'cannabis',
  },
  ncpic: {
    label: 'NCPIC / Queensland Health, "A do-it-yourself guide to quitting cannabis"',
    url: 'https://adis.health.qld.gov.au/sites/default/files/resource/file/do-it-yourself-guide-to-quitting.pdf',
    substance: 'cannabis',
  },
  withyou: {
    label: 'With You (UK), "Coping with cannabis withdrawal symptoms"',
    url: 'https://www.wearewithyou.org.uk/help-and-advice/advice-you/coping-cannabis-weed-withdrawal-symptoms/',
    substance: 'cannabis',
  },
  santeSleep: {
    label: 'Santé.fr, "Le cannabis aide-t-il à dormir ?"',
    url: 'https://www.sante.fr/node/798439',
    substance: 'cannabis',
  },
  nhsInsomnia: {
    label: 'NHS, "Insomnia"',
    url: 'https://www.nhs.uk/conditions/insomnia/',
    substance: 'all',
  },
  drugAware: {
    label: 'Drug Aware (Australia), "Tips for saying no to drug use"',
    url: 'https://drugaware.com.au/get-the-facts/tips-for-saying-no-to-drug-use/',
    substance: 'all',
  },
  tasHealth: {
    label: 'Tasmanian Department of Health, "Coping with high-risk situations"',
    url: 'https://health.tas.gov.au/sites/default/files/2024-08/coping_with_high-risk_situations.pdf',
    substance: 'all',
  },
  lrcug: {
    label: 'Fischer et al. 2022, Lower-Risk Cannabis Use Guidelines (update), Int J Drug Policy 99',
    url: 'https://doi.org/10.1016/j.drugpo.2021.103381',
    substance: 'cannabis',
  },
  druglijnSelfHelp: {
    label: 'De DrugLijn, zelfhulpprogramma (gratis, anoniem)',
    url: 'https://zelfhulp.druglijn.be/',
    substance: 'cannabis',
  },
};

/** Day-by-day withdrawal companion. */
export const WITHDRAWAL_SOURCES: SupportSource[] = [SUPPORT.ncsct!, SUPPORT.ncpic!, SUPPORT.withyou!, SUPPORT.santeSleep!];
/** "Difficult nights" kit. */
export const NIGHTS_SOURCES: SupportSource[] = [SUPPORT.nhsInsomnia!, SUPPORT.santeSleep!, SUPPORT.withyou!, SUPPORT.ncsct!];
/** "When someone offers you one" screen. */
export const SOCIAL_SOURCES: SupportSource[] = [SUPPORT.drugAware!, SUPPORT.tasHealth!, SUPPORT.ncpic!];
/** Cutting down (use-free days). */
export const REDUCTION_SOURCES: SupportSource[] = [SUPPORT.lrcug!, SUPPORT.druglijnSelfHelp!];

/** CUDIT-R reference (freely available, permission not required, per PhenX). */
export const CUDIT_SOURCE = {
  label: 'Adamson et al. 2010, CUDIT-R, Drug Alcohol Depend 110; French version CUDIT-R-Fr (Luquiens et al. 2021); cut-offs 8 / 12 (PhenX Toolkit)',
  url: 'https://www.phenxtoolkit.org/protocols/view/510310',
};

/** Average joint weight used only as a hint (US estimate, never applied automatically). */
export const JOINT_WEIGHT_SOURCE = {
  label: 'Ridgeway & Kilmer 2016, mean marijuana weight per joint 0.32 g (US data), Drug Alcohol Depend 165',
  url: 'https://www.rand.org/pubs/external_publications/EP66542.html',
};

/** Fagerström interpretation reference. */
export const FAGERSTROM_SOURCE = {
  label: 'NIDA Common Data Elements (NIH), FTND score interpretation, CDE 2195870',
  url: 'https://cde.nida.nih.gov/node/239',
};

/**
 * Free quit-smoking help lines (checked October 2026). Shown as complementary resources,
 * never as a sign of failure.
 */
export interface HelpResource {
  id: string;
  topic: 'tobacco' | 'cannabis';
  country: 'BE' | 'FR' | 'NL' | 'UK';
  name: string;
  phone?: string;
  url: string;
}

/**
 * Help lines checked in October 2026. Hours and costs are in the translations
 * (help.resources.<id>) and only state what the official pages say.
 */
export const HELP_RESOURCES: HelpResource[] = [
  { id: 'be', topic: 'tobacco', country: 'BE', name: 'Tabacstop / Tabakstop', phone: '0800 111 00', url: 'https://www.tabacstop.be' },
  { id: 'fr', topic: 'tobacco', country: 'FR', name: 'Tabac Info Service', phone: '39 89', url: 'https://www.tabac-info-service.fr' },
  { id: 'nl', topic: 'tobacco', country: 'NL', name: 'Ikstopnu (Stoplijn)', phone: '0800-1995', url: 'https://www.ikstopnu.nl' },
  { id: 'uk', topic: 'tobacco', country: 'UK', name: 'NHS Smokefree National Helpline', phone: '0300 123 1044', url: 'https://www.nhs.uk/better-health/quit-smoking/' },
  { id: 'c_be_fr', topic: 'cannabis', country: 'BE', name: 'Infor-Drogues & Addictions', phone: '02 227 52 52', url: 'https://infordrogues.be/' },
  { id: 'c_be_nl', topic: 'cannabis', country: 'BE', name: 'De DrugLijn', phone: '078 15 10 20', url: 'https://www.druglijn.be/' },
  { id: 'c_fr', topic: 'cannabis', country: 'FR', name: 'Drogues Info Service', phone: '0 800 23 13 13', url: 'https://www.drogues-info-service.fr/' },
  { id: 'c_nl', topic: 'cannabis', country: 'NL', name: 'Trimbos Drugs Infolijn', phone: '0900-1995', url: 'https://www.drugsinfo.nl' },
  { id: 'c_nl_jellinek', topic: 'cannabis', country: 'NL', name: 'Jellinek', url: 'https://www.jellinek.nl/en/alcohol-drugs-behavior/cannabis/stop-or-cut-back-on-cannabis/' },
  { id: 'c_uk', topic: 'cannabis', country: 'UK', name: 'FRANK', phone: '0300 123 6600', url: 'https://www.talktofrank.com/contact-frank' },
];
