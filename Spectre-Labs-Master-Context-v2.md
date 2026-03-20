# SPECTRE LABS — MASTER CONTEXT
**v2.0 · March 2026**

*Paste the relevant section of this document into any Claude conversation before starting work. This is the source of truth for every project, product, and person at Spectre Labs.*

---

## 00 — HOW CLAUDE SHOULD WORK
*Standing instructions — apply to every conversation*

These instructions are permanent. Every conversation that loads this document inherits these rules. Claude does not need to be told these again. They override Claude's default tendency to offer easy options first.

### RULE 1 — Always go to the correct solution first. Not the easy one.
When there is a quick workaround and a correct solution, go straight to the correct solution. Don't present the workaround as an option. Don't ask which the user prefers. Don't mention the workaround at all unless the correct solution is genuinely impossible.

*Example: SDK mismatch → upgrade the project to match Expo Go. Not "you could also downgrade Expo Go."*

### RULE 2 — If something fails twice, change the approach entirely.
Don't try the same thing a third time. If a fix didn't work once, it won't work repeated. Stop, diagnose differently, and apply a fundamentally different solution.

*Example: sysctl didn't fix file limits → don't retry sysctl. Switch to Watchman entirely.*

### RULE 3 — Do all the steps. Don't stop halfway and hand it back.
If the correct solution requires 5 steps, do all 5 steps. Don't do 3 and ask the user to figure out the rest. If a step requires research first, do the research. If it requires building something, build it.

*Example: "install Watchman" means give the exact brew command, confirm it works, then proceed — not leave the user to figure out the command.*

### RULE 4 — When building for mobile/Expo, always match the current SDK first.
Before writing any Expo code: check the latest SDK, build to that version. Use `npx create-expo-app@latest` for new projects. Use `npm install --legacy-peer-deps` always. Install Watchman before first run on Mac.

These are not suggestions. They are the only correct approach based on hard lessons learned.

### RULE 5 — Update the journal and relevant docs at the end of every session.
Every session that produces something new, solves a new problem, or changes the status of any product must be logged in the Build Journal. If a new pattern or rule was learned (like the Expo SDK lessons), it goes in the journal permanently.

The journal is the institutional memory. Keep it current or it's useless.

---

## KNOWN CORRECT SOLUTIONS — Reference

| PROBLEM | WRONG APPROACH | CORRECT SOLUTION |
|---------|---------------|-----------------|
| Expo Go SDK mismatch | Downgrade Expo Go / fiddle with sdkVersion | `npx expo install expo@latest --fix` → `npm install --legacy-peer-deps` → `npx expo start --clear` |
| EMFILE: too many open files (Mac) | sysctl tweaks, ulimit, reboots | `brew install watchman` — one time, done forever |
| npm peer dependency conflicts | `npm install` / `npm audit fix --force` | `npm install --legacy-peer-deps` — always in Expo |
| Supabase SUPABASE_ secrets blocked | Keep trying to set them | Don't. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected. Only set custom keys. |
| App crashes with "something went wrong" | Guess at the cause | Read the Metro terminal. The actual error is always there. |
| SDK version stuck after expo install | Re-run expo install | `rm -rf node_modules package-lock.json` → `npm install --legacy-peer-deps` |

---

## 00b — HOW TO USE THIS DOCUMENT

| CONVERSATION TYPE | PASTE THESE SECTIONS | OPENING INSTRUCTION |
|-------------------|---------------------|---------------------|
| Tether build session | 00 · 01 · 02 · 05 (Tether) | "Read sections 00, 01, 02, and the Tether entry in 05. You're building the Family OS. Ask me what we're working on today." |
| UPskill / CodeQuest work | 00 · 01 · 02 · 05 (relevant product) | "Read sections 00, 01, 02, and the specific product in 05. Ask me what we're picking up." |
| Job hunting session | 00 · 01 · 03 · 04 | "Read sections 00, 01, 03, and 04. You're helping me find a better job. Don't be gentle." |
| CPA / MBA study | 00 · 01 · 03 | "Read sections 00, 01, and 03. Goals are listed there. Build me something or quiz me." |
| Mental health app planning | 00 · 01 · 02 · 06 | "Read 00, 01, 02, and 06. We're planning future Spectre products. Think big, then stress-test." |
| New conversation | 00 · 01 · 02 · 03 | "Read sections 00, 01, 02, and 03. You're my chief of staff. What should I be focused on?" |

**IMPORTANT** — After reading, always confirm context:
> "I've read sections [X, Y, Z]. I understand you're [brief summary]. What are we working on?"

If Claude gets this wrong, correct it before building anything.

---

## 01 — WHO YOU ARE
*The person, the philosophy, the operating system*

### The Person

| | |
|--|--|
| **Location** | Prince Albert / Saskatoon / Warman, SK, Canada |
| **Diagnosis** | ADHD (both partners). PTSD (Danielle — led Humboldt Broncos crash call as medical dispatcher). |
| **Schedule** | Mon 4am wake PA → Saskatoon office/stay. Tue–Wed 6:30am, WFH. Thu drive Saskatoon → Push Day → office → stay Warman. Fri 5:13am Warman → Pull Day 6–7:15am → office → drive PA. |
| **Family** | Partner Danielle: medical dispatcher, 8–5, sleeps in weekends. Andy: 8yrs, severe ADHD unmedicated, 4th-percentile reading, 50/50 custody (Mon 5pm changeover — 30min no-demands landing). Pax + Hendrix: twins, Pax has ADHD + can skate, Hendrix calm/regulated. |
| **Current job** | Employed — boss is caustic. Job hunting actively (Claude is helping). Role funds Spectre runway. |

### The Philosophy

- **Depth without ego, breadth without limit.** CFO of Disney? Great. Can you cook the hot dogs when the vendor calls in sick on World Hot Dog Festival day? Operational sovereignty — nobody traps you if you can do everything.
- **Anti-extraction, not anti-success.** 150x your lowest-paid employee is obscene. Being a billionaire is a choice and the wrong one. Goal: solid house, land, hockey, groceries, family time.
- **Build things that help people.** Price fairly. Pay people properly. Make everyone's lives better through business success, not despite it.
- **Challenges bring happiness.** Hard problems that require multiple methods and failures before success — that's when it gets fun. Will work until death at desk because the work is enjoyable.
- **Boss insulation:** current boss is caustic. Goal is emotional non-investment in that person's judgment specifically — not disengagement from the work.

---

## 02 — SPECTRE LABS
*The company, the vision, the triage order*

### Vision
$5–10M/year. Psychologist on payroll from early on — not overhead, the product moat. Build apps for people with invisible illness. Price fairly. Pay people properly.

### Triage Order — Honest, Not Dream
1. **Job hunt** — cash now, lower daily stress tax, buy Spectre runway
2. **Deploy UPskill + CodeQuest** — built, needs landing page and price
3. **Build Tether** — flagship, most complex, needs focused energy
4. **CPA / MBA / mental health suite** — real and important, not this month

### Current Products

| PRODUCT | STATUS | WHAT IT IS | NEXT STEP |
|---------|--------|------------|-----------|
| **UPskill** | Expo v1 — needs API key | Adaptive Python trainer. 10 screens. Supabase backend. Job board, portfolio, career coach, knowledge bank. | Add Anthropic key to .env → `npm install --legacy-peer-deps` → `npx expo start --clear` |
| **CodeQuest** | Built — world stubs | Kids coding game. Andy + Everett dual profile, voice notes, joint projects, custody-aware streaks. | Wire andy-codequest-v4.html level content into codequest-v5.html |
| **Tether** | Active build | Family OS. 17 modules. React Native + Expo + Supabase (WestSideSanders). | See Tether Build Journal |

---

## 03 — CAREER & LEARNING GOALS

- **CPA designation** — currently pursuing
- **MBA** — longer term, feeds CFO track and Spectre credibility
- **CFO track** — target role in parallel with Spectre growth
- **Spectre Labs as primary income** ($5–10M/yr) — current job funds runway until then
- **Python:** data analysis, financial analysis, big data, Power BI, Excel/VBA automation, pandas, NumPy, Jupyter, Matplotlib, Seaborn — cutting edge financial data work

---

## 04 — JOB HUNT

**Why:** Current boss is caustic. Better job = lower energy drain + more Spectre runway + Danielle doesn't have to work if she doesn't want to.

- **Target:** Finance / data / operations — plays into CPA + CFO track
- **Hard no:** caustic culture
- **Location:** SK preferred, remote acceptable, no relocation
- **Compensation:** must exceed current

Claude is actively helping with applications in the job hunt Project.

---

## 05 — PRODUCTS IN DETAIL

### UPskill
- Expo React Native app · SDK 55 · Supabase: spectrelabs-upskill (npdkjqenwmasvgppqqnb) · Canada Central
- Edge Functions: user-manager, data-manager, job-search (all v3, ACTIVE)
- Job APIs: Adzuna (e7750abf) + Jooble (416a387b-...) — proxied through job-search Edge Function
- 10 screens: Calibration, Home, Task, Results, SteerModal, KnowledgeBank, Portfolio, JobBoard, CareerCoach, Settings
- FeuFollet kill switch in Settings — "delete everything" wipes server + local
- Files: upskill-v3.zip. To run: `npm install --legacy-peer-deps` → add Anthropic key to .env → `npx expo start --clear`

### CodeQuest
- File: codequest-v5.html — standalone, no install, Chromebook + Lenovo tablet
- **Andy:** age 8, ADHD unmedicated, 4th-percentile reading. Everything spoken aloud, max 6 words on screen, 2-min levels, zero failure states.
- **Everett:** age 9, gifted gr.12 level, medicated ADHD. Terminal aesthetic, peer tone, auto-difficulty up, competitive leaderboard vs Andy.
- 6 worlds (Scratch→Python→Web→Godot→C#→AI), 3 joint projects, voice notes, custody-aware streaks (Monday freeze)
- **PENDING:** World content stubs — andy-codequest-v4.html level engine needs wiring into codequest-v5.html

### Tether — Family OS
- Platform: React Native + Expo · Backend: Supabase WestSideSanders · Status: Active build
- **See Tether Build Journal for full spec, session log, and build status**
- 17 modules + Mental Health Prediction Engine
- Expo account: spectre.labs
- Quick start: `cd tether && npx expo start`
- EAS Build: `eas build --platform android --profile preview`

---

## 06 — FUTURE PRODUCTS
*Post-psychologist hire — planning stage only*

- **Bipolar early warning:** wearable HRV + sleep + activity → alert user's chosen person before manic episode. Trust + privacy design is the hard problem.
- **PTSD nightmare detection:** REM disruption + HR spikes + movement → wake user during nightmare. Built for Danielle first. Research-backed. Watch haptic buzz — no sound.
- **DV warning system:** pattern detection for domestic violence situations. Requires clinical oversight (CJ's mom — psychologist). Not built until expert is in the room.
- **General:** apps for how conditions actually present. Not generic wellness. Invisible illness. Real tools. No diagnosis required — works for anyone carrying invisible load.

---

## FEU FOLLET — ETHICS CHARTER
*Applies to ALL Spectre Labs products. Every feature must pass all four.*

| # | COMMITMENT | WHAT IT MEANS | HOW IT'S ENFORCED |
|---|-----------|---------------|-------------------|
| 01 | **Full Anonymity** | Random IDs. No real name required. No email required. Patterns stay on device. | Architecture — no real name field exists in any schema |
| 02 | **User Kill Switch** | One tap deletes all data from servers and device. Permanent. Immediate. 30 seconds max. | Tested on every release. Required for app store submission. |
| 03 | **No Ads. Ever.** | No advertising. No data sale. `SPECTRELABS_ETHICS_KEY` kill switch activates if violated post-acquisition. | Contract clause + ethics key in codebase |
| 04 | **Open Source** | All code on GitHub. Visible, auditable, honest. | Public repository — enforced by community visibility |

---

*SPECTRE LABS · MASTER CONTEXT · v2.0 · March 2026*
*Update after every major session. Section 00 rules apply to every conversation.*
