# Souffle

Application mobile iOS et Android pour aider les adultes à arrêter ou réduire le tabac, le cannabis, ou les deux : bouton SOS envie, respiration guidée, sport à domicile sur 12 semaines, suivi des envies, économies, badges, gestion bienveillante des rechutes. Tout fonctionne hors ligne, les données restent sur le téléphone.

Stack : Expo SDK 58 (React Native 0.88, React 19), TypeScript strict, Expo Router, Zustand + AsyncStorage, Zod, React Hook Form, i18next (FR / NL / EN), Reanimated, expo-notifications, expo-haptics, expo-speech, expo-print, expo-sharing, expo-file-system.

> Souffle est un outil d'accompagnement comportemental, pas un dispositif médical.

---

## 1. Lancer le projet

Prérequis : Node.js 20 ou plus récent (testé avec Node 22.22) et npm.

```bash
npm install
npx expo start
```

Puis, dans le terminal Expo :

- `a` : émulateur Android (Android Studio installé)
- `i` : simulateur iOS (Mac avec Xcode)
- `w` : version web (pratique pour une démonstration rapide)

### Tester sur un téléphone

1. Installe **Expo Go** (App Store / Google Play). La version d'Expo Go doit correspondre au SDK 58.
2. Téléphone et ordinateur sur le même réseau Wi‑Fi.
3. `npx expo start`, puis scanne le QR code (appareil photo sur iPhone, application Expo Go sur Android).
4. Si le réseau bloque la connexion : `npx expo start --tunnel`.

Dans Expo Go, tout fonctionne (SOS, minuteurs, vibrations, synthèse vocale, PDF, partage, notifications **locales**). Pour tester dans les conditions finales, utilise un *development build* :

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
```

### Données de démonstration

Sur l'écran d'accueil : **Charger la démonstration** (profil fictif « Sam », 23 jours, envies, séances, sommeil, toux, badges). Un bandeau signale toujours le mode démo.
Depuis *Profil → Confidentialité et données* : **Réinitialiser la démonstration** ou **Quitter la démonstration**. Si un vrai profil existait, il est sauvegardé à part avant la démo et restauré intact à la sortie.

---

### Tabac, cannabis ou les deux

Au premier écran du profil, la personne choisit ce qu'elle fume :

- **Tabac** : cigarettes par jour, prix du paquet, test de Fagerström.
- **Cannabis** : joints par jour, grammes par joint, prix du gramme, joints roulés avec du tabac ou non, test CUDIT-R.
- **Les deux** : les deux séries de questions et les deux tests. Cigarettes et joints sont comptés ensemble pour la réduction ; chaque consommation notée précise « cigarette » ou « joint » et les économies utilisent le prix exact de chacun.

Tous les textes s'adaptent (« Sans cannabis depuis », « Noter un joint », « joints évités »…) grâce à des surcouches de traduction (`src/i18n/locales/overlays/<langue>.<cannabis|both>.json`) qui ne redéfinissent que les phrases concernées. La chronologie santé, les sources et les lignes d'aide suivent aussi la substance. Le choix se modifie à tout moment dans *Profil → Mes habitudes* ; les économies passées sont conservées.

---

## 2. Vérifications

```bash
npm run typecheck     # TypeScript strict
npm run lint          # ESLint (config Expo)
npm test              # Jest : 176 tests unitaires et d'intégration
npm run i18n:check    # toutes les clés utilisées existent en FR, NL et EN
npm run check         # les quatre à la suite
```

Tests de bout en bout (application web exportée, Chromium via Playwright) :

```bash
npm run export:web                    # génère dist/
cd e2e && npm install
node serve.js ../dist 8088 &          # petit serveur statique
CHROME_PATH=/chemin/vers/chrome node flow.js ./shots
CHROME_PATH=/chemin/vers/chrome node flow2.js ./shots
CHROME_PATH=/chemin/vers/chrome node flow3.js ./shots
```

`flow.js` (28 vérifications) : onboarding complet, Fagerström, compteur, économies, persistance après rechargement, SOS respiration (pause / reprise / fin), feedback, journal des envies, séance complète avec adaptation aux limitations, XP et badges, rechute, thème sombre, néerlandais et anglais, export JSON, PDF, suppression des données, mode démo.
`flow2.js` (16 vérifications) : objectif de réduction, mini-séance SOS 5 min, jeux de distraction, craving surf, coach, journal de victoires, sommeil, toux, défis, partage famille, test de souffle, import JSON, très grand texte + contraste élevé, bouclier sur une vraie série.

`flow3.js` (12 vérifications) : parcours cannabis complet (profil, CUDIT-R, économies en joints, chronologie du sevrage, lignes d'aide cannabis, joint noté), passage à « les deux » (choix cigarette / joint), textes adaptés en néerlandais et en anglais, persistance.

Les scénarios pilotent le temps avec une horloge simulée (minuteurs de 2, 3 et 5 minutes et séances de 10 minutes exécutés jusqu'au bout).

---

## 3. Builds Android et iOS (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure            # une seule fois, lie le projet à ton compte Expo

# Android
eas build -p android --profile preview      # APK installable directement (tests)
eas build -p android --profile production   # AAB pour le Play Store
eas submit -p android

# iOS (compte Apple Developer payant requis)
eas build -p ios --profile production
eas submit -p ios                           # vers TestFlight / App Store Connect
```

Builds locaux sans EAS : `npx expo run:android` (Android Studio + SDK) ou `npx expo run:ios` (Mac + Xcode). Les dossiers `android/` et `ios/` sont générés (Continuous Native Generation) : ne pas les modifier à la main, tout se configure dans `app.json`.

Identifiants : `com.souffle.app` (à changer avant publication si besoin). Nom, icône et textes se modifient dans `app.json`, `assets/images/` et `src/i18n/locales/`. Le nom affiché dans l'interface vient de `APP_NAME` (`src/utils/constants.ts`).

### Permissions

- Android : `VIBRATE`, notifications (Android 13+ : demandée au moment où l'utilisateur active les rappels). `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` sont explicitement bloquées : les rappels n'ont pas besoin d'une heure exacte.
- iOS : autorisation des notifications demandée seulement quand l'utilisateur les active.
- Aucune localisation, caméra, micro ou contacts.

---

## 4. Architecture

```
src/
  app/            routes Expo Router (onglets Accueil, Sport, SOS, Progrès, Profil + écrans)
  components/     ui/ (boutons, cartes, formulaires, minuteur…), dashboard/, sos/, workouts/, charts/
  hooks/          useCountdown (minuteur basé sur l'horloge), useNow, useRewards, useDashboard…
  store/          Zustand persistés (user, cravings, workouts, rewards, journal, settings)
  services/       storage, migration, data (export/import/suppression/démo), export (fichiers),
                  report (PDF), analytics, cravingPrediction, recommendation, coach, reward,
                  challenge, notification, audio, haptic, future/ (interfaces V2)
  data/           exercices, séances, programme 12 semaines, badges, jalons santé, démo
  utils/          calculs purs (compteur, économies, séries, Fagerström), dates, monnaie, validation
  i18n/           fr.json, nl.json, en.json (1 491 chaînes chacun) + overlays/ (textes cannabis et « les deux »)
  __tests__/      tests Jest
scripts/          i18nKeys.js (contrôle des traductions), buildLocale.py
e2e/              scénarios Playwright
```

Principes :

- **Calculs centralisés et purs** (`utils/calculations.ts`, `utils/streaks.ts`) : compteur, économies, réduction, séries, bouclier, gel. Le temps sans tabac est toujours recalculé à partir de dates ISO, jamais d'un compteur stocké.
- **Économies jamais perdues** : `savingsStartDate` est fixé une fois ; une rechute, une nouvelle date d'arrêt ou un passage en réduction ne l'effacent pas. Les habitudes déclarées sont versionnées (`habitsHistory`) : changer le prix du paquet n'affecte pas les économies passées.
- **Récompenses idempotentes** : chaque XP est lié à un identifiant d'événement unique (y compris les jalons santé, récompensés une seule fois) ; les badges ne sont jamais retirés.
- **Série, bouclier, pause** : le bouclier protège une cigarette d'aujourd'hui ou d'hier, une fois tous les 7 jours. La pause (maladie, voyage) dure 1 à 14 jours, une fois tous les 30 jours, et ne peut pas masquer une cigarette déjà notée.
- **Minuteurs exacts** : `useCountdown` calcule le temps restant à partir de l'horloge murale ; pause, arrière-plan ou ralentissement ne créent pas de dérive.
- **Stockage** : uniquement via `storageService` (clés centralisées, préfixe `souffle.`), schéma versionné (v2), migrations dans `migrationService` (testées).
- **Coach local** : règles explicites par mots-clés (FR / NL / EN), demande de précision s'il ne comprend pas. L'interface `CoachProvider` permet de brancher une IA distante plus tard.

### Contenus santé et sources (vérifiées en octobre 2026)

- Test de Fagerström : barème de Heatherton et al. (1991) ; interprétation selon les NIDA Common Data Elements (NIH), CDE 2195870 : 0–2 très faible, 3–4 faible, 5 moyenne, 6–7 forte, 8–10 très forte.
- Chronologie santé : OMS (*Health benefits of smoking cessation*) et NHS Wales 111 (*Quit smoking timeline*). Présentée comme repères généraux, variables selon les personnes, jamais mesurés par le téléphone.
- Lignes d'aide tabac : Tabacstop 0800 111 00 (Belgique, gratuit), Tabac Info Service 39 89 (France), Ikstopnu 0800-1995 (Pays-Bas), NHS Smokefree 0300 123 1044 (Royaume-Uni).
- Cannabis, test CUDIT-R : Adamson et al. 2010 (libre d'utilisation selon PhenX), version française validée CUDIT-R-Fr (Luquiens et al. 2021, formulation tutoyée dans l'appli), seuils 8 (consommation à risque) et 12 (trouble possible) ; https://www.phenxtoolkit.org/protocols/view/510310. Pas de version néerlandaise validée : la version NL de l'appli est une traduction, signalée comme telle.
- Cannabis, sevrage : Budney et al. 2003 (début jours 1 à 3, pic jours 2 à 6, la plupart des effets 4 à 14 jours), Bonnet & Preuss 2017 (jusqu'à 3 semaines), Royal Children's Hospital Melbourne (sommeil parfois perturbé plusieurs mois), Lee et al. 2014 (rêves et sommeil), Jellinek et Santé.fr (bénéfices décrits sans chiffres). Tabac dans les joints : FRANK (gouvernement britannique).
- Grammes par joint : seulement un repère affiché (0,32 g, Ridgeway & Kilmer 2016, données américaines), jamais appliqué automatiquement.
- Lignes d'aide cannabis : Infor-Drogues & Addictions 02 227 52 52 et De DrugLijn 078 15 10 20 (Belgique), Drogues Info Service 0 800 23 13 13 (France, gratuit, 8 h-2 h), Trimbos Drugs Infolijn 0900-1995 et Jellinek (Pays-Bas), FRANK 0300 123 6600 (Royaume-Uni, 24 h/24). Écran « Trouver de l'aide » avec appel direct.
- Aucune estimation personnalisée d'espérance de vie ou de capacité pulmonaire.

---

## 5. Confidentialité

- Aucune donnée ne quitte le téléphone, sauf si l'utilisateur partage lui-même un fichier (export JSON, PDF, récapitulatif famille).
- Pas de compte, de serveur, d'analytics ni de publicité. Les notifications et la synthèse vocale utilisent les services système.
- Export JSON complet, import validé (les éléments invalides sont ignorés et comptés), suppression totale après saisie du mot de confirmation (données, sauvegarde de démo, rappels programmés).
- Le stockage local ne suffit pas, seul, à affirmer une conformité RGPD : avant publication, prévoir une politique de confidentialité, le registre des traitements et les mentions des stores (« Data safety » / « App Privacy »).

---

## 6. Limites connues

| Sujet | État |
|---|---|
| Mode famille, défis partagés, forum, invitations | Nécessitent un serveur : interfaces préparées dans `services/future`, écran de présentation + partage volontaire d'un récapitulatif texte. Aucune fausse invitation. |
| Coach IA distant, synchronisation cloud, Premium, partenaires, dons | Non activés ; interfaces `CoachProvider`, `SyncProvider`, `PremiumProvider` prêtes. |
| Widget d'écran d'accueil | Non livré : nécessite des extensions natives (WidgetKit iOS en Swift, App Widget Android) et un development build, impossible à compiler et tester dans cet environnement. Équivalent fonctionnel : bouton SOS central dans la barre d'onglets et bouton SOS en tête de l'accueil. Piste : `expo-widgets` / `react-native-android-widget` + config plugin. |
| Guide vocal | Synthèse vocale du téléphone (hors ligne si une voix de la langue est installée) ; pas de fichiers audio enregistrés. Le texte reste toujours affiché. |
| Notifications | Locales, au mieux du système (peuvent être retardées). Non disponibles dans la version web. |
| Tests sur appareil | Les tests de bout en bout ont tourné sur la version web (React Native Web, Chromium). Aucun test n'a pu être fait sur un vrai téléphone ou un émulateur iOS / Android dans cet environnement : vibrations, notifications réelles, partage natif et génération PDF native restent à vérifier sur appareil. |
| expo-doctor | 18/20 contrôles OK ; les 2 restants exigent un accès réseau à l'API Expo, indisponible ici. À relancer en local : `npx expo-doctor`. |

### À vérifier sur un vrai téléphone (checklist)

1. Vibrations pendant la respiration (activer / désactiver).
2. Guide vocal dans les 3 langues.
3. Activer les notifications, accepter l'autorisation, vérifier un rappel de séance.
4. Mettre l'app en arrière-plan pendant la respiration, revenir : le temps restant doit être cohérent.
5. Rapport PDF : génération et feuille de partage.
6. Export JSON vers Fichiers / Drive, puis réimport.
7. Bouton retour Android dans les minuteurs et l'onboarding.
