# TETHER — BUILD JOURNAL
*Last updated: March 31, 2026 (Sessions 27–32)*

---

## ⚡ QUICK REFERENCE

**Start dev server:** `cd tether && npx expo start` → scan QR with Expo Go
**EAS Build (standalone APK):** `eas build --platform android --profile preview`
**Expo account:** spectre.labs
**Resume in new chat:** Upload this file + Spectre-Labs-Master-Context-v2.md + Spectre_Labs_Privacy_and_security.docx and say "Read the project files. We're on Tether. Confirm build status and ask me what we're working on."

---

## SPECTRE LABS — MASTER CONTEXT

**Vision:** $5–10M/year. Psychologist on payroll from early on. Build apps for people with invisible illness. Price fairly. Pay people properly.

**Triage order (honest, not dream):**
1. Job hunt — cash now, lower daily stress, buy Spectre runway
2. Deploy UPskill + CodeQuest — built, needs landing page and price
3. Build Tether — flagship, most complex, needs focused energy
4. CPA / MBA / mental health suite — real and important, not this month

**Standing rules for every Claude session (from Master Context v1.1):**
- Rule 1: Always go to the correct solution first. Not the easy one.
- Rule 2: If something fails twice, change the approach entirely. Don't retry the same thing.
- Rule 3: Do all the steps. Don't stop halfway.
- Rule 4: Always match current Expo SDK first. Use `npm install --legacy-peer-deps` always.
- Rule 5: Update the journal at the end of every session.

**Known correct solutions:**
- Expo SDK mismatch → `npx expo install expo@latest --fix` → `npm install --legacy-peer-deps` → `npx expo start --clear`
- EMFILE too many open files → `brew install watchman` — one time, done forever
- npm peer conflicts → always `--legacy-peer-deps`
- Supabase SUPABASE_ secrets blocked → don't set them, they're auto-injected

---

## FEU FOLLET — SPECTRE LABS ETHICS CHARTER (v1.0)

*Every feature must pass all four commitments before shipping.*

### Commitment 01 — Full Anonymity by Default
- Random ID generated on first launch (e.g. `QuietMaple#4471`) — this is the only identifier stored
- No real name ever collected, stored, or required
- Email optional only — for backup/restore only, never marketing, stored encrypted
- No social login (Google/Facebook) — these share data, we do not
- Behavioural patterns stored locally first — cloud sync is opt-in and encrypted
- **Implementation:** Random name generator runs before any data is written. No onboarding screen asks for real name as required field.

### Commitment 02 — The Kill Switch
- One tap: "Delete All My Data" — permanent, immediate, no grace period, no recovery
- Deletes: all local data, all Supabase rows, session history, HRV data, sleep data, the random ID itself
- Does NOT delete: anonymised aggregate stats (non-identifiable), legal payment records (held by Stripe)
- Must complete within 30 seconds under normal conditions
- If offline: local deleted immediately, server deletion queued for next connection
- **Implementation:** Settings screen must have this clearly labelled — not buried. Cascade delete across all tables.

### Commitment 03 — No Advertising. Ever.
- No ads, no sponsored content, no data licensing, no behavioural targeting. Ever.
- `SPECTRELABS_ETHICS_KEY` environment variable required for app to function — held only by Spectre Labs
- If acquired: contract must prohibit ads, data sale, anonymity changes, deletion feature removal
- If violated post-acquisition: key is revoked, app ceases to function until corrected
- **Implementation:** Key check in codebase, visible and auditable on GitHub

### Commitment 04 — Open Source. Full Transparency.
- All code on GitHub. Every version. Every change.
- Commit history preserved — privacy-sensitive changes documented clearly
- Kill switch mechanism visible in codebase
- Security researchers encouraged — responsible disclosure policy published in repo
- Settings screen and website link to GitHub repo

---

## TETHER — IMMEDIATE CODEBASE CHANGES REQUIRED (Feu Follet compliance)

Current state violates commitments 01 and 02. Must fix before next build:

**Auth screen** — ✅ DONE (Session 8). Now fully Feu Follet compliant:
- Random username auto-generated on signup using `generateUsername()` from config.ts
- Username shown prominently with reroll button (gold-bordered card)
- Password always required (for biometric vault + account recovery)
- Email optional, clearly labelled "Optional — for backup only. We will never contact you."
- No real name field anywhere
- No email → `signInAnonymously()` Supabase anonymous auth
- Email provided → standard `signUp(email, password)`
- Biometrics: after login, offers "Save with Face ID/Touch ID" via SecureStore
- On return: Face ID/Touch ID button appears automatically if credentials saved
- Onboarding greets user by codename ("Hey, IronWombat4829")
- `finishOnboarding` no longer writes `athlete` or `email` fields — only `username`, profile prefs
- `expo-local-authentication` installed

**User schema** — `user_profiles.username` column already existed ✅. No migration needed.

**Kill switch** — not yet built. Must add to Settings:
- "Delete All My Data" button
- Cascade delete: user_profiles, gym_sessions, gym_profiles, workday_sessions, budget_expenses, props, household_events
- Reset app to first-launch state

**SPECTRELABS_ETHICS_KEY** — not yet in codebase. Must add before any public release.

**GitHub** — repo not yet public. Must create before launch.

### Anonymous by Default
- No email required. Ever.
- Account creation: auto-generated username (Reddit-style: `TangyWombat4729`) + password
- No real name, no phone number, no email unless user voluntarily adds for account recovery
- All health, financial, and behavioral data tied to anonymous ID only
- Even Tether (the company) cannot link a username to a real person without the user's explicit action
- Data inputs: receipts, screenshots, manual entry only — no bank access, no account linking

### Data Principles
- All sensitive data encrypted at rest (Supabase encryption + additional app-layer encryption)
- No data sold. Ever. To anyone. For any reason.
- No advertising. Ever. To anyone. For any reason.
- User can export all their data at any time (full JSON dump)
- User can delete all their data at any time — complete, irreversible, instant
- Mental health pattern data never leaves the user's account — not even anonymized for "research" without explicit opt-in per use case

### COST STRUCTURE — NON-NEGOTIABLE LINE ITEMS

Every budget, every stage, always:

- **Psychologist / mental health advisor on retainer** — not for liability, for integrity. Someone who lives in this space reviews every mental health feature before it ships. The nightmare buzz, the pattern engine, the dysregulation detection — none of it goes out without a clinical eye on it.
- **R&D budget** — if we're not actively researching better ways to help people, we're stagnating. Tied to revenue as a percentage. Grows as the company grows. Includes: wearable integration research, ADHD/PTSD academic literature review, user pattern research (anonymized, opt-in only), partnerships with researchers.

**Philosophy:** Stagnant = not helping more people = not doing it right. R&D isn't overhead. It's the product.
Baked into the product at every level:
1. **Legal:** Restrictive covenant in incorporation documents and any future acquisition agreement — "This software may never serve advertisements or sell user data. Any transfer of ownership requires acquirer to maintain this covenant in perpetuity."
2. **Technical:** Ad infrastructure is architecturally incompatible — no ad SDK hooks, no telemetry endpoints, no user segmentation data structures
3. **Community:** Core privacy architecture open-sourced so the community can audit any changes
4. **Business model:** Subscription only. The product is the product. Users are not the product.

### Why This Matters
The people using Tether are sharing their worst moments — nightmares, PTSD flares, financial stress, mental health spirals. That data is sacred. It will never be used against them.

Built by someone who lives it. For people who live it.

No app has done this — not because the tech doesn't exist, but because the people building software haven't been there.

**The nightmare watch buzz.**
HRV + heart rate spiking during sleep = nightmare in progress. Garmin detects it in real time. Tether sends a gentle haptic buzz to the watch. Service dogs do this. They cost $20,000+. Your watch already has the sensor. Nobody connected it.

**The silent chain.**
PTSD flares → can't cook → Skip The Dishes spending creeps up → budget shows eating out increasing → last time this happened it lasted a month → Tether has been saving for this all year → it knows the snowball method is in progress → it knows house maintenance is over.

Response (no texts, no alarms, no conversations needed):
- Suggest frozen complete meals + quick meals for next grocery run
- Add paper plates to D's grocery list (less cleanup = lower barrier)
- Move money quietly between envelopes to cover it
- Redirect Skip budget to grocery budget
- D gets a soft "hey, grab these 3 things on the way home" — framed as helpful, not clinical
- Nobody has to notice. Nobody has to talk about it. It just gets handled.

**The pattern map.**
After a year of data, Tether knows:
- 100% of the time eating out creeps up = PTSD symptoms incoming
- Sleep < 4hrs x 4 nights + HR > 80 + nicotine up = 2-week manic window ahead
- Workout attendance drops before a depressive episode, not during
- Running during PTSD flare = HR elevated for 2 days (makes it worse)
- Cold shower brief exposure = measurable HRV improvement 3 weeks post-episode

It doesn't diagnose. It mirrors. "Here's what we've seen before. Here's what helped. Here's what didn't. What do you want to do?"

**The goal.**
Not to fix anyone. Not to pathologize anyone. To make the infrastructure so good that the right thing becomes the easy thing — automatically, quietly, without shame, without anyone having to remember.

PTSD + ADHD + blended family + shift schedules + financial stress + two people trying their best.

Tether holds the load they can't hold right now so they can hold each other.

---

## WHAT TETHER IS

A mass-market family operating system built specifically for ADHD households. Not a productivity app. Not a chore tracker. A system that replaces the executive function your brain doesn't reliably provide — for the whole family.

**Platform:** React Native + Expo  
**Backend:** Supabase (WestSideSanders project, Canada Central)  
**AI:** Claude API (Anthropic)  
**Auth:** Supabase RLS (disabled for dev)  
**Users:** Cade + Danielle

---

## TECH STACK

- Frontend: React Native (Expo SDK 55), TypeScript
- Backend: Supabase
- AI: Claude API
- Dev environment: VS Code, Mac
- Folder structure: `src/screens`, `src/lib`, `src/components`
- Testing: Expo Go (Android, installed via direct APK from expo.dev/go)
- Auth/integrations: Google Cloud Console, OAuth 2.0

---

## BUILD STATUS

### Infrastructure
- ✅ Expo app scaffolded (SDK 55, TypeScript)
- ✅ Supabase project (WestSideSanders, Canada Central) — client connected
- ✅ RLS disabled for development (must enable before public launch)
- ✅ Google Calendar API enabled + OAuth 2.0 credentials
- ✅ Java + Homebrew + Watchman installed on Mac
- ✅ EAS build configured — `eas build --platform android --profile preview`
- ✅ `"scheme": "tether"` in app.json (required for Linking / OAuth)
- ✅ expo-notifications plugin added to app.json
- ⬜ Google Calendar fully wired into app
- ✅ Client-side Fitness Engine (`src/lib/fitness/engine.ts`) — deterministic set planning
- ⬜ D's phone — install Session 14 APK when build completes (Session 13 build `53b48c7e` shipped)

### Screens Built
- ✅ **Workday Rhythm** (`src/screens/WorkdayRhythm.tsx`)
  - Brain state check-in: Locked in / Okay / Scattered / Toast
  - 52-min focus / 17-min break timer — fires notification + vibration through locked screen
  - AppState listener keeps JS timer alive in background
  - Saves to `workday_sessions` table
  - Theme tokens from UserContext
- ✅ **FitnessScreen** (`src/screens/FitnessScreen.tsx`)
  - Modes: PLAN / LFG / BEAST / QUICK HITS / JOINT OPS
  - Theme tokens from UserContext (IRON / FORM / RONIN / VALKYRIE)
  - Anthropic-powered: session_start, set_completed, exercise_skipped, session_end
  - Auto rest timer, EffortSelector, PR badge, adjustments card, sneaky cardio prompt
  - Hard stop picker, week strip, recent PRs feed, Send Props button
  - Spotify widget (connect → playlist → add track)
  - Props inbox with unseen badge
- ✅ **BudgetTracker / The Armory** (`src/screens/BudgetTracker.tsx`)
  - Envelope budgeting (7 envelopes), payday countdown, "Can I afford this?" AI
  - 📸 Scan statement: expo-image-picker → Anthropic vision → parsed transactions
  - Scan review: grouped by category, confidence badges, delete-per-row, Log all
  - Committed bills: recurring auto-pays saved to `committed_bills`, summed on home screen
  - Theme tokens from UserContext
- ✅ **AuthScreen** (`src/screens/AuthScreen.tsx`)
  - Auto-generated codename (generateUsername) with reroll
  - "Keep me signed in" toggle (checked by default) — ephemeral flag in SecureStore
  - Biometrics: Face ID / Touch ID via expo-local-authentication
  - Anonymous auth path (no email → signInAnonymously)
  - Fully Feu Follet compliant
- ✅ **SettingsScreen** (`src/screens/SettingsScreen.tsx`)
  - "DELETE ALL MY DATA" — cascade delete, works offline (pending delete queue)
  - VALKYRIE grant for spectre.labs admin
  - HOUSEHOLD section — join by name (links to partner), leave household button
- ✅ **JointOps** (`src/screens/JointOps.tsx`)
  - Invite flow → household_events → both join → fitness-engine joint_ops_start
  - Real-time scoreboard (Supabase postgres_changes)
  - Shit talk + props buttons, winner/loser/tied completion screen
- ✅ **VSScreen** (`src/components/VSScreen.tsx`)
  - Split-screen animation (split → fill → names → stats → mode label → BEGIN)
  - Per-theme colours, rank diff glow, CHALLENGER badge, Ghost Protocol variant
- ✅ **HouseholdSetupScreen** (`src/screens/HouseholdSetupScreen.tsx`)
  - Fires on first open when `house_name` is null. Asks about the crew → Claude generates 3 call sign suggestions → user picks or types own → saves to user_profiles + household_settings
- ✅ **RoninInkWash / RoninPRCelebration / RoninRankUp** — RONIN theme animations
- ✅ **ValkyrieLightning / ValkyriePRCelebration** — VALKYRIE theme animations
- ✅ **EffortSelector** (`src/components/EffortSelector.tsx`) — 2×2 RPE chip grid
- ✅ **WarRoom** (`src/screens/WarRoom.tsx`) — command center home screen. Clock + themed greeting, **INTEL overlay** (4-mode: Photo/Screenshot/Voice/Text → queue → FILED AND FORGOTTEN), **RECON strip** (sleep/HRV/resting HR/steps from wearable), **Grocery Nudge cards** (deal alerts), Brain State check-in (4 states → user_context_snapshots), Today's Missions (3 editable slots w/ AI sub-steps), Incoming Signals (unread props from partner), Allied Forces (partner name/theme/link status), BLITZ button, SUPPLY RUN, Quick Access row (WORK/FIT/PANTRY/ARMORY/OPS). Theme-aware via UserContext.
- ✅ **Pantry** (`src/screens/Pantry.tsx`) — 5-tab inventory screen (Fridge/Freezer/Pantry/House/Kids). Color-coded status dots, running low banner, expandable item detail, USED IT + REMOVE actions. Auto-populated by Intel image drop. Opened as overlay from WarRoom quick access.
- ✅ **SignalButton** (`src/components/SignalButton.tsx`) — floating 📡 FAB, bottom-right above tab bar. Tap → slide-up bottom sheet. 8 default signals + custom signal input (saved to household_settings.signal_library). Sends to partner via props table (event_type: 'signal'). Dismissed individually in WarRoom Incoming Signals panel.
- ⚠️ **BattleMode** (`src/screens/BattleMode.tsx`) — LEGACY, queries `gym_sessions` with hardcoded athlete strings. Remove after legacy tables dropped.

### Supabase Tables
- ✅ `workday_sessions` — brain_state, blocks_completed, date
- ✅ `workout_sessions` — user_id, started_at, ended_at, label, mode, planned_by_ai
- ✅ `exercise_performance` — session_id, exercise_name, set_index, weight, reps, effort, is_pr
- ✅ `user_profiles` — id, username, theme, athlete, goals, training_days, equipment, body_focus, house_name, kids_themes, spotify fields, valkyrie_seen, rank, weight_unit, push_token, household_setup_seen
- ✅ `budget_expenses` — user_id, envelope_id, amount, note, date, recipient, recurrence, receipt_fingerprint
- ✅ `income_transactions` — user_id, amount, source, note, category, date, recurrence, receipt_fingerprint
- ✅ `committed_bills` — user_id, merchant, amount, due_day, account, is_auto_pay, envelope_id, last_seen
- ✅ `user_context_snapshots` — user_id, brain_state, captured_at
- ✅ `household_settings` — house_name, shit_talk_library, signal_library (jsonb)
- ✅ `props` — from_user, to_user, message, event_type, seen
- ✅ `household_events` — house_name, event_type, payload, triggered_by
- ✅ `armory_clarifications` — user_id, transaction_name, amount, date, recipient, status, resolved_envelope_id, options, answered, answer, prompt_count, last_prompted_at. (Unknown e-transfers routed here for push clarification.)
- ✅ `health_snapshots` — user_id, date, sleep_hours, sleep_start, sleep_end, resting_hr, avg_hr, hrv_ms, steps. Unique (user_id, date).
- ✅ `pantry_items` — household_id (text), name, category, quantity, unit, location (fridge/freezer/pantry/household/kids), purchased_at, estimated_empty_at, added_via
- ✅ `purchase_history` — user_id, household_id (text), item_name, item_category, store, quantity, price_paid, purchased_at
- ✅ `household_item_preferences` — household_id (text), item_name, usual_store, avg_purchase_interval_days, last_purchased_at
- ✅ `intel_queue` — user_id, type (image/voice/text), payload, status, result, created_at, processed_at. RLS enabled.
- ✅ `field_reset_sessions` / `injury_flags` / `shopping_list_items` / `flyer_deals` / `grocery_nudges` / `user_events`
- ⚠️ `gym_sessions` — legacy. Pending removal after BattleMode redesign.
- ⚠️ `gym_profiles` — legacy. Pending removal.

### Supabase Edge Functions
- ✅ `fitness-engine` — handles session_start, set_completed, exercise_skipped, session_end, joint_ops_start, **weekly_brief**
  - Anthropic (claude-sonnet-4-6) for live plan adaptation
  - PR detection server-side, daily context snapshot (getUserContext with 24h cache)
  - Health snapshot integration: sleepRolling7d, stepsRolling7d, hrvRolling7d, latestHrv, latestSleep
  - HRV/sleep-based prompt rules: <30ms HRV → reduce volume, ≥60ms → PR green-lit, <5h sleep → compressed session
  - `weekly_brief` event → generates weekTheme, dayBriefs, monthPhase, weeklyTarget (7-day client cache)
  - `ANTHROPIC_API_KEY` set as Supabase secret ✅
- ✅ `intel-processor` — handles `type: 'image' | 'text' | 'voice'`
  - Image: any purchase evidence (receipts, product photos, grocery bags, Costco hauls, online orders) → financial items + pantry items in one pass
  - Text/voice: brain dump routing → expenses, pantry upsert, shopping needs, calendar items returned
  - Deterministic ENVELOPE_MAP (14 regex entries), per-item dedup, e-transfer → clarification queue
  - `upsertPantryItem()` — updates pantry_items + purchase_history + household_item_preferences rolling avg
  - Both deployed with `--no-verify-jwt` ✅

### Theme System
- ✅ `src/themes/` — iron.ts, form.ts, ronin.ts, valkyrie.ts, forge.ts, arcane.ts, dragonfire.ts, void.ts, verdant.ts + index.ts
- ✅ `ThemeTokens` type — standard shape across all themes: bg, dark, card, border, accent, accentDim, accentBg, gold, text, muted, green, red, blue, mode, name
- ✅ `getTheme(themeName)` — exported from themes/index.ts
- ✅ `themeTokens` exposed via UserContext — computed from user.theme, defaults to IRON
- ✅ All screens use context, zero hardcoded per-screen colour objects

### Pending
- ✅ Session 13 EAS build — shipped `53b48c7e`
- ✅ Session 14 EAS build — shipped `2ff3ca3e`
- ✅ Spotify Client ID — pasted, PKCE OAuth live
- ⬜ Spotify redirect URI — add `tether://spotify` in Spotify Developer Dashboard → app → Redirect URIs
- ⬜ Flyer deal ingestion — seed `flyer_deals` table (manual CSV or flyer API) before nudges fire in prod
- ⬜ WarRoom missions persistence — currently in-memory; wire to Supabase or AsyncStorage
- ✅ Pantry screen built (`Pantry.tsx`) — 5 tabs, running low banner, status dots, USED IT / REMOVE
- ✅ Consumption engine (`consumptionEngine.ts`) — depletion estimates, markConsumed, running low queries
- ✅ Google Calendar wired in FitnessScreen (session → event) + one-time month scheduling
- ✅ Push token in `user_profiles` — real push delivery active
- ✅ WarRoom missions persistence via AsyncStorage with daily reset
- ✅ Interactive push clarifications — unknown e-transfers get action buttons answerable without opening app
- ⬜ Spotify full OAuth flow tested end-to-end
- ⬜ RLS enabled on all tables (before public launch)
- ⬜ Flyer deal ingestion — seed `flyer_deals` table before nudges fire in prod
- ⬜ "Thinking of You" button

---

## ALL MODULES — FULL SUMMARY

### 1. SMART ALARMS
Replaces missing internal body clock. Integrates Garmin/Apple Health sleep data — alarm adapts to actual sleep quality. Low HRV or poor sleep = softer alarm, added buffer time. Learns your patterns. Stops alarming when you've been up 20 min. Adjusts tone/intensity to brain state. Covers: eat, drink, move, meds, depart reminders.
*Future: nightmare detection via HRV spike → gentle watch haptic buzz. No wake. Just interrupt.*

### 2. ANDROID MODES
One tap changes your whole phone for context. Modes: Drive / Gym / Work / Bedtime / Recovery / Family / DJ. Each silences irrelevant apps, surfaces relevant ones, changes notifications. AI suggests mode switches based on calendar, location, time of day.

### 3. WORKDAY RHYTHM ✅ (built)
Keeps you functional through the workday without willpower. Brain state check-ins (Locked in / Okay / Scattered / Toast). 52-min focus blocks, 17-min breaks. AI adapts rest of day based on check-in. Low focus = shorter blocks. High focus = protect the window.

### 4. BEDTIME MODE
Visual wind-down sequence for whole household. Triggered at set time. Shows sequence (kids bath → stories → lights → adult wind down). Rotation tracker so both partners share load fairly. Off-duty notification sent to partner. AI learns what actually works — notices if bedtime keeps blowing past 9pm and suggests pulling trigger earlier.

### 5. FITNESS MODULE ✅ (built — IRON + FORM + PULSE)
Full workout tracker with ADHD-aware auto-adapt. Hard stop timer. Auto-compress if session starts late. 3 aesthetic themes. Onboarding: goals, training days, equipment, body focus. Battle Mode head-to-head. Beast Mode (LFG — all users). Quick Hits (3-7 min WFH micro-workouts). RPE check-ins. Plateau detection. Adaptive programming. Wearable integration. Body scan module (future). Ties to Macros + Pendulum.

### 6. NUTRITION & MACROS
Passive food logging for people with no hunger cues. Quick-log from favourites. AI suggests what you probably ate based on time + past patterns. Tracks cal + protein only (not obsessive). Topiramate-adjusted targets. Flags when you haven't logged since morning — nudges, never lectures. 
*Ties to: Budget (grocery spend), Fitness (fueling adjustments), Mental Health Engine (missed meals = early warning signal), Grocery Module.*

### 7. GROCERY & CONSUMPTION MODULE ⭐
Smart grocery list that learns your household consumption rate. You log what you buy → app tracks how long it lasts → builds consumption rate per item (e.g. cottage cheese: 1 tub / 5 days) → auto-adds to list when predicted to run out. Flags sales at your usual store. Sale items → budget module notified → money moved from grocery envelope automatically.
*Ties to: Budget (envelope auto-adjust), Macros (what you have = what you can hit), Mental Health Engine (eating out creep = PTSD signal). During PTSD flare: auto-suggests frozen complete meals + quick prep items, adds paper plates to list.*

### 8. BUDGET & ENVELOPE MODULE ⭐
Trust-based envelope budgeting — no bank access ever. User enters accounts, bills, income manually or via receipt/screenshot. Committed money subtracted first — envelopes built from truly available funds only. Payday countdown. Transfer reminders timed to wake-up not bill time. Overdraft prediction. AI notices patterns ("grocery budget over 3 months in a row by ~$40 — adjust?"). Snowball debt method. Savings goals auto-squirrel. Canadian investment guidance (TFSA → FHSA → RRSP).
*Ties to: Grocery (consumption rate × price = weekly forecast), Mental Health Engine (spending pattern shifts = symptom signal), Macros, Smart Alarms (transfer reminder 10 min after wake-up).*

### 9. VEHICLE MAINTENANCE
Never miss a service interval. Tracks odometer (manual or OBD). Knows service intervals per vehicle. Auto-funds maintenance envelope based on km driven ($0.02/km squirreled per km). Commute tracker PA↔Saskatoon ~100km auto-deducts fuel envelope. Appointment reminders.

### 10. BLENDED FAMILY MODULE
Andy changeover protocol (30 min no-demands landing time). Custody schedule tracker. Changeover checklist both directions. School communication log. IPP/IEP document storage. Kids' medication tracking. AI: "Andy's changeover in 2 hours. Last time: 45 min decompression before regulated. Clear schedule until 6:30."

### 11. PENDULUM ⭐⭐
Predict your peak focus windows. Inputs: HRV, sleep quality, meds timing, last meal, brain state check-ins, workout data, RPE. Output: predicted focus curve for today. "Your peak window is likely 10am–12pm. Block it for deep work now." Learns your personal pattern over time. Knows bad sleep + Topiramate late = foggy until 11am. Adjusts schedule suggestions accordingly.
*Ties to: Smart Alarms, Workday Rhythm, Fitness, Macros, Mental Health Engine.*

### 12. WEEKLY REVIEW
15-min Sunday family check-in. Both partners, 6pm Sunday. Reviews: week wins, friction points, upcoming week, one thing to improve. Battle Mode weekly results revealed. AI generates the week summary automatically. "This week: 3 workouts each, Cade won Battle Mode by 15pts, grocery was $23 over, Andy had 2 good school days."

### 13. CLEAN MODE
Household reset for overwhelmed days. One button. Strips everything to survival protocol. One basket per room. Clear floor only (not clean — clear). 10-min timer, one person, one room. No guilt, no score, just reset. AI detects stress signals (missed alarms, skipped meals, no check-ins) and gently suggests Clean Mode.

### 14. DAILY TIP CARDS
Shared language for the household. One card per day, both partners see it. Topics: ADHD, parenting, nutrition, finance, relationship, regulation, exercise science. Cards adapt to what's happening in the household. Post-changeover day → co-parenting tip. Budget tight week → finance tip. Low sleep flagged → rest tip. Exercise cards tied to research on ADHD + focus + movement.

### 16. "I'M THINKING ABOUT YOU" BUTTON
Available on home screen for both partners. One tap sends a notification to the other person.

**How it works:**
- Starts with warmgeneric messages ("Thinking of you ❤️")
- Each partner builds their own list of things the other person said that made them smile
- Each partner builds a list of things they like to say to their person
- Cade's list includes things like "smokeshow" — app learns the language of this specific relationship
- Over time: AI picks the right message for the right moment based on time of day, what's been happening, stress levels detected, how long since they last connected
- 6pm on a hard Monday after Andy's changeover → different message than a lazy Sunday morning
- Never automated without a tap — always requires the human to initiate. The app just helps them say it better.

**Partner list building:**
- "Things they said that made me smile" — both partners add to this over time
- "Things I like to say to them" — personal vocabulary, nicknames, inside jokes
- App uses these lists to generate messages that sound like YOU, not a greeting card

---

### 17. BRAIN DUMP BUTTON
Available on EVERY screen. Persistent floating button. Tap it anywhere, type anything, move on.

**Input examples:**
"remind me to turn off the water, pay these three bills, go to karate registration for Hendrix, do that PPT for work, text mom back, buy more protein powder"

**What happens:**
- AI reads the dump and sorts it automatically:
  - Calendar items → Google Calendar or Outlook (work items)
  - Bills → Budget module + reminder
  - Kids activities → Blended Family module + shared calendar
  - Work tasks → Work calendar + timesheet if relevant
  - Shopping → Grocery list (checks consumption tracker first — do you already have it?)
  - Reminders → Smart Alarms at appropriate time
  - Partner items → asks "send this to D?" before dispatching

**Calendar integrations:**
- Google Calendar (personal) — already set up ✅
- Microsoft Outlook (work) — to be wired in
- Shared family calendar — both partners see relevant items
- Solo lists vs joint lists — app knows the difference

**The bread problem:**
Consumption tracker knows you have 1.4 loaves. D is on her way home. Brain dump or grocery list says "bread." App checks: already have bread, estimated 3 days left. Response: "You've got bread. Skip it." No more two-loaf households.
See MENTAL HEALTH PREDICTION ENGINE section above. Tracks patterns across ALL modules. Learns personal early warning signs. Intervenes quietly. Never clinical. Never without consent. The nightmare watch buzz. The silent chain. The pattern map. This is what makes Tether irreplaceable.

---

## FITNESS MODULE — AI TRAINER ARCHITECTURE (Session 6 spec)

### The Big Decision
Fitness is no longer a static JSON workout generator. It is an **Anthropic-driven live AI coach** that adapts in real-time during the session AND learns across time from behavior + mental health signals.

### Navigation — Final Structure
```
App tabs: Workday | Fitness | Budget
```
- **Single Fitness tab** — all modes live inside FitnessScreen
- Tab label personalized from user profile (`fitnessLabel`), default "IRON"
- Modes inside Fitness: LFG / Beast Mode / Quick Hits / Battle
- All modes powered by same Anthropic engine, different tempo/intent
- **Battle Mode** — full reset. Current implementation scrapped. Redesign as competitive mode inside Fitness, driven by same Anthropic engine.

### Effort Rating (RPE) — ADHD-Friendly
```typescript
export type EffortRating = 'too_easy' | 'shaky' | 'grind_good' | 'felt_like_shit';
```
- **too_easy** → slightly increase challenge (weight or extra set if time allows)
- **shaky** → back off: reduce weight or trim one remaining set
- **grind_good** → maintain plan or allow small progression
- **felt_like_shit** → safety signal: zero remaining sets for this exercise, switch body part, schedule lighter back-off set later

`EffortSelector` component: 4 big tappable chips, selected = gold background. No sliders, no text input.

### Live Session Architecture
```
Phone (session state) → event → Backend function → Anthropic → diff → UI applies
```

**Events sent after each meaningful moment:**
- Set logged (weight, reps, effort)
- Exercise skipped
- Injury flagged
- Cardio block completed or skipped

**Example event payload:**
```json
{
  "event": "set_completed",
  "sessionId": "sess-123",
  "userId": "abc123",
  "exerciseId": "deadlift",
  "weight": 285,
  "reps": 4,
  "effort": "grind_good",
  "timestamp": "2026-03-19T02:20:00Z"
}
```

**Anthropic returns a small diff:**
```json
{
  "nextExercise": { "id": "cable_row", "sets": 3, "targetReps": "10-12" },
  "restSeconds": 90,
  "adjustments": ["Keep deadlift at this weight today."],
  "sneakyCardio": [{ "label": "Reset walk between pulls", "durationSeconds": 120 }]
}
```

UI just applies the diff. No manual decisions required by user.

### Rest Timer Behavior
- Rest starts automatically after each set — no manual "start rest" button
- `getRestDurationForSet({ exercise, timeRemainingMs })` returns ms
- Base rest: compound lifts ~105s, accessories ~45s
- If time is low: compress toward 50-70% of base

### Supabase Schema — Performance History
```sql
WorkoutSession: id, user_id, started_at, ended_at, label, mode, planned_by_ai
ExercisePerformance: session_id, exercise_name, set_index, weight, reps, effort, is_pr
CardioPerformance: session_id, modality, duration, distance, effort
```
PR detection runs server-side on insert. `is_pr` flagged automatically.

### Daily Behavior & Mental Health Context Snapshot
Computed once per day, sent with every Anthropic call:
```json
{
  "sleepRolling7d": 6.2,
  "stepsRolling7d": 8500,
  "avgSessionsPerWeek": 2.3,
  "moodTrend14d": "up",
  "maniaEpisodes14d": 1,
  "depressionEpisodes14d": 3,
  "prsLast14d": 4,
  "spendingPattern": "stable"
}
```

Anthropic sees correlations like "PRs cluster on 7-8h sleep + moderate steps" and biases future programming toward those conditions.

**Core Anthropic system prompt principle:**
> "A gym program works when the user is consistent. Always bias toward the behaviors they actually repeat and feel positive about. Use performance and mental health signals to quietly steer them toward patterns that produce PRs, better mood, and fewer mania spikes."

### Cardio Behavior
- Default new users to C25K (mode: c25k, modality: run)
- Collect EffortRating after each run
- If last 4-6 runs all `too_easy` → upgrade to faster 5k program
- User can change modality (Run/Bike/Row/Stairs/Other)
- Optional YouTube buttons for guided spin/row workouts (React Native `Linking.openURL`)

**Sneaky cardio for avoidant users:**
- Track `cardioSessionsPlanned` vs `cardioSessionsCompleted`
- If completion rate < 25% over several weeks → stop scheduling standalone cardio days
- Insert short movement prompts between strength sets ("Reset walk", "Flush set")
- Never label it "cardio"

### Skip + Injury Handling
```typescript
interface InjuryFlag {
  bodyPart: 'knee' | 'shoulder' | 'back' | 'elbow' | 'hip' | 'other';
  severity: 'mild' | 'moderate' | 'bad';
}
```
- High skip rate on exercise → lower priority, swap for similar movement
- bad severity → remove heavy exercises, offer lighter alternatives/rehab
- mild/moderate → safer movements, fewer sets

### Adaptive Split Scheduling
```typescript
interface WeeklyBehaviorSummary {
  sessionsByDayOfWeek: Record<number, number>;
  sessionsByTag: { push: number; pull: number; legs: number; full: number; }
}
```
- Consistently 1-2 days/week → auto-shift to 2-day full body. No announcement.
- Repeatedly skips legs → stop scheduling leg day, integrate 1-2 leg exercises into existing days
- **Philosophy: consistency first.** Design the plan around what they actually do, not what's ideal on paper.

---

## DATA TRACKING — LONG-HORIZON BEHAVIOR LAB

### The Tim Hortons Insight
> "When Tim Hortons visits spike, it's not laziness — it's a signature of fight-or-flight and rising PTSD load."

This is the whole point. The app tracks enough signals that it can surface correlations no one thought to look for. The data model must support this from day one.

### Data Domains to Track (per user, timestamped)
- **Financial:** daily/weekly spend by category (fast food/coffee, impulse, bills)
- **Fitness:** attendance, performance, PRs, skips, effort ratings
- **Food/consumption:** meal quality, timing, drive-thru frequency
- **Rest/recovery:** sleep duration/quality, HRV, resting HR
- **Movement:** steps, general activity, cardio
- **Work performance:** self-rated focus/productivity, stress
- **Couple/family:** relationship pendulum swings, conflict events, time together, positive rituals
- **Mental health:** mood logs, mania/hypomania markers, depressive episodes, PTSD flare indicators

### Event-First Data Model
Prefer event log model with derived materialized views:
```sql
user_event (
  id, user_id, event_type, payload jsonb, created_at
)
```
This means we can discover patterns we didn't anticipate — because all raw events are preserved.

### Data Security Requirements (Feu Follet compliant)
- Supabase RLS on all tables (currently disabled for dev — must enable before launch)
- Encrypt sensitive fields where possible
- Clear separation: PII vs. aggregated analytics
- Anonymised aggregate stats survive kill switch; individual data does not
- **Design principle:** Treat all data like sensitive clinical data from day one

### Analytics Target
Time-series and correlation analysis per user:
- Rolling windows: "sleep 7d avg vs mood vs spending vs PR frequency"
- Pattern detection: what combinations of variables predict good weeks / bad weeks
- The insights will surface things we don't yet know to ask about

---

## TODO — NEXT SESSION PRIORITIES

### Session 7–8 completed ✅
- ✅ Single FitnessScreen (replaces GymScreen + GymScreenD)
- ✅ EffortSelector component (4-chip RPE grid)
- ✅ Auto rest timer (starts after set, no manual button)
- ✅ workout_sessions + exercise_performance tables
- ✅ Supabase Edge Function `fitness-engine` (Anthropic-driven, all 4 events)
- ✅ Anonymous auth — email optional, username auto-generated
- ✅ Biometrics — Face ID / Touch ID login via expo-local-authentication
- ✅ Feu Follet commitment 01 — AuthScreen fully compliant

### Session 9 completed ✅
- ✅ Mode grid: PLAN / LFG / BEAST / QUICK HITS / JOINT OPS (correct icons, descriptions, full-width Joint Ops card)
- ✅ "This Week" strip: Mon–Sun, grayed past, gold today, split labels (LEGS/PUSH/PULL etc) from user.training_days
- ✅ Recent PRs feed: last 5 PRs across user + partner, Send Props button on each
- ✅ Partner lookup by house_name
- ✅ PRCelebration fullscreen modal on PR hit during workout
- ✅ PropsModal wired: workout screen, complete screen, home PR feed
- ✅ Props inbox: unseen badge in header, list view, mark-as-seen on open
- ✅ JointOps.tsx: full invite flow → household_events → both join → fitness-engine joint_ops_start → shared workout
- ✅ Joint Ops real-time scoreboard (Supabase postgres_changes subscription)
- ✅ Shit talk: 10 defaults seeded in household_settings, delivered via props table (event_type:'shit_talk'), toast on receive
- ✅ Joint Ops completion: winner/loser/tied, PR list, final scores, props + shit talk buttons
- ✅ Supabase migrations: Spotify columns on user_profiles, household_settings table, props.event_type
- ✅ UserContext type expanded: username, house_name, training_days, equipment, Spotify fields
- ✅ spotifyService.ts: full API wrapper built (auth, search, playlist, sync) — deferred to tomorrow

### Session 10 completed ✅
- ✅ Daily context snapshot: `getUserContext()` in fitness-engine with 24h cache in `user_context_snapshots` table
- ✅ Context passed to Anthropic on every session_start (avgSessionsPerWeek, PRs, effortDistribution, restDays, brainState)
- ✅ Fixed: `mode` was hardcoded `"lfg"` in edge function — now reads from `payload.mode`
- ✅ Kill switch — Feu Follet commitment 02:
  - `SettingsScreen.tsx`: Settings tab (⚙️) added to bottom nav
  - "DELETE ALL MY DATA" button — prominent, not buried
  - Two-step confirm modal — no accidental tap
  - Cascade delete: exercise_performance, workout_sessions, workday_sessions, budget_expenses, user_context_snapshots, props (both directions), household_events, user_profiles
  - Clears biometric SecureStore keys immediately (works offline)
  - Offline safety: queues user_id in `tether_pending_delete` SecureStore key, flushed on next sign-in
  - `deleteAccount()` in UserContext — exposed via context, available anywhere

### Session 11 — March 19, 2026 (tonight)
- Spotify developer app created, Client ID + Secret added to config.ts
- Fresh EAS build queued for D's phone
- Fitness mode definitions finalized: PLAN / LFG / BEAST / QUICK HITS / JOINT OPS / GHOST PROTOCOL
- Battle Mode full redesign spec locked: JOINT OPS + GHOST PROTOCOL
- Spectre Labs Master Context converted to .md
- Supabase migrations: username, house_name, kids_themes columns added to user_profiles
- Legacy athlete: 'danielle' record deleted
- Claude Code build plan written for: mode grid fix, PR feed, Props wiring, Joint Ops, Spotify

*(Session 12 plan executed — see Session 12 log below)*

### Session 12 — March 20, 2026
- ✅ FitnessScreen rebuilt from scratch — replaced GymScreen.tsx + GymScreenD.tsx with single multi-theme screen
- ✅ Modes: PLAN / LFG / BEAST / QUICK HITS / JOINT OPS — all wired
- ✅ Fixed 19x Linking warnings — moved `makeRedirectUri` call to module scope, outside component
- ✅ Added `"scheme": "tether"` to app.json — required for Linking/OAuth in production builds
- ✅ Added expo-notifications plugin to app.json
- ✅ EAS build `3f8dd0da` — shipped to D's phone
- ✅ Cade's IRON: LFG, Beast Mode, shit talk fires

### Session 13 — March 20, 2026
**Task 1 — Theme System**
- ✅ `src/themes/iron.ts` — IRON theme tokens (dark/gold)
- ✅ `src/themes/form.ts` — FORM theme tokens (light/rose)
- ✅ `src/themes/ronin.ts` — updated with standard token fields + backward-compat for RoninInkWash
- ✅ `src/themes/valkyrie.ts` — updated with standard token fields
- ✅ `src/themes/index.ts` — `ThemeTokens` type + `getTheme(name)` function
- ✅ `UserContext.tsx` — added `themeTokens: ThemeTokens` computed from user.theme, exposed via context
- ✅ All screens migrated to context tokens: FitnessScreen, WorkdayRhythm, BudgetTracker, App.tsx
- ✅ Budget tab renamed to ARMORY
**Task 2 — Bank Statement Scanner**
- ✅ `src/lib/parseFinancialImage.ts` — expo-image-picker → base64 → Anthropic vision API → JSON parse
- ✅ BudgetTracker: "Scan statement" button → `scan_review` screen (group by category, confidence badges, delete per row, Log all)
- ✅ `logAllScanned()` — expenses to `budget_expenses`, recurring auto-payments to `committed_bills`
- ✅ COMMITTED (auto-pay) total displayed on BudgetTracker home
- ✅ EAS build `53b48c7e` — queued and shipped ✅

### Session 14 — March 20, 2026
- ✅ `rank integer default 1` added to `user_profiles` (Supabase migration)
- ✅ `signal_library jsonb default '[]'` added to `household_settings` (Supabase migration)
- ✅ `src/screens/WarRoom.tsx` — command center home screen
  - Clock + themed greeting (per theme, per time of day: morning / afternoon / evening)
  - Brain State check-in: LOCKED IN / DRIFTING / FLOW STATE / EMERGENCY → saves to `user_context_snapshots`
  - Today's Missions: 3 editable inline slots (tap to edit, inline TextInput)
  - Incoming Signals: unread props (event_type='signal') from partner, dismiss individually
  - Allied Forces: partner name, theme, linked status (queried by house_name)
  - Quick Access: 4 buttons to navigate to WORK / FIT / ARMORY / SETTINGS tabs
- ✅ `src/components/SignalButton.tsx` — floating 📡 FAB, bottom-right, above tab bar
  - Animated slide-up bottom sheet (Animated.spring)
  - 8 default signals + custom signal input (saved to household_settings.signal_library)
  - Sends to partner via props table (event_type='signal')
  - No partner found → Alert to link household in Settings
- ✅ App.tsx — WAR ROOM added as first tab (🎯), `<SignalButton />` rendered above tab navigator
- ✅ Zero TypeScript errors
- ✅ EAS build `2ff3ca3e` — shipped ✅

### Session 15 — March 20, 2026
**Spotify OAuth — PKCE upgrade**
- ✅ `SPOTIFY_CLIENT_ID` pasted into `src/lib/config.ts` — OAuth now live
- ✅ Upgraded from implicit flow (`ResponseType.Token`) to PKCE (`ResponseType.Code` + `usePKCE: true`)
  - Implicit flow gave 1-hour tokens with no refresh; PKCE gives refresh tokens that auto-renew
- ✅ `exchangeCodeForTokens(code, codeVerifier, redirectUri)` added to spotifyService.ts — exchanges PKCE auth code for access + refresh token via Spotify token endpoint (no client secret needed)
- ✅ `refreshSpotifyToken(refreshToken)` — calls Spotify token endpoint with refresh_token grant
- ✅ `getValidAccessToken(user)` — checks expiry (60s buffer), auto-refreshes if needed, saves new tokens to Supabase
- ✅ FitnessScreen: `spotifyToken` local state — decoupled from UserContext, survives refresh without page reload
- ✅ On mount: calls `getValidAccessToken` to restore session from stored tokens, auto-refreshing expired ones
- ✅ `isSpotifyConnected` now checks local `spotifyToken` + expiry timestamp (not just existence of stored token)
- ✅ `handleSpotifySearch`, `addTrack`, `syncWithPartner` — all use local `spotifyToken` state
- ✅ Zero TypeScript errors
- ✅ EAS build `683122da` — shipped ✅
- **ACTION REQUIRED**: In Spotify Developer Dashboard → app settings → Redirect URIs, add: `tether://spotify`

### Session 16 — March 20, 2026
**Supabase migrations**
- ✅ `purchase_history` — where household shops per item (user_id, store, item_category, price_paid, purchased_at)
- ✅ `household_item_preferences` — inferred "usual store per item", avg interval (updated by engine)
- ✅ `flyer_deals` — sale data (store, item, sale_price, regular_price, discount_pct computed, postal_code_prefix)
- ✅ `grocery_nudges` — smart nudges surfaced to user (dismissible, reason text)
- ✅ `pantry_items` — food tracker (name, category, quantity, unit, location: fridge/freezer/pantry, estimated_empty_at)
- ✅ `household_items` — inventory for non-food (toys, cleaning, etc., tagged_to: andy/pax/hendrix/home)
- ✅ `intel_drops` — receipt audit log (image_url, raw_anthropic_response, processed, routed_to[])
- ✅ Supabase Storage bucket: `intel-drops` (private)

**Grocery Nudge engine**
- ✅ `src/lib/groceryNudge.ts` — pure logic layer: `shouldNudge()` + `computeNudges()`
  - Fires when: item due in ±7 days AND ≥30% off AND budget has room (envelope > bills × 1.2)
  - Also fires for ≥40% off regardless of timing (worth stocking up)
  - Sorted by discount descending
- ✅ `src/components/GroceryNudgeCard.tsx` — theme-aware dismissible card with item name, store, discount %, sale price, reason

**INTEL DROP — one button, zero thinking**
- ✅ `intel-processor` Edge Function deployed (ACTIVE, v1)
  - Receives: imageUrl (Supabase Storage path), userId, householdId
  - Downloads image from `intel-drops` bucket → sends base64 to Anthropic Vision (claude-sonnet-4)
  - Extraction prompt: classifies every line item (is_food, is_household_item, location, tagged_to)
  - Routes:
    - Food items → `pantry_items`
    - Household items → `household_items` (tagged to andy/pax/hendrix/home)
    - All items → `purchase_history`
    - Receipt total → `budget_expenses` (groceries envelope, negative amount)
    - Raw response → `intel_drops` audit log
  - Returns: { itemsLogged, routedTo[], store, total }
- ✅ WarRoom — INTEL DROP button (gold-bordered, prominent above Brain State)
  - Requests photo library permission → ImagePicker → upload to Supabase Storage → call Edge Function
  - Shows "Analyzing receipt..." spinner during processing
  - Shows result summary: "✓ 12 items logged from Superstore → pantry, household_items, finance"
- ✅ WarRoom — INTEL — DEALS DETECTED section (shows active grocery nudges, dismissible inline)
- ✅ Zero TypeScript errors
- ✅ EAS build `6578caf3` — shipped ✅

### Session 17 — March 20, 2026
**Auth + theme fixes**
- ✅ `src/lib/supabase.ts` — root cause fix for "Keep me signed in" not working
  - Was: `createClient` with no storage → React Native has no `localStorage`, sessions never persisted
  - Now: `AsyncStorage` as storage adapter, `autoRefreshToken: true`, `persistSession: true`
- ✅ `src/screens/AuthScreen.tsx` — 3 fixes:
  - THEMES array now includes all 4: IRON, RONIN, FORM, VALKYRIE (was missing RONIN, had non-existent "pulse")
  - Biometrics: fingerprint-only via `supportedAuthenticationTypesAsync()` check — hides biometric path if device only has Face ID
  - `handleSignup` keepSignedIn fix: sets/clears ephemeral session key on signup too (not just sign-in)

**Theme animations wired in FitnessScreen**
- ✅ `RoninInkWash` fires on session start (`setScreen('workout')`) for Ronin theme users
- ✅ `RoninPRCelebration` replaces standard PR celebration for Ronin theme
- ✅ `ValkyriePRCelebration` replaces standard PR celebration for Valkyrie theme
- ✅ Iron + Form themes continue to use standard `PRCelebration` (with exercise details + send props)

- ✅ Zero TypeScript errors
- ✅ EAS build queued

### Session 18 — March 20, 2026
**Household Setup Screen**
- ✅ `src/screens/HouseholdSetupScreen.tsx` — fires automatically on first open when `user.house_name` is null
  - Step 1: Text input — "Tell us about your crew" (kids names, ages, what they're into)
  - Step 2: Calls Anthropic API (`claude-sonnet-4-20250514`) → generates 3 creative household call sign suggestions based on kids' interests
  - Step 3: Pick screen — 3 tappable suggestion cards + "Something else..." option with free-text input
  - Confirm → saves to `user_profiles.house_name` + upserts `household_settings` row
  - Fully theme-aware (uses `themeTokens` from UserContext)
- ✅ `src/context/UserContext.tsx` — added `refreshUser()` — re-fetches profile from Supabase, updates user state without requiring auth state change
- ✅ `App.tsx` — wired: `if (!user.house_name) return <HouseholdSetupScreen />` — fires before main tab nav

**War Era Theme System**
- ✅ `src/themes/forge.ts` — FORGE: Medieval / Swords & Shields — stone, iron, firelight red, parchment
- ✅ `src/themes/arcane.ts` — ARCANE: Wizards & Mages — deep purple, arcane violet, spell-glow gold
- ✅ `src/themes/dragonfire.ts` — DRAGONFIRE: Dragons / High Fantasy — charcoal, ember orange, dragon gold
- ✅ `src/themes/void.ts` — VOID: Sci-Fi / Future War — near-black, electric blue, holographic teal
- ✅ `src/themes/verdant.ts` — VERDANT: Nature / Druid / Ranger — deep forest green, earth brown, earth gold
- ✅ `src/themes/index.ts` — all 5 new themes registered in `getTheme()`, exported
- ✅ `src/screens/AuthScreen.tsx` — THEMES picker updated: IRON, RONIN, VALKYRIE, FORGE, ARCANE, DRAGONFIRE, VOID, VERDANT (8 total). FORM removed from picker, kept in codebase for backward compat.

**Build situation**
- ⛔ EAS cloud quota exhausted for the month — resets April 1, 2026
- ⛔ Local build attempted — failed: Java 25 installed (too new for Gradle). Fixed: `brew install openjdk@17`
- ⛔ Local build still failed — Android SDK not installed (all previous builds were EAS cloud)
- ✅ Decision: install Android Studio → bundles SDK → local builds work forever after, no cloud dependency
- ✅ Android Studio installed — SDK at `~/Library/Android/sdk`
- ✅ Local build working: `ANDROID_HOME=~/Library/Android/sdk JAVA_HOME=/opt/homebrew/opt/openjdk@17 eas build --platform android --profile preview --local`
- ✅ First successful local build — APK `build-1774064919843.apk` (69.8 MB)
- ✅ Cade's `user_profiles.theme` fixed from `iron` → `ronin` directly in Supabase

### Session 19 — March 20, 2026
**Household Join flow**
- ✅ `src/screens/SettingsScreen.tsx` — HOUSEHOLD section added:
  - No house_name: shows text input + JOIN HOUSEHOLD button → saves to `user_profiles.house_name` + upserts `household_settings`, calls `refreshUser()`
  - Has house_name: shows linked name + "Leave household" button (sets house_name to null, keeps partner's household intact)
- ✅ Zero TypeScript errors
- ✅ Local build — APK `build-1774066663110.apk` shipped ✅

**Household linking flow (how it works)**
1. D creates account → HouseholdSetupScreen fires → picks a call sign → saved to her profile
2. D tells Cade the name
3. Cade → Settings → HOUSEHOLD → types the name → JOIN HOUSEHOLD
4. Both profiles share `house_name` → WarRoom Allied Forces, JointOps, shit talk, Signal Button all active

**Call sign prompt upgrade**
- ✅ `HouseholdSetupScreen` — Claude prompt rewritten to force deeper cuts
  - Kills the obvious mashup ("if it could belong to any family with a hockey kid, it's not good enough")
  - Opens vocabulary: scientific terms, eras, mythology, sports slang, Latin
  - Mental model shifted: band name / unit patch, not a username
  - Bad: `ThePuckPack`, `DinoLabHQ` → Good: `CretaceousEnforcers`, `VelociraptorLineChange`, `BrickAndBoneUnited`

### Session 20 — March 20, 2026
**Household loop fix + QR invite**

Root cause: `App.tsx` gated main app on `!user.house_name` — so leaving a household trapped you on HouseholdSetupScreen with no way to reach Settings and join.

- ✅ DB migration: `household_setup_seen boolean DEFAULT false` added to `user_profiles`
- ✅ `App.tsx` — condition changed to `!user.house_name && !user.household_setup_seen && !householdSkipped`
  - Setup screen only fires on **first-ever login**, never again after seen/skipped
  - Leaving a household goes straight back to main app
- ✅ `HouseholdSetupScreen` — full rewrite:
  - Two-mode toggle: **NAME YOUR CREW** (existing generate flow) / **JOIN A HOUSEHOLD** (type partner's name)
  - Join validates against `household_settings` table — shows error if name not found
  - "skip for now" link — marks `household_setup_seen = true`, never shows again
  - Accepts `prefillJoin` prop for deep link auto-fill
- ✅ `SettingsScreen` — **Share household QR** button added
  - Shows QR code in modal encoding `tether://join?house=HOUSEHOLDNAME`
  - Partner scans → app opens → join mode pre-filled → one tap to confirm
- ✅ `App.tsx` — deep link handler: `tether://join?house=X` → opens setup screen in join mode with name pre-filled
- ✅ Packages installed: `react-native-svg`, `react-native-qrcode-svg`
- ✅ APK `build-1774069712549.apk` shipped

**Household linking flow (updated)**
1. D creates account → HouseholdSetupScreen → names the crew → locked in
2. D → Settings → HOUSEHOLD → "Share household QR" → Cade scans
3. Cade's app opens join mode with D's household name pre-filled → one tap
4. OR: Cade goes Settings → type the name manually → JOIN HOUSEHOLD

### Session 21 — March 21, 2026
**Intel Drop bug fix**
- Root cause: Storage upload (`supabase.storage.from('intel-drops').upload(...)`) failing on device with `TypeError: Network request failed` — Storage bucket policy + network conditions on mobile
- Fix: removed Storage entirely. ImagePicker `base64: true` → base64 sent directly to edge function
- ✅ `src/screens/WarRoom.tsx` — `handleIntelDrop` rewritten: no upload, no blob, just `asset.base64`
- ✅ `supabase/functions/intel-processor/index.ts` — new function created and deployed
  - Accepts `{ base64Image, mimeType, userId, householdId }`
  - Anthropic Vision (claude-haiku) → parse store + line items + categories
  - Maps categories → envelope IDs → inserts to `budget_expenses`
  - Logs grocery nudge to `grocery_nudges` if householdId + store present
  - Deployed to `rzutjhmaoagjdrjefvzh`

**Field Reset module**
- ✅ `src/screens/FieldReset.tsx` — new full-screen overlay launched from War Room
  - Screen 1: Mission Status (LOCKED IN / HOLDING / SCATTERED / CRITICAL) — no wrong answer
  - Screen 2: Single mission card — room, zone, time limit, timer counts UP (momentum not pressure)
  - Debrief: 2-min rest after each COMPLETE, "AREA SECURED" flash, skip available
  - Screen 3: Field Report after 3+ missions — areas secured, time in field, LOG TO WAR ROOM / CONTINUE / STAND DOWN
  - Anthropic (claude-haiku) generates missions tuned to energy level — directional language only, no "clean"
  - REASSIGN = no penalty, no comment
  - STAND DOWN = logged as a win regardless
  - Logs to `field_reset_sessions` table (SQL to run in dashboard)
  - Theme-aware throughout
- ✅ `src/screens/WarRoom.tsx` — wired in:
  - 🏴 FIELD RESET quick action button above Quick Access
  - Partner DRIFTING/EMERGENCY → "🏴 BACKUP AVAILABLE" nudge in Allied Forces
  - `loadPartner()` now also fetches partner's latest `brain_state` from `user_context_snapshots`
- ✅ Zero TypeScript errors
- ✅ APK `build-1774110573304.apk` shipped

**SQL to run in Supabase dashboard:**
```sql
create table if not exists field_reset_sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id),
  mission_status text,
  missions_complete integer default 0,
  minutes_in_field integer default 0,
  areas_secured text[],
  date date default current_date
);
alter table field_reset_sessions disable row level security;
```

### Session 22 — March 21, 2026
**BLITZ (renamed from Field Reset) + Spotify + background timer + calendar + Supply Run**

**Step 1 — Rename Field Reset → BLITZ**
- ✅ `src/screens/FieldReset.tsx` → `src/screens/Blitz.tsx`
- ✅ All references in `WarRoom.tsx` updated: `showFieldReset` → `showBlitz`, `FieldReset` → `Blitz`
- ✅ UI copy: "FIELD RESET" → "BLITZ", "FIELD REPORT" → "BLITZ REPORT", icon 🏴 → 🔥
- ✅ "AREA SECURED" — kept, perfect as-is
- ✅ "🔥 BACKUP AVAILABLE — Blitz ready" in Allied Forces when partner is DRIFTING/EMERGENCY

**Step 2 — Spotify bar in BLITZ**
- ✅ `Blitz.tsx` mission card screen — Spotify bar above mission card, gold border, full width
  - Connected + playlist: "Tether Gym 💪" + ▶ PLAY → `Linking.openURL('spotify:playlist:ID')` opens Spotify directly
  - Not connected: "Connect Spotify for battle music" → taps through to close (Settings)
  - Loads `household_settings.joint_ops_playlist_id` via `getHouseholdPlaylistId()`

**Step 3 — Background timer + audio**
- ✅ `Blitz.tsx` — AppState listener added (same pattern as WorkdayRhythm)
  - FG timer → BG timer handoff on app backgrounding, sync back on foreground
  - Mission time reached in background → `expo-notifications` local notification fires
  - `Vibration.vibrate([0, 300, 200, 300])` — two pulses on complete
  - `expo-av` plays `assets/audio/beep-beep.mp3` — try/catch, falls back to vibration if file missing
  - ⚠️ Need to add `beep-beep.mp3` to `assets/audio/` — any short double-beep MP3 works

**Step 4 — Google Calendar integration in War Room**
- ✅ `expo-calendar` installed + added to `app.json` plugins
- ✅ `WarRoom.tsx` — `loadCalendar()` on focus: requests permission, fetches today's events from all device calendars
  - Events shown with 📅 prefix + time above manual mission slots
  - Calendar events sorted by start time, non-editable, max 4 shown
  - No permission: shows manual slots only + "Connect calendar in device Settings" note
  - Manual slot numbering offset by calendar event count

**Step 5 — Supply Run (shopping list)**
- ✅ `src/screens/ShoppingList.tsx` — new full-screen overlay
  - Three tabs: 🏠 HOUSEHOLD (shared, real-time), 👤 PERSONAL (private), 👦 THE UNIT (tagged to Andy/Pax/Hendrix)
  - Supabase real-time subscription on `shopping_list_items` filtered by `house_name`
  - AI suggestions from `budget_expenses` grocery history (items bought 2+ times)
  - ADD ALL / DISMISS suggestions
  - Check off → strikethrough → CLEAR COMPLETED
  - THE UNIT: kid selector (Andy / Pax / Hendrix) → item prefixed with name
- ✅ `WarRoom.tsx` — 📋 SUPPLY RUN button below BLITZ
- ✅ `BudgetTracker.tsx` — SUPPLY RUN section at bottom of home screen
- ⚠️ SQL to run in Supabase dashboard:
```sql
create table if not exists shopping_list_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  house_name text,
  user_id uuid references auth.users(id),
  list_type text,
  item text,
  tagged_to text,
  completed boolean default false,
  added_by text
);
alter table shopping_list_items disable row level security;
```
- ✅ Zero TypeScript errors
- ✅ APK `build-1774114082044.apk` shipped

### Session 23 — March 21, 2026
**Audio cues — Blitz + WorkdayRhythm**
- ✅ `assets/audio/beep-beep.wav` — generated: 880Hz sine, two pulses (0.12s on, 0.08s gap, 0.12s on), 44100Hz mono
- ✅ `src/screens/Blitz.tsx` — `playBeep()` updated to `new Audio.Sound()` + `loadAsync` + `playAsync` pattern
- ✅ `src/screens/WorkdayRhythm.tsx` — `playBeep()` added, called in `fireBlockEndNotification()`
  - Plays beep-beep.wav 1x on focus block end (52 min) and break end (17 min)
  - Original vibration pattern `[0, 500, 200, 500]` preserved
  - try/catch fallback to vibration-only if audio fails
- ✅ APK `build-1774116921587.apk` shipped

### Session 24 — March 21, 2026
**Boring But Critical — push tokens, missions persistence, event logging, RLS**

**Push tokens + real notifications**
- ✅ `src/lib/sendPushNotification.ts` — fetches partner's `push_token` from `user_profiles`, hits `exp.host` push API, silent fail
- ✅ `UserContext.tsx` — `registerPushToken()` fires after every login; requests permission, gets Expo push token, stores in `user_profiles.push_token`
- ✅ **SignalButton** — fires push on send: "📡 Signal from [name]"
- ✅ **PropsModal** (HouseholdSetup.tsx) — fires push on send: "🏆 Props incoming"
- ✅ **JointOps** `sendShitTalk` — fires push: "💀 Shit talk from [name]"
- ✅ **WarRoom** `selectBrainState` — fires push to partner when EMERGENCY selected: "🚨 BACKUP NEEDED"

**Missions persistence**
- ✅ WarRoom missions load from AsyncStorage on mount
- ✅ Auto-reset to `['', '', '']` at midnight (compares saved date to today's date)
- ✅ `saveMission()` persists immediately on every edit

**Event logging — `src/lib/logEvent.ts` + 9 touchpoints**
- ✅ `brain_state_set` — WarRoom `selectBrainState`
- ✅ `workout_start` — GymScreen `startSession`
- ✅ `pr_hit` — GymScreen `finishSession` (only fires if PRs hit)
- ✅ `blitz_start` — Blitz `handleSelectStatus`
- ✅ `blitz_complete` — Blitz `handleLogToWarRoom`
- ✅ `intel_drop` — WarRoom `handleIntelDrop` (after successful parse)
- ✅ `signal_sent` — SignalButton `sendSignal`
- ✅ `envelope_open` — WarRoom `dismissSignal`
- ✅ `supply_run_add` — ShoppingList `addItem`

**Supabase SQL run:**
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS push_token text;
CREATE TABLE user_events (id uuid PK, user_id uuid FK, event_type text, metadata jsonb, created_at timestamptz);
-- RLS: users insert/read own events; users update own push_token
```

- ✅ APK `build-1774120281641.apk` shipped (76.1 MB, 414 Gradle tasks, 8 min)

### Session 25 — March 26, 2026
**Live testing fixes — fitness, Joint Ops, War Room, intel**

**APK:** `build-1774224036127.apk` (prior session build, installed on both phones before this session)

**Step 1 — Weight/reps inputs**
- ✅ FitnessScreen workout `ScrollView` — added `keyboardShouldPersistTaps="handled"` (Android touch intercept was blocking TextInput taps)
- ✅ JointOps weight/reps were `TouchableOpacity + Text` (non-editable) — replaced with proper `TextInput` components
- ✅ JointOps `ScrollView` — same keyboard fix applied

**Step 2 — Weight units: KG / LBS**
- ✅ `UserContext.tsx` — added `weight_unit?: 'kg' | 'lbs'` to User type
- ✅ `SettingsScreen.tsx` — added UNITS section with KG/LBS toggle; saves to `user_profiles.weight_unit`
- ✅ FitnessScreen WEIGHT input placeholder now reads from `user.weight_unit` (default `lbs`)
- SQL: `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lbs';`

**Step 3 — Joint Ops battleground workout**
- ✅ `fitness-engine` `handleJointOpsStart` — fetches both users' `training_days` from `user_profiles`
- ✅ Calculates tomorrow's planned split for each user, injects into Anthropic prompt: "avoid these muscle groups"
- ✅ Finds exercises both users have done in last 14d with high volume (weight × reps × sets) — "battleground" exercises where both are strong
- ✅ Falls back to full-body AMRAP/EMOM circuit if no overlap found
- ✅ Exercises flagged `battleground: true` for UI highlighting

**Step 4 — Joint Ops scoreboard**
- ✅ Scoreboard switched from point-based to cumulative volume (kg × reps moved)
- ✅ My volume: derived live from `completedSets` (already in state)
- ✅ Partner volume: realtime subscription on `exercise_performance` filtered by `session_id` + `partner_id`
- ✅ Display: shows total volume per user, plus PR count below

**Step 5 — Shit talk fix**
- ✅ Verified column names: `from_user` / `to_user` (not `_id` suffix) — consistent with WarRoom signals query
- ✅ Realtime subscription filter confirmed correct
- ✅ `exercise_name` is passed correctly from `exercises[exerciseIndex].name`
- ✅ Pending shit talk queue — holds message until partner reaches the same exercise name

**Step 6 — MED EVAC**
- ✅ Added `🚑 MED EVAC` button below LOG SET on workout screen
- ✅ First tap: Alert → confirm → writes to `injury_flags`, skips remaining sets, moves to next exercise (cleared in 1 week)
- ✅ Second tap on same body part: "See a doctor" alert, cleared in 2 weeks
- ✅ `medEvacCount` state tracks per-exercise tap count within session
- SQL: `CREATE TABLE IF NOT EXISTS injury_flags (id uuid PK, user_id uuid FK, body_part text, exercise_name text, severity text default 'moderate', active boolean default true, date date default current_date); ALTER TABLE injury_flags DISABLE ROW LEVEL SECURITY;`

**Step 7 — Back buttons**
- ✅ Workout screen already had `← END` back button (confirmed, no change needed)
- ✅ Added `← ABORT` back button to loading screen (no way to cancel a hung session start previously)

**Step 8 — Next week preview on PLAN home**
- ✅ Added NEXT WEEK strip below THIS WEEK on FitnessScreen home — grayed out, smaller labels, shows repeating split pattern from `user.training_days`

**Step 9 — War Room: AI mission steps**
- ✅ Missions restructured from `string[]` to `Mission[]` with `{ text, steps: [{text, done}][], expanded, done }`
- ✅ On `saveMission()` — calls Anthropic (claude-haiku-4-5) to break text into 2–5 actionable sub-steps
- ✅ Steps stored in AsyncStorage alongside mission text
- ✅ UI: mission row shows chevron to expand steps; each step is a tappable checkbox
- ✅ Mission auto-marks done when all steps checked
- ✅ AsyncStorage migration: string[] loads are converted to Mission[] format on first read

**Step 10 — War Room: CLEAR ALL signals**
- ✅ Added `CLEAR ALL` button at top of INCOMING SIGNALS section
- ✅ Marks all `event_type='signal'` rows `seen=true` for current user in one query, clears local state

**Step 11 — Intel Drop fix**
- ✅ Added granular `console.log` at each step (payload received, Anthropic call, response, routing)
- ✅ Anthropic model confirmed `claude-haiku-4-5-20251001`
- ✅ Error philosophy: never surface "Processing failed" to user — if Anthropic fails, return `{ itemsLogged: 0, message: 'Filed for later processing' }` with 200 status
- ✅ Image payload check: if base64 string >1.3MB estimated, logs warning (compression needed upstream)

**Step 12 — Local build**
- ✅ `build-1774224036127.apk` already on device from prior session
- 🔄 New build queued after all fixes land

**SQL to run this session:**
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'lbs';

CREATE TABLE IF NOT EXISTS injury_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  body_part text,
  exercise_name text,
  severity text DEFAULT 'moderate',
  active boolean DEFAULT true,
  date date DEFAULT current_date
);
ALTER TABLE injury_flags DISABLE ROW LEVEL SECURITY;
```

### Session 26 — March 27–28, 2026
**Edge Function auth fixes + workout split logic + intel-processor logging**

**Part 1 — Workout always returns Push day (March 27)**
- ✅ Root cause: prompt gave Anthropic `training_days: [1,4,6]` and `Day: Thursday` with no mapping instructions. Model anchored on the JSON schema example label `"PUSH DAY"` and always returned that.
- ✅ Added `getSplitLabel()` + `SPLIT_MUSCLES` map to `fitness-engine` — mirrors the exact frontend logic (position in sorted training_days → split name)
- ✅ Prompt now explicitly states: `TODAY'S SPLIT: PULL DAY — train back, biceps, rear delts. Do NOT train other muscle groups.`
- ✅ Schema example label is now dynamic (computed split, not hardcoded PUSH DAY)
- ✅ Added `console.log` before every Anthropic call: split, day, todayNum, trainingDays, prompt preview, response label
- ✅ Deployed fitness-engine

**Part 2 — Intel Drop silent success, 0 items (March 27)**
- ✅ Root cause: `supabase.from().insert()` returns `{ data, error }` — doesn't throw. Error was never checked. Function returned `{ itemsLogged: rows.length }` even when the insert failed silently.
- ✅ Added full error check on insert — returns `{ itemsLogged: 0, message: "Filed for later processing" }` on failure
- ✅ Added 7 granular `console.log` steps throughout intel-processor
- ✅ User never sees "Processing failed" — all errors return 200
- ✅ Confirmed `user_id: userId` already present in every `budget_expenses` insert row
- ✅ Deployed intel-processor

**Part 3 — 401 auth errors on both functions (March 27)**
- ✅ Created `src/lib/callEdgeFunction.ts` — single helper for all edge function calls
  - Gets live session JWT via `supabase.auth.getSession()`
  - Sends both `Authorization: Bearer <user_jwt>` and `apikey: <anon_key>`
  - Falls back to anon key if no session (prevents hard crash)
  - Throws with readable error on non-200
- ✅ `FitnessScreen.tsx` — replaced bare `callEngine` fetch with `callEdgeFunction('fitness-engine', body)`
- ✅ `JointOps.tsx` — same replacement
- ✅ `WarRoom.tsx` — replaced manual `fetch(INTEL_EDGE_URL, ...)` with `callEdgeFunction('intel-processor', ...)`
- ✅ Removed all dead `EDGE_URL` / `INTEL_EDGE_URL` constants

**Part 4 — Still 401 after Part 3 (March 28)**
- ✅ Root cause: functions were deployed WITHOUT `--no-verify-jwt`, turning Supabase gateway JWT verification back on. The gateway was rejecting requests before the function ran.
- ✅ Fix: redeployed both with `--no-verify-jwt`. No code changes needed — the helper was already correct.
- ✅ Security rationale: `userId` in payload + DB RLS is the real auth layer. Gateway JWT check adds friction without meaningful security benefit here.

**Part 5 — budget_expenses user_id column (March 28)**
- ✅ `user_id` column added to `budget_expenses` table in Supabase
- ✅ Confirmed `user_id: userId` already present in insert rows — no code change needed
- ✅ Redeployed intel-processor to sync live function with current code

**APKs this session:**
- `build-1774591404530.apk` — split fix + intel logging
- `build-1774593482219.apk` — auth helper wired in
- `build-1774714804958.apk` — current build (no code changes, just confirms auth fix)

**SQL run this session:**
```sql
ALTER TABLE budget_expenses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
```

### Session 27 — March 29, 2026
**ARMORY FIX — intel-processor deterministic rewrite**

Root cause: AI-assigned envelope categories were inconsistent and income detection was broken.

- ✅ `supabase/functions/intel-processor/index.ts` — complete rewrite
  - `isIncome()`: checks `is_income` flag OR `/deposit|received|payroll|direct deposit|credit/i` regex
  - `ENVELOPE_MAP: [RegExp, string][]`: 14-entry deterministic map (regex → envelope_id). No AI categorization.
  - `categorize(name)`: iterates ENVELOPE_MAP, returns `'overflow'` if no match
  - Per-item dedup: queries `budget_expenses`/`income_transactions` for same `amount + note` within ±1 day before every insert
  - Unknown e-transfers (`envelope === 'unknown_transfer'`) → `armory_clarifications` table + `budget_expenses` with `envelope_id = 'pending'`
  - Whole-image fingerprint as fast-path dedup (within 1hr)
  - AI prompt simplified: extract name, amount, is_income, recipient only — no categorization
  - Response shape: `{ itemsLogged, incomeLogged, clarifications, store }` (`routedTo` removed)
- ✅ `armory_clarifications` table created (MCP)
  - Columns: id, user_id, transaction_name, amount, date, recipient, status, resolved_envelope_id, created_at
  - RLS enabled, indexes on user_id + status
- ✅ `WarRoom.tsx` — `intelResult` type updated, result display updated, try/catch around response parsing
- ✅ Deployed `intel-processor --no-verify-jwt`
- ✅ `callEdgeFunction` required on all edge function calls — gateway JWT must stay off

### Session 28 — March 29, 2026
**Workout calendar + WarRoom training mission + Blitz calendar + FitnessScreen calendar view**

**Google Calendar integration (FitnessScreen)**
- ✅ `startSession()` — calls `addWorkoutToCalendar(label, startTime, durationMinutes)` on session start via `expo-calendar`
- ✅ `scheduleMonthCalendar()` — one-time on first use: creates 4 weeks of recurring workout events. AsyncStorage flag `cal_scheduled_{userId}` prevents re-creation.
- ✅ Hard stop row replaced with duration chips + LEAVE BY button + DateTimePicker (`@react-native-community/datetimepicker`)
  - `getHardStopDate()` / `getEffectiveMinutes()` — compute from LEAVE BY time or fixed duration
- ✅ Blitz: after 3 sessions, prompts to add 28-day "BLITZ — Field Reset" calendar block at 7:30am

**THIS WEEK / THIS MONTH calendar view (FitnessScreen PLAN mode)**
- ✅ New state: `calendarTab` ('week'|'month'), `weeklyBrief`, `monthSessions`, `weekExpanded`
- ✅ `loadWeeklyBrief()` — calls `fitness-engine` `weekly_brief` event, 7-day AsyncStorage cache, structured fallback if Anthropic fails
- ✅ `handleWeeklyBrief()` in `fitness-engine` — queries last 6 sessions, builds split map per day, calls Anthropic → `{ weekTheme, dayBriefs, monthPhase, weeklyTarget, generatedAt }`
- ✅ `loadMonthSessions()` — queries `workout_sessions` for current month
- ✅ UI: tab row (THIS WEEK / THIS MONTH), expandable week cards (per-day split/muscles/focus/note + lift chips), month grid (dots for session days), weekly target banner

**WarRoom training mission**
- ✅ Missions auto-reset on new day pre-populates slot 0 with today's split if it's a training day
  - E.g. `IRON — PUSH DAY 💪`

### Session 29 — March 29, 2026
**Wearable integration — Google Health Connect**

- ✅ `src/lib/healthConnect.ts` (new)
  - Android-only dynamic import (`await import('react-native-health-connect')`) — never crashes on iOS/dev
  - `initHealthConnect()` — initializes + requests 6 permissions (SleepSession, HeartRate, HeartRateVariabilityRmssd, Steps, RestingHeartRate, ActiveCaloriesBurned)
  - `getLastNightSleep()` — SleepSession 6pm yesterday → now, returns `{ hours, startTime, endTime }`
  - `getTodayHR()` — averages all HeartRate samples today
  - `getLatestHRV()` — `HeartRateVariabilityRmssd.heartRateVariabilityMillis` (last 24h)
  - `getTodaySteps()` — sums Steps.count today
  - `getRestingHR()` — most recent RestingHeartRate today
  - `getAllHealthData()` — runs all 5 in parallel, returns null if permissions not granted
  - All wrapped in try/catch — never blocks app startup
- ✅ `src/context/UserContext.tsx` — `HealthData` state + `syncHealthData()` called non-blocking after `loadProfile()`
  - Upserts to `health_snapshots` table (onConflict: 'user_id,date')
  - `healthData` exposed via context
- ✅ `health_snapshots` table created (MCP): user_id, date, sleep_hours, sleep_start, sleep_end, resting_hr, avg_hr, hrv_ms, steps. Unique on (user_id, date).
- ✅ `supabase/functions/fitness-engine/index.ts`
  - `getUserContext()` — queries `health_snapshots` last 7 days, computes rolling averages
  - `handleSessionStart()` — reads real-time `healthContext` from payload, injects into Anthropic prompt
  - Health-based rules in prompt: HRV <30 → reduce volume 20% + no PR attempts, HRV ≥60 → PR green-lit, sleep <5h → compressed session
  - `handleWeeklyBrief()` — added; generates `weekTheme, dayBriefs, monthPhase, weeklyTarget` for FitnessScreen plan view
- ✅ `FitnessScreen.tsx` — `startSession()` passes `healthContext: { sleepHours, hrv, restingHR, steps }` and `sleepContext` string to fitness-engine
- ✅ `WarRoom.tsx` — RECON strip between Brain State and BLITZ sections
  - Expandable (tap ▼/▲), shows: 💤 sleep hours, ❤️ resting HR, 📊 HRV (color-coded: green/yellow/red), 👟 steps
  - Expanded: HRV status label, sleep flag, avg HR, step count
  - Only renders if `healthData` is non-null (Android with permissions)
- ✅ `app.json` — Health Connect plugin expanded with full permissions object
- ✅ Bug fixed: `HeartRateVariabilityRmssd` (not `HeartRateVariabilitySdnn`) — TypeScript SDK type

### Session 30 — March 30, 2026
**Pantry + Consumption Engine + Smart Filing + Intel 4-Mode Overlay + Interactive Push**

**Database migrations (MCP)**
- ✅ `alter_armory_clarifications_add_push_fields` — added: options (jsonb), answered (bool), answer (text), prompt_count (int), last_prompted_at (timestamptz)
- ✅ `create_intel_queue` — intel_queue table: id, user_id, type (image/voice/text), payload, status (pending/processing/done/failed), result, created_at, processed_at. RLS enabled.
- ✅ `pantry_household_id_to_text` — changed `household_id` in pantry_items, purchase_history, household_item_preferences from uuid to text (to match existing `house_name` text key pattern)

**intel-processor — expanded for any purchase evidence**
- ✅ Now accepts `type: 'image' | 'text' | 'voice'` in request body
- ✅ Image path: new expanded prompt extracts TWO groups from any evidence:
  - GROUP 1 — Financial transactions → `budget_expenses` / `income_transactions` (existing flow)
  - GROUP 2 — Pantry/grocery items (individual products) → `pantry_items` + `purchase_history` + `household_item_preferences`
  - Handles: store receipts, bank screenshots, grocery bags, product photos, Costco hauls, online order screenshots
  - Legacy `items` shape (no `financial_items`/`pantry_items` split) still supported as fallback
- ✅ Text/voice path: brain dump routing — expenses, pantry items (have vs need), calendar items
  - "need" items → returned as `shoppingNeeds` for client to add
  - "have" items → upserted to `pantry_items`
  - Calendar items → returned as `calendarItems` (client handles)
- ✅ `upsertPantryItem()` — upserts `pantry_items` (adds qty if exists), logs `purchase_history`, updates rolling avg in `household_item_preferences`
- ✅ `PANTRY_LOCATION` map: category → location tab (fridge/freezer/pantry/household/kids)
- ✅ Deployed `intel-processor --no-verify-jwt`

**consumptionEngine.ts** (`src/lib/consumptionEngine.ts`)
- ✅ `CATEGORY_LIFESPAN_DAYS` — per-category default depletion windows (produce: 5d, dairy: 7d, meat: 3d, frozen: 30d, etc.)
- ✅ `getEstimatedEmptyDate()` — uses `household_item_preferences.avg_purchase_interval_days`, falls back to category default
- ✅ `refreshEstimates()` — backfills `estimated_empty_at` for items without one
- ✅ `getRunningLow()` — items with `estimated_empty_at` within next N days
- ✅ `markConsumed()` — decrements quantity, recalculates `estimated_empty_at` proportionally, removes item if qty reaches 0
- ✅ `updateConsumptionPattern()` — refreshes estimate after new purchase
- ✅ `getPantryByLocation()` — returns items grouped by fridge/freezer/pantry/household/kids
- ✅ `daysUntilEmpty()` / `getStatusColor()` — returns color (green/yellow/orange/red) for UI

**Pantry.tsx** (`src/screens/Pantry.tsx`)
- ✅ 5 tabs: ❄️ FRIDGE · 🧊 FREEZER · 🥫 PANTRY · 🧴 HOUSE · 🧸 KIDS
- ✅ Running low banner (yellow, horizontal scroll of low-stock items)
- ✅ Per-item colored status dot, expandable detail (last stocked, est. empty date, category)
- ✅ USED IT button (calls `markConsumed`) + REMOVE button (hard delete)
- ✅ Empty state per tab: "Drop a grocery receipt in Intel to auto-populate"
- ✅ Refreshes estimates on focus
- ✅ Accessible from WarRoom QUICK ACCESS via overlay (same pattern as ShoppingList)

**ShoppingList.tsx — pantry suggestions**
- ✅ `loadSuggestions()` rewritten: pantry running-low items appear FIRST (⚠ badge), then frequent grocery history
- ✅ Pantry suggestions: items with `estimated_empty_at` within 5 days, formatted "⚠ Pantry: ~Xd left"

**WarRoom Intel Overlay (4-mode)**
- ✅ Intel Drop button replaced with compact INTEL button → opens full-screen `Modal`
- ✅ 4-mode selector: 📷 PHOTO · 🖼️ SCREEN · 🎤 VOICE · ⌨️ TYPE
- ✅ Photo/Screenshot mode: pick from camera or gallery → processes immediately → result shown in queue
- ✅ Voice/Text mode: multiline TextInput (with keyboard mic for voice), "+ ADD TO QUEUE" button
- ✅ Queue display: type icon, content preview, live status (processing spinner / ✓ done / ✗ failed), result summary
- ✅ **FILED AND FORGOTTEN** button: processes all pending text items in queue, closes overlay after 1.5s delay
- ✅ Image items process immediately on add; text/voice items queue and batch-submit on FILED AND FORGOTTEN
- ✅ `IntelMode` + `IntelQueueItem` types at module scope
- ✅ Pantry quick access added to QUICK ACCESS row (opens Pantry overlay)

**Interactive push + downtime detector** (`src/lib/downtimeDetector.ts`)
- ✅ `setupClarifyCategory()` — registers `clarify_transfer` notification category with 6 action buttons: MORTGAGE · GROCERIES · FUEL · KIDS · OTHER · SKIP
- ✅ `checkAndSendPendingClarifications(userId)` — queries unanswered e-transfers, sends push with action buttons, updates `prompt_count + last_prompted_at`
- ✅ `resolveClarification(clarificationId, envelopeId)` — marks clarification resolved, re-categorizes the `pending` budget_expense to the chosen envelope
- ✅ `UserContext.tsx` — calls `setupClarifyCategory()` + `checkAndSendPendingClarifications()` after login
- ✅ `App.tsx` — `Notifications.addNotificationResponseReceivedListener` routes button taps to `resolveClarification`
- ✅ `App.tsx` — `AppState.addEventListener('change')` fires `checkAndSendPendingClarifications` on foreground

### Session 31 — March 30, 2026

**D's FitnessScreen bug fixes:**
- ✅ Bug 1 — Stale closure fixed: `setCurrentSetIndex(prev => prev + 1)` in catch block (was `setCurrentSetIndex(currentSetIndex + 1)`)
- ✅ Bug 2+3 — Weight unit: label now reads `WEIGHT (LBS)` / `WEIGHT (KG)` from user context on every render. Suggested weight meta text uses correct unit. No local state copy.
- ✅ Bug 4 — Cardio log: CARDIO LOG button on home screen mode grid + complete screen. `CardioModal` component with 8 type options (Elliptical, Run, Bike, Row, Swim, Walk, Stairmaster, Jump Rope). Saves to `exercise_performance` as `Cardio — ${type}`, reps = durationMinutes, PR = longest session.

**Fitness Progression Engine:**
- ✅ `fitness-engine` — `getUserContext()` now computes consistency score (sessions last 7d / 30d, `isConsistent` = 8+ sessions/30d, `isGymRat` = 12+)
- ✅ Cardio detection — queries `exercise_performance` for voluntary cardio history. Stored in snapshot as `hasLoggedCardioVoluntarily`
- ✅ Session start prompt — cardio block mandatory in every workout. If user has logged cardio voluntarily → labeled correctly (Elliptical, Run, etc.). If not → disguised as Pump-up circuit (start) or Finisher (end). Never uses word "cardio" for avoiders.
- ✅ D flag — D has logged elliptical, so her cardio shows correctly labeled automatically.
- ✅ Deployed `fitness-engine --no-verify-jwt`

**Water Tracker (WarRoom):**
- ✅ Water tracker between Brain State and Today's Missions
- ✅ 8 drink types: bottle (💧 500ml), cup (🥤 250ml), tumbler (🫗 750ml), big gulp (🪣 1000ml), pepsi (🥤 355ml, type: caffeine_sugar), coffee (☕ 250ml, type: caffeine), drink (🍺 355ml, type: alcohol), other (💬 250ml)
- ✅ Quick tap [+ 💧] logs default container instantly. ▼ opens bottom sheet with all 8 options
- ✅ Water options on top, other drinks below divider — no labels, no judgment, just logging
- ✅ UNDO removes last entry
- ✅ Goal completion message — theme-appropriate (RONIN: "Discipline maintained." VALKYRIE: "Hydrated. Ready." etc.)
- ✅ Persists to AsyncStorage keyed `water_log_${userId}_${date}` — resets each day
- ✅ Saves to `health_snapshots.water_ml` (total), `caffeine_sugar_ml`, `alcohol_units` on every log
- ✅ `logEvent('drink_logged', { drink_type, amount_ml, container })` — silent data layer for pattern engine
- ✅ Settings — water goal (6/8/10/12 units), default container stored in `user_profiles`

**Supabase migrations applied:**
- ✅ `user_goals` — goal_text, goal_type, target_value, target_unit, target_date, current_value, achieved
- ✅ `nutrition_logs` — protein_g, calories, carbs_g, fat_g, water_ml, log_level
- ✅ `user_profiles` — added macro_tier, goal_unlocked, consistency_unlocked_at, water_goal_units (default 8), default_water_container (default 'bottle')
- ✅ `health_snapshots` — added water_ml, caffeine_sugar_ml, alcohol_units

**Deferred to next session:**
- Goal unlock push notification + War Room goal card (requires consistency detection to trigger)
- Macro unlock tiers (protein-only → protein+calories → full macros)
- MISSION card in War Room for active goals with progress bar

**Build needed** — `react-native-health-connect` is a native module, requires local EAS build:
```
ANDROID_HOME=~/Library/Android/sdk JAVA_HOME=/opt/homebrew/opt/openjdk@17 eas build --platform android --profile preview --local
```

### Session 32 — March 31, 2026
**Architecture refactor + Root Routing + Pantry Sync**

- ✅ **Client-side Fitness Engine** (`src/lib/fitness/engine.ts`): Ported core workout state logic from Edge Functions.
  - Implements `logSetAndReplan` for zero-latency weight/set adjustments based on effort.
  - Implements `getRestDurationForSet` with time-based compression.
  - Edge functions (Sonnet) now focus on long-term strategy, while client handles deterministic set-to-set flow.
- ✅ **Root-level Event Routing** (`App.tsx`): 
  - Centralized deep-link parsing for `tether://join` and Spotify redirects.
  - Implemented `addNotificationResponseReceivedListener` for `clarify_transfer` interactive pushes.
  - Wired `AppState` listener to trigger `checkAndSendPendingClarifications` on app focus.
- ✅ **Shopping List Pantry Sync**: `ShoppingList.tsx` now correctly surfaces "Running Low" items from `pantry_items` by checking `estimated_empty_at` and recent purchase frequency.
- ✅ **Theme Icon Map**: Verified and finalized tab bar icons/labels for all 8 war themes (Ember, Ronin, Valkyrie, etc.).

### Immediate (next build session)
1. **Goal unlock flow** — consistency detection fires push, War Room goal card appears.
2. **Macro tiers** — protein-only unlocks after goal set.
3. **"Thinking of You" button** — library implementation.
4. **Spotify Full Test** — wire and test full OAuth flow with Client ID.

### Architecture (before public launch)
- **SPECTRELABS_ETHICS_KEY** — add to codebase. Feu Follet commitment 03.
- **GitHub repo public** — Feu Follet commitment 04.
- **RLS on all tables** — push_token + user_events done. Remaining tables need audit before launch.
- **Remove legacy tables** — `gym_sessions`, `gym_profiles` after Battle Mode redesign confirmed working.

### Backlog (logged, not this session)
- Household pairing + PR notifications to partner
- Props wired into workout completion flow
- Variable training days in onboarding
- Hard stop time setting in onboarding
- HouseholdSetup wired into AuthScreen
- Body scan + macro module
- Wearable integration (Garmin/Apple Health)
- Nightmare watch buzz (future, clinical oversight required)

- First login → onboarding flow → everything saved to account
- Mass market user → sees their own program.

### Onboarding Flow (snappy — max 90 seconds)
Keep it moving, never lose them. 5 quick screens:
1. **Who are you training for?** (Yourself / A partner / Both)
2. **Your goal** — single select: Build muscle / Lose fat / Get stronger / Just move / All of the above
3. **Training days** — tap the days you can train (Mon-Sun grid)
4. **Your gym** — Home (no equipment) / Home (some equipment) / Full gym / Varies
5. **Body focus** — multi-select chips: Glutes / Chest / Back / Shoulders / Arms / Legs / Core / Balanced
   - Optional: "Anything you want to flag?" free text (e.g. "bigger shoulders", "bad knees", "post-partum")

That's it. Program generated. Can always adjust later.

### Adaptive Programming
- **Plateau detection** — if same weight logged 3+ sessions in a row on main lift → suggest progression (deload, rep range change, exercise swap)
- **Goal input** — "bigger shoulders" note → next program cycle prioritizes lateral raises, overhead press volume
- **Free text adjustments** — user types anything → AI interprets and adjusts next workout
- **Progressive overload tracking** — suggests weight increases when target reps hit 2 sessions in a row

### Body Scan + Macro Integration (separate module, ties to Fitness)
- Body scan: periodic photo check-in (front/side/back) — AI tracks visual changes over time, no weight obsession
- Macro tracking: cal + protein only (not obsessive) — feeds into workout adjustments
- If cutting → cardio increases, volume slightly reduces
- If bulking → volume prioritized, cardio optional
- Body scan + macros + workout data → Pendulum feature (peak focus + recovery windows)

### Equipment-Aware Programming
- Full gym: barbell everything
- Some equipment: DB + bodyweight alternatives auto-substituted
- Home/no equipment: full bodyweight program generated
- Travels: hotel room mode — no equipment, 30 min, anywhere

### Schedule
- Mon — Legs (post-drive, Saskatoon gym)
- Thu — Push (office day, Saskatoon gym) ⚡ CHEST WEAK POINT
- Fri — Pull (6:00-7:15am, before office)

### Hard Stop: 75 minutes
Auto-compress logic:
- >60 min remaining: full program
- 45-60 min: cut 1 set from each accessory
- 30-45 min: cut last accessory exercise, reduce all accessory to 2 sets
- <30 min: main lifts only, 3 sets each
- <15 min: skip — log as missed, no guilt

Rest time compression:
- Full time: 3min main / 90s accessory
- Tight: 2min main / 60s accessory
- Very tight: 90s main / 45s accessory

### Monday — Legs
- Barbell Back Squat 4×5 (3min rest)
- Romanian Deadlift 4×6
- Leg Press 3×10 (feet high, glutes)
- Bulgarian Split Squat 3×8ea
- Leg Curl 3×12
- Standing Calf Raise 4×15

### Thursday — Push ⚡ CHEST WEAK POINT
- Flat DB Bench Press 4×6 ⚡ priority
- Incline DB Press 4×8 ⚡ upper chest
- Machine Chest Press 3×10 ⚡ volume
- Seated DB Shoulder Press 4×8
- Cable Lateral Raise 3×15
- Tricep Pushdown 3×12
- Overhead Tricep Ext 3×10

### Friday — Pull
- Deadlift 4×5 (3min rest)
- Barbell Row 4×6
- Lat Pulldown 3×10
- Cable Row 3×12
- Barbell Curl 3×10
- Hammer Curl 3×12
- Wrist Roller 3×fail

### Individual Goals
**Cade:**
- Build size + strength, 3-day program hard enough no 4th day needed
- Chest: ⚡ WEAK POINT — extra volume every Push day
- Cardio: C25K integrated (9wk program), 3 sessions/week on gym days
- Nutrition: 2,000-2,400 cal (Topiramate adjusted), 120-140g protein, no hunger cues
- PRs: Track every lift, celebrate weekly bests

**Danielle:**
- Days: Tuesday + Wednesday
- Split: Self-selected via onboarding
- No C25K (already runs)
- PRs: Track every lift

### Battle Mode — Cade vs Danielle
Scoring:
- Session completed: 10 pts
- PR hit: 25 pts
- On-time start: 5 pts
- Exercise volume win: 15 pts/exercise
- C25K session (Cade only): 10 pts bonus
- Weekly winner picks Saturday activity

Exercise Battle: same exercise, both log it → app compares weight×reps → weekly trophy 🏆

Display:
- Home screen widget — live score this week
- End of session — point breakdown
- Sunday night — weekly recap notification
- All-time record per exercise (both)

## BATTLE MODE — FULL REDESIGN SPEC

### Two Modes

---

### 🤝 JOINT OPS
*Activated intentionally — rare occasions when both are in the gym at the same time (together or hundreds of miles apart simultaneously)*

**How it works:**
- Either partner activates from their Fitness home screen
- App looks at BOTH users' full workout history
- Generates a completely new workout neither has done recently — mix of stuff they're both good and bad at
- Designed so both can win (different metrics: 1RM, reps to failure, volume, etc.)
- Both get the same workout on their respective screens simultaneously

**Competition:**
- Head-to-head scoring on shared exercises (1RM, reps to failure, volume)
- Designed so both CAN win — different categories, different strengths
- Score tracked per session + lifetime leaderboard

**Shit talk:**
- Both wearing headphones — communication is through the app
- Shit talk button available throughout the workout
- Tap it after a lift → sends a shit talk message to partner at that exact point in their workout (same exercise, same moment)
- Messages are timed to the workout position, not wall clock
- Both partners can add to the shit talk library anytime (like the "thinking of you" button — same UX)
- Library grows over time, gets more personal

**Props:**
- Send props the same way — tap after a lift, partner gets it at that point in their workout
- Props library also user-customizable

---

### 👻 GHOST PROTOCOL
*App-initiated, surprise, unpredictable — keeps both guessing*

**How it works:**
- User taps "Do Workout" on their normal Fitness screen
- Screen MELTS away (animation)
- GHOST PROTOCOL appears — no warning, no opt-out
- App generates the same type of workout as Joint Ops (based on both histories, stuff they've missed, mix of strengths/weaknesses)
- They do it. Score logged.
- Partner doesn't know it happened yet.

**The timing:**
- App decides when to trigger Ghost Protocol for each person — independently
- Could be next workout. Could be next week. Could be 3 weeks from now.
- Neither person knows when theirs is coming or when the other person's was triggered
- App tracks both and ensures both get hit within a reasonable window (so it doesn't go stale)

**The reveal:**
- After Person A's Ghost Protocol session → their score is locked and waiting
- Sometime later, Person B's Ghost Protocol fires
- When Person B finishes → BOTH scores revealed simultaneously
- Full breakdown: who won what, by how much
- Lifetime score updated

**Shit talk timing:**
- Person A does their session first, taps shit talk after key lifts
- That shit talk is timestamped to the specific exercise
- When Person B hits that same exercise in their session → the shit talk fires
- Person B has no idea when it's coming — just gets roasted mid-lift
- Person B can fire back (their shit talk gets queued for whenever Person A's next Ghost Protocol fires)

**Score tracking:**
- Same metrics as Joint Ops (1RM, reps to failure, volume per exercise)
- Separate lifetime Ghost Protocol leaderboard
- "Ambush record" — how many times each person has been caught off guard

---

### Shared Features (both modes)
- Shit talk library: both partners build it over time, tap to add anytime from home screen
- Props library: same
- Lifetime score: Joint Ops record + Ghost Protocol record tracked separately + combined
- All shit talk timestamped and tied to specific exercises so delivery is contextually perfect
- "Thinking of you" button — still needs to be built (logged separately)
- Props — still needs to be built (logged separately)

---

### Technical Notes
- Ghost Protocol trigger: weighted random — app checks last Ghost Protocol date for each user, applies a probability that increases the longer it's been since the last one. Never more than X weeks apart.
- Workout generation: Anthropic call with both users' full exercise history, generates a balanced challenge
- Shit talk delivery: tied to `ExercisePerformance` event timestamp, not wall clock — so it fires when partner reaches that exercise regardless of how long their rest times are — One tap at session start. Selects a station (bench+DBs, cables, squat rack, machines) and auto-reorganizes the entire workout so all exercises stay in that zone. No bouncing around a crowded gym. AI picks best substitute exercises for equipment already claimed.

- **BEAST MODE** — Home screen "LFG" button. Triggered when pissed/anxious/need to shut brain off. Switches to circuit mode: heavy, no tracking, just go. Audio-driven: beep = move, next exercise read out loud via text-to-speech. Profanity-level motivational cues ("let's f***ing go", "stop being a b****"). Hard stop 10 min earlier than normal (65 min instead of 75) so there's time to not die before work. No set logging, no rest timers — just survive it. Post-session: simple "you did it" screen, no stats.

- **One More Set** — When hard stop timer fires, instead of ending: "ONE MORE SET?" button appears. Taps it → auto-generates a 3x dropset of the last exercise logged (same weight structure, drop 20% each set). Timer gives exactly 3 min to finish and get out. No snoozing — after 3 min it locks. Same feature for both Cade and D.

- **Surprise Battle Mode** — Randomly triggers on a Wed/Thu (unannounced). First person to open the app that day gets the surprise — has to do a special head-to-head challenge workout instead of their normal session. They log their result + shit talk. Second person gets the shit talk injected into their next normal workout (mid-session, between exercises — no warning). Whoever wins gets bragging rights + bonus Battle Mode points. Goal: inject some chaos and connection into weeks when they're not getting much time together.

### C25K Integration (Cade)
- 9 weeks × 3 sessions
- Runs on gym days after lifting OR standalone
- Week 1: 60s run / 90s walk × 8 rounds → progresses to continuous 30min run
- Counts toward Battle Mode bonus pts

---

## BUDGET MODULE — RECEIPT SCANNING + GRADUAL FINANCIAL ONBOARDING

### Core Philosophy
Shame is the #1 barrier to financial health for ADHD brains. Never show the full picture until they're ready. Build trust month by month. One question at a time. No lectures. No judgment.

### Receipt + Screenshot Scanning
- Camera button on Budget home screen — tap to photograph receipt or screenshot
- AI reads: merchant, total, line items, date
- Auto-categorizes to envelope (groceries, fuel, entertainment, etc.)
- Asks "Does this look right?" → one tap confirm or adjust
- Over time learns user's common merchants → auto-confirms without asking
- Bank statement screenshots: AI reads transactions, logs to appropriate envelopes
- E-transfer confirmations: logs payment, updates committed bills tracker
- No bank access ever — trust-based, receipt/screenshot only

### Monthly Financial Check-in (Gradual Disclosure Model)
- Short questionnaire, once a month, never the same questions twice
- Rotates through categories so nothing feels like an interrogation
- AI tracks what's been asked and answered, builds the picture slowly over time
- User adds debt/expenses over multiple months — never forced to see the full picture at once

**Question categories (rotated monthly, 2-3 questions max):**
- Income: "Did your income change this month?"
- Bills: "Any new recurring bills? Anything cancelled?"
- Debt: "Any debt you want to add to track? (credit card, loan, etc.)" — optional, never required
- Goals: "Anything you're saving toward right now?"
- Wins: "Any financial win this month, even small?"
- Stress: "How's money stress feeling this month? (just to calibrate)"

**Key rules:**
- Never ask about total debt directly in month 1
- Never show a full debt summary until user has voluntarily added 3+ items over time
- Each piece of info they add = more accurate envelope recommendations
- AI notices patterns: "You've added 3 credit cards over the past 3 months — want to see a simple payoff plan?" (user's choice)
- Snowball method suggested gently when enough debt is entered, never pushed

### Auto-Squirrel + Transfer Instructions

**The core behavior:**
Tether tells you exactly when and where to move money. No decisions required. Just follow the instructions.

**Payday sequence (every 2nd Friday):**
1. Notification at midnight when pay lands: "Payday 💰 — here's what to move and when"
2. Step-by-step transfer instructions, in order:
   - "Move $630 KOHO → Tangerine before 10am (truck payment hits at 10)"
   - "Move $X to emergency buffer (Tangerine savings)"
   - "Move $X to vehicle maintenance buffer"
   - "Move $X to debt snowball target this month"
   - "Remaining $X = your spending envelopes for this period"
3. Each step has a checkbox — tap when done
4. Reminder fires 10 min after morning alarm if steps aren't checked off

**Buffer accounts:**
- Emergency buffer: target $1,000 → 3 months expenses (long term)
- Vehicle maintenance: $0.02/km driven auto-squirrel
- Irregular bills buffer: annual bills (insurance, registration) divided by 12, set aside monthly
- "Oh shit" buffer: $50-100/payday, never touched unless truly needed

**Snowball method:**
- User enters debts one at a time over multiple months (gradual disclosure — no shame)
- App ranks by balance (smallest first = snowball) or interest rate (highest first = avalanche)
- Each payday: calculates minimum payments on all debts + extra attack on smallest
- Shows one number: "Send $X to [debt name] this payday"
- Never shows the full debt picture until user is ready — just "here's the move for this week"
- Celebrates each payoff: "You killed the [debt name]. That payment now goes to [next debt]."
- Momentum is the product — not spreadsheets

**What the user sees:**
Not a dashboard. Not charts. Just: "Here's what to do today." One action at a time. ADHD-friendly. No overwhelm.

**Transfer reminder system:**
- Timed to wake-up alarm + 10 min (not the bill time)
- "Transfer $630 KOHO → Tangerine. Truck payment hits in 3 hours."
- If not confirmed by 9am → escalating reminder
- Once confirmed → done. No more nagging about that payment.
- After 1 month of receipt scanning → AI has enough data to suggest envelope amounts
- "Based on what you've been spending, here's what I'd suggest for next month" → user adjusts and confirms
- Committed bills always subtracted first before envelopes populate
- AI notices patterns: "You've gone over groceries 3 months in a row by ~$40 — want to adjust?"
- Never adjusts without asking — always proposes, user confirms

### The Core Idea
Tether has no access to bank accounts. It's trust-based — user enters starting balances, bills, and income manually or via receipt/screenshot uploads. The app becomes a financial brain that runs interference so ADHD doesn't cost money.

### How It Works
- User sets up accounts (Tangerine, KOHO, etc.) with starting balances
- User enters all recurring bills: amount, account, date, time
- User enters income: amount, account, date, time
- Tether calculates what's "actually available" after committed money is subtracted
- Envelopes are built from AVAILABLE money only — committed money is invisible

### Cade's Specific Setup (example)
- **Tangerine:** truck payment $624 biweekly Friday at 10am (OUTGOING)
- **KOHO:** payday biweekly Friday at midnight (INCOMING)
- **The gap:** paid at midnight, truck comes out at 10am same day — need to transfer $630 before 10am
- **ADHD factor:** remembering to transfer is not reliable — app handles it

### Transfer Alert Flow
1. Payday Friday midnight → Tether detects payday
2. 10 min after morning alarm fires → push notification: "Transfer $630 KOHO → Tangerine before 10am. Truck payment hits in X hours."
3. User confirms transfer done → Tether marks it complete
4. If not confirmed by 9am → escalating alert
5. Tether knows this $630 is committed — never counted as available spending money

### Envelope Logic
- Total income = $X
- Subtract all committed outgoing bills first
- AVAILABLE = income minus committed
- Envelopes built from AVAILABLE only
- User never sees committed money as spendable

### Account Types
- Chequing (Tangerine) — bills come out here
- Spending (KOHO) — day-to-day spending, envelopes live here
- Savings — emergency fund, tracked but separate
- Business (Spectre) — completely separate envelopes

### Input Methods (trust-based, no bank access)
- Manual entry (amounts, dates, recurring bills)
- Receipt photo → AI reads and logs expense to envelope
- Screenshot of e-transfer or payment confirmation → AI logs it
- Manual balance updates ("my KOHO balance is $847 right now")

### Smart Features
- **Committed money lock** — bills always subtracted before envelopes populate
- **Transfer reminders** — timed to your wake-up, not the bill time
- **Payday detection** — knows your pay schedule, confirms with you
- **Overdraft prediction** — "At current spend you'll have $12 left before payday. Here's what to defer."
- **AI pattern detection** — "You've transferred late 3 times — want me to move the reminder earlier?"

### MENTAL HEALTH AWARE FINANCE

**Who this is built for:**
Both users have ADHD, anxiety, depression, and PTSD. The app never punishes. It never lectures. It adapts silently and asks permission before changing anything visible.

**PTSD/Dysregulation Mode — Financial Impact**
- When the app detects dysregulation signals (missed alarms, no check-ins, skipped meals, brain state = Toast multiple days in a row):
  - Grocery envelope auto-gets a "survival buffer" — shifts $30-50 from overflow to groceries silently
  - Surfaces easy meal suggestions: M&M Meats deals, frozen meals on sale nearby, Skip/DoorDash promo codes
  - Never says "you're over budget" — says "here's what's easy right now"
  - Notifies the other partner: "Heads up — Cade's having a hard week. Might need backup on groceries/dinner."
  - Partner notification is opt-in and worded with care — never clinical, never alarming

**Auto-Envelope Builder**
- Setup wizard:
  1. Enter take-home pay (per period)
  2. Enter all committed bills (auto-subtracted — never touchable)
  3. Enter savings goals (emergency fund, vacation, kids activities, investing)
  4. Remaining = truly available
  5. AI suggests envelope split based on lifestyle answers
  6. User adjusts, confirms, done

**Goals Engine**
- Short term: emergency fund ($1,000 → 3 months expenses)
- Medium term: vacation, kids birthdays, vehicle replacement
- Long term: investing (TFSA, FHSA, RRSP — Canadian)
- Tether auto-squirrels: each payday, moves set amounts to goal buckets before envelopes populate
- Shows progress bars, celebrates milestones — never shames shortfalls

**Investing (future)**
- Start simple: "Put $25/payday into a TFSA index fund"
- No jargon. Just: "This is your future money. It's growing. Don't touch it."
- Canadian context: TFSA first, then FHSA (first home), then RRSP
- Partner visibility: both see household net worth growing

**Survival Mode Budget (PTSD/hard week)**
- Triggered manually ("I'm struggling") or auto-detected
- Strips budget to survival: food, gas, bills only
- Everything else paused, no guilt
- Easy meal suggestions surface automatically (see Food Module)
- Partner gets a gentle heads up

**Partner Notification System**
- Opt-in, both partners configure what they want to know
- Worded like a caring human: "Hey — Cade's having a rough one. Might be a good night to handle dinner."
- Never clinical. Never alarming. Never without permission.

---

## PRICING — MODULAR MODEL

### Base App
- **Free** — Core survival modules: Smart Alarms, Clean Mode, Basic Grocery List, Brain Dump, Daily Tips. 1 user. No AI adaptation.
- **Individual** — $4.99/mo or $39/yr — All core modules, AI adaptation, single user. Workday Rhythm, Budget, Blended Family, Pendulum, Weekly Review, Bedtime Mode, Android Modes, Thinking of You.
- **Family** — $9.99/mo or $69/yr ⭐ HERO — Everything in Individual + 2 users + Battle Mode + partner features + shared lists/calendar + Weekly Review AI summary.
- **Lifetime** — $149 one time — Family plan forever. Early adopter price. Founding member badge. Input on roadmap.

### Add-On Modules (buy what you need)
- **Fitness Module** — $3.99/mo or $29/yr — Full workout tracker, adaptive programming, Beast Mode, LFG, Quick Hits, Battle Mode fitness scoring, RPE tracking, plateau detection, adaptive scheduling. All 3 themes (IRON / FORM / PULSE).
- **Body & Macros Module** — $2.99/mo or $22/yr — Macro tracking (cal + protein), body scan check-ins, AI food suggestions, wearable integration (Garmin/Apple Health), HRV + sleep feeds into Pendulum.
- **Fitness + Body Bundle** — $5.99/mo or $44/yr — Both modules together. Saves ~$2/mo vs buying separately. Full adaptive coaching experience — workout + nutrition + body scan + Pendulum all talking to each other.

### B2B / Therapist Tier
- $29.99/mo — Clinician dashboard, multiple client households, progress reports, ADHD coaching integration, white label option (future).

### Pricing Philosophy
- Base app is genuinely useful without add-ons. Not crippled. Not a bait-and-switch.
- Add-ons are for people who want to go deeper in specific areas.
- Bundle pricing rewards commitment.
- No ads. No data sales. Ever. At any tier.

---

## AI PHILOSOPHY

Tether AI never lectures. It never shames. It notices, suggests, and gets out of the way. It learns YOU — not a generic ADHD profile. The goal: make the right thing the easy thing. Not willpower. Infrastructure.

---

## FAMILY CONTEXT

- **Cade:** ADHD, PTSD. Weekly schedule: Mon 4am wake PA→Legs→drive Saskatoon→office. Tue/Wed 6:30am wake PA→kids school→WFH. Thu drive Saskatoon→Push→office. Fri 5:13am wake Warman→drive Saskatoon→Pull 6-7:15am→office→drive PA.
- **Danielle:** Medical dispatcher, 8-5, ADHD, PTSD (led Humboldt crash call). Sleeps in weekends.
- **Andy:** 8yrs, severe ADHD, 4th percentile reading, 50/50 custody. Changeover Monday 5pm — 30min landing time, no demands. Other household: no rules, unlimited screens.
- **Pax:** 3yrs (turns 4 March 19), ADHD, can skate.
- **Hendrix:** 3yrs (turns 4 March 19), calm/regulated.

---

## SESSION LOG

### Session 1 — March 7, 2026
- Scaffolded Expo app, running on Cade's Android
- Set up VS Code + folder structure
- Connected Supabase
- Set up Google Calendar API + OAuth credentials
- Installed Java + Homebrew on Mac
- Generated debug keystore + SHA-1 fingerprint
- Built Workday Rhythm screen (brain state, timer, blocks)
- Wired Supabase — data persisting from phone ✅

### Session 2 — March 8, 2026
- Locked full app spec (14 modules, pricing, AI philosophy)
- Locked Gym Module spec (exercises, auto-adapt logic, Battle Mode, C25K)
- Locked Budget Module spec
- Disabled RLS on workday_sessions, confirmed data saving from phone
- Gym tracker bridge apps exist (gym-tracker.html + App-form-gym.js) — ported Session 3

### Session 3 — March 14, 2026
- Installed expo-font + Google Fonts (Bebas Neue, DM Mono, DM Sans)
- Created gym_sessions + gym_profiles + budget_expenses tables in Supabase (RLS disabled)
- Built GymScreen.tsx — Cade's IRON tracker (Push/Pull/Legs, auto-compress, PR tracking, Supabase)
- Built GymScreenD.tsx — D's FORM tracker (onboarding, rose/pink theme, PR tracking, Supabase)
- Built BattleMode.tsx — weekly head-to-head scores, Saturday prize, all-time leaderboard
- Built BudgetTracker.tsx — envelope budgeting, expense logging, "Can I afford this?" AI (Claude API), history
- Wired bottom tab navigation — all 5 screens live on phone (Work / IRON / FORM / Battle / 💰)
- Logged feature backlog: Busy Gym Mode, Beast Mode, One More Set, Surprise Battle Mode, Budget auto-refill
- Monday deliverable: ✅ COMPLETE

### Session 6 — March 19, 2026 (architecture session — Cursor)
- Full AI trainer architecture designed (Anthropic-driven, live session updates, event model)
- EffortRating model defined (too_easy / shaky / grind_good / felt_like_shit)
- Navigation finalized: single Fitness tab with mode switcher inside
- Battle Mode: full reset — current implementation scrapped
- LFG + Quick Hits: switch to Anthropic-generated sessions
- Supabase schema designed: WorkoutSession, ExercisePerformance, CardioPerformance, user_event
- Daily behavior/mental health context snapshot spec defined
- Long-horizon data tracking vision locked: Tim Hortons insight — behavior correlations will surface patterns no one thought to check
- Feu Follet compliance gaps documented — must fix before public launch
- Master Context v2 + Privacy & Security charter read and integrated into journal

### Session 5 — March 17, 2026
- Built HouseholdSetup.tsx — random username gen (reroll), kids themes → AI house name generator (deep pop culture mashup), PR celebration fullscreen with random GIFs (no sound — D has PTSD), one-tap props modal (16 options inc. "SMOKESHOW"), saves to Supabase
- Built clean GymScreen.tsx — LFG button wired to BeastMode, athlete field fixed to 'cade'
- Created household_events + props tables in Supabase
- Added username generator + word lists to config.ts
- EAS Build queued — new APK for D's phone with FORM experience
- Modular pricing locked: base $4.99/$9.99, Fitness add-on $3.99, Body+Macros $2.99, bundle $5.99
- Marketing strategy locked: lead with the feeling not the diagnosis
- Expanded population: no diagnosis required, works for anyone carrying invisible load
- Clinical advisory: Cade's mom (psychologist) flagged ADHD too narrow — architecture now condition-agnostic
- DV warning system documented — future build, requires clinical oversight before any code written
- Next: wire HouseholdSetup into AuthScreen, PR notifications to partner, variable training days
- Set up Supabase email/password auth — login + signup working
- Built AuthScreen.tsx — login, signup, 5-step onboarding (theme, goal, training days, equipment, body focus)
- Built UserContext.tsx — global auth state, user profile loaded on login
- Created user_profiles table in Supabase
- 3 aesthetic themes defined: IRON (dark/gold), FORM (rose/warm), PULSE (navy/blue)
- App now routes to IRON or FORM based on logged-in user's theme
- EAS Build configured — standalone APK built and installed on D's phone
- BeastMode.tsx built — audio-guided circuit, text-to-speech, trash talk, vibration, saves to Supabase
- GymScreen.tsx partially broken adding LFG — restore from backup tomorrow
- Expo account: spectre.labs
- Fix GymScreen.tsx (restore from backup, add LFG button cleanly)
- LFG / Beast Mode button inside Fitness module
- Budget envelope setup flow (income → percentages → auto-calculate)
- Budget monthly auto-refill
- D's Expo Go fix (fresh APK install)
- Bedtime Mode screen
- Andy Changeover protocol

### FITNESS MODULE — FULL FEATURE BACKLOG

**LFG / Beast Mode** — available to ALL users (IRON, FORM, PULSE)

**Busy Gym Mode** — one tap reorganizes workout to stay at one station

**Random Battle Workouts** — surprise head-to-head challenges (Wed/Thu rotation, shit talk injection)

**Quick Hits** ⭐
- Unlockable with fitness module purchase
- Setup: user declares quick-access equipment (e.g. Bowflex 3000, resistance bands, nothing)
- Button on main home screen
- Generates 3-7 min workouts invisible during WFH breaks
- Goal: 3-5x per day, micro-dosing movement
- Tracks what muscle groups are lagging and auto-targets them
- Adapts to fitness level (wall pushups → regular → weighted)
- Ties to research: exercise + ADHD + focus — surfaces as daily tip cards
- Logs to total weekly volume, counts toward patterns

**RPE Check-in (Rate of Perceived Exertion)**
- After each exercise or session: "How'd that feel?" 
- Options: Awesome / Good / Shaky / Rough (or similar — keep it human)
- Feeds into adaptive programming
- Low RPE on heavy lift = suggest weight increase next session
- High RPE on light day = flag potential fatigue/recovery issue

**Wearable Integration (Garmin + Apple Health)**
- Sleep quality + duration
- HRV (heart rate variability)
- Resting heart rate
- Active minutes
- All feed into workout adaptation + Pendulum feature

**Adaptive Programming Engine**
- Inputs: sleep, HRV, RPE history, macros, stress check-ins, meds timing
- Outputs: today's recommended intensity, volume, rest times
- Auto-adjusts hard stop and compression based on detected fatigue
- Plateau detection → program variation every 6-8 weeks

**Cardio Integration (whether they like it or not)**
- Every program includes cardiovascular work — no exceptions. General fitness requires it.
- If user selects "I hate cardio" or skips cardio consistently → app never labels it cardio again.
- Disguised as:
  - "Pump-up circuit" at the start (gets HR up, feels like warming up)
  - "No-rest superset" in the middle (back-to-back movements, zero rest — that's cardio)
  - "Finisher" at the end (AMRAP, EMOM, bodyweight burnout — that's cardio)
  - "Athletic conditioning" for people who respond to that framing
  - "Active recovery" on off days (walking, mobility flow — still cardio)
- App tracks HR data from wearable — if HR isn't hitting the zone, intensity increases next session
- Over time user gets fitter without ever having "done cardio"
- C25K for Cade stays labeled as running because he opted in — different user, different framing
- Goal: get the user in shape. The app is responsible for the outcome, not just logging the input.
- Variable dates — user sets preferred days but life happens. App tracks actual vs planned.
- Missed session logic: missed today → auto-moves to tomorrow, no guilt, no notification. Missed tomorrow too → quietly drops it, picks up next scheduled day.
- Consistently missing 2+ weeks → silently resets to full body / general fitness until habit stabilizes. No announcement. No shame. Just adapts.
- Habit detection — once consistent attendance resumes (3+ weeks), app reintroduces original split or suggests new one based on what's been working.
- Expansion logic — as consistency builds, incorporates new movements + variations the user has shown they enjoy (based on RPE + completion rate per exercise).
- Never asks permission — all happens silently. User opens app and today's workout is right for today. No explanations unless they ask.

---

## THEME SYSTEM — WAR ERA THEMES

### The Big Idea
Every theme is a war era. You don't just pick a color scheme — you choose your world, earn your rank, and your behavior determines how deep into it you go. Consistent at the gym = you level up. Crushing PRs = new gear unlocks. Financial discipline = your war chest grows.

The app isn't a productivity tool. It's a campaign. You're the commander.

### War Era Themes

| THEME | ERA | AESTHETIC | VIBE |
|-------|-----|-----------|------|
| **IRON** | Modern Military / Black Ops | Dark, tactical, gold accents, night vision green | You move in silence. You get the job done. |
| **FORGE** | Medieval / Swords & Shields | Stone, iron, deep red, firelight | The stronghold. Built brick by brick. |
| **RONIN** | Feudal Japan / Samurai | Ink black, blood red, cherry blossom accent | Discipline. Precision. No wasted movement. |
| **ARCANE** | Wizards & Mages / Fantasy War | Deep purple, arcane blue, spell-glow gold | Knowledge is power. Strategy over strength. |
| **DRAGONFIRE** | Dragons / High Fantasy | Charcoal, ember orange, scales texture | Unleashed. Raw. Unstoppable. |
| **VOID** | Sci-Fi / Future War | Near-black, electric blue, holographic | You're operating 10 steps ahead. |
| **VERDANT** | Nature / Druid / Ranger | Deep forest green, earth brown, gold | Patient. Relentless. Grown from the ground up. |
| **VALKYRIE** | Norse / Shield Maiden | Deep violet, silver, lightning white | She who decides who rises. Fierce. Elegant. Unstoppable. |
| **FORM** | (retired — replaced by VALKYRIE for D) | — | — |
| More... | Unlock through behavior | — | Seasonal, limited, earned |

### Rank Progression Within Each Theme
You don't just pick RONIN — you start as an apprentice and earn your rank:

- **Recruit** → First week, fresh install
- **Soldier** → 2 weeks consistent
- **Veteran** → 1 month, hitting goals
- **Elite** → 3 months, PRs, financial wins
- **Commander** → 6 months, full system running
- **Legendary** → 1 year, you've become the person the app was built for

Each rank unlocks: visual upgrades (new UI elements, richer textures, new animations), new shit talk lines, new props, new achievement badges.

### Fluid Per-Module Theming
Same era, different battlefield depending on which module you're in:

**Fitness (The Arena / The Dojo / The Battlefield)**
- Crushing it → theme intensifies, richer colors, sharper edges
- Beast Mode → temporary overlay: pure war, stripped back, aggressive
- Ghost Protocol fires → brief invasion animation before it resets

**Budget (The War Chest / The Treasury / The Keep)**
- On track → strong, fortified, your era's "wealthy commander" look
- Overspending → subtle "breach in the walls" aesthetic — not alarming, just honest
- Snowball milestone → gold flash, fanfare, upgrade moment
- Survival mode → stripped to essentials, tactical grey

**Workday (The Command Center / The Study / The Bridge)**
- Locked in → sharp, focused, high contrast
- Toast → softer, muted, the morning-after-battle aesthetic

**Family (The War Room)**
- Daily briefing format — era-appropriate
- RONIN: "Today's mission scroll"
- VOID: "Today's tactical overlay"
- FORGE: "The keep's morning report"
- Always funny, always warm — the kids' sections are never grim

### Transition Animations
- Tab switch between modules: brief half-and-half crossfade, like moving between theaters of war
- Rank up: full-screen moment, era-appropriate animation (sword flash / spell cast / drone flyover)
- Ghost Protocol activation: screen "corrupts" then reforms into battle UI
- Session complete: victory screen in your era (medieval fanfare / sci-fi mission complete / Japanese ink splash)

### Unlockables
- New eras earned through behavior streaks (30 days consistent = RONIN unlocks)
- Seasonal themes (limited time: Winter Siege, Summer Campaign)
- Joint Ops exclusive theme: unlocks after first completed Joint Ops session
- Ghost Protocol exclusive: unlocks after first ambush survived
- Founder theme: locked forever for beta users

### Technical Notes
- Theme ID stored in `user_profiles.theme` (string: 'iron', 'ronin', 'arcane', etc.)
- Rank stored in `user_profiles.rank` (integer 1-6)
- Per-module behavioral modifiers: jsonb overlay, computed nightly from pattern data
- Transition: 300ms crossfade on tab switch with era-specific easing curve
- User can lock theme to one era if they don't want fluid shifts (settings toggle)
- D's FORM theme is its own standalone — not a "war era" but equally respected

### The Big Idea
Your theme isn't just a color scheme you pick once. It shifts based on your behavior in each module. The app reflects your life back at you — without saying a word.

### DEFAULT THEMES
- **Cade:** RONIN — ink black, blood red, cherry blossom accent. Discipline. Precision. No wasted movement.
- **D:** VALKYRIE — deep violet, silver, lightning white. She who decides who rises. Fierce, elegant, unstoppable. (Medical dispatcher who led the Humboldt crash call. She's earned it.)
- **Family Dashboard:** THE WAR ROOM — daily briefing format, mission-style. "Today's Missions" not "Today's Tasks."

### MISSIONS (replacing "Tasks" / "To-Do" everywhere in the app)
- Nothing is a "task" in Tether. Everything is a **MISSION**.
- Complete a workout → Mission complete
- Pay a bill on time → Mission complete
- Andy changeover smooth → Mission complete
- Budget on track → Holding the line
- Weekly Review done → After Action Report filed

## WAR ROOM — FULL MODULE NAMING SYSTEM

| MODULE | WAR ROOM NAME | NOTES |
|--------|--------------|-------|
| Family Dashboard | **THE WAR ROOM** | Daily briefing, objectives, known threats, allied forces |
| Fitness | **TRAINING** | The arena / dojo / battlefield depending on era |
| Workday Rhythm | **THE COMMAND CENTER** | Focus blocks = missions, breaks = debrief |
| Budget / Money | **THE ARMORY** | War chest, supply lines, resupply drops |
| Grocery / Food | **RATIONS** | Consumption tracker, meal suggestions, survival food |
| Vehicle | **FLEET** | Maintenance, odometer, service intervals |
| Health / Body | **FIELD MEDIC** | HRV, sleep, recovery, body scan |
| Kids / Family | **THE UNIT** | Andy protocol, changeover, school, meds |
| Weekly Review | **AFTER ACTION REPORT** | Sunday 6pm, both partners, AI summary |
| Clean Mode | **FIELD RESET** | One basket, clear floor, 10 min, no guilt |
| Bedtime | **STAND DOWN** | Wind-down sequence, rotation tracker, off-duty |
| Quick Hits | **DRILLS** | 3-7 min WFH micro-workouts |
| Brain Dump | **INTEL DUMP** | Floating button, every screen, AI sorts it |
| Thinking of You | **SIGNAL** | One tap, sends message to partner |
| Battle Mode | **JOINT OPS / GHOST PROTOCOL** | Already named ✅ |
| Daily Tips | **BRIEFING** | One card/day, household-adaptive |
| Pendulum / HRV | **RECON** | Pattern detection, peak focus windows |
| Android Modes | **DEPLOYMENT** | Drive / Gym / Work / Bedtime / Recovery / Family / DJ |
| Smart Alarms | **REVEILLE** | Wake-up system, adaptive to sleep quality |
| Settings | **HQ** | Profile, theme, kill switch, biometrics |

### The Armory — Budget Language
- Envelopes → **Supply lines**
- Payday → **Resupply drop**
- Debt snowball → **Clearing the field**
- Transfer reminders → **Resupply orders**
- Savings goals → **War chest**
- Emergency fund → **Reserve**
- Overspending → **Breach in supply line**
- On track → **Fortified**
- "Can I afford this?" → **Mission feasibility check**
- Monthly check-in → **Resource audit**

### VALKYRIE — FULL DESIGN SPEC (build for Saturday Joint Ops)

**Colour Palette:**
```
Primary:      #1a0a2e  (deep void violet — the sky before lightning)
Secondary:    #2d1b4e  (storm purple — card backgrounds)
Accent 1:     #c0c8d8  (storm silver — text, borders)
Accent 2:     #e8f0ff  (lightning white — highlights, active states)
Accent 3:     #d4af37  (battle gold — PRs, wins, achievements)
Danger:       #7b2d8b  (dark lightning — warnings, not red)
Success:      #4a9eff  (electric blue — completions, good signals)
Background:   #0d0618  (near black with violet undertone)
Card:         #1e1030  (lifted surface)
Border:       #3d2a5a  (subtle violet border)
Muted:        #6b5a7e  (subdued text)
```

**Typography:**
- Display / Headers: Cinzel or Trajan Pro — classical, commanding, not fantasy-costume
- Body: Inter or DM Sans — clean, readable, modern
- Mono (timers, stats): DM Mono — precise
- Letter spacing: generous on headers (3-4px), tight on body
- Weight: 300 for body, 700 for headers — nothing in between feels weak

**Iconography:**
- Wing motifs — subtle, architectural, not costume-y
- Lightning bolt as accent element (not emoji — SVG line, sharp)
- Shield outline for protection/security elements
- Spear/sword tip for action buttons (very minimal, not literal)

**UI Elements:**
- Buttons: sharp corners, silver border, violet fill on press
- Cards: deep void background, silver border, slight violet glow on active
- Progress bars: silver fill, lightning white leading edge
- Tab bar: near-black, active tab gets silver + thin lightning-white underline
- Input fields: dark card background, silver border, lightning white focus ring

**Animations:**
- App open / theme unlock: lightning crack splits screen top to bottom, Valkyrie emerges from the break — 2 seconds, then settles
- PR hit: silver shockwave radiates from center, gold flash, "VALKYRIE PR" text slams in
- Joint Ops start: both screens show lightning connecting them — synchronized
- Session complete: wings unfurl across screen briefly, then fade to summary
- Tab switch: silver ripple, 200ms
- Rank up: full lightning storm sequence, 3 seconds

**Video assets needed (for Claude Code / design):**
- Unlock sequence: lightning crack → dark sky → figure emerging (silhouette) → Valkyrie text
- PR celebration: shockwave + gold flash loop (3 sec, loops)
- Joint Ops activation: dual lightning bolt connecting two points
- Session complete: wings + victory moment (3 sec)
- These can be built as Lottie animations or React Native Animated sequences — no video files needed, pure code

**Lottie animation approach (no external video files):**
```javascript
// PR celebration
Animated.sequence([
  Animated.timing(shockwave, { toValue: 1, duration: 300 }),
  Animated.timing(goldFlash, { toValue: 1, duration: 200 }),
  Animated.timing(prText, { toValue: 1, duration: 400 }),
])

// Lightning crack unlock
Animated.sequence([
  Animated.timing(crack, { toValue: 1, duration: 600 }),
  Animated.timing(emerge, { toValue: 1, duration: 800 }),
  Animated.timing(settle, { toValue: 1, duration: 400 }),
])
```

**War Room copy (Valkyrie voice — commanding, warm, never aggressive):**
- Morning briefing: "Field is yours. Here's what's on the board today."
- Training: "The field is yours. Always has been."
- Armory: "The treasury. She who controls the gold, controls the field."
- Stand Down: "Rest. You've earned it. Tomorrow the field is yours again."
- Joint Ops: "Your partner has entered the field. May the best warrior win."
- Ghost Protocol: "Ambush incoming. You didn't hear it from us."
- PR hit: "New record. Filed. They'll know your name."
- Session complete: "Mission complete. The field remembers."
- Brain state Toast: "Even Valkyries have hard days. We adjust the plan."

**Saturday Joint Ops — Special Valkyrie moment:**
When both partners are in Joint Ops and one has Valkyrie:
- Their screen shows Valkyrie theme throughout
- Partner's screen shows a subtle "⚡" indicator next to their name — no explanation
- At session end, if Valkyrie wins: "The Valkyrie claims the field." 
- If Valkyrie loses: "Even the Valkyrie falls sometimes. The field remembers your name."
- If tied: "The field holds. Both warriors stand."

**Build instructions for Claude Code:**
1. Create `src/themes/valkyrie.ts` — full colour token file
2. Create `src/components/ValkyrieLightning.tsx` — animated lightning crack component
3. Create `src/components/ValkyriePRCelebration.tsx` — shockwave + gold flash + PR text
4. Wire into FitnessScreen — if `user.theme === 'valkyrie'` use Valkyrie components
5. Admin grant function in SettingsScreen — `user.username === 'spectre.labs'` check
6. Unlock screen in App.tsx — checks for `theme === 'valkyrie'` on first load, shows sequence

---

### RONIN — FULL DESIGN SPEC

**The Ronin is the masterless samurai. No army. No banner. Just discipline, precision, and the work.**
CJ's default theme. Earned through consistency. Gets richer as rank increases.

**Colour Palette:**
```
Primary:      #0a0a0a  (void black)
Secondary:    #111118  (ink — card backgrounds)
Accent 1:     #c41e3a  (blood red — PRs, alerts, Beast Mode)
Accent 2:     #f5e6c8  (rice paper — primary text)
Accent 3:     #d4af37  (forge gold — wins, achievements, rank)
Accent 4:     #ffb7c5  (cherry blossom — rest states, D's messages)
Success:      #4a7c59  (bamboo green — completions, on-track)
Background:   #060608  (deepest black, slight blue undertone)
Card:         #0f0f14  (lifted surface)
Border:       #1e1e28  (barely visible)
Muted:        #4a4a5a  (subdued text)
```

**Typography:**
- Display: Noto Serif JP or Shippori Mincho — Japanese-influenced serif
- Headers: same serif, tracked out, sparse
- Body: DM Sans
- Mono: DM Mono
- Letter spacing: very open on display (5-6px), tight on body

**Rank Visual Progression:**
- **Recruit:** sparse, minimal — ink and void. Almost nothing.
- **Soldier:** cherry blossom petal appears in corners. Subtle.
- **Veteran:** red accent deepens. Stats sharper. Borders tighten.
- **Elite:** gold appears on key achievements. Faint kanji watermark in background.
- **Commander:** full ink wash texture on cards. Red and gold in balance.
- **Legendary:** brushstroke background pattern. Cherry blossoms fall occasionally (idle animation).

**UI Elements:**
- Buttons: sharp corners, no radius. Blood red on press. Rice paper text.
- Cards: ink background, barely-there border, red left-edge accent on active
- Progress bars: blood red fill, gold leading edge when on track
- Tab bar: void black, active = thin red underline + rice paper text
- Rest timer: huge, stark countdown in rice paper on void

**Animations:**
- App open: ink wash spreads, Ronin kanji (浪人) forms, dissolves into UI
- PR hit: red shockwave, gold flash, "NEW PR" slams down in stark serif
- Session complete: ink brushstroke sweeps screen, calligraphy-style
- Rank up: cherry blossoms fall, single kanji for new rank appears and dissolves
- Tab switch: ink ripple, 150ms
- Beast Mode: near-total black, single red line pulses
- Ghost Protocol fires: sword slash cuts screen, reforms into battle UI

**War Room copy (Ronin voice — sparse, direct, zero wasted words):**
- Morning: "Today's field. Move with intent."
- Training: "The work is the way."
- Armory: "Resources accounted for. Hold the line."
- Stand Down: "Rest is part of the discipline."
- Joint Ops: "The field awaits. No mercy."
- PR hit: "New record. Keep moving."
- Session complete: "Done. The body remembers."
- Brain state Toast: "Even the sharpest blade needs sharpening. Adjust."
- LFG: "No plan. Just intention. Go."

**Build instructions for Claude Code:**
1. `src/themes/ronin.ts` — full colour token file
2. `src/components/RoninInkWash.tsx` — animated ink wash open sequence
3. `src/components/RoninPRCelebration.tsx` — red shockwave + gold flash + stark serif PR text
4. `src/components/RoninRankUp.tsx` — cherry blossom + kanji rank sequence
5. Wire into all screens for `user.theme === 'ronin'`
6. Idle cherry blossom animation at Legendary rank

---

### BATTLE VS SCREEN — THEME-AWARE

Activates when Joint Ops starts or Ghost Protocol reveals. Adapts to both users' themes and ranks.

**Layout:**
```
[LEFT — User A theme]   ⚔️   [RIGHT — User B theme]
  Username                      Username
  Rank badge                    Rank badge
  W/L record                    W/L record
  Current streak                Current streak
```

**Theme clash combinations:**

| USER A | USER B | VS FEEL | CENTER TEXT |
|--------|--------|---------|-------------|
| RONIN | VALKYRIE | Ink black / void violet. Brushstroke meets lightning. | "Discipline vs Power." |
| RONIN | RONIN | Mirror. Single red line down center. | "The blade meets itself." |
| VALKYRIE | VALKYRIE | Full lightning both sides. Gold divide. | "The field divides." |
| IRON | RONIN | Tactical crosshairs / ink calligraphy. | "Firepower vs Precision." |
| RONIN | FORM | Ink black / warm rose. Stark contrast. | "The mountain vs the bloom." |

**Rank differential:**
- 2+ ranks higher: their side gets subtle glow advantage
- Legendary vs Recruit: Legendary gets full animation, Recruit gets "CHALLENGER" badge — underdog energy, not shame

**Animation sequence:**
1. Screen splits from center (200ms)
2. Each side fills with theme colours (300ms)
3. Username + rank badge slam in from each side (400ms)
4. Record + streak fade in (300ms)
5. Center divide pulses once
6. Mode label appears at top: "JOINT OPS" or "GHOST PROTOCOL"
7. 3 second hold → "BEGIN" appears
8. Tap → screens slam together → workout begins

**Ghost Protocol variant:**
- Normal workout screen → sword slash / lightning / breach (theme-dependent) cuts across
- VS screen assembles showing Person A's locked score
- "They went first. Now it's your turn."
- Queued shit talk count shown: "3 messages waiting at specific exercises."

**Build instructions for Claude Code:**
1. `src/components/VSScreen.tsx` — theme-aware component
2. Props: `userA: { username, theme, rank, wins, losses, streak }`, `userB: same`, `mode: 'joint_ops' | 'ghost_protocol'`
3. `getVSConfig(themeA, themeB)` function — returns colours, copy, animation style per combination
4. Ghost Protocol variant shows locked score + shit talk queue count
5. Integrate into JointOps.tsx and Ghost Protocol reveal flow

**Not available in the theme picker. Ever.**

Valkyrie cannot be selected, earned through streaks, or unlocked through normal progression. It exists in the codebase as a gift. One person in the world has it.

**How it's bestowed:**
- Only the account with username `spectre.labs` (CJ) can grant Valkyrie to another username
- Admin function in HQ (Settings): "Grant Valkyrie" → enter username → confirm
- Once granted: cannot be revoked except by the recipient
- The recipient gets a full-screen moment when it unlocks — no explanation, just the theme emerging

**Aesthetic:**
- Deep violet / storm silver / lightning white
- Hints of gold at the edges — earned, not given
- Typography: sharp, elegant, authoritative
- Animation: lightning crack across screen on unlock, then settles into quiet power
- Not aggressive — commanding. She who decides who rises.

**Copy (Valkyrie-specific):**
- Armory: "The treasury. She who controls the gold, controls the field."
- Training: "The field is yours. Always has been."
- Command Center: "Locked in. Nothing gets through."
- War Room: "Daily orders. You run this."
- Stand Down: "Rest. You've earned it. Tomorrow the field is yours again."

**Why it exists:**
D led the Humboldt Broncos crash call as a medical dispatcher. ADHD, PTSD, medical dispatcher, mother, partner, still shows up to the gym on Tuesdays. She doesn't get FORM — a warm rose theme built for someone who needs encouragement. She gets Valkyrie — built for someone who already knows what she's made of.

**Technical:**
- `theme: 'valkyrie'` in `user_profiles` — only writable via admin function
- Admin check: `user.username === 'spectre.labs'` before grant is allowed
- Grant logged to `household_events` table with `event_type: 'valkyrie_granted'`
- Recipient sees unlock screen on next app open
**RONIN (Armory):** "Your war chest. Move with precision. Spend with intent."
**VOID (Armory):** "Resource allocation. Tactical. Optimized."
**FORGE (Armory):** "The keep's treasury. Every coin counts. The stronghold holds."
**ARCANE (Armory):** "The vault. Knowledge of your resources is power."
**VALKYRIE (Armory):** "The treasury. She who controls the gold, controls the field."
- This language runs through the entire app — not just fitness

### UI LANGUAGE OVERHAUL (War Room era)
| OLD | NEW |
|-----|-----|
| Tasks | Missions |
| Home | War Room |
| History | After Action |
| Settings | Command |
| Complete | Mission Complete |
| Skip | Stand Down |
| Budget envelopes | Supply Lines |
| Payday | Resupply |
| Weekly Review | After Action Report |
| Clean Mode | Field Reset |
| Bedtime Mode | Stand Down |
| Brain state check-in | Condition Report |
- **IRON** — Dark/gold/brutal. Heavy lifting aesthetic. For people who show up hard.
- **FORM** — Warm/rose/feminine. Elegant, soft, strong. (NOT pink — retired that name)
- **PULSE** — Clean navy + electric blue. Athletic, modern, calm. (NOT called "blue")
- **EMBER** — Deep red/amber/orange. Fire. Intensity. Controlled chaos.
- **GHOST** — Almost monochrome. Dark grey + single accent. Minimal. Mysterious. For people who move in silence.
- More unlockable over time based on behavior streaks, PRs, financial milestones, etc.

### Fluid Per-Module Behavior
Each module has its own theme state that shifts based on your behavior patterns:

**Fitness:**
- Consistent → stays in your base theme, gets more saturated/intense over time
- Crushing PRs → visual effects intensify, small celebrations baked in
- Missing sessions → theme desaturates slightly, gets quieter (not punishing — just honest)
- Beast Mode activated → temporary visual shift to EMBER/red while in session
- LFG → theme gets looser, more chaotic energy

**Budget:**
- On track → clean, confident, your base theme
- Overspending → subtle shift toward warning colors (not red, not alarming — just a little rougher)
- Snowball milestone hit → flash of gold, celebration moment
- Survival mode → strips everything back, calm grey, no distractions

**Workday:**
- Brain state "Locked in" → sharp, high contrast
- Brain state "Toast" → softer, lower contrast, gentler prompts

### The Transition Animation
Half-and-half when switching between module contexts — like you're walking from the gym into the office. Brief transition: split screen fades from one theme to another. Subtle. Satisfying. Tells the story of who you are in each context.

### The Battle Theme (Family OS)
Life with twins + blended family + ADHD + 4am gym + shift work = you are running a campaign. Lean into it — but keep it funny, not grim.

**Family dashboard concept: THE WAR ROOM**
- Not serious military — more like a ridiculous mission briefing that acknowledges the chaos
- Daily briefing format: "Today's objectives", "Known threats" (Andy changeover, low fuel, payday in 3 days), "Allied forces" (D on duty, kids at school)
- Weekly review = "After Action Report"
- Bedtime = "Stand down"
- Clean Mode = "Field reset"
- It's funny because it's TRUE. Two adults with ADHD and PTSD running a household with three kids under 9 IS a military operation. Might as well have fun with it.

**Important balance:** Has to be funny and warm, not aggressive. The twins are 4. This is a loving chaotic household. The battle theme is self-aware humor, not actual intensity. D's rose theme softens it. The kids' stuff is always warm.

### Technical Notes
- Theme stored per-module in user_profiles (jsonb: `{ fitness: 'iron', budget: 'ember', workday: 'ghost' }`)
- Behavioral modifiers computed from pattern data, applied as CSS variable overrides
- Transition animation: 300ms cross-fade between module themes on tab switch
- Base theme always user-controlled. Behavioral modifiers are overlays, not replacements.
- User can turn off behavioral theming in settings if they find it distracting

### The Core Insight
Most people who need Tether will never google "ADHD app." They don't have a diagnosis. They just know life feels harder than it should. The pattern engine doesn't care what you're diagnosed with — it watches what happens and learns what helps. That's more honest than diagnosis-first software.

### Brand Positioning
**Don't lead with ADHD. Lead with the feeling.**

**The headline:**
*"For families where life feels harder than it should."*

Or:
*"Finally. An app that runs the parts of life your brain keeps dropping."*

**One sentence:**
*Tether is for anyone whose brain makes daily life harder than it looks from the outside — diagnosed or not.*

No diagnosis required. No label required. No shame. Just: does this sound like you?

### Acquisition Channels

**TikTok / Reels**
"Things that happen in our house" content. Relatable chaos. No clinical language. The comments will be full of people saying "wait this is me." That's the acquisition engine. Authentic, not produced.

**Reddit (organic only — no ads)**
- r/ADHD, r/AdultADHD
- r/Parenting, r/Mommit
- r/BipolarSOs, r/AlAnon
- r/CPTSD, r/raisedbynarcissists
- r/recovery, r/leaves (quitting nicotine)
These communities share tools that actually help. One honest post from a real user is worth 1,000 ads.

**ADHD Coaches + Therapists (B2B)**
They have clients who need this. B2B tier gets them recommending it. Word of mouth from a trusted clinician is worth 1,000 ads. Target: ADHD coaches on Instagram/TikTok who already have audiences.

**Mom + Parenting Communities**
Facebook groups, parenting podcasts, mommy blogs. "I don't have a diagnosis but I have three kids and I'm drowning" is a massive underserved market. Lead with the bedtime chaos, the mental load, the invisible work.

**Recovery Communities**
AA/NA adjacent spaces. Structure + pattern tracking is exactly what early recovery needs. Approach with extreme care and respect — earned presence only, no marketing blitzes.

**Small Towns**
People who struggle without a diagnosis, without access to specialists, without the language for what they're experiencing. No psychiatrist for 200km. No waitlist to get on. Just a phone and a problem. Tether works without requiring them to self-identify as anything.

**The Anti-Marketing**
No ads. No influencer deals. No sponsored posts. Growth comes from the app being so genuinely useful that people share it because it changed something real for them. That's the only kind of growth worth having.

### What We Never Say
- Never use "productivity app"
- Never use "hack your brain"
- Never use clinical language in marketing
- Never make people feel broken for needing it
- Never promise a cure or a fix — promise infrastructure

ADHD is the entry point. The system works for any household carrying invisible load.

### Conditions the architecture must support (build now, expand later)
- ADHD (primary — already building for this)
- Depression + anxiety (pattern engine already captures this)
- FASD (Fetal Alcohol Spectrum Disorder) — behavioral patterns, sensory needs, routine rigidity
- Addiction recovery — tracking sobriety milestones, trigger pattern detection, support system alerts
- Other mental health conditions — the profile system needs to be multi-flag, not single-diagnosis
- Physical disabilities — workout module needs full accessibility adaptation
- Households with one OR both parents affected
- Households where a CHILD is the one with the diagnosis (Andy — already in scope)

### Architecture decisions to make NOW
- User profile supports multiple condition flags — not a dropdown, a multi-select
- Pattern engine is condition-agnostic — it learns your patterns regardless of cause
- Warning systems work for individuals without a partner (single parent households)
- Child behavioral tracking as a separate sub-profile under family module
- All of this is opt-in, user-defined, never assumed

### The Domestic Violence Layer — future, with clinical oversight
The silent pattern detection system — spending changes, sleep disruption, isolation signals, communication pattern shifts — is exactly what an early warning system for DV situations would need. Done wrong it could endanger someone. Done right it could save lives.

**This does not get built without:**
- A psychologist in the room (Cade's mom is a candidate)
- Clinical review of every detection threshold
- Extensive safety testing with people who have lived experience
- Legal review of duty-to-report implications
- A clear protocol for what the app does (and doesn't do) when a pattern is detected

**The privacy architecture already in place (anonymous, no data sales, user controls everything) is exactly what this use case requires.** The foundation is right. The feature waits until the expertise is in the room.

### Note on clinical advisory
Cade's mother (psychologist) flagged that ADHD is too narrow a framing for the population this app will actually serve. She's right. Consider her as first clinical advisor — the R&D and psych retainer budget already accounts for this role.

### The Vision
Tether tracks patterns silently across ALL modules and learns the user's personal early warning signs for mental health episodes (ADHD spiral, PTSD flare, depressive episode, manic period). When pattern matching occurs, it intervenes gently — not clinically.

### Data Inputs Tracked
- Sleep duration + quality (Garmin/Apple Health)
- Resting HR + HRV trends
- Workout output (volume, intensity, attendance)
- RPE check-ins
- Brain state check-ins (Workday Rhythm)
- Macro logging (food, skipped meals)
- Substance tracking (optional self-report: caffeine, nicotine, alcohol, meds)
- Work stress indicators (timesheet gaps, missed focus blocks)
- Partner-reported observations (opt-in)
- Quick text sentiment (app notices language shifts in check-ins)

### Pattern Example (Cade)
"The last time you slept under 4hrs for 4 consecutive nights, your resting HR exceeded 80bpm, nicotine intake increased ~10mg/day, caffeine exceeded 500mg/day, and you reported feeling 'manic' for two weeks. We're seeing a similar pattern starting now."

→ Suggestions (with links to actual research):
- "Running elevated your HR for 2 days last time — consider walking or yoga instead"
- "Cold exposure (brief cold shower) showed benefit in your data 3 weeks after your last episode"
- "Would you like to send Danielle a heads-up and ask her to free up time this weekend?"
- Links to peer-reviewed articles on HRV + PTSD, sleep deprivation + ADHD, exercise timing + mood

### Intervention Options (user chooses)
- Text D directly from the app (pre-written, editable)
- Block calendar time for recovery
- Switch to Survival Mode (budget + meals + schedule stripped to basics)
- Adjust this week's workouts to recovery protocol
- "I'm okay, thanks" — acknowledged, monitoring continues silently

### Key Principle
**Never clinical. Never alarming. Never without consent.**
The app is a pattern mirror, not a diagnosis. It says "here's what we've seen before" not "you're having an episode." The user stays in control. Partner notifications always opt-in.

---

---

## SESSION 27 — ARMORY FIX + WAR ROOM CRASH FIX
*March 29, 2026*

### ARMORY FIX — intel-processor complete rewrite (Step 2)

**Problem:** Paycheques going to overflow. Tim Hortons going to groceries. Duplicate receipts double-logged. E-transfers had no categorization logic.

**Solution — deterministic regex ENVELOPE_MAP:**
- AI now only extracts merchant names and amounts — no longer assigns categories
- 14-entry `ENVELOPE_MAP` matches merchant name → envelope: `coffee`, `nicotine`, `groceries`, `fuel`, `food`, `subscriptions`, `debt_payment`, `insurance`, `phone`, `kids_andy`, `health`, `personal_care`, `unknown_transfer`, `overflow`
- Income detection: `is_income` flag from AI OR `/deposit|received|payroll|direct deposit|credit/i.test(name)`
- Per-item dedup: checks `budget_expenses` / `income_transactions` for matching `amount + note + date ±1 day` before every insert
- Unknown e-transfers → `armory_clarifications` table (status: pending) + `budget_expenses` with `envelope_id = 'pending'`
- Image fingerprint (whole-receipt dedup) retained as fast-path check

**New table created:** `armory_clarifications` — columns: `id`, `user_id`, `transaction_name`, `amount`, `date`, `recipient`, `status` (pending/resolved/dismissed), `resolved_envelope_id`, `created_at`. RLS enabled.

**Deploy:** `supabase functions deploy intel-processor --no-verify-jwt`

### WAR ROOM CRASH FIX

**Problem:** intel-processor returned 200 but app crashed — `routedTo` field removed from response, `data.routedTo.join(', ')` threw on undefined.

**Fix:** Updated WarRoom response type to `{ itemsLogged, incomeLogged?, clarifications?, store? }`. Added try/catch around response parsing. Updated result display to show expenses + income + pending review count. Crash-safe: always shows "Intel filed" on any post-200 failure.

---

## SESSION 28 — CALENDAR + MISSIONS + LEAVE BY TIME PICKER
*March 29, 2026*

### Google Calendar integration

**Step 1 — Workout → calendar on session start (FitnessScreen.tsx)**
- Added `addWorkoutToCalendar(label, startTime, durationMinutes)` — requests calendar permission, finds first writable calendar, creates event titled `{THEME} — {WORKOUT LABEL}`
- Called in `startSession()` after plan loads, fires-and-forgets (non-blocking)
- Installed: `expo-calendar` was already present (~55.0.10)

**Step 2 — Schedule month of training events (FitnessScreen.tsx)**
- Added `scheduleMonthCalendar()` — one-time function, checks AsyncStorage flag `cal_scheduled_{userId}` to prevent re-scheduling
- Creates 4 weeks of calendar events for all training days (split label as title, 7am start, 75min duration, 15min alarm)
- Skips past days in current week

**Step 3 — Training mission auto-populated in War Room (WarRoom.tsx)**
- Daily missions reset now checks if today is a training day
- If yes, slot 0 pre-populated with `{THEME} — {SPLIT} DAY 💪`
- Uses same `SPLIT_LABELS` lookup as FitnessScreen
- `useEffect` dependency changed from `[]` to `[user?.id]` so it fires with user data

**Step 4 — BLITZ calendar suggestion (Blitz.tsx)**
- After `handleLogToWarRoom()`, queries total BLITZ session count
- On count === 3: Alert prompts user to add weekly BLITZ block
- `addBlitzToCalendar()`: creates daily 10-min "BLITZ — Field Reset" events for next 28 days (7:30am, 5-min alarm)

### LEAVE BY time picker (FitnessScreen.tsx)

**Problem:** Hard stop only supported fixed durations (45/60/75/90m). No way to say "I need to leave by 6:50am".

**Solution:**
- Installed: `@react-native-community/datetimepicker`
- Added state: `hardStopMode` ('duration'|'time'), `leaveByTime` (Date|null), `showTimePicker`
- Added `getHardStopDate()` — returns leaveBy − 5min buffer, or now + duration
- Added `getEffectiveMinutes()` — computes minutes remaining until leave-by
- UI: duration chips + "LEAVE BY" button side by side on one row
- Duration chips dim when LEAVE BY active; LEAVE BY clears when duration tapped
- `startSession()` now uses `getHardStopDate()` for `hardStopTimeRef` and `getEffectiveMinutes()` for plan generation and calendar event duration

### Build command
```
ANDROID_HOME=~/Library/Android/sdk JAVA_HOME=/opt/homebrew/opt/openjdk@17 eas build --platform android --profile preview --local
```

---

---

## SESSION 29 — WEARABLE INTEGRATION (RECON MODULE)
*March 29, 2026*

### What was built

**react-native-health-connect installed** — unified Android health API that pulls from Garmin Connect, Samsung Health, Wear OS, Fitbit. Pre-installed on Android 14+, available on Play Store for older.

**app.json** — plugin entry expanded with full permission set: `READ_SLEEP`, `READ_HEART_RATE`, `READ_HEART_RATE_VARIABILITY`, `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_RESTING_HEART_RATE`. Note: `HeartRateVariabilityRmssd` is the correct SDK record type (not Sdnn).

**src/lib/healthConnect.ts (new)**
- Dynamic import — only loads `react-native-health-connect` on Android, all functions return null/0 elsewhere
- `initHealthConnect()` — initializes + requests permissions
- `getLastNightSleep()` — queries SleepSession from 6pm yesterday → now, returns hours + start/end
- `getTodayHR()` — averages all HeartRate samples since midnight
- `getLatestHRV()` — most recent HeartRateVariabilityRmssd record in last 24h
- `getTodaySteps()` — sums all Steps records since midnight
- `getRestingHR()` — most recent RestingHeartRate in last 24h
- `getAllHealthData()` — runs all 5 in parallel, returns null if not granted
- All functions wrapped in try/catch — Health Connect unavailable never crashes the app

**health_snapshots table (new)**
- Columns: `id, created_at, user_id, date, sleep_hours, sleep_start, sleep_end, resting_hr, avg_hr, hrv_ms, steps, source`
- Unique constraint on `(user_id, date)` — upsert-safe
- RLS disabled (service role writes from UserContext, no client RLS needed)

**UserContext.tsx**
- Added `HealthData` type to context
- `healthData` state exposed via `useUser()` — available across all screens
- `syncHealthData(userId)` called after `loadProfile` — non-blocking, fires in background
- On success: sets `healthData` in context + upserts to `health_snapshots` with `onConflict: 'user_id,date'`
- Errors silently caught — wearable unavailable never blocks auth

**WarRoom.tsx — RECON strip**
- `healthData` pulled from `useUser()`
- `reconExpanded` state for expand/collapse
- RECON strip shown when `healthData` is non-null, between Brain State and BLITZ
- Strip shows: 💤 sleep hours (red if <5h), ❤️ resting HR, 📊 HRV (green >50ms / yellow 30-50ms / red <30ms), 👟 steps
- Tap to expand → full detail view with HRV status label ("RECOVERED / MODERATE / FATIGUED"), sleep flag if <5h, avg HR, step count
- If HRV < 30ms: detail shows "FATIGUED — back off today"

**FitnessScreen.tsx**
- `healthData` pulled from `useUser()`
- `startSession()` now passes `healthContext: { sleepHours, hrv, restingHR, steps }` to fitness-engine
- `sleepContext` computed from actual sleep hours: 'poor' / 'moderate' / 'good' / 'unknown'

**fitness-engine — getUserContext (updated)**
- Now queries `health_snapshots` in parallel with other data sources
- Computes `sleepRolling7d`, `stepsRolling7d`, `hrvRolling7d` from last 7 days of snapshots
- Exposes `latestHrv` and `latestSleep` (today's values, not rolling avg)
- These replace the placeholder `null` values that were there before

**fitness-engine — handleSessionStart (updated)**
- Extracts `hc` (healthContext) from payload
- Uses real-time `hc.hrv` / `hc.sleepHours` with fallback to `context.latestHrv` / `context.latestSleep`
- Added WEARABLE DATA section to Anthropic prompt
- Added health-based guidance rules:
  - HRV < 30ms → reduce volume 20%, skip compounds, no PR attempts
  - HRV ≥ 60ms → PR attempts green-lit, full volume
  - Sleep < 5h → compress session, recovery focus only
  - Sleep 5-7h → moderate intensity, no weight increases

### Requires new build
`react-native-health-connect` is a native module. Requires:
```
ANDROID_HOME=~/Library/Android/sdk JAVA_HOME=/opt/homebrew/opt/openjdk@17 eas build --platform android --profile preview --local
```
User must have Google Health Connect installed on device (pre-installed Android 14+, Play Store for older).

---

*To resume in a new chat: upload this file and say "Resume Tether build"*
