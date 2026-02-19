# All U Need Pest Control Training Seed — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Node.js seed script that populates an AUN organization with 7 courses, ~30 modules, 50+ scenario templates, exact pricing, objections, customer profiles, and sales guidelines — all derived from AUN's knowledge base.

**Architecture:** Single parameterized seed script (`api/scripts/seed-alluneed.js`) using the existing Supabase admin client. All data is org-scoped via `organization_id`. The existing `scenarioGenerator.js` already fetches this data dynamically — no code changes needed to the core platform. The script is idempotent (uses upsert/conflict handling).

**Tech Stack:** Node.js, Supabase JS client, existing `api/lib/supabase.js` admin client

**Design Doc:** `docs/plans/2026-02-18-alluneed-training-course-design.md`

---

## Task 1: Create Seed Script Skeleton

**Files:**
- Create: `api/scripts/seed-alluneed.js`

**Step 1: Create the script with CLI argument parsing and Supabase connection**

```javascript
// api/scripts/seed-alluneed.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ORG_ID = process.argv[2];
if (!ORG_ID) {
  console.error('Usage: node seed-alluneed.js <organization_id>');
  process.exit(1);
}

async function verifyOrg() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', ORG_ID)
    .single();
  if (error || !data) {
    console.error(`Organization ${ORG_ID} not found`);
    process.exit(1);
  }
  console.log(`Seeding training data for: ${data.name} (${data.id})`);
  return data;
}

async function seedServicePackages() { /* Task 2 */ }
async function seedObjectionsAndSellingPoints() { /* Task 3 */ }
async function seedSalesGuidelines() { /* Task 4 */ }
async function seedCustomerProfiles() { /* Task 5 */ }
async function seedCoursesAndModules() { /* Task 6 */ }
async function seedScenarioTemplates(courseModuleMap) { /* Task 7-8 */ }

async function main() {
  try {
    const org = await verifyOrg();
    console.log('\n--- Seeding Service Packages ---');
    const packageMap = await seedServicePackages();
    console.log('\n--- Seeding Objections & Selling Points ---');
    await seedObjectionsAndSellingPoints(packageMap);
    console.log('\n--- Seeding Sales Guidelines ---');
    await seedSalesGuidelines();
    console.log('\n--- Seeding Customer Profiles ---');
    await seedCustomerProfiles();
    console.log('\n--- Seeding Courses & Modules ---');
    const courseModuleMap = await seedCoursesAndModules();
    console.log('\n--- Seeding Scenario Templates ---');
    await seedScenarioTemplates(courseModuleMap);
    console.log('\n=== Seed complete ===');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
```

**Step 2: Verify the script runs and finds the org**

Run: `cd api && node scripts/seed-alluneed.js <test_org_id>`
Expected: Prints org name or "Organization not found" error

**Step 3: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add AUN training seed script skeleton"
```

---

## Task 2: Seed Service Packages

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Context:** AUN has 6 recurring tiers (Silver, Gold×3, Diamond×2) each with 4 sq ft brackets, plus ~12 specialty services. Total: ~36 packages.

**Step 1: Define the package data constants**

Add to `seed-alluneed.js` above the function definitions:

```javascript
const RECURRING_PACKAGES = [
  // Silver - Perimeter Pest Annual (Exterior Only, Bi-Monthly)
  {
    name: 'Perimeter Pest Annual (Silver)',
    internal_name: 'silver',
    description: 'Exterior only pest control, bi-monthly service, no contract. Covers ants, roaches, spiders, silverfish, earwigs.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly (every 60 days)',
    warranty_details: '60-day warranty between services. Free service calls for active pest issues.',
    included_pests: ['ants (excl. BHA & fire ants)', 'roaches (excl. German)', 'spiders', 'silverfish', 'earwigs'],
    included_services: ['exterior perimeter spray', 'fog treatment', 'granular barrier', 'entry point treatment', 'soffit sweep', 'lanai/pool cage'],
    target_customer: 'Budget-conscious homeowners wanting basic exterior protection',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 45, yearly: 645, drop_initial: 99, drop_monthly: 42, drop_yearly: 561 },
      { sqft: '3001-4000', initial: 190, monthly: 50, yearly: 740, drop_initial: 150, drop_monthly: 47, drop_yearly: 667 },
      { sqft: '4001-5000', initial: 280, monthly: 57, yearly: 907, drop_initial: 240, drop_monthly: 54, drop_yearly: 834 },
      { sqft: '5001+', initial: 380, monthly: 67, yearly: 1117, drop_initial: 340, drop_monthly: 64, drop_yearly: 1044 },
    ]
  },
  // Gold - Perimeter Plus Granular
  {
    name: 'Perimeter Plus Granular (Gold)',
    internal_name: 'gold_granular',
    description: 'Perimeter pest control plus quarterly granular ant treatment. Covers all Silver pests plus big headed ants and fire ants.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly pest + quarterly granular',
    warranty_details: '60-90 day warranty. Free service calls between visits.',
    included_pests: ['all Silver pests', 'big headed ants', 'fire ants'],
    included_services: ['all Silver services', 'quarterly granular ant treatment across full lawn and mulch beds'],
    target_customer: 'Homeowners with ant problems in lawn, especially BHA or fire ants',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 55, yearly: 755, drop_initial: 99, drop_monthly: 52, drop_yearly: 671 },
      { sqft: '3001-4000', initial: 190, monthly: 60, yearly: 850, drop_initial: 150, drop_monthly: 55, drop_yearly: 755 },
      { sqft: '4001-5000', initial: 280, monthly: 67, yearly: 1017, drop_initial: 240, drop_monthly: 62, drop_yearly: 922 },
      { sqft: '5001+', initial: 300, monthly: 85, yearly: 1235, drop_initial: 250, drop_monthly: 82, drop_yearly: 1152 },
    ]
  },
  // Gold - Perimeter Plus SLP
  {
    name: 'Perimeter Plus SLP (Gold)',
    internal_name: 'gold_slp',
    description: 'Perimeter pest control plus standard lawn pest control. Covers home and lawn pests.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly pest + quarterly lawn (when paired)',
    warranty_details: '60-90 day warranty. Free service calls between visits.',
    included_pests: ['all Silver pests', 'lawn ants', 'lawn spiders', 'lawn roaches', 'fleas', 'ticks', 'millipedes', 'centipedes'],
    included_services: ['all Silver services', 'liquid lawn spray via power sprayer', 'full lawn coverage'],
    target_customer: 'Homeowners wanting comprehensive home + lawn protection',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 65, yearly: 865, drop_initial: 99, drop_monthly: 62, drop_yearly: 781 },
      { sqft: '3001-4000', initial: 190, monthly: 70, yearly: 960, drop_initial: 150, drop_monthly: 65, drop_yearly: 865 },
      { sqft: '4001-5000', initial: 280, monthly: 77, yearly: 1127, drop_initial: 240, drop_monthly: 72, drop_yearly: 1032 },
      { sqft: '5001+', initial: 380, monthly: 87, yearly: 1337, drop_initial: 340, drop_monthly: 82, drop_yearly: 1242 },
    ]
  },
  // Gold - Perimeter Plus Mosquito
  {
    name: 'Perimeter Plus Mosquito (Gold)',
    internal_name: 'gold_mosquito',
    description: 'Perimeter pest control plus monthly mosquito treatment.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly pest + monthly mosquito',
    warranty_details: '60-day pest warranty. Monthly mosquito coverage.',
    included_pests: ['all Silver pests', 'mosquitoes'],
    included_services: ['all Silver services', 'monthly mosquito spray on trees, shrubs, standing water areas'],
    target_customer: 'Homeowners near water or in mosquito-heavy areas',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 90, yearly: 1140, drop_initial: 99, drop_monthly: 87, drop_yearly: 1056 },
      { sqft: '3001-4000', initial: 190, monthly: 95, yearly: 1235, drop_initial: 150, drop_monthly: 92, drop_yearly: 1162 },
      { sqft: '4001-5000', initial: 280, monthly: 102, yearly: 1402, drop_initial: 240, drop_monthly: 99, drop_yearly: 1329 },
      { sqft: '5001+', initial: 380, monthly: 112, yearly: 1612, drop_initial: 340, drop_monthly: 109, drop_yearly: 1539 },
    ]
  },
  // Diamond - Perimeter Plus Granular + Mosquito
  {
    name: 'Perimeter Plus Granular + Mosquito (Diamond)',
    internal_name: 'diamond_granular_mosquito',
    description: 'Premium bundle: perimeter pest + granular ant program + monthly mosquito.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly pest + quarterly granular + monthly mosquito',
    warranty_details: '60-90 day warranty. Free service calls. Full lawn + mosquito coverage.',
    included_pests: ['all Silver pests', 'big headed ants', 'fire ants', 'mosquitoes'],
    included_services: ['all Silver services', 'quarterly granular ant treatment', 'monthly mosquito spray'],
    target_customer: 'Homeowners wanting comprehensive protection with ant + mosquito coverage',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 97, yearly: 1217, drop_initial: 99, drop_monthly: 94, drop_yearly: 1133 },
      { sqft: '3001-4000', initial: 190, monthly: 105, yearly: 1345, drop_initial: 150, drop_monthly: 100, drop_yearly: 1250 },
      { sqft: '4001-5000', initial: 280, monthly: 112, yearly: 1512, drop_initial: 240, drop_monthly: 107, drop_yearly: 1417 },
      { sqft: '5001+', initial: 300, monthly: 130, yearly: 1730, drop_initial: 250, drop_monthly: 127, drop_yearly: 1647 },
    ]
  },
  // Diamond - Perimeter Plus SLP + Mosquito
  {
    name: 'Perimeter Plus SLP + Mosquito (Diamond)',
    internal_name: 'diamond_slp_mosquito',
    description: 'Ultimate bundle: perimeter pest + standard lawn pest + monthly mosquito.',
    pricing_model: 'monthly',
    service_frequency: 'Bi-monthly pest + quarterly lawn + monthly mosquito',
    warranty_details: '60-90 day warranty. Free service calls. Complete home, lawn, and mosquito protection.',
    included_pests: ['all Silver pests', 'lawn pests (ants, spiders, roaches, fleas, ticks, millipedes, centipedes)', 'mosquitoes'],
    included_services: ['all Silver services', 'liquid lawn spray', 'monthly mosquito treatment'],
    target_customer: 'Homeowners wanting the most comprehensive protection available',
    tiers: [
      { sqft: '<3000', initial: 150, monthly: 110, yearly: 1360, drop_initial: 99, drop_monthly: 107, drop_yearly: 1276 },
      { sqft: '3001-4000', initial: 190, monthly: 115, yearly: 1455, drop_initial: 150, drop_monthly: 110, drop_yearly: 1360 },
      { sqft: '4001-5000', initial: 280, monthly: 122, yearly: 1622, drop_initial: 240, drop_monthly: 117, drop_yearly: 1527 },
      { sqft: '5001+', initial: 380, monthly: 132, yearly: 1832, drop_initial: 340, drop_monthly: 127, drop_yearly: 1737 },
    ]
  }
];

const SPECIALTY_PACKAGES = [
  {
    name: 'Bed Bug Treatment (Aprehend)',
    internal_name: 'bed_bug',
    description: 'Single-visit biological bed bug treatment using Aprehend (Beauveria bassiana fungus). 60-day warranty. Must vacate 4+ hours. Single-family homes only.',
    pricing_model: 'one_time',
    initial_price: 1000,
    service_frequency: '1 visit + possible follow-up',
    warranty_details: '60-day warranty. Follow-up visit = "Bed Bug 2".',
    included_pests: ['bed bugs'],
    target_customer: 'Homeowners with confirmed bed bug activity'
  },
  {
    name: 'German Roach Treatment',
    internal_name: 'german_roach',
    description: '3-visit intensive treatment program (14 days apart). Uses professional baits, IGR, and dust. Focuses on kitchens, bathrooms, laundry rooms. Customer prep required.',
    pricing_model: 'one_time',
    initial_price: 500,
    service_frequency: '3 visits, ~14 days apart',
    warranty_details: '30 days from last paid service. Follow-up = "German Roach 4". Minimum $400.',
    included_pests: ['German cockroaches'],
    target_customer: 'Homeowners with confirmed German roach activity'
  },
  {
    name: 'Sentricon Installation',
    internal_name: 'sentricon_install',
    description: 'In-ground bait station system for subterranean termite colony elimination. Does NOT treat drywood termites.',
    pricing_model: 'one_time',
    initial_price: 895,
    service_frequency: 'One-time install + annual monitoring',
    warranty_details: 'Annual renewal at $375/year. Stations inspected/replenished annually.',
    included_pests: ['subterranean termites'],
    target_customer: 'Homeowners wanting termite protection (no spray foam insulation)'
  },
  {
    name: 'Sentricon Renewal',
    internal_name: 'sentricon_renewal',
    description: 'Annual renewal of existing Sentricon system. Inspection and bait replenishment.',
    pricing_model: 'annual',
    recurring_price: 375,
    service_frequency: 'Annual',
    warranty_details: 'Continued termite protection for the year.',
    included_pests: ['subterranean termites'],
    target_customer: 'Existing Sentricon customers'
  },
  {
    name: 'Sentricon Takeover',
    internal_name: 'sentricon_takeover',
    description: 'Taking over monitoring of existing Sentricon system from another provider.',
    pricing_model: 'one_time',
    initial_price: 375,
    service_frequency: 'One-time takeover + annual renewal',
    warranty_details: 'Includes first year. Renewal at $375/year.',
    included_pests: ['subterranean termites'],
    target_customer: 'Homeowners with existing Sentricon from another provider'
  },
  {
    name: 'Rodent Exclusion',
    internal_name: 'rodent_exclusion',
    description: 'Sealing entry points + attic trap placement + 4 follow-up trap checks. Single-family homes only. No crawlspaces, townhomes, condos, manufactured homes.',
    pricing_model: 'one_time',
    initial_price: 1295,
    service_frequency: 'Exclusion + 4 trap checks (Mon/Thu)',
    warranty_details: '1-year warranty. Extra trap checks $85 each.',
    included_pests: ['rats', 'mice'],
    target_customer: 'Single-family homeowners with confirmed rodent activity (no crawlspace)'
  },
  {
    name: 'Rodent Bait Box Installation',
    internal_name: 'rodent_bait_install',
    description: 'Exterior-only tamper-resistant bait stations with anticoagulant rodenticide (Final Blox). Minimum 2 boxes. Property must be fully sealed first.',
    pricing_model: 'one_time',
    initial_price: 70,
    service_frequency: 'Installation + quarterly refill',
    warranty_details: '$8/box refill. $35/box install (min 2).',
    included_pests: ['rats', 'mice (exterior only)'],
    target_customer: 'Homeowners with exterior-only rodent activity and sealed property'
  },
  {
    name: 'Flea Treatment',
    internal_name: 'flea',
    description: 'Interior treatment: full-surface liquid (insecticide + IGR) + dust in cracks/crevices. 2 treatments, 2 weeks apart. Pets must be on vet-prescribed flea medication.',
    pricing_model: 'one_time',
    initial_price: 199,
    service_frequency: '2 visits, 2 weeks apart',
    warranty_details: '30 days from final treatment.',
    included_pests: ['fleas'],
    target_customer: 'Pet owners with confirmed flea infestation'
  },
  {
    name: 'Mosquito Service (Standalone)',
    internal_name: 'mosquito_standalone',
    description: 'Monthly mosquito treatment. Liquid application with repellent + IGR on all trees, shrubs, and standing water areas.',
    pricing_model: 'monthly',
    recurring_price: 80,
    service_frequency: 'Monthly (seasonal May-October option available)',
    warranty_details: 'Monthly coverage. Seasonal option April-October.',
    included_pests: ['mosquitoes'],
    target_customer: 'Homeowners wanting mosquito control without full pest bundle'
  },
  {
    name: 'One-Time Service (Single Family)',
    internal_name: 'ots_single_family',
    description: 'Single pest treatment visit for single-family homes.',
    pricing_model: 'one_time',
    initial_price: 199,
    service_frequency: 'One visit',
    warranty_details: '30-day warranty.',
    included_pests: ['general pests'],
    target_customer: 'Homeowners wanting a single treatment without recurring service'
  },
  {
    name: 'One-Time Service (Apt/Condo)',
    internal_name: 'ots_apt_condo',
    description: 'Single pest treatment visit for apartments and condos.',
    pricing_model: 'one_time',
    initial_price: 199,
    service_frequency: 'One visit',
    warranty_details: '30-day warranty. Discount to $180 available. Below $180 = manager approval.',
    included_pests: ['general pests'],
    target_customer: 'Apartment/condo residents wanting a single treatment'
  },
  {
    name: 'TAP Insulation',
    internal_name: 'tap_insulation',
    description: 'Thermal, Acoustical, Pest Control insulation. Whole-home attic solution. Inspection required before selling. Coordinate scheduling with Ryan.',
    pricing_model: 'one_time',
    initial_price: 2400,
    service_frequency: 'One-time installation (permanent)',
    warranty_details: 'Permanent pest protection. R-3.6 per inch. 15-30% energy bill reduction.',
    included_pests: ['ants', 'termites', 'cockroaches', 'silverfish'],
    target_customer: 'Homeowners wanting energy efficiency + permanent pest protection'
  }
];
```

**Step 2: Implement the seedServicePackages function**

```javascript
async function seedServicePackages() {
  const packageMap = {};

  // Insert recurring packages (one row per sq ft tier for price_display clarity)
  for (const pkg of RECURRING_PACKAGES) {
    for (const tier of pkg.tiers) {
      const record = {
        organization_id: ORG_ID,
        name: `${pkg.name} — ${tier.sqft} sq ft`,
        internal_name: `${pkg.internal_name}_${tier.sqft.replace(/[^a-z0-9]/gi, '')}`,
        description: pkg.description,
        pricing_model: pkg.pricing_model,
        initial_price: tier.initial,
        recurring_price: tier.monthly,
        price_display: `$${tier.initial} initial + $${tier.monthly}/mo ($${tier.yearly}/yr)`,
        included_pests: pkg.included_pests,
        included_services: pkg.included_services,
        service_frequency: pkg.service_frequency,
        warranty_details: pkg.warranty_details,
        target_customer: pkg.target_customer,
        ideal_situations: [`Home ${tier.sqft} sq ft`, `Price drop: $${tier.drop_initial} initial + $${tier.drop_monthly}/mo ($${tier.drop_yearly}/yr)`],
        is_active: true
      };

      const { data, error } = await supabase
        .from('service_packages')
        .upsert(record, { onConflict: 'organization_id,internal_name', ignoreDuplicates: false })
        .select()
        .single();

      if (error) {
        // Fallback: insert without upsert
        const { data: inserted, error: insertErr } = await supabase
          .from('service_packages')
          .insert(record)
          .select()
          .single();
        if (insertErr) throw insertErr;
        packageMap[record.internal_name] = inserted.id;
      } else {
        packageMap[record.internal_name] = data.id;
      }
    }
  }

  // Insert specialty packages
  for (const pkg of SPECIALTY_PACKAGES) {
    const record = {
      organization_id: ORG_ID,
      name: pkg.name,
      internal_name: pkg.internal_name,
      description: pkg.description,
      pricing_model: pkg.pricing_model,
      initial_price: pkg.initial_price || null,
      recurring_price: pkg.recurring_price || null,
      price_display: pkg.initial_price ? `$${pkg.initial_price}` : `$${pkg.recurring_price}/mo`,
      included_pests: pkg.included_pests,
      service_frequency: pkg.service_frequency,
      warranty_details: pkg.warranty_details,
      target_customer: pkg.target_customer,
      is_active: true
    };

    const { data, error } = await supabase
      .from('service_packages')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    packageMap[pkg.internal_name] = data.id;
  }

  console.log(`  Inserted ${Object.keys(packageMap).length} service packages`);
  return packageMap;
}
```

**Step 3: Run and verify packages seed**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: "Inserted 36 service packages" (24 recurring tiers + 12 specialty)

**Step 4: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add AUN service package seed data with exact pricing"
```

---

## Task 3: Seed Objections, Selling Points & Sales Guidelines

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Step 1: Define objections data and implement seeding**

Add objection data constants and the `seedObjectionsAndSellingPoints` function. Key objections to seed (linked to packages via `packageMap`):

**General objections (apply to all recurring packages):**
- "Too expensive" → Emphasize free service calls, warranty, satisfaction guarantee, 30K+ five-star reviews
- "My neighbor pays less" → Different service levels, warranty inclusion, what's covered vs not
- "I can just do it myself" → Professional-grade products, EPA-registered, integrated approach, safety
- "I need to think about it" → Same-day service available, pest activity won't wait, seasonal urgency

**Specialty objections:**
- German roach: "Why aren't they covered under regular pest control?" → Specialized intensive treatment required, can't prevent introduction
- German roach: "Why is it $400+?" → Minimum 3 treatments, professional baits + IGR, guaranteed results
- Bed bug: "Why am I still getting bitten?" → Aprehend works over days, expected in first 1-2 weeks, biological process
- Bed bug: "Why can't I clean after treatment?" → Removes fungal spores, invalidates 90-day residual
- Bed bug: "Can I spray something extra?" → No, other chemicals interfere with Aprehend
- Sentricon: "Does this cover drywood termites?" → No, Sentricon targets subterranean only, refer to Baton for drywood
- Rodent: "Why can't you do my crawlspace home?" → Cannot fully seal, exclusion requires complete sealing
- TAP: "Can you just do one room?" → Whole-home attic solution only, not individual rooms
- Service calls: "I'm still seeing bugs after treatment" → Dead bugs = treatment working, non-repellent takes 7-10 days

**Selling points per package tier:**
- Silver: Affordable protection, free service calls, bi-monthly coverage, lanai/pool cage included
- Gold: Everything in Silver + lawn/ant/mosquito protection (varies by sub-tier)
- Diamond: Most comprehensive, best value per service, complete home + lawn + mosquito

```javascript
async function seedObjectionsAndSellingPoints(packageMap) {
  // General objections for all recurring packages
  const generalObjections = [
    {
      objection_text: "That's too expensive",
      objection_category: 'price',
      frequency: 'very_common',
      recommended_response: "I understand price is important. Let me share what's included — you get free service calls between visits anytime you see live pest activity, which alone can save hundreds. Plus our satisfaction guarantee means if pests come back, we come back at no charge. Over 30,000 customers have given us five-star reviews because of that value.",
      response_key_points: ['free service calls between visits', 'satisfaction guarantee', '30,000+ five-star reviews', '3x Inc. 5000 company'],
      avoid_saying: ['It\'s the cheapest option', 'You get what you pay for', 'Others charge more'],
      coaching_tip: 'Focus on total value (service calls + warranty + guarantee) not just the monthly price. Calculate what a single emergency service call would cost without coverage.'
    },
    {
      objection_text: "My neighbor pays less for their pest control",
      objection_category: 'competitor',
      frequency: 'common',
      recommended_response: "That's great they have protection! Different companies offer different levels of coverage. Our plan includes free service calls anytime between visits, a full warranty on covered pests, and interior service on request. Many services that seem cheaper don't include those — and a single service call elsewhere can cost $150-200. Would you like me to walk through exactly what's covered?",
      response_key_points: ['different coverage levels', 'free service calls included', 'full warranty', 'interior service on request'],
      avoid_saying: ['They\'re probably getting bad service', 'You\'ll regret going cheap'],
      coaching_tip: 'Never badmouth competitors. Focus on what AUN includes, not what others lack.'
    },
    {
      objection_text: "I need to think about it",
      objection_category: 'stall',
      frequency: 'very_common',
      recommended_response: "Absolutely, it's a good decision to consider your options. I should mention that pest activity tends to increase the longer it goes untreated — what starts as a few ants can become a much bigger issue. We do offer same-day service when available, so whenever you're ready, we can usually get someone out quickly. Can I answer any specific questions that might help you decide?",
      response_key_points: ['respect their decision', 'pest activity increases over time', 'same-day service available'],
      avoid_saying: ['This offer expires today', 'You need to decide now'],
      coaching_tip: 'Create gentle urgency through education about pest behavior, not pressure tactics.'
    }
  ];

  // Insert general objections for each recurring package
  const recurringPackageIds = Object.entries(packageMap)
    .filter(([key]) => !SPECIALTY_PACKAGES.some(sp => sp.internal_name === key))
    .map(([, id]) => id);

  for (const pkgId of recurringPackageIds) {
    const objections = generalObjections.map((obj, idx) => ({
      package_id: pkgId,
      ...obj,
      display_order: idx
    }));
    const { error } = await supabase.from('package_objections').insert(objections);
    if (error) throw error;
  }

  // Specialty-specific objections
  const specialtyObjections = {
    german_roach: [
      {
        objection_text: "Why aren't German roaches covered under my regular pest control?",
        objection_category: 'coverage',
        frequency: 'very_common',
        recommended_response: "Great question. German roaches are the only roach species that lives entirely indoors and reproduces extremely quickly. They require specialized intensive treatments — professional baits, insect growth regulators, and targeted dust applications across three visits. Regular perimeter pest control treats the outside of your home, but German roaches are brought inside from external sources like packages, used appliances, or visitors. That's why they need their own dedicated treatment program.",
        response_key_points: ['only indoor roach species', 'rapid reproduction', 'introduced from external sources', 'requires 3 specialized visits'],
        avoid_saying: ['Your regular service should have caught them', 'We don\'t cover them'],
        coaching_tip: 'This is the #1 German roach question. Be educational, not dismissive. Explain the biology.'
      },
      {
        objection_text: "How did I get German roaches? My house is clean.",
        objection_category: 'education',
        frequency: 'common',
        recommended_response: "German roaches have absolutely nothing to do with cleanliness. They're carried inside from infested environments — they can hitch a ride in grocery bags, packages, used appliances, even a friend's purse. Restaurants, laundromats, and storage facilities are common sources. The good news is our treatment program is very effective at eliminating them.",
        response_key_points: ['not related to cleanliness', 'carried in from external sources', 'common introduction vectors', 'treatment is effective'],
        avoid_saying: ['Someone must have brought them in', 'Where have you been lately?'],
        coaching_tip: 'Customers are often embarrassed. Normalize it immediately — roaches don\'t discriminate.'
      }
    ],
    bed_bug: [
      {
        objection_text: "Why am I still getting bitten after treatment?",
        objection_category: 'timeline',
        frequency: 'very_common',
        recommended_response: "I completely understand the frustration. Aprehend works differently from chemical sprays — it uses a natural fungus that attaches to bed bugs when they cross treated surfaces. It takes 3-7 days for the fungus to work, and during that time the infected bugs spread it to others they contact. You should see a sharp decline in activity between days 7-21, with full resolution typically within 3-6 weeks. The most important thing is to keep sleeping in your bed so the bugs continue crossing the treated areas.",
        response_key_points: ['biological process takes 3-7 days', 'sharp decline days 7-21', 'full resolution 3-6 weeks', 'keep sleeping in treated bed'],
        avoid_saying: ['It should have worked by now', 'That\'s unusual'],
        coaching_tip: 'Set expectations BEFORE treatment. If calling post-treatment, validate their frustration then educate on timeline.'
      },
      {
        objection_text: "Why can't I clean my bedroom after treatment?",
        objection_category: 'post_treatment',
        frequency: 'common',
        recommended_response: "The Aprehend treatment creates an invisible barrier on surfaces that remains active for up to 90 days. When bed bugs walk across these treated surfaces, the fungal spores attach to them. If you clean, mop, steam, or apply any disinfectants, you'll remove those spores and eliminate the treatment's effectiveness. Think of it like a protective barrier that needs to stay in place to keep working. Regular activities like sleeping and walking are completely fine.",
        response_key_points: ['90-day active barrier', 'spores attach when bugs cross surfaces', 'cleaning removes spores', 'normal activities are fine'],
        avoid_saying: ['Just don\'t clean', 'It\'s not that hard'],
        coaching_tip: 'Use the "protective barrier" metaphor. Makes it intuitive why cleaning removes it.'
      }
    ],
    sentricon_install: [
      {
        objection_text: "Does this cover drywood termites too?",
        objection_category: 'coverage',
        frequency: 'common',
        recommended_response: "Sentricon is specifically designed for subterranean termites — the ones that nest underground and build mud tubes to reach your home. Drywood termites are a different species that lives inside the wood itself, so they require a different treatment approach. For drywood termites, I'd recommend contacting Baton Service Pros at 844-699-4138 — they specialize in that type of treatment.",
        response_key_points: ['Sentricon = subterranean only', 'drywood termites = different species', 'Baton referral: 844-699-4138'],
        avoid_saying: ['We don\'t do that', 'That\'s not our problem'],
        coaching_tip: 'Always provide the Baton referral number proactively. Don\'t leave the customer without a next step.'
      }
    ],
    rodent_exclusion: [
      {
        objection_text: "Why can't you service my crawlspace home?",
        objection_category: 'eligibility',
        frequency: 'common',
        recommended_response: "Our rodent exclusion service works by identifying and sealing every potential entry point, then placing traps to catch any rodents already inside. With crawlspace homes, there are simply too many access points underneath that can't be fully sealed — the crawlspace itself acts as an open pathway. Without being able to guarantee a complete seal, we can't provide our warranty. We want to make sure that when we do the work, it actually solves the problem long-term.",
        response_key_points: ['exclusion requires complete sealing', 'crawlspace has too many access points', 'can\'t guarantee warranty without full seal'],
        avoid_saying: ['We just don\'t do those', 'Find someone else'],
        coaching_tip: 'Explain the WHY — customers accept limitations when they understand the reasoning.'
      }
    ]
  };

  for (const [internalName, objections] of Object.entries(specialtyObjections)) {
    const pkgId = packageMap[internalName];
    if (!pkgId) continue;
    const rows = objections.map((obj, idx) => ({ package_id: pkgId, ...obj, display_order: idx }));
    const { error } = await supabase.from('package_objections').insert(rows);
    if (error) throw error;
  }

  // Selling points for tier categories
  const tierSellingPoints = {
    silver: ['Affordable perimeter protection', 'Free service calls between visits', 'Bi-monthly coverage', 'Lanai and pool cage included', 'Interior service available on request', 'Satisfaction guarantee'],
    gold_granular: ['Everything in Silver', 'Quarterly granular ant treatment', 'Covers big headed ants and fire ants', 'Full lawn and mulch bed coverage', 'Upgrade to SLP or SLP+ available'],
    gold_slp: ['Everything in Silver', 'Standard lawn pest control included', 'Covers fleas, ticks, millipedes, centipedes in lawn', 'Professional power sprayer application', 'Upgrade to SLP+ with plants & ornamentals'],
    gold_mosquito: ['Everything in Silver', 'Monthly mosquito treatment', 'Trees, shrubs, and standing water areas treated', 'Repellent + insect growth regulator', 'Seasonal April-October option available'],
    diamond_granular_mosquito: ['Most comprehensive ant + mosquito bundle', 'All Silver + Gold Granular + Mosquito benefits', 'Best value per service', 'Year-round protection', 'Complete peace of mind'],
    diamond_slp_mosquito: ['Ultimate protection package', 'All Silver + SLP + Mosquito benefits', 'Home, lawn, AND mosquito coverage', 'Best value per service', 'Nothing left unprotected']
  };

  for (const [tierPrefix, points] of Object.entries(tierSellingPoints)) {
    const matchingPkgIds = Object.entries(packageMap)
      .filter(([key]) => key.startsWith(tierPrefix))
      .map(([, id]) => id);

    for (const pkgId of matchingPkgIds) {
      const rows = points.map((point, idx) => ({
        package_id: pkgId,
        point,
        emphasis_level: idx === 0 ? 2 : 1,
        display_order: idx
      }));
      const { error } = await supabase.from('package_selling_points').insert(rows);
      if (error) throw error;
    }
  }

  console.log(`  Inserted objections and selling points`);
}
```

**Step 2: Implement seedSalesGuidelines**

```javascript
async function seedSalesGuidelines() {
  const guidelines = [
    {
      guideline_type: 'pricing_rule',
      title: 'Minimum Initial Service Price',
      content: 'Minimum initial service price is $99 for all plans. No exceptions without manager approval.',
      examples: ['Standard minimum: $99', 'Takeover/exterior only: $79', 'Lead gen (FB/Thumbtack): $49 initial']
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Double Lot Pricing',
      content: 'Add $5/month for double lots on any recurring plan.',
      examples: ['Gold SLP <3000 sqft on double lot: $65 + $5 = $70/month']
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Price Drops',
      content: 'Price drops are available when approved by management. Never offer price drops proactively — only use when needed to close. Each tier has a defined price drop schedule.',
      examples: ['Silver <3000: $150→$99 initial, $45→$42/mo', 'Gold SLP <3000: $150→$99 initial, $65→$62/mo']
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Same-Day Service',
      content: 'Same-day service requires manager approval before confirming with customer.',
      examples: []
    },
    {
      guideline_type: 'pricing_rule',
      title: 'SLP Paired with GHP Discount',
      content: 'When SLP is paired with GHP and the lot is <=7,500 sq ft, SLP can be offered at $60 quarterly.',
      examples: ['Customer on GHP Silver, wants lawn added: offer SLP at $60/quarter instead of standalone $80']
    },
    {
      guideline_type: 'pricing_rule',
      title: 'In-Wall System',
      content: 'In-wall pest system adds $5/month to any plan.',
      examples: []
    },
    {
      guideline_type: 'qualification',
      title: 'Rodent Exclusion Eligibility',
      content: 'Single-family homes ONLY. No crawlspaces, townhomes, condos, or manufactured homes. Not available in Texas. Not available for two-story homes in Jacksonville.',
      examples: ['Customer in Houston with rodents → NOT eligible (Texas)', 'Customer in Jax with 2-story → NOT eligible', 'Customer with crawlspace → NOT eligible']
    },
    {
      guideline_type: 'qualification',
      title: 'Sentricon Spray Foam Policy',
      content: 'New installations: Do NOT approve if spray foam insulation is found. Renewals: Honor remainder of contract, then not obligated to renew. Offer to uninstall or give 30 days to find another provider.',
      examples: ['New customer with spray foam → decline installation, explain why', 'Existing customer with spray foam, renewal due → honor contract, inform of non-renewal']
    },
    {
      guideline_type: 'qualification',
      title: 'TAP Insulation Pre-sell Requirements',
      content: 'Always requires an inspection before selling. Prequalify at $2,400 minimum. Whole-home attic only (not individual rooms). Coordinate scheduling with Ryan from TAP. Financing available upon approval.',
      examples: ['Customer asks for TAP quote → schedule inspection first, do not quote final price over phone']
    },
    {
      guideline_type: 'process',
      title: 'Card Decline — Longstanding Customer',
      content: 'If customer has 5+ paid quarterly services on record, approve the service to proceed even with a declined card. Use the longstanding customer voicemail/text template. Document in AR for follow-up.',
      examples: ['Customer with 8 visits, card declined, tech on-site → approve service, send longstanding template']
    },
    {
      guideline_type: 'process',
      title: 'Card Decline — New Customer',
      content: 'If customer has fewer than 5 paid services, do NOT approve service. Use the non-longstanding template. Follow up for updated payment information.',
      examples: ['Customer with 3 visits, card declined → do not approve, contact for updated payment']
    },
    {
      guideline_type: 'process',
      title: 'Service Call Eligibility',
      content: 'Free service calls between visits ONLY if: (1) customer is not currently due for next scheduled service AND (2) experiencing active live pest issue. If tech didn\'t have full access on last visit, schedule as CES/CIS, NOT a free service call.',
      examples: ['Due for quarterly next week + seeing ants → move up scheduled service', 'Had service 3 weeks ago + seeing roaches → eligible for free service call', 'Tech couldn\'t access backyard → schedule CES, not service call']
    },
    {
      guideline_type: 'referral',
      title: 'Baton Service Pros Referral',
      content: 'Refer to Baton Service Pros at (844) 699-4138 for services AUN does not offer: drywood termites, lawn care, grub treatment, and other non-pest services.',
      examples: ['Customer asks about drywood termites → refer to Baton', 'Customer wants lawn care company → refer to Baton']
    },
    {
      guideline_type: 'communication',
      title: 'Approved Customer Language',
      content: 'Use: "EPA registered," "applied according to label," "targets pest\'s life cycle," "part of integrated approach." Avoid: "It\'s harmless," "works instantly," "more chemical is better."',
      examples: []
    }
  ];

  const rows = guidelines.map((g, idx) => ({
    organization_id: ORG_ID,
    ...g,
    is_active: true,
    display_order: idx
  }));

  const { error } = await supabase.from('sales_guidelines').insert(rows);
  if (error) throw error;
  console.log(`  Inserted ${rows.length} sales guidelines`);
}
```

**Step 3: Run and verify**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: Objections, selling points, and guidelines inserted without errors

**Step 4: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add AUN objections, selling points, and sales guidelines"
```

---

## Task 4: Seed AUN Customer Profiles

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Context:** 15-20 pest-control-specific personas with tailored pain points, buying motivations, and personality traits. These supplement the 50 existing system profiles with AUN-specific scenarios.

**Step 1: Define and implement customer profile seeding**

```javascript
const AUN_CUSTOMER_PROFILES = [
  // EASY (close_difficulty 1-3)
  {
    name: 'Amanda Rivera',
    gender: 'female',
    age_range: '30-39',
    personality_traits: ['friendly', 'eager', 'trusting'],
    communication_style: 'friendly',
    pain_points: ['just moved to Florida', 'first time dealing with pest control', 'saw a few ants on the patio'],
    buying_motivations: ['wants family protection', 'new homeowner pride', 'neighbor recommended AUN'],
    objection_likelihood: 2,
    close_difficulty: 2
  },
  {
    name: 'Jake Morrison',
    gender: 'male',
    age_range: '25-34',
    personality_traits: ['laid-back', 'agreeable', 'practical'],
    communication_style: 'direct',
    pain_points: ['spiders in garage', 'girlfriend is terrified of bugs'],
    buying_motivations: ['quick resolution', 'impressing partner', 'affordable price'],
    objection_likelihood: 2,
    close_difficulty: 3
  },
  {
    name: 'Linda Chen',
    gender: 'female',
    age_range: '40-49',
    personality_traits: ['organized', 'decisive', 'loyal'],
    communication_style: 'direct',
    pain_points: ['referred by friend who uses AUN', 'wants consistent quarterly service', 'previous company was unreliable'],
    buying_motivations: ['reliability', 'switching from bad provider', 'friend\'s recommendation'],
    objection_likelihood: 1,
    close_difficulty: 2
  },
  // MEDIUM (close_difficulty 4-6)
  {
    name: 'Robert Fitzgerald',
    gender: 'male',
    age_range: '50-59',
    personality_traits: ['cautious', 'research-oriented', 'thorough'],
    communication_style: 'analytical',
    pain_points: ['fire ants in yard, grandkids visit often', 'wants to understand exactly what chemicals are used'],
    buying_motivations: ['grandchild safety', 'thorough explanation', 'professional credentials'],
    objection_likelihood: 5,
    close_difficulty: 5
  },
  {
    name: 'Maria Santos',
    gender: 'female',
    age_range: '35-44',
    personality_traits: ['price-conscious', 'comparison shopper', 'reasonable'],
    communication_style: 'analytical',
    pain_points: ['comparing 3 pest control companies', 'concerned about monthly cost adding up'],
    buying_motivations: ['best value for money', 'clear pricing', 'no hidden fees'],
    objection_likelihood: 6,
    close_difficulty: 5
  },
  {
    name: 'Tom Patterson',
    gender: 'male',
    age_range: '45-54',
    personality_traits: ['busy professional', 'impatient', 'results-oriented'],
    communication_style: 'direct',
    pain_points: ['roaches in kitchen, just bought a used refrigerator', 'doesn\'t have time for lengthy prep work'],
    buying_motivations: ['fast resolution', 'minimal disruption', 'professional handling'],
    objection_likelihood: 4,
    close_difficulty: 5
  },
  {
    name: 'Diane Crawford',
    gender: 'female',
    age_range: '60-69',
    personality_traits: ['detail-oriented', 'worried', 'talkative'],
    communication_style: 'emotional',
    pain_points: ['found droppings in attic, terrified of rodents', 'lives alone', 'worried about disease'],
    buying_motivations: ['safety and peace of mind', 'professional assessment', 'wants someone to handle everything'],
    objection_likelihood: 4,
    close_difficulty: 4
  },
  {
    name: 'Chris Nguyen',
    gender: 'male',
    age_range: '30-39',
    personality_traits: ['tech-savvy', 'skeptical of upsells', 'informed'],
    communication_style: 'analytical',
    pain_points: ['bed bugs after vacation', 'read conflicting info online', 'worried about chemical exposure'],
    buying_motivations: ['evidence-based approach', 'non-toxic options', 'clear timeline'],
    objection_likelihood: 6,
    close_difficulty: 6
  },
  {
    name: 'Sandra Williams',
    gender: 'female',
    age_range: '40-49',
    personality_traits: ['loyal customer', 'reasonable', 'expects good service'],
    communication_style: 'friendly',
    pain_points: ['existing AUN customer', 'card was declined on last visit', 'embarrassed about it'],
    buying_motivations: ['maintaining service continuity', 'good relationship with AUN', 'quick resolution'],
    objection_likelihood: 3,
    close_difficulty: 4
  },
  // HARD (close_difficulty 7-9)
  {
    name: 'Frank Henderson',
    gender: 'male',
    age_range: '55-64',
    personality_traits: ['confrontational', 'feels ripped off', 'threatening'],
    communication_style: 'confrontational',
    pain_points: ['had 3 GHP services and still seeing ants', 'feels the service doesn\'t work', 'threatening to cancel and leave bad review'],
    buying_motivations: ['proof the service works', 'immediate resolution', 'feeling heard'],
    objection_likelihood: 9,
    close_difficulty: 8
  },
  {
    name: 'Patricia Donovan',
    gender: 'female',
    age_range: '45-54',
    personality_traits: ['anxious', 'frustrated', 'impatient'],
    communication_style: 'emotional',
    pain_points: ['bed bug treatment 2 weeks ago', 'still getting bitten', 'wants refund or retreatment NOW'],
    buying_motivations: ['resolution of current problem', 'reassurance treatment is working'],
    objection_likelihood: 8,
    close_difficulty: 7
  },
  {
    name: 'Gary Lawson',
    gender: 'male',
    age_range: '40-49',
    personality_traits: ['DIY mindset', 'distrustful of companies', 'penny-pincher'],
    communication_style: 'guarded',
    pain_points: ['tried DIY pest control for months', 'problem getting worse', 'reluctant to pay for professional service'],
    buying_motivations: ['DIY failed', 'problem escalated', 'needs professional help but resents it'],
    objection_likelihood: 8,
    close_difficulty: 7
  },
  {
    name: 'Karen Mitchell',
    gender: 'female',
    age_range: '50-59',
    personality_traits: ['demanding', 'entitled', 'knows-it-all'],
    communication_style: 'confrontational',
    pain_points: ['technician no-show yesterday', 'took day off work for nothing', 'wants compensation'],
    buying_motivations: ['acknowledgment of mistake', 'priority rescheduling', 'some form of credit'],
    objection_likelihood: 9,
    close_difficulty: 8
  },
  {
    name: 'James Wright',
    gender: 'male',
    age_range: '35-44',
    personality_traits: ['stubborn', 'insistent', 'won\'t take no'],
    communication_style: 'direct',
    pain_points: ['wants rodent exclusion but has crawlspace home', 'doesn\'t understand why AUN can\'t help', 'previously told he qualifies by another company'],
    buying_motivations: ['solving rodent problem', 'will pay whatever it takes'],
    objection_likelihood: 7,
    close_difficulty: 8
  },
  {
    name: 'Betty Thompson',
    gender: 'female',
    age_range: '65-74',
    personality_traits: ['frugal', 'suspicious', 'resistant to change'],
    communication_style: 'guarded',
    pain_points: ['been with another pest company for 20 years', 'saw AUN ad', 'comparing but loyal to current provider'],
    buying_motivations: ['significant savings', 'better service guarantee', 'trusted referral'],
    objection_likelihood: 8,
    close_difficulty: 9
  },
  {
    name: 'Miguel Torres',
    gender: 'male',
    age_range: '30-39',
    personality_traits: ['frustrated', 'feeling embarrassed', 'wants discretion'],
    communication_style: 'emotional',
    pain_points: ['German roaches in apartment', 'landlord won\'t help', 'worried neighbors will find out'],
    buying_motivations: ['discreet service', 'fast results', 'not his fault — wants reassurance'],
    objection_likelihood: 5,
    close_difficulty: 7
  }
];

async function seedCustomerProfiles() {
  const rows = AUN_CUSTOMER_PROFILES.map(p => ({
    organization_id: ORG_ID,
    ...p,
    is_system: false,
    is_active: true
  }));

  const { data, error } = await supabase.from('customer_profiles').insert(rows).select('id, name');
  if (error) throw error;

  const profileMap = {};
  data.forEach(p => { profileMap[p.name] = p.id; });

  console.log(`  Inserted ${data.length} AUN customer profiles`);
  return profileMap;
}
```

**Step 2: Run and verify**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: "Inserted 16 AUN customer profiles"

**Step 3: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add AUN-specific customer profiles for training scenarios"
```

---

## Task 5: Seed Courses and Modules

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Context:** 7 courses with ~30 modules total. Org-scoped (not system courses). The module data drives scenario generation — `difficulty`, `scenario_count`, and `pass_threshold` are the key fields.

**Step 1: Define course and module data, implement seeding**

```javascript
const AUN_COURSES = [
  {
    name: 'Service Knowledge Fundamentals',
    description: 'Know what AUN sells, what\'s covered, what\'s not, and the vocabulary. Foundation course for both sales and CS teams.',
    category: 'product_knowledge',
    icon: '🏠',
    badge_name: 'Service Expert',
    badge_icon: '🎓',
    display_order: 1,
    modules: [
      { name: 'Home Pest Control (GHP)', description: 'Coverage, warranty, interior vs exterior, quarterly maintenance. What\'s included and what\'s excluded.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
      { name: 'Lawn Pest Control (SLP/QGG)', description: 'SLP vs QGG, bimonthly vs quarterly frequency, SLP+ upgrade path, non-covered lawn pests.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
      { name: 'Specialty Services Overview', description: 'Sentricon, bed bugs, German roach, rodents, fleas, mosquito, TAP — knowing when to schedule vs refer.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Non-Warrantied Pests', description: 'Proper handling of carpet beetles, dust mites, drywood termites, pantry pests, grubs, chinch bugs. When to refer to Baton.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      { name: 'Service Lingo Fluency', description: 'Natural use of industry abbreviations (GHP, SLP, CES, CIS, DNS, OTS, QGG, DSV, IGR, TAP, BCP, AR).', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 }
    ]
  },
  {
    name: 'Pricing & Sales',
    description: 'Quote accurately, sell confidently, upsell naturally. For the sales team.',
    category: 'sales_skills',
    icon: '💰',
    badge_name: 'Sales Pro',
    badge_icon: '🏆',
    display_order: 2,
    modules: [
      { name: 'Quoting New Customers', description: 'Square footage to tier matching, reading pricing tables, initial + monthly + yearly. Lead gen and minimum pricing rules.', difficulty: 'medium', scenario_count: 10, pass_threshold: 65 },
      { name: 'Package Tiers (Silver → Gold → Diamond)', description: 'Explaining value differences between tiers. Matching customer needs to the right package.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Upselling & Bundling', description: 'Moving Silver to Gold, presenting price drops, double lot surcharges, SLP paired discount.', difficulty: 'hard', scenario_count: 12, pass_threshold: 55 },
      { name: 'Handling Price Objections', description: 'Responding to "too expensive," competitor comparisons, value-based selling, leveraging service call inclusion.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
      { name: 'Specialty Service Sales', description: 'Quoting and selling bed bug, German roach, Sentricon, rodent exclusion, TAP, and one-time services.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 }
    ]
  },
  {
    name: 'Scheduling & Service Call Triage',
    description: 'Right service, right time, no unnecessary truck rolls. For the CS team.',
    category: 'customer_service',
    icon: '📋',
    badge_name: 'Scheduling Expert',
    badge_icon: '📅',
    display_order: 3,
    modules: [
      { name: 'Booking Initial Services', description: 'Agreement verification, payment processing, pet safety check, two follow-ups. Marshall Reddick exception.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
      { name: 'Service Call vs. Full Service', description: 'Free service call eligibility, warranty windows by service type, CES/CIS distinction.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Avoiding Unnecessary Visits', description: 'Dead bugs, minimal activity, millipedes, plaster bagworms, pantry pests — phone resolution techniques.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Rescheduling & Follow-Up', description: 'Correct template selection for 15+ situations, 3-attempt protocol, technician call-out messaging.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Multi-Visit Scheduling', description: 'German roach 3-visit flow, rodent exclusion sequence, Sentricon install/takeover, holiday adjustments.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 }
    ]
  },
  {
    name: 'Customer Retention & De-escalation',
    description: 'Save the account, keep the customer. For the CS team.',
    category: 'retention',
    icon: '🛡️',
    badge_name: 'Retention Champion',
    badge_icon: '💎',
    display_order: 4,
    modules: [
      { name: 'Card Decline Handling', description: 'Longstanding customer (5+ visits) vs new customer protocol. Verbal approval flow, RED NOTE documentation.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
      { name: 'Hold Policy Execution', description: '90-day maximum, correct reason selection, payment pausing, contract customer restrictions.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      { name: 'Cancellation Saves', description: 'Root cause investigation, available concessions, escalation vs release decisions.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
      { name: 'Gate Access & Not-Home', description: 'Template selection for not-home, exterior completed, lockbox issues, gate code failures.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
      { name: 'Angry Customer De-escalation', description: 'Tech no-shows, "still seeing bugs" complaints, bed bug timeline frustration.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 }
    ]
  },
  {
    name: 'Specialty Service Qualification',
    description: 'Qualify leads correctly for complex services. For the sales team.',
    category: 'sales_skills',
    icon: '🔍',
    badge_name: 'Qualification Expert',
    badge_icon: '🎯',
    display_order: 5,
    modules: [
      { name: 'Rodent Qualification', description: 'Prequalification questions, eligibility exclusions (crawlspace, townhome, TX, 2-story Jax), pricing.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
      { name: 'German Roach Qualification', description: 'Five prequalification questions, $400 minimum, 3-treatment requirement, customer prep communication.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
      { name: 'Bed Bug Qualification', description: 'Payment policy, vacate requirement, Aprehend education, post-treatment rules, common objection handling.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
      { name: 'Sentricon Qualification', description: 'Interior access requirement, payment-before-service, spray foam policy, install vs takeover vs renewal.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
      { name: 'TAP Insulation Qualification', description: 'Inspection-first requirement, $2,400 minimum, capping vs restoration, whole-home only, Ryan coordination.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 }
    ]
  },
  {
    name: 'Communication & Documentation',
    description: 'Say the right thing, document everything. For both teams.',
    category: 'customer_service',
    icon: '📝',
    badge_name: 'Communication Pro',
    badge_icon: '✍️',
    display_order: 6,
    modules: [
      { name: 'Professional Call Handling', description: 'Standard greeting, customer name usage, proper tone, callback number, professional closing.', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 },
      { name: 'Text & Voicemail Templates', description: 'Selecting correct template for 15+ situations, personalizing with customer details.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'Task Documentation', description: 'Task setup, interaction logging, status usage, follow-up cadence by task type.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      { name: 'Service Area Routing', description: 'ZIP code to office mapping, dial code usage, coverage boundaries across FL, TX, SC.', difficulty: 'easy', scenario_count: 6, pass_threshold: 75 }
    ]
  },
  {
    name: 'Complex Service Coordination',
    description: 'Manage multi-visit services and complex approval workflows. For the CS team.',
    category: 'advanced',
    icon: '⚙️',
    badge_name: 'Operations Expert',
    badge_icon: '🔧',
    display_order: 7,
    modules: [
      { name: 'Initial Service Approval Workflow', description: 'Full approval checklist, Marshall Reddick exception, two follow-ups, locked gate partial service.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
      { name: 'Recurring Service Approval', description: 'Exterior access + pets, construction safety, card decline rules by visit history.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      { name: 'Technician No-Show Recovery', description: 'Responsibility determination (office vs D2D sale), 3-attempt protocol, cancellation procedure.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
      { name: 'Post-Treatment Follow-Up', description: 'Service call follow-up, bed bug/flea/German roach timeline education, rodent trap monitoring.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
      { name: 'BCP — Service During Disruptions', description: 'Phone outage reboot, internet outage mobile app switch, paper logging, post-outage recovery.', difficulty: 'medium', scenario_count: 6, pass_threshold: 60 }
    ]
  }
];

async function seedCoursesAndModules() {
  const courseModuleMap = {};

  for (const course of AUN_COURSES) {
    const { modules, ...courseData } = course;

    const { data: courseRow, error: courseErr } = await supabase
      .from('courses')
      .insert({
        organization_id: ORG_ID,
        ...courseData,
        is_system: false,
        is_active: true
      })
      .select()
      .single();

    if (courseErr) throw courseErr;

    const moduleRows = modules.map((mod, idx) => ({
      course_id: courseRow.id,
      ...mod,
      required_completions: 1,
      unlock_order: idx
    }));

    const { data: insertedModules, error: modErr } = await supabase
      .from('course_modules')
      .insert(moduleRows)
      .select();

    if (modErr) throw modErr;

    courseModuleMap[course.name] = {
      courseId: courseRow.id,
      modules: {}
    };
    insertedModules.forEach(m => {
      courseModuleMap[course.name].modules[m.name] = m.id;
    });

    console.log(`  Course: ${course.name} (${insertedModules.length} modules)`);
  }

  return courseModuleMap;
}
```

**Step 2: Run and verify**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: 7 courses with module counts printed

**Step 3: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add AUN 7 courses with 30 modules"
```

---

## Task 6: Seed Scenario Templates — Courses 1-4

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Context:** Scenario templates provide the AI scenario generator with structured foundations. Each template has a `base_situation`, `customer_goals`, `csr_objectives`, `scoring_focus`, and trigger/resolution conditions. Templates are linked to modules via `module_id`.

**Step 1: Define scenario template data for courses 1-4 and implement seeding**

This is the largest data definition. Templates should be detailed enough that the AI can generate realistic variations. Key fields:
- `base_situation`: The customer's problem in 2-3 sentences
- `customer_goals`: What the customer wants from this call
- `csr_objectives`: What the CSR should accomplish
- `scoring_focus`: JSON with weighted scoring criteria
- `resolution_conditions`: What constitutes a successful call

```javascript
function getScenarioTemplates(courseModuleMap) {
  const templates = [];

  // Helper to add templates for a module
  const addTemplates = (courseName, moduleName, moduleTemplates) => {
    const moduleId = courseModuleMap[courseName]?.modules?.[moduleName];
    if (!moduleId) {
      console.warn(`  WARNING: Module not found: ${courseName} > ${moduleName}`);
      return;
    }
    moduleTemplates.forEach(t => {
      templates.push({ ...t, module_id: moduleId, organization_id: ORG_ID, is_active: true });
    });
  };

  // ============================================================
  // COURSE 1: Service Knowledge Fundamentals
  // ============================================================

  addTemplates('Service Knowledge Fundamentals', 'Home Pest Control (GHP)', [
    {
      name: 'New Customer — What Does GHP Cover?',
      category: 'product_knowledge',
      base_situation: 'A new homeowner who just moved to Florida calls asking about basic pest control options. They\'ve never had professional pest control before and want to understand what\'s included.',
      customer_goals: 'Understand what pests are covered, how often service happens, what the warranty means',
      csr_objectives: 'Explain GHP coverage clearly: covered pests (ants excl. BHA/fire, spiders, roaches excl. German, silverfish, earwigs), interior + exterior treatment, quarterly maintenance, lanai/pool cage included. Identify if customer needs more than GHP.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "needs_discovery": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands what GHP covers and doesn\'t cover. CSR correctly identifies coverage scope.'
    },
    {
      name: 'Customer Reports Ants — Is It Covered?',
      category: 'product_knowledge',
      base_situation: 'Existing GHP customer calls reporting ant activity around their patio and kitchen. They want to know if this is covered and whether they need a service call.',
      customer_goals: 'Find out if ants are covered, get service if needed',
      csr_objectives: 'Determine ant type — regular ants are covered under GHP. BHA and fire ants require QGG upgrade. Check if customer is due for quarterly service or eligible for free service call.',
      scoring_focus: '{"pest_identification": 0.3, "service_call_triage": 0.3, "product_knowledge": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR asks clarifying questions about ant type, correctly determines coverage, and takes appropriate action (schedule service call or explain upgrade to QGG).'
    },
    {
      name: 'Quarterly Visit — Interior Service Request',
      category: 'product_knowledge',
      base_situation: 'Customer\'s quarterly GHP visit is coming up. They call asking if the technician will treat inside the house or just the outside.',
      customer_goals: 'Understand what happens at quarterly visit, request interior service',
      csr_objectives: 'Explain that quarterly maintenance is exterior perimeter treatment. Interior service is available upon request if customer is seeing live pest activity. Add note to appointment if customer wants interior.',
      scoring_focus: '{"product_knowledge": 0.4, "accuracy": 0.3, "customer_care": 0.2, "documentation": 0.1}',
      resolution_conditions: 'CSR correctly explains quarterly is exterior by default, interior available on request, and adds appropriate note.'
    }
  ]);

  addTemplates('Service Knowledge Fundamentals', 'Lawn Pest Control (SLP/QGG)', [
    {
      name: 'Fire Ants in Lawn — SLP vs QGG',
      category: 'product_knowledge',
      base_situation: 'Customer on GHP calls about aggressive ants building mounds in their sunny yard. They\'re getting stung when mowing. Wants lawn treatment.',
      customer_goals: 'Get rid of fire ants in lawn',
      csr_objectives: 'Identify fire ants (dome mounds, sunny areas, aggressive stinging). Explain that GHP doesn\'t cover fire ants. Recommend QGG (Quarterly Granular Ant Program) specifically for fire ants and BHA. Explain SLP covers general lawn pests but QGG is better for fire ants specifically.',
      scoring_focus: '{"pest_identification": 0.3, "product_knowledge": 0.3, "recommendation_accuracy": 0.2, "upsell_appropriateness": 0.2}',
      resolution_conditions: 'CSR correctly identifies fire ant situation and recommends QGG over SLP for this specific problem.'
    },
    {
      name: 'Grubs Damaging Lawn',
      category: 'product_knowledge',
      base_situation: 'Customer calls about brown patches appearing in their lawn. They pulled up some turf and found white C-shaped larvae. Wants AUN to treat the lawn.',
      customer_goals: 'Fix the lawn damage from grubs',
      csr_objectives: 'Identify grubs (white, C-shaped, 0.5-1.5 inches). Explain grubs are NOT warrantied — AUN cannot reverse lawn damage. SLP may help but cannot fully warranty. Refer to Baton Service Pros (844-699-4138) for lawn care company.',
      scoring_focus: '{"pest_identification": 0.3, "honesty": 0.3, "referral_handling": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR correctly identifies grubs, explains non-coverage honestly, and provides Baton referral.'
    }
  ]);

  addTemplates('Service Knowledge Fundamentals', 'Non-Warrantied Pests', [
    {
      name: 'Pantry Moths — Customer Wants Service Call',
      category: 'product_knowledge',
      base_situation: 'Customer calls reporting small moths flying around their kitchen and pantry. They want someone to come spray.',
      customer_goals: 'Get rid of pantry moths',
      csr_objectives: 'Identify as pantry pest (small moths near food storage). Explain these are not warrantied and spraying won\'t solve the problem. Guide customer through DIY resolution: find and discard infested product, vacuum shelves, store food in airtight containers. Do NOT schedule a service call for pantry pests.',
      scoring_focus: '{"pest_identification": 0.3, "education": 0.3, "avoiding_unnecessary_visit": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR correctly identifies pantry pest, explains DIY solution, does NOT schedule a service call.'
    },
    {
      name: 'Drywood Termite — Baton Referral',
      category: 'product_knowledge',
      base_situation: 'Customer found tiny pellets piling up near a windowsill and small holes in the wood trim. They\'re worried about termites and want AUN to treat it.',
      customer_goals: 'Get termite treatment',
      csr_objectives: 'Identify drywood termite signs (frass pellets with 6 concave sides, tiny holes, no mud tubes). Explain Sentricon only covers subterranean termites, not drywood. Drywood termites live inside dry wood without soil contact — different treatment needed. Refer to Baton Service Pros at (844) 699-4138.',
      scoring_focus: '{"pest_identification": 0.3, "product_knowledge": 0.3, "referral_handling": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR correctly distinguishes drywood from subterranean, explains Sentricon limitation, provides Baton referral.'
    }
  ]);

  // ============================================================
  // COURSE 2: Pricing & Sales
  // ============================================================

  addTemplates('Pricing & Sales', 'Quoting New Customers', [
    {
      name: 'New Customer — 2800 sq ft Home Quote',
      category: 'sales',
      base_situation: 'Potential new customer calls wanting pest control for their 2,800 sq ft home. They want to know the cost and what\'s included.',
      customer_goals: 'Get a price for pest control, understand what they\'re paying for',
      csr_objectives: 'Determine sq footage (<3000 tier). Present Silver as baseline: $150 initial + $45/mo. Explain coverage, frequency, warranty. Ask about lawn/mosquito needs to potentially present Gold or Diamond options.',
      scoring_focus: '{"pricing_accuracy": 0.3, "needs_discovery": 0.3, "presentation": 0.2, "upsell_attempt": 0.2}',
      resolution_conditions: 'CSR quotes correct Silver pricing for <3000 sqft tier. Asks about additional needs. Presents at least one upgrade option.'
    },
    {
      name: 'Facebook Lead — $49 Initial',
      category: 'sales',
      base_situation: 'Customer mentions they saw an AUN ad on Facebook and called the number. They\'re interested in getting started.',
      customer_goals: 'Get pest control service, may have seen a promotional price',
      csr_objectives: 'Recognize Facebook lead gen mention → $49 initial pricing applies. Quote $49 initial (instead of standard minimum $99). Get sq footage to determine monthly rate. Present appropriate tier.',
      scoring_focus: '{"pricing_accuracy": 0.4, "lead_source_recognition": 0.3, "professionalism": 0.2, "closing": 0.1}',
      resolution_conditions: 'CSR recognizes Facebook as lead gen source and applies $49 initial pricing.'
    }
  ]);

  addTemplates('Pricing & Sales', 'Upselling & Bundling', [
    {
      name: 'Silver Customer Wants Lawn Treatment',
      category: 'sales',
      base_situation: 'Existing Silver (exterior only) customer calls about ants and bugs in their lawn. They\'re wondering if their current plan covers the lawn.',
      customer_goals: 'Get lawn pest coverage',
      csr_objectives: 'Explain Silver covers home perimeter only, not lawn. Present Gold SLP upgrade option. If lot <=7,500 sqft and paired with GHP, SLP can be $60/quarter. Calculate price difference and present as value proposition.',
      scoring_focus: '{"upsell_technique": 0.3, "value_presentation": 0.3, "pricing_accuracy": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR correctly identifies upsell opportunity, presents Gold SLP with accurate pricing, explains added value.'
    }
  ]);

  addTemplates('Pricing & Sales', 'Handling Price Objections', [
    {
      name: 'Customer Says Too Expensive',
      category: 'sales',
      base_situation: 'Potential customer received a Gold SLP quote for their 3,500 sqft home ($190 initial, $70/mo). They say it\'s more than they expected and are hesitant.',
      customer_goals: 'Get pest control at a price they feel comfortable with',
      csr_objectives: 'Acknowledge the concern. Don\'t immediately discount. Emphasize value: free service calls (normally $150-200 each), full warranty, satisfaction guarantee, 30K+ reviews. If needed and approved, present price drop tier ($150 initial, $65/mo). Never go below minimum $99 initial.',
      scoring_focus: '{"objection_handling": 0.3, "value_selling": 0.3, "pricing_rules": 0.2, "closing": 0.2}',
      resolution_conditions: 'CSR handles objection with value-first approach before offering price drop. Does not offer below minimums.'
    }
  ]);

  // ============================================================
  // COURSE 3: Scheduling & Service Call Triage
  // ============================================================

  addTemplates('Scheduling & Service Call Triage', 'Avoiding Unnecessary Visits', [
    {
      name: 'Dead Bugs — Treatment Working',
      category: 'service_triage',
      base_situation: 'Customer had GHP service 5 days ago and is finding dead roaches around the house. They\'re upset and want someone to come back.',
      customer_goals: 'Understand why they\'re seeing dead bugs, possibly want another service',
      csr_objectives: 'Reassure customer that dead bugs mean the treatment IS working. Non-repellent insecticides take 7-10 days to fully work — bugs contact treated surfaces and die. This is a sign of success, not failure. Do NOT schedule a service call for dead insects.',
      scoring_focus: '{"education": 0.3, "reassurance": 0.3, "avoiding_unnecessary_visit": 0.2, "professionalism": 0.2}',
      resolution_conditions: 'CSR explains dead bugs = treatment working, does not schedule unnecessary visit, customer feels reassured.'
    },
    {
      name: 'Customer Insists Despite Unnecessary — Always Schedule',
      category: 'service_triage',
      base_situation: 'Customer is seeing 1-2 occasional ants on their countertop (minimal activity, normal for Florida). CSR has explained this is normal. Customer doesn\'t care and threatens to cancel if no one comes out.',
      customer_goals: 'Wants someone to come treat, threatening cancellation',
      csr_objectives: 'After explaining that minimal activity is normal in Florida, if customer insists and threatens cancellation — ALWAYS schedule the service call. Never let an unnecessary service call lead to a cancellation. Document thoroughly.',
      scoring_focus: '{"customer_retention": 0.3, "judgment": 0.3, "education_attempt": 0.2, "documentation": 0.2}',
      resolution_conditions: 'CSR tries to educate first, but when customer insists and threatens cancellation, schedules the service call.'
    },
    {
      name: 'Plaster Bagworms — Never Schedule',
      category: 'service_triage',
      base_situation: 'Customer calls about small cocoon-like cases hanging from walls and ceiling. They want pest control to remove them.',
      customer_goals: 'Get rid of the bagworms',
      csr_objectives: 'Identify as plaster bagworms. Do NOT schedule a service call — they do not respond to insecticide. Educate: lower humidity, clean regularly, vacuum/dust to remove food sources. This is a firm "do not schedule" — unlike other situations, even customer insistence should not result in scheduling.',
      scoring_focus: '{"pest_identification": 0.3, "education": 0.3, "correct_action": 0.2, "customer_care": 0.2}',
      resolution_conditions: 'CSR correctly identifies bagworms and does NOT schedule service, provides DIY guidance.'
    }
  ]);

  addTemplates('Scheduling & Service Call Triage', 'Service Call vs. Full Service', [
    {
      name: 'Customer Due Next Week — Move Up Service',
      category: 'service_triage',
      base_situation: 'Customer calls reporting live ant activity. Their quarterly GHP service is due in 8 days.',
      customer_goals: 'Get someone out for the ants',
      csr_objectives: 'Check service schedule — customer is due next week. Instead of creating a free service call, move up the scheduled quarterly service. This is more efficient and the customer gets their full service sooner.',
      scoring_focus: '{"scheduling_efficiency": 0.3, "service_call_rules": 0.3, "customer_care": 0.2, "accuracy": 0.2}',
      resolution_conditions: 'CSR moves up quarterly service instead of scheduling separate service call.'
    },
    {
      name: 'Incomplete Service — CES Not Service Call',
      category: 'service_triage',
      base_situation: 'Customer says the technician couldn\'t access their backyard last visit because the gate was locked. Now they\'re seeing bugs back there. They want a service call.',
      customer_goals: 'Get their backyard treated',
      csr_objectives: 'This is NOT a free service call — the tech didn\'t have full access on the original visit. Schedule as Complete Exterior Service (CES), not a service call. A service call is only for something the tech missed while having full access.',
      scoring_focus: '{"service_call_rules": 0.4, "accuracy": 0.3, "scheduling": 0.2, "documentation": 0.1}',
      resolution_conditions: 'CSR correctly identifies this as CES (not service call) and schedules appropriately.'
    }
  ]);

  // ============================================================
  // COURSE 4: Customer Retention & De-escalation
  // ============================================================

  addTemplates('Customer Retention & De-escalation', 'Card Decline Handling', [
    {
      name: 'Longstanding Customer — Card Declined, Tech On-Site',
      category: 'retention',
      base_situation: 'Technician is on-site for a quarterly GHP visit. The customer\'s card on file was declined. Customer has been with AUN for 2 years (8 paid quarterly visits).',
      customer_goals: 'Get their service completed',
      csr_objectives: 'Check paid visit count — 8 visits = longstanding (5+ threshold). Approve the service to proceed. Use the longstanding customer voicemail/text template. Note for AR follow-up. Do NOT delay the service.',
      scoring_focus: '{"policy_knowledge": 0.3, "decision_accuracy": 0.3, "template_usage": 0.2, "documentation": 0.2}',
      resolution_conditions: 'CSR correctly identifies as longstanding customer, approves service, uses correct template, documents for AR.'
    },
    {
      name: 'New Customer — Card Declined, Wants to Pay Later',
      category: 'retention',
      base_situation: 'Customer with only 3 paid visits has a declined card. Tech is on-site. Customer asks if they can just pay later this week.',
      customer_goals: 'Get service done now, pay later',
      csr_objectives: 'Under 5 paid visits = new customer protocol. If customer wants to pay later: (1) Confirm verbal approval to proceed (recorded), (2) Ensure service agreement is signed, (3) Get specific payment date, (4) Document in RED NOTE section with payment date and method, (5) Set personal reminder. Use non-longstanding customer template.',
      scoring_focus: '{"policy_knowledge": 0.3, "process_adherence": 0.3, "documentation": 0.2, "communication": 0.2}',
      resolution_conditions: 'CSR follows complete verbal approval flow, documents everything in RED NOTE, sets follow-up reminder.'
    }
  ]);

  addTemplates('Customer Retention & De-escalation', 'Angry Customer De-escalation', [
    {
      name: 'Tech No-Show — Furious Customer',
      category: 'de_escalation',
      base_situation: 'Customer took a day off work for their initial service. The technician never showed up. Customer is calling angry, threatening to cancel and leave a 1-star review.',
      customer_goals: 'Acknowledgment of mistake, immediate resolution, possibly compensation',
      csr_objectives: 'Empathize first — validate their frustration. Determine if this was an office sale (original rep follows up) or D2D/tech sale (scheduler handles follow-up). Apologize sincerely. Offer priority rescheduling. Add DNS notes with special scheduling notes. Follow 3-attempt protocol if needed.',
      scoring_focus: '{"empathy": 0.3, "de_escalation": 0.3, "process_knowledge": 0.2, "resolution": 0.2}',
      escalation_triggers: 'Dismissive responses, blaming the customer, making excuses without acknowledgment, defensive tone',
      deescalation_triggers: 'Sincere apology, validation of frustration, immediate action, priority scheduling offer',
      resolution_conditions: 'Customer feels heard, appointment is rescheduled with priority, proper documentation added.'
    },
    {
      name: 'Bed Bug Customer — 2 Weeks Post-Treatment Frustration',
      category: 'de_escalation',
      base_situation: 'Customer had Aprehend bed bug treatment 14 days ago. They\'re still getting bitten at night and are extremely frustrated. They want a refund or someone to come spray again immediately.',
      customer_goals: 'Stop getting bitten, possibly wants refund',
      csr_objectives: 'Empathize with frustration. Educate on Aprehend timeline: days 7-21 is when sharp decline begins, full resolution typically 3-6 weeks. This is NORMAL and EXPECTED. The biological fungus takes time. Stress they MUST keep sleeping in the treated bed. Do NOT schedule retreatment yet — it\'s too early. Do NOT offer refund. If customer has cleaned treated surfaces or used other chemicals, escalate to Operations as failure risk.',
      scoring_focus: '{"empathy": 0.2, "product_knowledge": 0.3, "de_escalation": 0.2, "timeline_education": 0.2, "judgment": 0.1}',
      escalation_triggers: 'Dismissing concern, saying "just wait," offering retreat too early',
      deescalation_triggers: 'Acknowledging discomfort, explaining the science, giving specific timeline expectations',
      resolution_conditions: 'Customer understands timeline, continues sleeping in treated bed, no unnecessary retreatment scheduled. Escalated if failure risk indicators present.'
    }
  ]);

  return templates;
}
```

**Step 2: Implement the seedScenarioTemplates function**

```javascript
async function seedScenarioTemplates(courseModuleMap) {
  const templates = getScenarioTemplates(courseModuleMap);

  // Batch insert in chunks of 20
  const chunkSize = 20;
  let inserted = 0;
  for (let i = 0; i < templates.length; i += chunkSize) {
    const chunk = templates.slice(i, i + chunkSize);
    const { error } = await supabase.from('scenario_templates').insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }

  console.log(`  Inserted ${inserted} scenario templates`);
}
```

**Step 3: Run and verify**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: All templates inserted for courses 1-4

**Step 4: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add scenario templates for courses 1-4 (knowledge, sales, scheduling, retention)"
```

---

## Task 7: Seed Scenario Templates — Courses 5-7

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Step 1: Add scenario templates for courses 5-7 to the getScenarioTemplates function**

Continue in the same function, adding templates for Specialty Qualification, Communication, and Complex Coordination:

```javascript
  // ============================================================
  // COURSE 5: Specialty Service Qualification
  // ============================================================

  addTemplates('Specialty Service Qualification', 'Rodent Qualification', [
    {
      name: 'Crawlspace Home — Must Decline',
      category: 'qualification',
      base_situation: 'Customer hears scratching in their attic and found droppings. They want rodent exclusion. During qualification, they mention their home has a crawlspace.',
      customer_goals: 'Get rodent exclusion service',
      csr_objectives: 'Run full prequalification: hearing noises or seeing droppings? (yes) Does home have crawlspace? (yes — DISQUALIFIED). Explain AUN cannot do exclusion for crawlspace homes because they cannot be fully sealed. Be empathetic but firm. Suggest alternative (bait boxes if exterior only).',
      scoring_focus: '{"qualification_accuracy": 0.4, "empathy": 0.2, "explanation": 0.2, "alternative_offered": 0.2}',
      resolution_conditions: 'CSR correctly identifies crawlspace disqualification, explains why, offers bait box alternative.'
    },
    {
      name: 'Houston Customer — Texas Exclusion',
      category: 'qualification',
      base_situation: 'Customer from Katy, TX (ZIP 77494) calls about rodents in their single-family home. They want the exclusion service they saw on the website.',
      customer_goals: 'Get rodent exclusion',
      csr_objectives: 'Rodent exclusion is not available in Texas. Identify customer is in Houston market (*3051). Explain limitation. Offer rodent bait boxes as alternative if exterior-only activity.',
      scoring_focus: '{"qualification_accuracy": 0.4, "service_area_knowledge": 0.2, "alternative_offered": 0.2, "professionalism": 0.2}',
      resolution_conditions: 'CSR correctly identifies Texas exclusion, offers bait box alternative.'
    },
    {
      name: 'Qualified Customer — Full Scheduling',
      category: 'qualification',
      base_situation: 'Customer in Fort Myers (single-family, slab foundation, no crawlspace) reports noises in attic and droppings in garage. They\'re ready to proceed with rodent exclusion.',
      customer_goals: 'Get rodent problem solved',
      csr_objectives: 'Run full prequalification (all clear). Quote starting at $1,195. Explain process: sealing entry points + attic traps + 4 trap check visits (Mon/Thu pattern). Ask about DSV (attic sanitization) as add-on. Require payment in full + signed agreement before work. Homeowner presence preferred but not required if attic access provided.',
      scoring_focus: '{"qualification_accuracy": 0.2, "pricing_accuracy": 0.2, "scheduling_accuracy": 0.3, "process_explanation": 0.2, "upsell": 0.1}',
      resolution_conditions: 'CSR qualifies correctly, quotes pricing, explains full process including trap check schedule, mentions DSV option.'
    }
  ]);

  addTemplates('Specialty Service Qualification', 'German Roach Qualification', [
    {
      name: 'Used Refrigerator — Classic Introduction Vector',
      category: 'qualification',
      base_situation: 'Customer sees small fast-moving roaches in their kitchen that started appearing a week after they bought a used refrigerator.',
      customer_goals: 'Get rid of roaches',
      csr_objectives: 'Ask all 5 qualification questions: (1) How many? (2) When first appeared? (3) New appliances recently? (4) New people moved in? (5) Lots of packages? Used refrigerator = classic introduction vector. Explain German roach treatment: $400 minimum, 3 visits 14 days apart, all booked on this call. Communicate customer prep requirements (clean under cabinets, empty lower cabinets, dispose of cardboard).',
      scoring_focus: '{"qualification_questions": 0.3, "education": 0.2, "scheduling": 0.2, "prep_communication": 0.2, "pricing": 0.1}',
      resolution_conditions: 'CSR asks all 5 questions, identifies German roach, quotes correctly, explains 3-visit plan, communicates prep requirements.'
    }
  ]);

  addTemplates('Specialty Service Qualification', 'Bed Bug Qualification', [
    {
      name: 'Customer Already Used Raid — Failure Risk',
      category: 'qualification',
      base_situation: 'Customer confirms bed bugs. During qualification they mention they already sprayed Raid all over the bedroom before calling.',
      customer_goals: 'Get professional bed bug treatment',
      csr_objectives: 'Customer already used pesticides = failure risk indicator. This must be escalated to Operations before proceeding. Explain that other chemicals can interfere with Aprehend treatment. Quote $1,000, explain 4-hour vacate, full payment required. Note the Raid usage prominently.',
      scoring_focus: '{"risk_identification": 0.3, "escalation_judgment": 0.3, "pricing": 0.2, "communication": 0.2}',
      resolution_conditions: 'CSR identifies Raid usage as failure risk, escalates to Operations, communicates pricing and vacate requirement.'
    }
  ]);

  addTemplates('Specialty Service Qualification', 'Sentricon Qualification', [
    {
      name: 'Spray Foam Insulation — New Install Declined',
      category: 'qualification',
      base_situation: 'Customer wants Sentricon installed. During the conversation, they mention they had spray foam insulation put in their attic recently.',
      customer_goals: 'Get termite protection',
      csr_objectives: 'Spray foam insulation = do NOT approve Sentricon installation. Explain why: spray foam hides termite activity, covers inspection points, traps moisture. This makes monitoring impossible. Be empathetic but firm — this is a non-negotiable policy.',
      scoring_focus: '{"policy_knowledge": 0.4, "explanation_quality": 0.3, "empathy": 0.2, "firmness": 0.1}',
      resolution_conditions: 'CSR correctly declines installation due to spray foam, explains the reasoning clearly.'
    },
    {
      name: 'Sentricon Takeover from Another Provider',
      category: 'qualification',
      base_situation: 'Customer has existing Sentricon stations installed by their previous pest control company. They want AUN to take over monitoring.',
      customer_goals: 'Switch Sentricon monitoring to AUN',
      csr_objectives: 'Quote Sentricon Takeover at $375. Explain process: schedule uninstall of existing stations AND new installation. Interior access required — no exceptions. Payment before service — no exceptions. Renewal at $375/year after first year.',
      scoring_focus: '{"pricing_accuracy": 0.3, "scheduling_accuracy": 0.3, "policy_adherence": 0.2, "process_explanation": 0.2}',
      resolution_conditions: 'CSR quotes takeover correctly, schedules both uninstall and install, confirms interior access and payment requirements.'
    }
  ]);

  addTemplates('Specialty Service Qualification', 'TAP Insulation Qualification', [
    {
      name: 'Customer Wants TAP for One Room Only',
      category: 'qualification',
      base_situation: 'Customer heard about TAP insulation and wants it installed in just their master bedroom ceiling to help with noise from upstairs.',
      customer_goals: 'Get TAP for one room',
      csr_objectives: 'Explain TAP is a whole-home attic solution only — cannot do individual rooms. Prequalify at $2,400 minimum. Always requires inspection before selling (coordinate with Ryan). Explain benefits: R-3.6 per inch, 15-30% energy savings, permanent pest protection. Mention financing available.',
      scoring_focus: '{"product_knowledge": 0.3, "qualification_accuracy": 0.3, "expectation_management": 0.2, "professionalism": 0.2}',
      resolution_conditions: 'CSR explains whole-home requirement, offers to schedule inspection, prequalifies at $2,400 minimum.'
    }
  ]);

  // ============================================================
  // COURSE 6: Communication & Documentation
  // ============================================================

  addTemplates('Communication & Documentation', 'Text & Voicemail Templates', [
    {
      name: 'Card Decline — Select Correct Template',
      category: 'communication',
      base_situation: 'Tech is on-site. Card declined. Customer has 7 paid visits (longstanding). CSR needs to leave a voicemail and send a text using the correct template.',
      customer_goals: 'N/A — outbound communication scenario',
      csr_objectives: 'Identify longstanding customer (5+ visits). Use the longstanding customer template (acknowledges service was completed, asks to update payment, references AR follow-up). Do NOT use the non-longstanding template (which says tech is waiting for payment).',
      scoring_focus: '{"template_selection": 0.4, "personalization": 0.2, "policy_knowledge": 0.2, "professionalism": 0.2}',
      resolution_conditions: 'CSR selects correct longstanding template, personalizes with customer name and callback number (888-239-2847).'
    },
    {
      name: 'Not Home — Determine Correct Template',
      category: 'communication',
      base_situation: 'Tech arrives for a GHP quarterly service. Nobody is home. No special access requirements for this service type.',
      customer_goals: 'N/A — outbound communication',
      csr_objectives: 'GHP quarterly can proceed with exterior only — no customer presence required. Use "Exterior Completed" template. Offer to schedule interior portion. Do NOT use the "Customer Required to Be Present" template (that\'s for services like Sentricon that need interior access).',
      scoring_focus: '{"template_selection": 0.4, "service_knowledge": 0.3, "professionalism": 0.2, "accuracy": 0.1}',
      resolution_conditions: 'CSR correctly uses Exterior Completed template for GHP quarterly, offers to schedule interior.'
    }
  ]);

  addTemplates('Communication & Documentation', 'Service Area Routing', [
    {
      name: 'ZIP Code to Office Routing',
      category: 'communication',
      base_situation: 'Customer calls from ZIP 33916. CSR needs to identify the correct office and dial code for routing.',
      customer_goals: 'Get connected to the right office',
      csr_objectives: 'Identify 33916 = Fort Myers office, dial code *3011, local number (239) 424-8742. Route or handle call appropriately.',
      scoring_focus: '{"routing_accuracy": 0.5, "speed": 0.2, "professionalism": 0.2, "knowledge": 0.1}',
      resolution_conditions: 'CSR correctly identifies Fort Myers office from ZIP code.'
    }
  ]);

  // ============================================================
  // COURSE 7: Complex Service Coordination
  // ============================================================

  addTemplates('Complex Service Coordination', 'Initial Service Approval Workflow', [
    {
      name: 'Agreement Not Signed — Cannot Approve',
      category: 'operations',
      base_situation: 'Technician is on-site for initial service. They report the customer isn\'t home, the agreement hasn\'t been signed, but the gate is open and they can access the property.',
      customer_goals: 'N/A — operational decision scenario',
      csr_objectives: 'Do NOT approve service. Agreement must be signed before service begins — no exceptions. Attempt to contact customer by phone first, then text. If unreachable, tech cannot proceed.',
      scoring_focus: '{"policy_adherence": 0.4, "decision_accuracy": 0.3, "communication": 0.2, "documentation": 0.1}',
      resolution_conditions: 'CSR correctly refuses to approve service without signed agreement, attempts to contact customer.'
    }
  ]);

  addTemplates('Complex Service Coordination', 'Technician No-Show Recovery', [
    {
      name: 'D2D Sale No-Show — Scheduler Responsibility',
      category: 'operations',
      base_situation: 'A door-to-door rep sold service 3 days ago. The customer\'s initial appointment was today but the tech didn\'t show. Customer is calling upset.',
      customer_goals: 'Get their service rescheduled, acknowledgment of the issue',
      csr_objectives: 'D2D or technician sale = scheduler handles ALL follow-ups (not the original rep). Apologize sincerely. Add DNS (Do Not Schedule) note with special scheduling notes. Follow 3-attempt protocol: (1) same day call+text, (2) 2-3 days call+text, (3) one week final call+text. If unresponsive after 3rd attempt, cancel under "Initial Appointment Cancelled."',
      scoring_focus: '{"responsibility_determination": 0.3, "process_knowledge": 0.3, "customer_care": 0.2, "documentation": 0.2}',
      resolution_conditions: 'CSR correctly identifies scheduler responsibility for D2D sale, adds DNS notes, follows protocol.'
    }
  ]);

  addTemplates('Complex Service Coordination', 'BCP — Service During Disruptions', [
    {
      name: 'Internet Outage — Phones Working',
      category: 'operations',
      base_situation: 'The office internet just went down. Phones are still working. Customers are calling and you can\'t access their accounts.',
      customer_goals: 'Various — customer calling during an outage',
      csr_objectives: 'Switch to Affiliated Technology mobile app (credentials in BCP binder). Answer calls with standard greeting. Use the BCP script: "We are experiencing a temporary internet outage, so I am unable to access your full account details. I am taking down your information, and we will review your account and call you back as soon as our systems are back online." Document EVERY call: name, phone, callback time, address, reason, urgent needs. Use paper outage log.',
      scoring_focus: '{"bcp_knowledge": 0.3, "script_accuracy": 0.3, "documentation": 0.2, "professionalism": 0.2}',
      resolution_conditions: 'CSR uses correct BCP script, captures all required information, maintains professional tone.'
    }
  ]);
```

**Step 2: Run full seed and verify all templates**

Run: `cd api && node scripts/seed-alluneed.js <org_id>`
Expected: All scenario templates inserted across all 7 courses

**Step 3: Verify scenario generation works with seeded data**

Test by calling the scenario generator API for one of the new modules:
```bash
# Use curl or the dev dashboard to start a module and verify scenarios generate
curl -X POST http://localhost:3001/api/modules/<module_id>/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

Expected: Scenarios generate using the seeded AUN service packages and customer profiles as context

**Step 4: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add scenario templates for courses 5-7 and complete AUN seed script"
```

---

## Task 8: Add Idempotency and Cleanup Support

**Files:**
- Modify: `api/scripts/seed-alluneed.js`

**Step 1: Add --clean flag support to remove existing AUN data before re-seeding**

```javascript
const CLEAN = process.argv.includes('--clean');

async function cleanExistingData() {
  if (!CLEAN) return;
  console.log('Cleaning existing AUN data...');

  // Delete in reverse dependency order
  // Scenario templates (depend on modules)
  await supabase.from('scenario_templates').delete().eq('organization_id', ORG_ID);
  // Selling points and objections (depend on packages)
  const { data: pkgs } = await supabase.from('service_packages').select('id').eq('organization_id', ORG_ID);
  if (pkgs?.length) {
    const pkgIds = pkgs.map(p => p.id);
    await supabase.from('package_selling_points').delete().in('package_id', pkgIds);
    await supabase.from('package_objections').delete().in('package_id', pkgIds);
  }
  // Modules (depend on courses)
  const { data: courses } = await supabase.from('courses').select('id').eq('organization_id', ORG_ID);
  if (courses?.length) {
    const courseIds = courses.map(c => c.id);
    await supabase.from('course_modules').delete().in('course_id', courseIds);
  }
  // Top-level tables
  await supabase.from('courses').delete().eq('organization_id', ORG_ID);
  await supabase.from('service_packages').delete().eq('organization_id', ORG_ID);
  await supabase.from('sales_guidelines').delete().eq('organization_id', ORG_ID);
  await supabase.from('customer_profiles').delete().eq('organization_id', ORG_ID).eq('is_system', false);

  console.log('  Cleaned existing data');
}
```

Add `await cleanExistingData()` as the first call in `main()`.

**Step 2: Add summary stats at the end**

```javascript
async function printSummary() {
  const counts = {};
  for (const table of ['courses', 'service_packages', 'sales_guidelines', 'customer_profiles', 'scenario_templates']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID);
    counts[table] = count;
  }
  // Count modules via courses
  const { data: courses } = await supabase.from('courses').select('id').eq('organization_id', ORG_ID);
  if (courses?.length) {
    const { count } = await supabase.from('course_modules').select('*', { count: 'exact', head: true }).in('course_id', courses.map(c => c.id));
    counts['course_modules'] = count;
  }

  console.log('\n=== AUN Training Data Summary ===');
  console.log(`  Courses: ${counts.courses}`);
  console.log(`  Modules: ${counts.course_modules}`);
  console.log(`  Service Packages: ${counts.service_packages}`);
  console.log(`  Sales Guidelines: ${counts.sales_guidelines}`);
  console.log(`  Customer Profiles: ${counts.customer_profiles}`);
  console.log(`  Scenario Templates: ${counts.scenario_templates}`);
}
```

**Step 3: Run with clean flag**

Run: `cd api && node scripts/seed-alluneed.js <org_id> --clean`
Expected: Cleans old data, re-seeds everything, prints summary

**Step 4: Commit**

```bash
git add api/scripts/seed-alluneed.js
git commit -m "Add idempotent --clean flag and summary stats to AUN seed script"
```

---

## Execution Notes

**Total deliverable:** One Node.js script (`api/scripts/seed-alluneed.js`) that populates an AUN organization with:
- 36 service packages (24 recurring tier variants + 12 specialty)
- Selling points per package tier
- Objections with detailed recommended responses per package
- 14 sales guidelines
- 16 AUN-specific customer profiles
- 7 courses with 30 modules
- 50+ scenario templates covering all critical procedures

**Usage:**
```bash
# First time
node api/scripts/seed-alluneed.js <org_id>

# Re-seed (clean first)
node api/scripts/seed-alluneed.js <org_id> --clean
```

**No platform code changes needed.** The existing `scenarioGenerator.js` already fetches org-scoped packages, objections, competitors, and sales guidelines when generating scenarios. The seeded data flows through automatically.
