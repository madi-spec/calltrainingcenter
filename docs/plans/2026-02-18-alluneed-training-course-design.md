# All U Need Pest Control — CSR Training Course Design

**Date:** 2026-02-18
**Customer:** All U Need Pest Control (AUN)
**Source:** Stephen Harper's "Quick Guide" knowledge base (1000 lines)
**Approach:** Curated courses + scenario templates seeded into existing training simulator

---

## Goals

1. Comprehensive training covering onboarding, sales, and customer service
2. Skill-based modules — independent courses, manager-assignable per team
3. Layered depth — customer-facing basics first, advanced operational procedures in later modules
4. Separate sales and CS team targeting

## Architecture Decision: Curated Courses + Scenario Templates (Option B)

The All U Need knowledge base contains ~50 distinct operational procedures with specific correct responses (card decline protocols, pest qualification flows, approval workflows). Generic AI scenario generation won't reliably test these. Instead:

- **6 courses, ~30 modules** created as structured seed data
- **50+ curated scenario templates** for critical operational procedures
- **Service packages with exact pricing** across all tiers (Silver, Gold, Diamond)
- **Package objections & responses** from the doc's FAQ and objection sections
- **Custom customer profiles** tailored to pest control scenarios
- **Sales guidelines** covering upsell paths, price drop rules, minimums

The existing AI scenario generator still provides variety — templates serve as foundations, not scripts.

---

## Team Targeting

| Course | Sales | CS | Both |
|--------|:-----:|:--:|:----:|
| 1. Service Knowledge Fundamentals | | | x |
| 2. Pricing & Sales | x | | |
| 3. Scheduling & Service Call Triage | | x | |
| 4. Customer Retention & De-escalation | | x | |
| 5. Specialty Service Qualification | x | | |
| 6. Communication & Documentation | | | x |
| 7. Complex Service Coordination | | x | |

---

## Course 1: Service Knowledge Fundamentals

**Target:** Both teams
**Purpose:** Know what AUN sells, what's covered, what's not, and the vocabulary

### Module 1.1: Home Pest Control (GHP)
- **Difficulty:** Easy
- **Tests:** Coverage (ants, spiders, roaches excl. German, silverfish, earwigs), interior vs exterior treatment, quarterly maintenance, lanai/pool cage inclusion, warranty scope
- **Key scenarios:**
  - Customer asks "what does your basic pest control cover?"
  - Customer reports ants — CSR must confirm GHP covers them (excluding BHA and fire ants)
  - Customer asks about interior service on a quarterly visit (available upon request)

### Module 1.2: Lawn Pest Control (SLP/QGG)
- **Difficulty:** Easy
- **Tests:** SLP coverage vs QGG, bimonthly vs quarterly frequency, SLP+ upgrade path, what's NOT covered (grubs, chinch bugs, sod webworms, mole crickets)
- **Key scenarios:**
  - Customer asks about fire ants in lawn — route to QGG, not SLP
  - Customer reports grubs — explain not warrantied, refer to Baton
  - Customer on GHP asks about lawn — explain SLP addon, quarterly if paired

### Module 1.3: Specialty Services Overview
- **Difficulty:** Medium
- **Tests:** Knowing when to schedule Sentricon vs refer drywood termites, bed bug vs German roach vs flea protocols, rodent exclusion eligibility, TAP basics
- **Key scenarios:**
  - Customer sees winged insects — determine termite swarmers vs ant swarmers (wing length, antennae, body shape)
  - Customer reports small roaches in kitchen — German roach qualification questions
  - Customer asks about termite protection — Sentricon overview, drywood termite Baton referral

### Module 1.4: Non-Warrantied Pests
- **Difficulty:** Medium
- **Tests:** Proper deflection for carpet beetles, dust mites, drywood termites, pantry pests, grubs, chinch bugs, aphids, oleander caterpillars. When to refer to Baton (844-699-4138)
- **Key scenarios:**
  - Customer reports pantry moths — guide through DIY (find infested product, airtight containers, vacuum shelves)
  - Customer asks about drywood termites — explain Sentricon is subterranean only, provide Baton referral
  - Customer reports carpet beetles — explain not warrantied, prevention tips

### Module 1.5: Service Lingo Fluency
- **Difficulty:** Easy
- **Tests:** Natural use of abbreviations (GHP, SLP, CES, CIS, DNS, OTS, QGG, DSV, IGR, TAP, BCP, AR, SSN, SVC) in conversation with colleagues and understanding them in customer context
- **Key scenarios:**
  - Tech calls in: "CES needed, customer had DNS on the SSN" — CSR must understand and act
  - Manager says "schedule a CIS for this GHP customer" — CSR knows what to book

---

## Course 2: Pricing & Sales

**Target:** Sales team
**Purpose:** Quote accurately, sell confidently, upsell naturally

### Module 2.1: Quoting New Customers
- **Difficulty:** Medium
- **Tests:** Square footage → tier matching, reading pricing tables correctly, initial + monthly + yearly totals, minimum initial ($99), lead gen pricing ($49 initial for FB/Thumbtack)
- **Key scenarios:**
  - New customer with 2,800 sq ft home wants basic pest control — quote Silver tier correctly ($150 initial, $45/mo)
  - Customer mentions they found AUN on Facebook — apply lead gen $49 initial
  - Customer has 5,200 sq ft home — route to 5001+ pricing tier

### Module 2.2: Package Tiers (Silver → Gold → Diamond)
- **Difficulty:** Medium
- **Tests:** Explaining value differences between Silver (exterior only, bi-monthly), Gold (+ granular OR SLP OR mosquito), Diamond (+ SLP + mosquito). Matching customer needs to right tier
- **Key scenarios:**
  - Customer says "I just need the basics" — Silver with clear explanation of what's included
  - Customer has kids playing in yard + ant problem — recommend Gold with SLP
  - Customer near water with mosquito complaints — present Diamond with mosquito bundle

### Module 2.3: Upselling & Bundling
- **Difficulty:** Hard
- **Tests:** Moving Silver → Gold, presenting price drops when approved, double lot surcharge (+$5), SLP quarterly pricing when paired with GHP ($60)
- **Key scenarios:**
  - Existing Silver customer calls about ants in yard — upsell to Gold + SLP
  - Customer hesitates on Gold pricing — present approved price drop tier
  - Customer has large property — properly apply double lot pricing

### Module 2.4: Handling Price Objections
- **Difficulty:** Hard
- **Tests:** Responding to "too expensive," competitor price comparisons, emphasizing free service calls, warranty value, satisfaction guarantee, 30K+ five-star reviews, 3x Inc. 5000
- **Key scenarios:**
  - "My neighbor pays $30/month for pest control" — value comparison, warranty inclusion, service call coverage
  - "Can you do any better on price?" — price drop tiers if approved, never below minimums
  - "I'll think about it" — create urgency with same-day service availability, pest activity concerns

### Module 2.5: Specialty Service Sales
- **Difficulty:** Hard
- **Tests:** Quoting bed bugs ($1,000), German roach ($500 prequalify, $400 min), Sentricon ($895 or $565+$30/mo), rodent exclusion ($1,295+), TAP ($2,400 min), one-time service ($199)
- **Key scenarios:**
  - Customer reports bed bugs in master bedroom — quote $1,000, explain Aprehend, 4-hour vacate, 60-day warranty
  - Customer wants termite protection — present Sentricon options (full pay vs monthly), explain annual renewal ($375)
  - Customer interested in TAP — prequalify at $2,400 minimum, schedule inspection first (coordinate with Ryan)

---

## Course 3: Scheduling & Service Call Triage

**Target:** CS team
**Purpose:** Right service, right time, no unnecessary truck rolls

### Module 3.1: Booking Initial Services
- **Difficulty:** Easy
- **Tests:** Agreement signed? Payment processed? Pets secured? Two follow-ups required (same day + 2-3 days). Marshall Reddick invoice exception
- **Key scenarios:**
  - Tech on-site, agreement not signed — do NOT approve service
  - New customer, payment processed, back gate locked — approve, tech services accessible areas
  - Marshall Reddick account — invoice after service (exception to payment-first rule)

### Module 3.2: Service Call vs. Full Service
- **Difficulty:** Medium
- **Tests:** Free service call eligibility (not due for next visit + active live pest issue), warranty windows (OTS 30 days, GHP/SLP 60-90, bed bug 60, German roach 30, rodent exclusion 1 year), CES/CIS vs service call distinction
- **Key scenarios:**
  - Customer due for quarterly next week reports ants — move up scheduled service, don't create service call
  - Customer had GHP 3 weeks ago, seeing live roaches — eligible for free service call
  - Tech couldn't access backyard last visit, customer wants it done — schedule CES, NOT free service call

### Module 3.3: Avoiding Unnecessary Visits
- **Difficulty:** Medium
- **Tests:** Dead bugs = treatment working (7-10 days for non-repellent), 1-3 occasional bugs normal in FL, millipede seasonal waves, plaster bagworms (never schedule), pantry pests (customer resolves)
- **Key scenarios:**
  - Customer: "I'm finding dead roaches everywhere!" — reassure, treatment is working, no visit needed
  - Customer: "There are hundreds of tiny worm-like bugs on my patio" — millipedes, seasonal, SLP helps but can't prevent migration waves
  - Customer: "Moths in my pantry" — guide through identification and DIY (find source, discard, airtight containers)
  - Customer insists on visit despite it being unnecessary — **always schedule rather than risk cancellation**

### Module 3.4: Rescheduling & Follow-Up
- **Difficulty:** Medium
- **Tests:** Correct text template selection, 3-attempt scheduling protocol (call+text same day, 2-3 days, 1 week), technician call-out messaging, proper documentation
- **Key scenarios:**
  - Tech called out sick, 8 customers need rescheduling — use correct "Technician Call Out" template
  - Customer hasn't responded to 2 attempts — use "Scheduling After 3rd Contact Attempt" template, auto-schedule
  - Customer requests reschedule but doesn't specify date — use "Reschedule Request — No Date" template

### Module 3.5: Multi-Visit Scheduling
- **Difficulty:** Hard
- **Tests:** German roach 3-visit flow (14 days apart, all booked on initial call), rodent exclusion scheduling (exclusion + 4 trap checks Mon/Thu + DSV on 4th if purchased), Sentricon install sequences, holiday adjustments
- **Key scenarios:**
  - New German roach customer — book all 3 visits during the call, 14 days apart, verify customer prep requirements communicated
  - Rodent exclusion sold — schedule exclusion appointment + 4 trap checks (Mon/Thu pattern) + DSV on 4th check if purchased
  - Sentricon takeover — schedule uninstall of existing system AND new installation

---

## Course 4: Customer Retention & De-escalation

**Target:** CS team
**Purpose:** Save the account, keep the customer

### Module 4.1: Card Decline Handling
- **Difficulty:** Medium
- **Tests:** Longstanding customer (5+ paid services) protocol vs new customer protocol, verbal approval process, RED NOTE documentation, payment date commitment
- **Key scenarios:**
  - Longstanding customer (8 quarterly visits), card declined, tech on-site — approve service, use longstanding voicemail/text template, note AR follow-up
  - New customer (2 visits), card declined — use non-longstanding template, do NOT approve service until payment updated
  - Customer wants to pay later — get verbal approval (recorded), signed agreement, specific payment date, document in RED NOTE

### Module 4.2: Hold Policy Execution
- **Difficulty:** Medium
- **Tests:** 90-day maximum, correct hold reason selection, "pending cancel" status for auto-reminders, pause payments on monthly customers, contract customer restrictions (12-month commitment must be complete)
- **Key scenarios:**
  - Customer going on extended vacation, wants to pause — apply 90-day hold, correct reason, pause payments
  - Customer on 8-month contract wants hold — explain 12-month commitment must complete first
  - Customer has been on hold 85 days — manager/lead must contact to reschedule or cancel

### Module 4.3: Cancellation Saves
- **Difficulty:** Hard
- **Tests:** Understanding root cause before offering solutions, knowing what concessions are available (reschedule, price adjustment, service frequency change), when to escalate vs let go
- **Key scenarios:**
  - Customer wants to cancel because "the service isn't working" — investigate: dead bugs? occasional bugs? actual infestation? Offer service call if warranted
  - Customer canceling due to price — explore tier adjustment, price drops if approved
  - Customer canceling because they're moving — offer to transfer service to new address, get referral for buyers

### Module 4.4: Gate Access & Not-Home Situations
- **Difficulty:** Easy
- **Tests:** Correct template selection (not home, exterior completed, lockbox not working, gate code not working), knowing when customer presence is required vs not
- **Key scenarios:**
  - Tech arrives, nobody home, this is a GHP quarterly — complete exterior, send "Exterior Completed" text, offer to schedule interior
  - Tech at community gate, code doesn't work — send "Gate Code Not Working" text, wait briefly, reschedule if no response
  - Sentricon appointment, nobody home — interior access REQUIRED, cannot proceed, must reschedule

### Module 4.5: Angry Customer De-escalation
- **Difficulty:** Hard
- **Tests:** Empathy-first approach, not being defensive, acknowledging the issue, finding solutions, knowing escalation paths
- **Key scenarios:**
  - Tech no-show: customer furious, took day off work — apologize, follow no-show protocol (D2D vs office sale determines who handles), reschedule immediately
  - "I've had 3 services and still have ants!" — investigate service history, offer service call, check if right service for pest type (BHA needs QGG, not GHP)
  - Bed bug customer: "It's been 2 weeks and I'm still getting bitten!" — explain Aprehend timeline (days 7-21 sharp decline expected), reassure this is normal, DO NOT schedule additional treatment

---

## Course 5: Specialty Service Qualification

**Target:** Sales team
**Purpose:** Qualify leads correctly for complex services before selling

### Module 5.1: Rodent Qualification
- **Difficulty:** Hard
- **Tests:** Prequalification questions (hearing noises or seeing droppings? crawlspace? duplex/townhome/condo/manufactured? single-family only), exclusions (no crawlspace homes, no townhomes/condos/manufactured, not in TX, no 2-story in Jax), pricing ($1,195+)
- **Key scenarios:**
  - Customer hears scratching in attic, has crawlspace home — cannot do exclusion, explain why
  - Customer in Houston reports rodents — exclusion not available in TX, offer bait boxes if exterior only
  - Customer in Jacksonville with 2-story home — not eligible, explain limitation
  - Qualified customer (single-family, slab, FL) — quote $1,195+, explain process (sealing + traps + 4 checks + optional DSV)

### Module 5.2: German Roach Qualification
- **Difficulty:** Hard
- **Tests:** 5 prequalification questions (how many? when first appeared? new appliances? new people? packages?), $400 minimum / $500 prequalify, 3 treatments required, customer prep requirements
- **Key scenarios:**
  - Customer sees 2-3 small roaches in kitchen — ask all 5 questions, determine if German roach (small, light brown, fast)
  - Customer: "I just bought a used refrigerator and now I see roaches" — classic German roach introduction vector, qualify for treatment
  - Customer asks why regular pest control doesn't cover German roaches — explain they're exclusively indoor, require specialized intensive treatment, introduced from external sources

### Module 5.3: Bed Bug Qualification
- **Difficulty:** Hard
- **Tests:** Payment policy (full payment, no exceptions), 4-hour vacate requirement, customer prep requirements, post-treatment 90-day rules, handling common objections
- **Key scenarios:**
  - Customer wants to split bed bug payment — explain full payment required at time of service, no exceptions
  - Customer asks "can I steam clean the mattress after?" — NO, explain cleaning removes Aprehend spores, 90-day no-cleaning rule
  - Customer says they already sprayed Raid — flag as failure risk indicator, escalate to Operations

### Module 5.4: Sentricon Qualification
- **Difficulty:** Hard
- **Tests:** Interior access required (no exceptions), payment before service (no exceptions), spray foam insulation policy (new install: do NOT approve; renewal: honor contract then offer uninstall), install vs takeover vs renewal scheduling
- **Key scenarios:**
  - Customer wants Sentricon but has spray foam insulation — do NOT approve installation, explain why (hides activity, covers inspection points, traps moisture)
  - Existing Sentricon customer with spray foam, renewal due — honor remainder of contract, after expiry not obligated to renew
  - Customer wants Sentricon, won't be home for install — cannot proceed, interior access required, no exceptions

### Module 5.5: TAP Insulation Qualification
- **Difficulty:** Medium
- **Tests:** Inspection always required before selling, $2,400 minimum prequalify, capping vs restoration, coordinate scheduling with Ryan, whole-home attic only (not individual rooms), financing available
- **Key scenarios:**
  - Customer interested in TAP for just their bedroom — explain whole-home attic only
  - Customer wants TAP quote over the phone — explain inspection required first, schedule with consultant
  - Customer asks about cost — prequalify at $2,400 minimum, mention financing available upon approval

---

## Course 6: Communication & Documentation

**Target:** Both teams
**Purpose:** Say the right thing, document everything

### Module 6.1: Professional Call Handling
- **Difficulty:** Easy
- **Tests:** Standard greeting, using customer name, proper tone, giving callback number (888-239-2847), closing professionally
- **Key scenarios:**
  - Inbound call from new customer — professional greeting, capture info, route appropriately
  - Outbound follow-up call — identify yourself and company, state purpose clearly

### Module 6.2: Text & Voicemail Templates
- **Difficulty:** Medium
- **Tests:** Selecting correct template for 15+ situations (card decline, not home, gate access, reschedule, follow-up, hold, Baton referral, etc.), personalizing with customer name and details
- **Key scenarios:**
  - Card declined for longstanding customer — select and personalize correct template (different from new customer template)
  - Customer not responding to reschedule attempts — use "Scheduling After 3rd Contact Attempt" template with auto-scheduled date
  - Customer asks about service AUN doesn't offer — use "Services Not Provided" template with Baton referral

### Module 6.3: Task Documentation
- **Difficulty:** Medium
- **Tests:** Proper task setup (clear reason, context), interaction logging (* + date), correct status usage (Pending/In Use/Completed), follow-up cadence by task type
- **Key scenarios:**
  - CC decline task — set up properly, follow 5-attempt cadence (day-of, 2-3 days, weekly), cancel as "Unable to Contact" after 5th
  - Quote follow-up — max 2 attempts, few days apart, stop unless customer responding
  - Call to Schedule — 5 weekly attempts (call+text), auto-schedule on 3rd, freeze account after 5th

### Module 6.4: Service Area Routing
- **Difficulty:** Easy
- **Tests:** ZIP code → office mapping (Fort Myers *3011, Port Charlotte *3021, Jacksonville *3031, Tampa *3041, Houston *3051, Melbourne *3061, Charleston *3131), dial code usage, knowing coverage boundaries
- **Key scenarios:**
  - Customer gives ZIP 33916 — Fort Myers office, dial *3011
  - Customer gives ZIP 77494 — Houston office, dial *3051
  - Customer gives ZIP outside coverage — politely explain AUN doesn't service that area

---

## Course 7: Complex Service Coordination

**Target:** CS team
**Purpose:** Manage multi-visit services and complex approval workflows

### Module 7.1: Initial Service Approval Workflow
- **Difficulty:** Medium
- **Tests:** Full approval checklist (agreement signed + payment processed + no loose pets), exception handling (Marshall Reddick invoicing), two follow-ups required (same day + 2-3 days), locked gate partial service protocol
- **Key scenarios:**
  - Tech on-site, agreement signed, payment processed, gate locked — approve, tech services accessible areas, schedule return for rest
  - Tech on-site, agreement NOT signed — do not approve, contact customer
  - Marshall Reddick account — approve with invoicing (exception to payment-first rule)

### Module 7.2: Recurring Service Approval
- **Difficulty:** Medium
- **Tests:** Exterior access + pets check, construction/work safety assessment, card decline rules (5+ paid visits = proceed, <5 = do not proceed), verbal approval + RED NOTE documentation
- **Key scenarios:**
  - Quarterly visit, construction happening around home — assess safety, reschedule if unsafe, ask for completion timeline
  - Card declined, customer has 7 paid visits — proceed with service, follow longstanding protocol
  - Card declined, customer has 3 paid visits — do NOT proceed, use new customer decline protocol

### Module 7.3: Technician No-Show Recovery
- **Difficulty:** Hard
- **Tests:** Determining responsibility (office sale = original rep follows up, D2D/tech sale = scheduler handles), 3-attempt follow-up protocol (same day, 2-3 days, 1 week), cancellation as "Initial Appointment Cancelled" after final attempt, DNS notes
- **Key scenarios:**
  - Office sale tech no-show — task original sales rep to reschedule, not your responsibility to follow up
  - D2D sale tech no-show — you handle all follow-ups, add DNS notes, follow 3-attempt protocol
  - 3rd attempt with no response — make final call, send closing text, cancel under "Initial Appointment Cancelled"

### Module 7.4: Post-Treatment Follow-Up Protocols
- **Difficulty:** Medium
- **Tests:** Service call follow-up (1 week), bed bug timeline education (3-6 weeks typical resolution), German roach monitoring between visits, rodent trap check scheduling, Sentricon annual monitoring
- **Key scenarios:**
  - 1 week after flea treatment, customer still seeing fleas — explain pupal stage (IGR disrupts but doesn't kill pupae immediately), vacuum daily for 10 days, second treatment in 1 week
  - Rodent exclusion complete, 2nd trap check shows no captures — continue monitoring, 2 consecutive no-capture visits needed before removing traps
  - Sentricon renewal coming up, customer has spray foam now — honor contract remainder, inform about non-renewal policy after expiry

### Module 7.5: BCP — Service During Disruptions
- **Difficulty:** Medium
- **Tests:** Phone outage procedure (unplug/reboot/test/escalate), internet outage procedure (mobile app, paper logging, professional script), post-outage recovery (enter all notes, return calls, update customers)
- **Key scenarios:**
  - Phones go down mid-shift — walk through reboot procedure, escalate if unresolved
  - Internet down but phones working — switch to mobile app, use BCP script ("We are experiencing a temporary internet outage..."), log every call on paper
  - Systems back online after outage — prioritize entering call notes and returning follow-up calls

---

## Data Seeding Requirements

### Service Packages (service_packages table)

Seed all pricing tiers with exact figures from knowledge base:

1. **Perimeter Pest Annual (Silver)** — Exterior only, bi-monthly, no contract
2. **Perimeter Plus Granular (Gold)** — + granular ant treatment
3. **Perimeter Plus SLP (Gold)** — + standard lawn pest
4. **Perimeter Plus Mosquito (Gold)** — + monthly mosquito
5. **Perimeter Plus Granular + Mosquito (Diamond)** — granular + mosquito bundle
6. **Perimeter Plus SLP + Mosquito (Diamond)** — SLP + mosquito bundle

Each with 4 sq ft tiers (<3000, 3001-4000, 4001-5000, 5001+) and both standard and price-drop rates.

**Specialty packages:** Bed Bug ($1,000), German Roach ($500), Sentricon Install ($895), Sentricon Renewal ($375), Sentricon Takeover ($375), Rodent Exclusion ($1,295+), Rodent Bait ($35/box min 2), OTS ($199), Mosquito Only ($80/mo), TAP ($2,400 min)

### Package Objections (package_objections table)

Seed common objections with recommended responses:

- "Too expensive" → Value comparison (free service calls, warranty, satisfaction guarantee)
- "My neighbor pays less" → Different service level, warranty inclusion
- "Why aren't German roaches covered?" → Specialized treatment, can't prevent introduction
- "Why am I still getting bitten (bed bugs)?" → Aprehend timeline, biological process, 3-6 week resolution
- "Why can't I clean after bed bug treatment?" → Removes spores, invalidates 90-day residual
- "Can I spray something extra for bed bugs?" → No, interferes with treatment
- "Why does Sentricon not cover drywood termites?" → Different biology, Sentricon targets subterranean foragers
- "Why can't you do rodent exclusion on my crawlspace home?" → Cannot fully seal
- "Dead bugs everywhere, treatment isn't working" → Opposite — dead bugs mean it IS working

### Customer Profiles (customer_profiles table)

Create 15-20 AUN-specific personas:

**Easy difficulty:**
- Friendly new homeowner, first-time pest control buyer
- Existing customer, happy, calling for routine questions
- Referral customer, pre-sold, just needs to be scheduled

**Medium difficulty:**
- Price-conscious customer comparing quotes
- Existing customer with card decline (longstanding, cooperative)
- Customer reporting non-warrantied pest (needs education)
- Customer wanting to reschedule, hard to pin down

**Hard difficulty:**
- Angry customer after tech no-show
- Customer threatening cancellation over "still seeing bugs"
- Bed bug customer 2 weeks post-treatment, frustrated
- German roach customer refusing to do prep work
- Customer with spray foam wanting Sentricon
- Customer in non-serviceable location (crawlspace home wanting rodent exclusion)
- Customer insisting on services AUN doesn't offer

### Sales Guidelines (sales_guidelines table)

- Minimum initial service: $99 (all plans)
- Lead gen (FB/Thumbtack): $49 initial
- Takeover/exterior only: $79 initial
- Double lot: +$5/month
- Same-day service: manager approval required
- SLP paired with GHP on lot <=7,500 sq ft: $60 quarterly
- In-wall system: +$5/month
- Price drops: only when approved by management
- TAP: always inspection before selling
- Rodent exclusion: payment in full + signed agreement before work

### Scenario Templates (scenario_templates table)

50+ curated templates covering every critical procedure:

**Card decline scenarios (4):**
- Longstanding customer, tech on-site
- New customer, tech on-site
- Customer wants to pay later (verbal approval flow)
- Customer with 5 exactly paid visits (edge case)

**Service call triage (6):**
- Dead bugs (reassurance, no visit)
- Minimal activity (1-3 bugs, normal)
- Millipedes (seasonal, SLP helps)
- Plaster bagworms (never schedule)
- Pantry pests (customer DIY)
- Customer insists despite unnecessary (always schedule)

**Pest qualification (8):**
- German roach — all 5 questions
- Rodent — crawlspace check, home type, location
- Bed bug — payment, vacate, prep, post-treatment
- Sentricon — spray foam check, access, payment
- TAP — inspection first, whole-home, minimum price
- Fire ants vs regular ants — routing to QGG
- Drywood vs subterranean termites — Baton referral
- Flea qualification — vet meds, vacate, manufactured home check

**Scheduling (6):**
- German roach 3-visit booking
- Rodent exclusion full sequence
- Sentricon install + uninstall (takeover)
- Initial service two follow-ups
- 3-attempt contact protocol
- Technician no-show recovery

**Retention (4):**
- Hold policy execution
- Cancellation save — service quality concern
- Cancellation save — price concern
- Cancellation save — moving

**Communication (4):**
- Card decline template selection (longstanding vs new)
- Not-home template selection
- Gate access template selection
- Baton referral template

**Approval workflows (4):**
- Initial service approval checklist
- Recurring service with card decline
- Construction/work around home assessment
- Sentricon spray foam policy

---

## Success Metrics

- CSRs completing all assigned courses within onboarding period
- Module pass rates (target: 80%+ first attempt on Easy, 65%+ on Medium, 50%+ on Hard)
- Score improvements on repeated module attempts
- Reduction in real-world unnecessary service calls
- Improvement in upsell/bundle rates (sales team)
- Reduction in avoidable cancellations (CS team)

---

## Technical Integration

All content seeds into existing database tables:
- `courses` + `course_modules` — 7 courses, ~30 modules
- `service_packages` + `package_selling_points` — all AUN tiers with exact pricing
- `package_objections` — objections with recommended responses
- `customer_profiles` — 15-20 AUN-specific personas
- `sales_guidelines` — pricing rules and constraints
- `scenario_templates` — 50+ curated templates for critical procedures
- `competitor_info` — optional, if AUN provides competitor data

Scenarios are generated per-user by the existing `scenarioGenerator.js` service, using curated templates as foundations with AI-generated variety layered on top. The Retell AI voice system handles real-time call simulation. Claude analyzes transcripts post-call for scoring and coaching.

Organization-scoped via `organization_id` on all tables — AUN content is isolated to their org.
