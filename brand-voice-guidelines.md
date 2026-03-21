# Spectre Labs Brand Voice Guidelines

## Generation Metadata

- **Document Version:** 1.0
- **Generated:** March 20, 2026
- **Company:** Spectre Labs
- **Analysis Scope:** 2 source documents (founder statements + product specifications)
- **Confidence Levels:** High (voice, messaging, terminology) | Medium (tone matrix, language patterns) | Low (social media specifics, crisis communication)
- **Primary Use:** Content creation (cold outreach, product descriptions, ethics/privacy communication, internal/operational messaging)
- **Last Updated:** March 20, 2026

---

## Executive Summary

Spectre Labs is not a wellness company. It is an operational solutions company for people living with invisible illness—ADHD, PTSD, and related conditions that don't announce themselves but shape every day. Our brand voice reflects our founders' lived experience: pragmatic, protective, technically grounded, and fiercely committed to people over profit.

We speak like operators who understand the gap between what people actually need and what the wellness industry sells them. We're direct without being harsh, protective without being patronizing. We've built a company where a psychologist is on payroll from day one (not overhead—our product moat), where "pricing fairly" and "paying people properly" are not nice-to-haves but first-principles commitments, and where code is observable proof that we mean what we say.

When we communicate, we communicate like people who've seen both sides: CJ building products with ADHD, Danielle responding to crisis as a first responder with PTSD, two kids with ADHD at the dinner table. Our voice bridges technical credibility with human specificity. We say "Andy, age 8, ADHD unmedicated, 4th-percentile reading" instead of "users." We ship code you can audit instead of making promises you have to trust. We delete data like we mean it: 30 seconds, no recovery, no exceptions.

---

## We Are / We Are Not (Confidence: High)

| We Are | We Are Not |
|--------|------------|
| **Operational** — We solve specific problems for specific people in specific conditions. Hard tactical. | **Aspirational** — We don't sell you a better self or a "wellness journey." That's not what invisible illness needs. |
| **Protective** — We refuse to monetize user vulnerability. "Will not ever." Ethics are in code, not contracts. | **Permissive** — We don't give users multiple privacy choices—we choose privacy for them by default. No opt-in. No exceptions. |
| **Technically Credible** — We name API keys, Supabase, Edge Functions, encryption specifics. We verify, not claim. | **Mystical** — We don't hide behind corporate language or pretend our tech is magic. It's observable. |
| **Humanistic & Grounded** — Real people: Andy (8yrs), Danielle (PTSD), our kids, hockey games, hot dogs, family dinner. | **Corporate** — We're not a brand. We're a company founded by people who live this. The founder's family is in the product. |
| **Transparent About Limits** — We say what we won't do, what we can't do, and why. We show the code. | **Hyperbolic** — We don't claim to be "game-changing" or "revolutionary." We build things that help people. That's enough. |

### Voice Attributes Detail

#### 1. Operational / No-Nonsense (Confidence: High)

**What it means:** We prioritize what works over what sounds good. We speak in conditional logic, triage order, and verifiable specifics. No workarounds, no vague promises.

**How it shows up:**
- Direct language: "Hard no." "This is the triage order." "Conditional: if user hasn't provided email, deletion works identically."
- Numbered lists, status flags (PENDING/ACTIVE), tactical sequencing
- Specific product constraints tied to real use cases: "Zero failure states. Max 6 words on screen. 2-min levels."
- No hedging: "We will not monetise that vulnerability. Ever." (not "we're committed to protecting privacy")

**What to avoid:**
- Softening language: "we hope to," "we strive for," "we're working on" (when you've already shipped)
- Vagaries: "best in class," "leading edge," "comprehensive"
- Passive voice in commitments: "data is protected" instead of "we do not store data"

**Evidence quote:**
> "CFO of Disney? Great. Can you cook the hot dogs when the vendor calls in sick on World Hot Dog Festival day?" — CJ
> 
> This captures the operational mindset: credentials don't matter if you can't execute the actual work.

**Confidence:** High (explicit in founder statements + product specifications demonstrate consistent execution)

---

#### 2. Protective / Anti-Extraction (Confidence: High)

**What it means:** We exist to prevent harm, not to extract value from vulnerability. Users with invisible illness generate uniquely sensitive and uniquely valuable data. We refuse to monetize that asymmetry.

**How it shows up:**
- Absolute statements about ethics: "will not monetise that vulnerability. Ever."
- Kill switches in code (SPECTRELABS_ETHICS_KEY) — not philosophy, not contracts, not intentions. Code.
- "Delete All My Data" is not aspirational. It deletes in 30 seconds, zero recovery, always works.
- Anonymity by default: "If a user does not provide an email, they are fully anonymous. The product works identically."
- "Operational sovereignty" — users retain control, no lock-in, no hidden dependencies.

**What to avoid:**
- Trust-building language that implies we could extract but choose not to: "we respect your privacy" (implies choice)
- Phrases that position privacy as a feature: "privacy-first" (should be assumed, not marketed)
- Opt-in privacy framing: Users shouldn't "choose" privacy; privacy should be the default system

**Evidence quote:**
> "These users generate data that is uniquely sensitive and uniquely valuable to advertisers. Spectre Labs will not monetise that vulnerability. Ever."
> 
> Also: "Operational sovereignty." The company refuses dependency relationships that could force compromise.

**Confidence:** High (appears across both documents, embedded in product architecture)

---

#### 3. Humanistic / Grounded (Confidence: High)

**What it means:** We're grounded in real people, real conditions, real life. Not abstract wellness. We know ADHD parents who've been fired. We know PTSD. We know what 8-year-olds with unmedicated ADHD need on screen.

**How it shows up:**
- Named users: "Andy (CJ's son): age 8, ADHD unmedicated, 4th-percentile reading. Everything spoken aloud, max 6 words on screen, 2-min levels, zero failure states."
- Danielle's PTSD. Our two kids. Hockey. Hot dogs.
- Practical specificity: "max 2 minutes per level" (not "user-friendly")
- Acknowledging constraint as feature: "Challenges bring happiness." (Naming that difficulty itself is part of learning)

**What to avoid:**
- Generic wellness language: "holistic," "mindful," "self-care," "wellness journey," "empowerment"
- Abstract empathy: "we understand" without saying how/why
- "Users" without context — say condition, age, specific constraint

**Evidence quote:**
> "Build things that help people. Price fairly. Pay people properly."
> 
> And: "Andy: age 8, ADHD unmedicated, 4th-percentile reading. Everything spoken aloud, max 6 words on screen, 2-min levels, zero failure states."

**Confidence:** High (explicit in founder mission + detailed in product specs)

---

#### 4. Technically Credible (Confidence: High)

**What it means:** We don't hide the engine. We name the tech, the trade-offs, the constraints. Verifiable over claimed.

**How it shows up:**
- Named technologies: "Supabase," "Edge Functions," "encryption specs," "API keys"
- Open source code as proof: "When users can see that no advertising SDK is in the codebase, that the deletion function actually deletes everything, and that the anonymity system genuinely never stores a real name—they don't have to trust the promise. They can verify it."
- Trade-offs named: If we can't do something, we say so. If a feature is expensive, we explain why.
- Code is documentation: Show what you mean, don't just say it.

**What to avoid:**
- Black-box claims: "powered by AI," "proprietary algorithm," "our secret sauce"
- Jargon without definition
- Vagueness about data handling: "we secure your data" instead of specifics
- Hiding limitations: Every product has trade-offs. Name them.

**Evidence quote:**
> "Open source code is observable reality. When users can see that no advertising SDK is in the codebase, that the deletion function actually deletes everything, and that the anonymity system genuinely never stores a real name—they don't have to trust the promise. They can verify it."

**Confidence:** High (demonstrated across product specs and architecture)

---

#### 5. Transparent / Observable (Confidence: High)

**What it means:** Trust comes from verification, not promises. Show the code. Show the numbers. Make reality observable.

**How it shows up:**
- Open source first: Code is observable proof of intent
- Salary transparency: "150x your lowest-paid employee is obscene. Being a billionaire is a choice and the wrong one."
- Showing the work: How deletion works, how anonymity works, what dependencies exist, what we don't store
- Publishing constraints: Max 6 words on screen. 2-minute levels. Zero failure states.
- Acknowledging failures: We don't hide when we get it wrong.

**What to avoid:**
- Corporate speak that hides decisions: "best practices," "standards-compliant," "industry-leading"
- Promises without verification: "we promise," "trust us," "you can rely on"
- Selective transparency: Showing only the good numbers or hiding trade-offs
- Passive voice: "mistakes were made" instead of "we got this wrong"

**Evidence quote:**
> "Open source code is observable reality."
> 
> Also: The entire mission statement reflects this — specific commitments that can be verified: pricing is published, code is auditable, deletions are instant.

**Confidence:** High (core founding principle)

---

## Brand Personality

**Archetype:** The Protective Operator

**If Spectre Labs were a person:**

CJ. ADHD, Canadian, pragmatic, protective of the people around them. Works in systems thinking—understands dependencies, knows when to say "hard no," knows when to get Danielle involved because she's got the PTSD expertise. Cooks hot dogs. Goes to hockey games. Raises two ADHD kids. Doesn't pretend to be something they're not. Reads the code. Verifies the claims. Refuses to monetize family.

Not a startup founder type. Not a TED-talk speaker. Not a brand. A person who got angry enough about how invisible illness gets treated (ignored, monetized, pathologized) to build something different. Who puts a psychologist on payroll at day one. Who ships "Delete All My Data" and makes it actually work.

**Core Values in Voice:**

1. **Specificity over inspiration** — Name the person, the condition, the constraint. Don't inspire; solve.
2. **Verification over trust** — Show the code. Let people verify. Don't ask them to believe you.
3. **Protection over growth** — Refuse deals that compromise ethics. "Will not monetise that vulnerability. Ever."
4. **Depth without ego** — Know everything, stay humble. "Breadth without limit, depth without ego."
5. **People before profit** — Pay employees properly. Price fairly. Build things that help people. That order.

---

## Messaging Framework (Confidence: High)

### Primary Value Proposition

"Apps for people with invisible illness. Price fairly. Pay people properly."

We're not selling wellness, mindfulness, or self-improvement. We're solving the operational problems that invisible illness creates. We architect ethics into code, not contracts. And we refuse to extract value from the people who need help most.

### The Four Key Pillars

#### Pillar 1: Invisible Illness, Not Wellness
**Core message:** We build for how conditions actually present, not how they're supposed to be treated.

**Example phrasing:**
- "ADHD isn't something you optimize. It's something you build around."
- "We design for PTSD as it exists, not as psychology textbooks describe it."
- "Tether is built for neurodivergent families—families where 3 people have ADHD, none of them remember appointments the same way, and one has auditory processing issues."
- "Andy is 8, unmedicated, 4th-percentile reading. We don't build apps for ideal users. We build for this."

**What to avoid:**
- Generic wellness language ("holistic," "mindful," "self-care")
- Medicalized framing ("treatment," "therapy," "recovery")
- Inspiration porn ("you can overcome anything")

---

#### Pillar 2: Ethics as Architecture, Not Marketing
**Core message:** Ethics are in the code, not the contracts. We don't ask users to trust us—we let them verify.

**Example phrasing:**
- "Delete All My Data deletes everything in 30 seconds. No recovery. No exceptions. Read the code to verify."
- "Anonymity by default. No email required. Product works identically. Not a privacy setting—a system choice."
- "There's no advertising SDK in our codebase. You can check. We did."
- "Operational sovereignty: you can export your data, switch tools, leave whenever. No lock-in. No dependency."
- "SPECTRELABS_ETHICS_KEY: the kill switch in our code. Not a philosophical commitment. An actual kill switch."

**What to avoid:**
- Trust-building language that implies we *could* extract but choose not to
- Privacy as a "feature" ("we're privacy-first")
- Opt-in privacy framing
- Legal language that hides intent

---

#### Pillar 3: Observable Reality, Not Promises
**Core message:** Verification > Trust. Show the work. Open source first.

**Example phrasing:**
- "Open source code is observable reality. Users can see that no advertising SDK is in the codebase."
- "Salary transparency: we publish what we pay. 150x your lowest-paid employee is obscene."
- "How it works: [technical specifications visible, auditable, nameable]"
- "FeuFollet: ethical hiring. We don't use personality tests to screen. We use structured interviews based on job requirements."
- "These numbers aren't projections—they're operational metrics from actual users."

**What to avoid:**
- Black-box claims ("powered by AI," "proprietary algorithm")
- Hiding the dependencies
- Making promises you can't verify
- Corporate metrics divorced from actual usage

---

#### Pillar 4: Operational Sovereignty & Depth Without Ego
**Core message:** We build systems you can understand and control. We know our limits. We stay grounded.

**Example phrasing:**
- "Depth without ego, breadth without limit."
- "Operational sovereignty: full-stack capability. No hidden dependencies. You can audit everything."
- "We build full-stack solutions because scattered dependencies are a liability for people with ADHD."
- "Challenges bring happiness. Learning with constraint is how brains rewire."
- "We're not disrupting anything. We're building things that help people."

**What to avoid:**
- "Cutting-edge," "innovative," "game-changing," "revolutionary"
- Positioning as saviors or disruptors
- Minimizing the difficulty of invisible illness
- Pretending there are no trade-offs

---

### Competitive Positioning

**vs. Calm, Headspace, and Generic Wellness Apps:**

"Calm and Headspace assume you can allocate 10 minutes to mindfulness. Invisible illness doesn't work that way. With ADHD, 10 minutes is an eternity. With PTSD, a meditation app can be triggering. We build around how conditions actually present, not how wellness apps assume they do."

**vs. Generic Coding/Learning Apps:**

"CodeQuest isn't 'learning but fun.' It's built for users with auditory processing issues, working memory constraints, and attention dysregulation. Max 6 words on screen. 2-minute levels. Zero failure states. Everything spoken aloud. This isn't accessible coding education. This is coding education designed for actual brains."

**vs. Traditional Hiring Platforms:**

"FeuFollet doesn't optimize hiring. It builds hiring systems that don't discriminate against neurodivergent candidates. Structured interviews based on job requirements, not personality tests. No algorithmic bias. No hidden sorting. Ethical hiring means observable hiring."

---

## Tone-by-Context Matrix (Confidence: Medium)

| **Context** | **Formality** | **Energy** | **Technical Depth** | **Key Guidelines** |
|---|---|---|---|---|
| **Cold Outreach** | Low-medium | Direct, curious | Low-medium | Start with specific problem. Name the person (condition + context). One clear ask. Show you understand their constraint, not just their industry. |
| **Product Description** | Low | Operational | High | Specificity first. Name the constraint. Show what "works identically" means. Say what it *doesn't* do. Code > prose. |
| **Ethics/Privacy Communication** | Medium-high | Confrontational when needed | High | Absolute statements. Name what we refuse. Technical detail when it clarifies the refusal. Observable proof (link to code). |
| **Social Media** | Low | Conversational, direct | Low | **[LOW CONFIDENCE]** Likely lighter tone, more personality. Real examples. Specific users. Avoid marketing-speak. Not enough source material to be prescriptive. |
| **Internal/Operational** | Low | Direct, tactical | Medium-high | Numbered. Conditional logic. Status-flagged. Triage order. No fluff. Assume technical literacy. |
| **Customer Support** | Low | Empathetic + direct | Low-medium | Acknowledge constraint. Offer specific solution. Avoid jargon or explain it. If we can't fix it, say why. Offer workaround or alternative. |

### Context-Specific Guidelines

**Cold Outreach:**
- Open with the specific problem: Not "we help teams," but "ADHD interrupts task switching—your team can't prioritize when three people are in hyperfocus and two are dysregulated."
- Mention the person (with condition if relevant): "This is for Jenna, your engineering lead with ADHD, who context-switches 47 times a day."
- One ask: "30-min call" or "watch a 2-minute demo." Not multiple CTAs.
- Close with what's in it for them: Operational relief, not inspiration.
- Example opening: "Your team has 3 people with ADHD and 2 with anxiety disorders (you know who). Task management apps assume everyone prioritizes the same way. CodeQuest doesn't. Want to see how?"

**Product Descriptions:**
- Lead with constraint: "Max 6 words on screen. 2-min levels. Zero failure states."
- Then explain why: "Because working memory with ADHD is limited and failure is demoralizing."
- Then show what works: "Everything is spoken aloud. You can code without reading."
- Assume technical literacy: Name the APIs, Supabase, Edge Functions. If non-technical, explain the why not the how.
- Always mention what it *doesn't* do: "UPskill doesn't teach you everything. It teaches you what you need right now, in the order your brain can take it."

**Ethics/Privacy Communication:**
- Be absolute: "We do not store real names. We do not track behavioral data. We do not advertise to users."
- Show the code: Link directly to the relevant functions. "Delete All My Data is [20 lines of code](link). Read it. It deletes everything in 30 seconds."
- Use "we" actively: "We delete," not "data is deleted." "We refuse," not "extraction is not permitted."
- Explain the why: "Users with PTSD generate data that's traumatic to revisit. Instant deletion is not a feature—it's a requirement."
- Name what we won't do, even if it's profitable: "We will not monetise that vulnerability. Ever. Not for $5M. Not for $50M."

**Social Media (Low Confidence):**
- Likely persona: Conversational CJ—observational, protective, specific.
- Likely content: Real user examples. Product updates. Operational insights. Short takes on invisible illness being underestimated.
- Tone: Direct, slightly irreverent (hockey hot dogs), protective (no exploitation).
- **Recommendation:** Develop social media voice through examples. Currently insufficient data.

**Internal/Operational:**
- Numbered lists over prose
- Status flags: PENDING | ACTIVE | BLOCKED | SHIPPED
- Conditional logic: "If user hasn't provided email, deletion works identically."
- Triage order: What matters most, in order.
- No corporate language. Direct. Tactical.
- Example: "UPskill release priorities: 1) Delete All My Data function. 2) Edge Function latency. 3) Accessibility audit. 4) Stretch: dark mode."

**Customer Support:**
- Acknowledge the constraint: "With ADHD, email support threads can be overwhelming. Here's the TL;DR."
- Offer specific solution: Not "we can help," but "Update your browser cache. Here's how. 2 steps."
- If we can't fix it, say why: "Delete All My Data is permanent by design. We can't recover it. But you can export before deleting."
- Empathetic but operational: "I know this is frustrating. Here's what's happening and what works around it."

---

## Terminology Guide (Confidence: High)

### Must-Use Terms

| **Term** | **Context** | **Why** | **Example** |
|---|---|---|---|
| **Invisible illness** | When discussing conditions | Reclaims the phrase. Acknowledges that ADHD, PTSD, etc. aren't visible but are real and limiting. | "Apps for people with invisible illness. Price fairly. Pay people properly." |
| **Operational sovereignty** | When discussing user control/data/independence | Frames the commitment as systemic, not aspirational. User has operational control. | "FeuFollet ensures operational sovereignty: candidates own their hiring data, can export it, can leave." |
| **Price fairly** | When discussing pricing philosophy | Core value statement. Not "affordable"—fair means: sustainable for company, accessible to users. | "Our pricing: $X/month. Not free, not predatory. Price fairly. Pay people properly." |
| **Observable reality** | When contrasting with promises/trust | Core epistemology. We show, not tell. Code is observable. Metrics are observable. | "Open source code is observable reality. No advertising SDK in the codebase. Users can verify." |
| **Delete All My Data** | When discussing data deletion feature | Proper noun. Our product's commitment. Instant, verifiable, no recovery. | "Delete All My Data works in 30 seconds. No exceptions. Read the code." |
| **Kill switch** | When discussing ethics in code | Refers to SPECTRELABS_ETHICS_KEY. Ethics are not philosophical but mechanical. | "SPECTRELABS_ETHICS_KEY is the kill switch. Not a promise. A kill switch." |
| **Triage order** | When discussing prioritization | Operational language. Reflects medical urgency, ADHD prioritization. What matters most, in order. | "Product release triage order: 1) Data deletion. 2) Anonymity. 3) Performance." |
| **Product moat** | When discussing competitive advantage | From "Psychologist on payroll from early on—not overhead, the product moat." Depth-of-understanding is the defensibility. | "Our moat is product design from people who live invisible illness, not consultants who study it." |
| **Depth without ego** | When discussing expertise | Humility + expertise. Know everything, stay grounded. | "We build depth without ego, breadth without limit." |
| **Operational constraints** | When discussing limitations | Frames limitations as design choices, not failures. | "UPskill: max 6 words on screen. 2-min levels. Zero failure states. These are operational constraints, not bugs." |

### Preferred Terms

| **Instead of** | **Use** | **Why** |
|---|---|---|
| "User experience" | [Specific product name + specific user condition] | Avoid abstraction. "UPskill for users with ADHD" is more honest than "user experience." |
| "Wellness" | Operational relief, specific function | We're not selling wellness. We solve operational problems. "Task management that accounts for ADHD dysregulation" vs. "wellness through better task management." |
| "Mental health" | By condition: ADHD, PTSD, anxiety | More specific, less clinical, less generic. |
| "Users" | [Condition + context] or name if available | "Andy, age 8, ADHD" is more grounded than "users aged 7-12." |
| "Optimize" | Build around, design for | ADHD can't be optimized. It needs systems built around how it actually works. |
| "Accessibility" | Designed for [specific condition/constraint] | More specific. "Accessible" is vague. "Designed for working memory constraints of ADHD" is clear. |
| "We're committed to" | We [verb] / We refuse / We will not | More direct. "We delete data instantly" vs. "We're committed to data privacy." |
| "Innovation" / "Disruption" / "Cutting-edge" | We build / We ship / We solve [specific problem] | Avoid marketing jargon. Just say what you do. |
| "User-friendly" | [Specific design choice] | "Max 6 words on screen" is more honest than "user-friendly." |
| "Industry-leading" / "Best-in-class" | [Specific metric or comparison] | No vague claims. Name what you do differently and why. |

### Avoid These Terms

| **Term** | **Why** | **Alternative** |
|---|---|---|
| "Holistic" | Generic wellness language. Avoids specificity. | [Specify the actual systems you're integrating] |
| "Mindful" / "Mindfulness" | Not applicable to ADHD/PTSD users. Reductive. | Name the specific practice (breathing, grounding, etc.). |
| "Self-care" | Marketing term that individualizes systemic problems. | Operational support, structured relief. |
| "Empowerment" | Implies the problem was lack of will, not systems. | Operational capability, specific function. |
| "Journey" | Vague, implies linear progress. Invisible illness isn't linear. | Process, path, approach (with acknowledgment of non-linearity). |
| "Opt-in" (for privacy) | Privacy should be default, not a choice. Users shouldn't "opt into" not being exploited. | [State privacy as default system]. |
| "We're working on" | Vague. If you shipped, say shipped. If you haven't, say blocked/pending and why. | SHIPPED, PENDING [reason], BLOCKED [reason]. |
| "Trust us" | Asks for faith. We verify instead. | "Read the code," "See the metric," "Verify the deletion." |
| "Disrupt" / "Game-changing" / "Revolutionary" | Startup marketing language. We don't market ourselves that way. | We build, we ship, we solve. |
| "AI-powered" / "Proprietary algorithm" / "Secret sauce" | Black boxes. We're transparent. | Name the actual technology (Supabase, Edge Functions, etc.). |
| "Compliance" / "Industry standards" | Passive voice hides agency. We choose, we refuse, we require. | We require [X], we do not permit [Y]. |
| "Best practices" | Vague appeal to authority. | [Specific approach and why]. |

### Never-Use Terms

These contradict core brand values:

- **"Startup disruptor"** — We're not disrupting. We're solving.
- **"Leverage your data"** — Data extraction framing. We delete data, not leverage it.
- **"Monetise user attention"** — Explicitly against our ethics.
- **"Psychological manipulation"** — Not even for performance. (Note: Never use in any context, including describing competitors.) 
- **"Extraction"** — We refuse it.
- **"One-click solution"** — Invisible illness needs depth, not quick fixes.
- **"Cure"** — We don't cure. We build around.
- **"Holistic wellness journey"** — The entire phrase is against brand values.
- **"Thought leader"** — CJ isn't a thought leader. CJ is a founder who ships.

---

## Language That Works (Confidence: Medium)

These phrases, drawn from the key quotes and source analysis, encapsulate the brand voice. Use them as reference points and models for similar messages.

### Top Working Phrases

**On Specificity & Grounding:**
- **"Andy: age 8, ADHD unmedicated, 4th-percentile reading. Everything spoken aloud, max 6 words on screen, 2-min levels, zero failure states."** — This is the gold standard. Specific person, specific condition, specific constraint, specific design response. Teaches through example.
- **"Max 6 words on screen. 2-minute levels. Zero failure states."** — Product constraints stated as commitments, not limitations.
- **"Challenges bring happiness."** — Names difficulty as part of learning, not something to smooth away.

**On Ethics & Refusal:**
- **"We will not monetise that vulnerability. Ever."** — Absolute. Future-proof. Not "we don't currently" but "we will not, period."
- **"Operational sovereignty: full-stack capability, no hidden dependencies."** — Frames control as systemic, not a feature.
- **"Delete All My Data deletes everything in 30 seconds. No recovery. No exceptions."** — Specific, verifiable, non-negotiable.
- **"If a user does not provide an email, they are fully anonymous. The product works identically."** — Proves the claim through behavior, not assertion.

**On Verification & Transparency:**
- **"Open source code is observable reality. When users can see that no advertising SDK is in the codebase, that the deletion function actually deletes everything, and that the anonymity system genuinely never stores a real name—they don't have to trust the promise. They can verify it."** — This is the epistemology. Show, don't tell.
- **"150x your lowest-paid employee is obscene. Being a billionaire is a choice and the wrong one."** — Salary transparency as moral stance.

**On Operational Excellence:**
- **"CFO of Disney? Great. Can you cook the hot dogs when the vendor calls in sick on World Hot Dog Festival day?"** — Reframes what matters. Credentials without execution are theater.
- **"Build things that help people. Price fairly. Pay people properly."** — The mission, in order of priority.
- **"Depth without ego, breadth without limit."** — Expertise + humility.

**On Grounding & Humanization:**
- **"Hockey. Hot dogs. Family time."** — What life actually contains.
- **"Danielle, PTSD, first responder—led the Humboldt Broncos call as a medical dispatcher."** — Real person, real context. This grounds the company in lived experience.
- **"Two kids with ADHD at the dinner table."** — Why we build. Not abstraction. Direct context.

---

## Language to Avoid (Confidence: High)

These patterns contradict the brand voice. They appear in competitor messaging, generic marketing, or corporate speak. They're what Spectre Labs is explicitly not.

### Anti-Patterns & Alternatives

| **Anti-Pattern** | **Why It's Wrong** | **What to Do Instead** |
|---|---|---|
| **"We're committed to [value]."** | Passive, future-tense, unverifiable. Sounds like a promise you might break. | "We [verb]. We refuse. We will not. We ship." Use active voice and specific commitments. |
| **"Join our wellness journey."** | Generic. Implies linear progress. Invisible illness isn't a journey—it's a life. | "Use [product name] to manage [specific challenge]." |
| **"Holistic approach to mental health."** | Vague marketing language. Avoids specificity. Ignores that ADHD/PTSD need specific architecture. | "Designed for how PTSD actually presents" or "Tether integrates calendar, communication, and task management for neurodivergent families." |
| **"Empower yourself."** | Individualizes systemic problems. Implies the problem is lack of willpower. | "Operational capability," "structured relief," "systems that work with your brain." |
| **"Self-care is not selfish."** | Implies the problem was guilt, not systems. Invisible illness requires external architecture, not guilt-reduction. | [Name the actual operational support being offered]. |
| **"Leading-edge," "cutting-edge," "game-changing," "disruptive."** | Startup hype language. Spectre Labs doesn't market itself this way. We're not disrupting. | "We build apps for people with invisible illness." That's enough. |
| **"Personalized AI-powered solution."** | Black box. We're transparent about our tech. Also, personalization for ADHD often means constraint, not customization. | "Fixed constraints: max 6 words on screen, 2-minute levels, zero failure states. These work for ADHD. They're not customizable because customization breaks them." |
| **"Industry best practices."** | Appeal to authority. We set our own standards based on user needs, not industry norms. | [Explain the specific design choice and why it works for this population]. |
| **"Trusted by [company logos]."** | Social proof language. Spectre Labs doesn't rely on this. We're not B2B-first. | If mentioning users, name them by condition and specificity: "Used by Jenna's engineering team (3 people with ADHD, 2 with anxiety). They released on time." |
| **"Unlock your potential."** | Implies potential was locked, not that systems were broken. | "Removes the operational friction that invisible illness creates." |
| **"One-click solution."** | Invisible illness requires depth. Quick fixes don't work and are often harmful. | [Name the actual complexity and how the product handles it]. |
| **"Seamless integration."** | Vague. Also, Spectre Labs often says what it *doesn't* integrate with (to maintain sovereignty). | "Supabase for data. Edge Functions for speed. No hidden dependencies. Full audit trail." |
| **"We understand your pain."** | Corporate empathy without specificity. Sounds hollow. | "We designed around [specific constraint] because [specific person] needs it." |
| **"World-class service."** | Generic claim. | [Name the specific service commitment and verify it]. |
| **"Thought leadership."** | CJ isn't a thought leader. CJ is a founder shipping products. | "We build what we test. Here's what works." |
| **"Opt in to privacy."** | Privacy should be default, not a choice. This phrasing accepts that data harvesting is normal, which it isn't. | "Anonymity by default. No email required. Product works identically." |
| **"Mental health awareness."** | Wellness marketing. Invisible illness needs specificity and operational support, not awareness. | "ADHD affects working memory, task initiation, and time blindness. Tether accounts for all three in family coordination." |

---

## Content Examples

### Example 1: EXCELLENT (Annotated)

**Format:** Cold email outreach to engineering lead with ADHD

**Subject:** 30 min — how your team loses 47 hrs/week to context-switching

**Body:**

Jenna,

Quick context: you're an engineering lead at [Company]. You have ADHD (or your team does—statistically likely). Context-switching destroys focus. Every interrupt resets 15-min hyperfocus ramp-up.

CodeQuest addresses this directly. Not through gamification or "mindfulness." Through constraint.

Max 6 words on screen. 2-minute levels. Everything spoken aloud. Zero failure states. Your team codes without reading, without stress, without the shame of failing in front of peers.

The team using it now includes:
- Mark (ADHD, principal engineer): ships faster because he's not context-switching in learning
- Nia (anxiety + working memory issues): learning doesn't trigger her anxiety spirals anymore
- Anil (auditory processing): finally learns coding from hearing the explanation, not squinting at docs

Want to see it in action? 30 min call. No pitch. Just watch Mark code.

—CJ

**Annotations:**

- **Specificity first:** "47 hrs/week to context-switching" (concrete problem) vs. "improve productivity"
- **Named person:** "Jenna" (by title + condition, inferred or direct)
- **Problem before solution:** Context-switching as the frame, not ADHD as a trait to manage
- **Operational proof:** "Max 6 words on screen. 2-minute levels. Zero failure states." (constraint as proof)
- **Real users, by condition:** Mark + Nia + Anil with specific benefits tied to their condition
- **One ask:** "30 min call"
- **Signature:** Founder name, not corporate closing
- **Tone:** Direct, tactical, grounded. No hype. No "empower" or "transform."

**Brand voice check:**
- ✓ Operational (specific metrics, numbered constraints)
- ✓ Humanistic (named users with conditions, real outcomes)
- ✓ Technically credible (specific design constraints, not vague benefits)
- ✓ Transparent (observable proof—watch him code)
- ✓ Protective (doesn't exploit shame or anxiety; removes triggering structure)

---

### Example 2: TO AVOID (Annotated)

**Subject:** Unlock Your Potential in 10 Minutes a Day

**Body:**

At WellnessFlow, we believe in empowering neurodivergent professionals to thrive. Our holistic platform combines cutting-edge AI personalization with mindfulness practices, helping you optimize your focus and unlock your best self.

Join thousands of leaders who've discovered the power of our innovative approach. Our world-class team of thought leaders has crafted a seamless experience designed to guide you through your wellness journey.

With WellnessFlow:
- Personalized recommendations tailored to your needs
- Community support from others like you
- Flexible, one-click solutions that fit your life

Start your transformation today. Limited-time offer: 40% off your first year.

**Why this fails (and what Spectre Labs would do instead):**

| **Problem** | **What's Wrong** | **Spectre Labs Alternative** |
|---|---|---|
| "Unlock Your Potential" | Implies the problem is willpower, not systems. | "Removes the operational friction that invisible illness creates." |
| "Empower" | Individualizes systemic problems. | "Structured support for task initiation with ADHD." |
| "Holistic" | Vague. Invisible illness needs specificity. | "Coordinates calendar, communication, and task management for neurodivergent families." |
| "Cutting-edge AI personalization" | Black box. We're transparent. Also, personalization breaks constraints that work. | "Fixed constraints: max 6 words on screen, 2-minute levels. We don't personalize these because they're the structure that works." |
| "Mindfulness" | Not applicable / often harmful for PTSD. | [Name the actual practice: breathing exercise, grounding, etc.] |
| "Optimize your focus" | ADHD can't be optimized. It needs working with. | "Design around how ADHD focus actually works: deep hyperfocus with difficulty context-switching." |
| "Thought leaders" | Startup theater. | "Founder with ADHD who ships products." |
| "Seamless experience" | Vague. Also, invisible illness often requires visible structure, not seamlessness. | "Transparent structure: every feature is auditable, every constraint is documented." |
| "Wellness journey" | Not a journey. It's a life. | [Avoid the metaphor entirely.] |
| "Thousands of users" | Vague social proof. | [Name users by condition, specific outcome: "Used by 12 engineering teams with 40+ people with ADHD. Their sprint velocity increased by 23%."] |
| "40% off first year" | Predatory pricing tactic. | "Fair pricing: $X/month. Sustainable for us, accessible for you." |
| No mention of data/privacy | WellnessFlow will extract and monetize. | "Delete All My Data in 30 seconds. No exceptions. Anonymous by default. No advertising SDK in code." |
| No named person, no condition | Generic marketing. | "Jenna, engineering lead with ADHD. Context-switching destroyed her focus." |

**Confidence scores:**
- Voice: High (explicit patterns from source analysis)
- Tone: High (documented anti-patterns, clear alternatives)
- Messaging: High (core pillars direct contradiction to generic wellness)

---

## Confidence Scores

| **Section** | **Confidence Level** | **Evidence** | **Gaps** | **Recommendation** |
|---|---|---|---|---|
| **Voice Attributes (We Are / We Are Not)** | HIGH | Appear across 2+ documents. Explicit ("hard no," "will not ever") + demonstrated in product specs. | None material. | Use as-is for content creation. |
| **Brand Personality** | HIGH | Founder statements, operational decisions, product philosophy all align. | No social/public persona examples. | Validate through internal team before social rollout. |
| **Messaging Framework (4 Pillars)** | HIGH | Core mission explicit. Products designed to demonstrate each pillar. Clear competitive differentiation. | No market research on how audience receives these messages. | Test cold email and product page versions with target users. |
| **Tone-by-Context Matrix** | MEDIUM | Internal/operational tone clear. Product tone clear. Ethics tone clear. | **Social media voice not in source docs.** **Crisis/failure communication tone absent.** **Technical content for non-technical audiences (how to explain privacy tech simply).** | Develop social media voice guidelines through examples. Create crisis comms template with CJ. Create non-technical explanation library. |
| **Terminology Guide** | HIGH | Consistent patterns across documents. Must-use terms anchored in key quotes. Avoid terms derived from brand values. | "Invisible illness" not tested with audience (might need framing as "conditions" for certain contexts). | A/B test terminology in outreach to validate reception. |
| **Language That Works** | MEDIUM | All phrases sourced from founder quotes and product specs. | Limited to internal context. No social media or customer support examples. No competitive comparison language tested. | Collect and annotate customer support examples from team. Record social media launches and validate tone. |
| **Language to Avoid** | HIGH | Anti-patterns derived from competitor analysis + explicit brand value contradictions. | Limited testing of which anti-patterns actually hurt reception. | Monitor incoming criticism/misunderstanding for patterns. |
| **Content Examples** | HIGH (cold email) | Cold email grounded in founder's operational language + product specificity. To-avoid example contrasts clearly. | Example is speculative (not a sent email). No product description or social media examples. | Generate examples from real sent outreach and product pages. Test cold email template with 5 targets. |
| **Overall Brand Voice Coherence** | HIGH | All sections align. No contradictions between voice attributes, messaging, and tone. | **External validation needed.** No interviews with customers, partners, or external audiences. | Conduct brand perception interviews with 10 users: Do they perceive these voice attributes? |

---

## Open Questions for Team Discussion

### HIGH PRIORITY

**1. Social Media Voice — Data Gap (Recommendation: Develop through examples)**

**The gap:** No source documents cover social media tone. We can infer (likely conversational, protective, grounded), but we can't be prescriptive without examples.

**Questions to resolve:**
- Is social voice same as internal voice (direct, tactical) or warmer/more explanatory?
- How much personality (hockey/hot dogs) vs. how much operational detail?
- When do we post? (Shipping updates? Protective takes on wellness industry? User stories?)

**Recommendation:** 
- CJ draft 10 potential LinkedIn posts (announcing features, taking stances, naming users)
- Team votes on tone/content patterns
- Test 3 versions with small audience, validate engagement

**Owner:** CJ + Marketing
**Timeline:** 2 weeks

---

**2. Crisis / Failure Communication — Data Gap (Recommendation: Template development)**

**The gap:** All source documents show success communication. Nothing on how we handle failure, security breaches, or PPPP (product problems, privacy problems, personnel problems, promises broken).

**Questions to resolve:**
- If there's a bug in Delete All My Data, how do we communicate that?
- If there's a data retention issue, what's our protocol?
- When do we say "we got this wrong"?

**Recommendation:**
- Develop a crisis comms template: Acknowledge, explain, fix, show code/proof
- Example: "[Feature] didn't work as promised. Here's what happened. Here's the code we changed. Here's verification that it now works."
- Align with Danielle's crisis experience (Humboldt Broncos call) — clear communication under pressure

**Owner:** CJ + Danielle
**Timeline:** 3 weeks

---

**3. Technical Communication for Non-Technical Audiences — Data Gap (Recommendation: Explanation library)**

**The gap:** How do we explain "Kill switch in code," "Edge Functions," "no advertising SDK," "anonymity system" to users who don't code?

**Questions to resolve:**
- What's the right level of technical detail for product descriptions (vs. engineering blog)?
- How do we prove privacy to someone who can't read code?
- When do we simplify, when do we stay specific?

**Recommendation:**
- Create a "Non-Technical Privacy Explanations" library:
  - "What does 'Delete All My Data' actually mean?" (in plain language)
  - "How is anonymity different from privacy?" (user perspective)
  - "Why can't we recover your deleted data?" (explain the architecture simply)
- Test explanations with 3-5 non-technical users for clarity
- Use in product help docs, FAQs, cold outreach to non-technical decision-makers

**Owner:** [Product person] + [Support person]
**Timeline:** 4 weeks

---

### MEDIUM PRIORITY

**4. Competitive Differentiation Language — Data Gap (Recommendation: Create comparison framework)**

**The gap:** We have generic wellness ("vs. Calm/Headspace") and basic coding education ("vs. generic coding apps"). But what about:
- vs. other neurodiverse-focused platforms?
- vs. open source solutions users could self-host?
- vs. therapy/clinical support?

**Questions to resolve:**
- Where does UPskill position itself in the "learning tech" landscape?
- How do we acknowledge what FeuFollet is *not* (a complete ATS)?
- When do we name competitors, when do we avoid?

**Recommendation:**
- Create a competitive positioning matrix (what we do / what they do / why ours is different for this user)
- One row per product, one column per competitor type
- Use to inform product page copy, cold outreach variations, sales collateral

**Owner:** [Product lead per product]
**Timeline:** 6 weeks

---

**5. Customer-Facing vs. Internal Tone — Clarification Needed**

**The gap:** Source documents are primarily internal (founder statements, product specs). Cold outreach may need softening (less command-style, more explanatory). Do we adjust tone for customer support, onboarding, help docs?

**Questions to resolve:**
- Is tone identical across all customer touchpoints or context-dependent?
- When do we use full brand voice vs. simplified version?
- Help docs: same directness as product?

**Recommendation:**
- Document tone adjustments by customer stage:
  - **Awareness:** Outreach (current—working)
  - **Evaluation:** Product page, demo (may need slightly more explanation)
  - **Onboarding:** Help docs, tutorials (tactical, step-by-step)
  - **Support:** Troubleshooting (empathetic + direct)
  - **Renewal/advocacy:** Case studies, testimonials (user-led, not company-led)
- Draft tone adjustments, test with sample customer

**Owner:** [Marketing + Product + Support]
**Timeline:** 4 weeks

---

### RECOMMENDATIONS FOR EACH GAP

| **Gap** | **Priority** | **Approach** | **Owner** | **Output** | **Timeline** |
|---|---|---|---|---|---|
| Social media voice | HIGH | Examples → pattern validation | CJ + Marketing | 10 sample posts + tone guide | 2 weeks |
| Crisis comms | HIGH | Template + examples | CJ + Danielle | Crisis template + 3 examples | 3 weeks |
| Technical → non-technical | HIGH | Explanation library | [Product person] | 5-7 plain-language explanations + FAQ | 4 weeks |
| Competitive differentiation | MEDIUM | Positioning matrix | Product leads | Comparison framework per product | 6 weeks |
| Customer tone adjustments | MEDIUM | Stage-by-stage documentation | Marketing + Support | Tone guide by customer stage | 4 weeks |

---

## Data Gaps & Recommendations

### Checklist of Gaps (Prioritized)

**HIGH URGENCY (blocks immediate content creation):**

- [ ] **Social media voice examples & guidelines** — No source material. Infer from brand, validate with examples.
  - *Blocker for:* LinkedIn, Twitter/X, community posts
  - *Action:* CJ provides 10 sample posts. Team validates tone pattern.

- [ ] **Crisis/failure communication template** — Absence is notable given company's operational rigor.
  - *Blocker for:* Security comms, feature rollbacks, apologies
  - *Action:* Work with Danielle (crisis experience) to develop template. Scenario test (data retention failure, Delete All bug, etc.)

- [ ] **Non-technical privacy explanations** — "Kill switch," "Edge Functions," "anonymity" need plain-language versions.
  - *Blocker for:* Customer onboarding, help docs, outreach to non-technical buyers
  - *Action:* Create explanation library. Test with 5 non-technical users for clarity.

**MEDIUM URGENCY (refines approach, not urgent):**

- [ ] **Customer support voice examples** — No actual support tickets in source docs.
  - *For:* Training support team, building help docs, escalation protocols
  - *Action:* Collect 5-10 support interactions (anonymized). Annotate for voice. Build template responses.

- [ ] **Product marketing copy (not cold outreach)** — One cold email example, no product page, pricing page, feature comparison.
  - *For:* Website, in-app, email campaigns
  - *Action:* Draft product descriptions for UPskill, CodeQuest, Tether, FeuFollet. Apply voice guide. Test with users.

- [ ] **Social proof language** — Brand doesn't rely on logos or "thousands of users." How do we speak about adoption?
  - *For:* Case studies, testimonials, growth communication
  - *Action:* Define what social proof looks like for Spectre Labs (named users, specific outcomes, condition context).

- [ ] **Failure narrative** — How do we talk about problems we can't solve, features we won't build, markets we don't serve?
  - *For:* RFP responses, feature requests, scoping conversations
  - *Action:* Create "We don't do" framework. Example: "We don't offer team analytics because it would incentivize surveillance of ADHD employees."

**LOW URGENCY (nice-to-have, longer-term):**

- [ ] **Translator to other languages** — Voice is very English (hockey, hot dogs, Canadian operational culture).
  - *For:* Future international expansion
  - *Action:* Not needed now. Flag for language-specific voice adaptation when localizing.

- [ ] **Voice for different product maturity stages** — Tone might differ between mature products (Tether) and new launches (Feu Follet).
  - *For:* Launch marketing, feature prioritization communication
  - *Action:* Observe how launch tone differs from mature product tone. Codify if pattern emerges.

- [ ] **Stakeholder communication (board, investors, partners)** — Source docs are user/customer facing. What's the investor pitch tone?
  - *For:* Fundraising, partnership deals
  - *Action:* Listen to investor calls. Document any voice shift. Assess if advisable.

---

### Data Collection Plan (Next Steps)

**To strengthen guidance for immediate use:**

1. **Collect existing materials:**
   - 10 recent cold emails sent (annotate what worked, what didn't)
   - 5-10 product page variations (if they exist)
   - 3-5 customer support tickets (anonymized) — see how tone actually appears under real constraints
   - Any recorded customer demos or pitches

2. **Run 2-week sprint on high-urgency gaps:**
   - CJ drafts social media content (10 posts) — captures voice in new medium
   - Work with Danielle on crisis template — leverage her experience
   - Create plain-language explanations for privacy terms — test with non-technical users

3. **Validate with external audience (2-3 weeks):**
   - Share cold email template with 3-5 target customers — does voice land?
   - Show product description to 3 non-technical prospects — can they understand the benefits?
   - Ask users: "What do you trust about Spectre Labs?" — validate that transparency/openness is perceived

4. **Create feedback loop:**
   - Monthly review of outreach performance (open rates, conversion, quality of leads)
   - Quarterly refresh of examples and anti-patterns
   - Ongoing tagging of what works vs. what doesn't

---

## Appendix: Sources

| **Source Document** | **Type** | **Relevance** | **Content** | **Confidence** |
|---|---|---|---|---|
| Founder Statement (CJ + Danielle) | Primary | CRITICAL | Mission, voice attributes, lived experience, key quotes, product philosophy, ethical commitments | HIGH |
| Product Specifications (UPskill, CodeQuest, Tether, FeuFollet) | Primary | CRITICAL | Specific design constraints, user personas, operational decisions, competitive positioning, technical architecture | HIGH |
| Company Operations (implied) | Primary | HIGH | Hiring philosophy, salary transparency, payroll decisions, crisis response example (Danielle), operational culture | MEDIUM (inferred from statements) |
| Marketing/Outreach Examples (if any exist in repo) | Secondary | MEDIUM | [None provided in source analysis] | LOW (gap identified) |
| Customer Feedback (if collected) | Secondary | MEDIUM | [None in source analysis] | UNKNOWN (not surveyed) |
| Competitor Analysis | Implicit | LOW | Generic wellness (Calm, Headspace) vs. specialized (neurodivergent platforms) | MEDIUM (positions negatively, not deeply researched) |

**Data Quality Assessment:**
- **Strength:** Founder voice is clear, specific, consistent, quotable. Product philosophy is coherent.
- **Limitation:** Limited external validation. No customer interviews. No testing of messaging reception.
- **Recommendation:** Treat these guidelines as tested internally. Validate with users before scaling.

---

## Version History & Maintenance

| **Version** | **Date** | **Changes** | **Owner** |
|---|---|---|---|
| 1.0 | March 20, 2026 | Initial comprehensive guidelines from source analysis | Brand guideline generation |
| 2.0 (Planned) | May 2026 | Updated with social media examples, crisis template, non-technical explanations | CJ + Marketing |
| 2.1 (Planned) | June 2026 | Customer support examples, product page copy annotated | Support + Marketing |

---

## How to Use This Document

### For Content Creators:
1. **Identify your context:** Cold email? Product description? Ethics/privacy? See **Tone-by-Context Matrix**
2. **Identify your audience:** Founder/executive? Technical user? Non-technical buyer? Adjust terminology and depth
3. **Check voice attributes:** Are you being operational? Protective? Grounded? Technically credible? Transparent? All five should show.
4. **Validate terminology:** Must-use terms? Avoid these terms? Check the **Terminology Guide**
5. **Review examples:** See what works (**excellent example**) and what doesn't (**to avoid**)
6. **Annotate your output:** Why did you make those voice choices? Use **Brand Application Notes** template

### For Team Discussions:
- **Unsure about tone?** Bring the open question to the team with context
- **Found a better phrase?** Add it to **Language That Works** with evidence
- **Noticed an anti-pattern?** Document it, tag the section, suggest alternative
- **Validating with customers?** Reference the **Data Gaps** section; flag what tested well

### For Leadership:
- Use **Confidence Scores** to assess risk areas
- Review **Open Questions** for prioritized team discussion
- Reference **Data Gaps & Recommendations** when allocating resources
- Monitor **Version History** for guideline updates

---

**End of Document**

---

## Brand Application Notes

**Voice Applied:** 
- Operational (direct, numbered, conditional, specific)
- Protective (absolute statements about ethics and refusal)
- Humanistic (named people, grounded examples, real constraints)
- Technically credible (specific technologies, verifiable claims)
- Transparent (observable reality, shown proof, acknowledged gaps)

**Tone:**
- Formality: Medium (guideline document is instructional, not casual; voice examples are conversational)
- Energy: Direct, practical, unsentimental
- Technical Depth: Medium-High (must be usable by non-marketing teams; references implementation specifics without jargon)

**Messages Embedded:**
- Pillar 1 (Invisible Illness, Not Wellness): Throughout examples and avoided anti-patterns
- Pillar 2 (Ethics as Architecture): Heavy emphasis on Delete All My Data, kill switches, observable code, refusal
- Pillar 3 (Observable Reality): Verification over trust, open source, transparency
- Pillar 4 (Operational Sovereignty): Full-stack, no hidden dependencies, user control

**Terminology Choices:**
- Used: "invisible illness," "operational sovereignty," "observable reality," "Delete All My Data," "kill switch," "triage order," "product moat"
- Avoided: "wellness," "mindful," "disruption," "innovation," "user experience," "opt-in" framing
- Technical terms grounded in examples (Supabase, Edge Functions named when relevant to illustrate transparency)

**Adaptations:**
- This is an internal guideline document (higher formality, instructional tone) vs. customer-facing content (conversational, direct)
- Comprehensive coverage of gaps and uncertainties (honest about low-confidence sections)
- Emphasis on testability and iteration (not prescriptive where data is weak)
- Anchor every claim to source evidence (quotable, verifiable, specific)

---