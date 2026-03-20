# TETHER — BUILD JOURNAL
*Last updated: March 19, 2026 (Session 10)*

---

## ⚡ QUICK REFERENCE

**Start dev server:** `cd tether && npx expo start` → scan QR with Expo Go
**EAS Build (standalone APK):** `eas build --platform android --profile preview`
**Expo account:** spectre.labs
**Resume in new chat:** Upload this file + Spectre-Labs-Master-Context-v2.docx + Spectre_Labs_Privacy_and_security.docx and say "Read the project files. We're on Tether. Confirm build status and ask me what we're working on."

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
- ✅ Expo app scaffolded (SDK 55, TypeScript) — running live on Cade's Android via Expo Go
- ✅ VS Code set up with folder structure (src/screens, src/lib, src/components)
- ✅ Supabase project created (WestSideSanders, Canada Central)
- ✅ Supabase client connected (src/lib/supabase.ts)
- ✅ RLS disabled for development
- ✅ Google Calendar API enabled + OAuth 2.0 credentials created
- ✅ Java + Homebrew installed on Mac
- ✅ Debug keystore generated (SHA-1 fingerprint registered in Google Cloud)
- ⬜ Expo Go on D's phone (old version, needs fresh APK install)
- ⬜ Bottom tab navigation shell
- ⬜ Google Calendar fully wired into app

### Screens Built
- ✅ **Workday Rhythm** (`src/screens/WorkdayRhythm.tsx`)
  - Brain state check-in: Locked in / Okay / Scattered / Toast
  - 52-minute focus timer with auto-switch to 17-min break
  - Block counter
  - Saves brain_state + blocks_completed to Supabase `workday_sessions` table
- ✅ **FitnessScreen** (`src/screens/FitnessScreen.tsx`) — replaces GymScreen + GymScreenD
  - Single screen, all modes inside: LFG / Beast Mode / Quick Hits / Joint Ops
  - IRON (dark/gold) + FORM (rose/warm) themes driven by `user.theme`
  - Anthropic-powered: `session_start`, `set_completed`, `exercise_skipped`, `session_end` events
  - Auto rest timer, EffortSelector (4 chips), PR badge, adjustments card, sneaky cardio prompt
  - Hard stop picker (45/60/75/90 min chips), mode grid on home screen
  - All data keyed to `user.id` — Feu Follet compliant
- ✅ **EffortSelector** (`src/components/EffortSelector.tsx`)
  - 2×2 chip grid: Too easy / Shaky / Grind but good / That felt like shit
  - `accentColor` prop for IRON/FORM theming
- ✅ **AuthScreen** (`src/screens/AuthScreen.tsx`) — full Feu Follet rewrite (Session 8)
  - Auto-generated codename (generateUsername) with reroll
  - Password always required; email optional, labelled clearly
  - Biometrics: Face ID / Touch ID via expo-local-authentication + expo-secure-store
  - Anonymous auth path (no email → signInAnonymously)
- ✅ **BattleMode** (`src/screens/BattleMode.tsx`) — ⚠️ LEGACY, pending redesign
  - Still queries `gym_sessions` with hardcoded `athlete` strings — Feu Follet violation
  - Scheduled for full redesign (see TODO)
- ✅ **Bottom tab navigation** (Work / Fitness / Budget)

### Supabase Tables
- ✅ `workday_sessions` — id, created_at, brain_state, blocks_completed, date
- ✅ `workout_sessions` — id, user_id, started_at, ended_at, label, mode, planned_by_ai
- ✅ `exercise_performance` — session_id, exercise_name, set_index, weight, reps, effort, is_pr
- ✅ `user_profiles` — id, username, theme, goals, training_days, equipment, body_focus, notes, house_name, kids_themes
- ⚠️ `gym_sessions` — legacy table, still used by BattleMode. Pending removal after Battle Mode redesign.
- ⚠️ `gym_profiles` — legacy table. Pending removal.

### Supabase Edge Functions
- ✅ `fitness-engine` — live at `https://rzutjhmaoagjdrjefvzh.supabase.co/functions/v1/fitness-engine`
  - Handles: session_start, set_completed, exercise_skipped, session_end
  - Calls Anthropic (claude-sonnet-4-20250514) for live plan adaptation
  - PR detection server-side via exercise_performance history
  - Fallback plans (Mon–Fri) if Anthropic unavailable
  - `ANTHROPIC_API_KEY` set as Supabase secret ✅

### Pending Modules
- ⬜ Budget Tracker ("can I afford this?" AI feature)
- ⬜ Expo Go on D's phone

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

### Immediate (next build session)
1. **Spotify** — add Client ID to config.ts, test OAuth flow, shared playlist, add-track, partner sync. Infrastructure already built.
2. **Budget Tracker** — envelope budgeting, no bank access, "can I afford this?" AI.
3. **Test on devices** — D's phone (FORM, full session, Joint Ops invite), Cade's (IRON, LFG, PR detection, shit talk)

### Architecture (before public launch)
- **user_event table** — event-first data model for long-horizon pattern detection
- **SPECTRELABS_ETHICS_KEY** — add to codebase. Feu Follet commitment 03.
- **GitHub repo public** — Feu Follet commitment 04.
- **RLS on all tables** — currently disabled for dev. Must enable before launch. Feu Follet compliance.
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
- D logs in → sees FORM. Cade logs in → sees IRON. Mass market user → sees their own program.

### Aesthetic Themes (3 options at onboarding)
- **IRON** — Cade's current dark/gold/brutal aesthetic
- **FORM** — D's current warm rose/cream/feminine aesthetic  
- **PULSE** — New option: clean, minimal, modern. Dark navy + electric blue. Athletic but not aggressive. Works for anyone.

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

## BUDGET MODULE — FULL VISION

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

## MARKETING & BRAND POSITIONING

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

*To resume in a new chat: upload this file and say "Resume Tether build"*
