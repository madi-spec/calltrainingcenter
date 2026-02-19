/**
 * Seed script for All U Need Pest Control
 * Populates org-specific training data: packages, objections, guidelines, profiles, courses, scenarios
 *
 * Usage: node api/scripts/seed-alluneed.js <ORG_ID>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ORG_ID = process.argv[2];
if (!ORG_ID) {
  console.error('Usage: node api/scripts/seed-alluneed.js <ORG_ID>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Verify org exists
// ---------------------------------------------------------------------------
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

  console.log(`Verified org: ${data.name} (${data.id})`);
  return data;
}

// ---------------------------------------------------------------------------
// RECURRING PACKAGES — 6 tiers x 4 sq ft brackets each
// ---------------------------------------------------------------------------
const RECURRING_PACKAGES = [
  // 1. Perimeter Pest Annual (Silver) — exterior only, bi-monthly
  {
    tier: 'Silver',
    name: 'Perimeter Pest Annual',
    internal_prefix: 'silver',
    description: 'Exterior-only perimeter pest protection with bi-monthly service. Covers common crawling insects around the foundation and entry points.',
    service_frequency: 'bi-monthly',
    warranty_details: 'Service warranty between scheduled visits. Free re-treat if pests return.',
    included_pests: ['ants', 'spiders', 'roaches (American)', 'earwigs', 'silverfish', 'crickets', 'centipedes', 'millipedes'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment'],
    target_customer: 'Budget-conscious homeowners wanting basic exterior protection',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 45, annual: 645, drop_initial: 99, drop_monthly: 42, drop_annual: 561 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 50, annual: 740, drop_initial: 150, drop_monthly: 47, drop_annual: 667 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 57, annual: 907, drop_initial: 240, drop_monthly: 54, drop_annual: 834 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 380, monthly: 67, annual: 1117, drop_initial: 340, drop_monthly: 64, drop_annual: 1044 },
    ],
  },
  // 2. Perimeter Plus Granular (Gold) — + quarterly granular ant treatment
  {
    tier: 'Gold',
    name: 'Perimeter Plus Granular',
    internal_prefix: 'gold_granular',
    description: 'Everything in Silver plus quarterly granular ant treatment in the yard. Targets fire ants and other yard-dwelling ant species.',
    service_frequency: 'bi-monthly + quarterly granular',
    warranty_details: 'Service warranty between visits. Granular re-application if ant activity returns between quarterly treatments.',
    included_pests: ['all Silver pests', 'fire ants', 'yard ants', 'carpenter ants (exterior)'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment', 'quarterly granular ant treatment'],
    target_customer: 'Homeowners with significant ant pressure or large yards',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 55, annual: 755, drop_initial: 99, drop_monthly: 52, drop_annual: 671 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 60, annual: 850, drop_initial: 150, drop_monthly: 55, drop_annual: 755 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 67, annual: 1017, drop_initial: 240, drop_monthly: 62, drop_annual: 922 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 300, monthly: 85, annual: 1235, drop_initial: 250, drop_monthly: 82, drop_annual: 1152 },
    ],
  },
  // 3. Perimeter Plus SLP (Gold) — + standard lawn pest
  {
    tier: 'Gold',
    name: 'Perimeter Plus SLP',
    internal_prefix: 'gold_slp',
    description: 'Everything in Silver plus standard lawn pest treatment. Covers chinch bugs, sod webworms, and other turf-damaging insects.',
    service_frequency: 'bi-monthly + lawn pest as needed',
    warranty_details: 'Service warranty between visits. Lawn pest re-treat if activity returns.',
    included_pests: ['all Silver pests', 'chinch bugs', 'sod webworms', 'army worms', 'mole crickets'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment', 'standard lawn pest treatment'],
    target_customer: 'Homeowners who value their lawn and want combined pest + lawn pest protection',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 65, annual: 865, drop_initial: 99, drop_monthly: 62, drop_annual: 781 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 70, annual: 960, drop_initial: 150, drop_monthly: 65, drop_annual: 865 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 77, annual: 1127, drop_initial: 240, drop_monthly: 72, drop_annual: 1032 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 380, monthly: 87, annual: 1337, drop_initial: 340, drop_monthly: 82, drop_annual: 1242 },
    ],
  },
  // 4. Perimeter Plus Mosquito (Gold) — + monthly mosquito
  {
    tier: 'Gold',
    name: 'Perimeter Plus Mosquito',
    internal_prefix: 'gold_mosquito',
    description: 'Everything in Silver plus monthly mosquito treatment. Barrier spray targets adult mosquitoes and larvicide treats standing water areas.',
    service_frequency: 'bi-monthly + monthly mosquito (seasonal)',
    warranty_details: 'Service warranty between visits. Mosquito re-treat available between monthly services.',
    included_pests: ['all Silver pests', 'mosquitoes'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment', 'monthly mosquito barrier spray', 'larvicide treatment'],
    target_customer: 'Homeowners with outdoor living spaces who want mosquito relief',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 90, annual: 1140, drop_initial: 99, drop_monthly: 87, drop_annual: 1056 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 95, annual: 1235, drop_initial: 150, drop_monthly: 92, drop_annual: 1162 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 102, annual: 1402, drop_initial: 240, drop_monthly: 99, drop_annual: 1329 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 380, monthly: 112, annual: 1612, drop_initial: 340, drop_monthly: 109, drop_annual: 1539 },
    ],
  },
  // 5. Perimeter Plus Granular + Mosquito (Diamond) — granular + mosquito
  {
    tier: 'Diamond',
    name: 'Perimeter Plus Granular + Mosquito',
    internal_prefix: 'diamond_granular_mosquito',
    description: 'Comprehensive package combining perimeter pest, quarterly granular ant treatment, and monthly mosquito service. Best value for full yard and home protection.',
    service_frequency: 'bi-monthly + quarterly granular + monthly mosquito',
    warranty_details: 'Full service warranty between all visits. Re-treat for any covered pest between scheduled services.',
    included_pests: ['all Silver pests', 'fire ants', 'yard ants', 'carpenter ants (exterior)', 'mosquitoes'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment', 'quarterly granular ant treatment', 'monthly mosquito barrier spray', 'larvicide treatment'],
    target_customer: 'Homeowners wanting maximum protection with ant and mosquito coverage',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 97, annual: 1217, drop_initial: 99, drop_monthly: 94, drop_annual: 1133 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 105, annual: 1345, drop_initial: 150, drop_monthly: 100, drop_annual: 1250 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 112, annual: 1512, drop_initial: 240, drop_monthly: 107, drop_annual: 1417 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 300, monthly: 130, annual: 1730, drop_initial: 250, drop_monthly: 127, drop_annual: 1647 },
    ],
  },
  // 6. Perimeter Plus SLP + Mosquito (Diamond) — SLP + mosquito
  {
    tier: 'Diamond',
    name: 'Perimeter Plus SLP + Mosquito',
    internal_prefix: 'diamond_slp_mosquito',
    description: 'Premium package combining perimeter pest, standard lawn pest treatment, and monthly mosquito service. Complete home, lawn, and outdoor living protection.',
    service_frequency: 'bi-monthly + lawn pest + monthly mosquito',
    warranty_details: 'Full service warranty between all visits. Re-treat for any covered pest between scheduled services.',
    included_pests: ['all Silver pests', 'chinch bugs', 'sod webworms', 'army worms', 'mole crickets', 'mosquitoes'],
    included_services: ['exterior perimeter spray', 'web removal', 'entry point treatment', 'standard lawn pest treatment', 'monthly mosquito barrier spray', 'larvicide treatment'],
    target_customer: 'Premium homeowners wanting total pest, lawn, and mosquito protection',
    brackets: [
      { label: '<3000 sq ft', sqft: '3000', initial: 150, monthly: 110, annual: 1360, drop_initial: 99, drop_monthly: 107, drop_annual: 1276 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 190, monthly: 115, annual: 1455, drop_initial: 150, drop_monthly: 110, drop_annual: 1360 },
      { label: '4001-5000 sq ft', sqft: '4001_5000', initial: 280, monthly: 122, annual: 1622, drop_initial: 240, drop_monthly: 117, drop_annual: 1527 },
      { label: '5001+ sq ft', sqft: '5001_plus', initial: 380, monthly: 132, annual: 1832, drop_initial: 340, drop_monthly: 127, drop_annual: 1737 },
    ],
  },
];

// ---------------------------------------------------------------------------
// SPECIALTY PACKAGES — 12 one-time / standalone services
// ---------------------------------------------------------------------------
const SPECIALTY_PACKAGES = [
  {
    name: 'Bed Bug Treatment (Aprehend)',
    internal_name: 'specialty_bed_bug',
    description: 'Professional bed bug elimination using Aprehend biopesticide. Fungal-based treatment that spreads between bed bugs for colony elimination.',
    pricing_model: 'one_time',
    initial_price: 1000,
    recurring_price: null,
    service_frequency: 'one-time treatment',
    warranty_details: '60-day warranty from date of treatment',
    included_pests: ['bed bugs'],
    included_services: ['Aprehend application', 'inspection', 'follow-up check'],
    target_customer: 'Homeowners or renters with confirmed bed bug activity',
  },
  {
    name: 'German Roach Treatment',
    internal_name: 'specialty_german_roach',
    description: 'Targeted German cockroach elimination. Requires prequalification to confirm species. Three visits spaced 14 days apart for full lifecycle disruption.',
    pricing_model: 'one_time',
    initial_price: 500,
    recurring_price: null,
    service_frequency: '3 visits, 14 days apart',
    warranty_details: '30-day warranty from last service visit',
    included_pests: ['German cockroaches'],
    included_services: ['gel bait application', 'IGR treatment', '3 scheduled visits', 'prequalification inspection'],
    target_customer: 'Homeowners with confirmed German roach infestation (must prequalify)',
  },
  {
    name: 'Sentricon Termite Install',
    internal_name: 'specialty_sentricon_install',
    description: 'Sentricon Always Active termite baiting system installation. Stations placed around the perimeter of the home for ongoing subterranean termite monitoring and elimination.',
    pricing_model: 'one_time',
    initial_price: 895,
    recurring_price: null,
    service_frequency: 'one-time install + annual monitoring',
    warranty_details: 'Ongoing warranty with annual renewal. Covers re-treatment if termite activity found.',
    included_pests: ['subterranean termites'],
    included_services: ['Sentricon station installation', 'initial inspection', 'annual monitoring setup'],
    target_customer: 'Homeowners wanting proactive termite protection or with active termite concerns',
  },
  {
    name: 'Sentricon Termite Renewal',
    internal_name: 'specialty_sentricon_renewal',
    description: 'Annual renewal for existing Sentricon Always Active system. Includes station inspection, bait replenishment, and continued warranty coverage.',
    pricing_model: 'annual',
    initial_price: null,
    recurring_price: 375,
    service_frequency: 'annual',
    warranty_details: 'Renewed annual warranty with active monitoring',
    included_pests: ['subterranean termites'],
    included_services: ['station inspection', 'bait replenishment', 'monitoring report'],
    target_customer: 'Existing Sentricon customers needing annual renewal',
  },
  {
    name: 'Sentricon Termite Takeover',
    internal_name: 'specialty_sentricon_takeover',
    description: 'Takeover of existing Sentricon system from another provider. Inspection of current stations and transition to All U Need monitoring and warranty.',
    pricing_model: 'one_time',
    initial_price: 375,
    recurring_price: null,
    service_frequency: 'one-time takeover + annual monitoring',
    warranty_details: 'Warranty begins after takeover inspection and station verification',
    included_pests: ['subterranean termites'],
    included_services: ['station inspection and takeover', 'bait replenishment if needed', 'monitoring transition'],
    target_customer: 'Homeowners with existing Sentricon system switching providers',
  },
  {
    name: 'Rodent Exclusion',
    internal_name: 'specialty_rodent_exclusion',
    description: 'Comprehensive rodent exclusion service. Seal entry points, install exclusion materials, and set up monitoring. Price starts at $1,295 and varies by home size and severity.',
    pricing_model: 'one_time',
    initial_price: 1295,
    recurring_price: null,
    service_frequency: 'one-time exclusion service',
    warranty_details: '1-year warranty on exclusion work',
    included_pests: ['rats', 'mice'],
    included_services: ['full inspection', 'entry point sealing', 'exclusion material installation', 'monitoring setup'],
    target_customer: 'Homeowners with active rodent issues or wanting preventive exclusion',
  },
  {
    name: 'Rodent Bait Box Install',
    internal_name: 'specialty_rodent_bait',
    description: 'Exterior rodent bait station installation. Minimum 2 boxes at $35 each. Stations provide ongoing rodent population control around the property.',
    pricing_model: 'one_time',
    initial_price: 70,
    recurring_price: null,
    service_frequency: 'one-time install (boxes checked during regular service)',
    warranty_details: 'Bait replenished during regular pest control visits',
    included_pests: ['rats', 'mice'],
    included_services: ['2 exterior bait stations', 'initial baiting', 'station anchoring'],
    target_customer: 'Customers wanting supplemental rodent control with their regular service',
  },
  {
    name: 'Flea Treatment',
    internal_name: 'specialty_flea',
    description: 'Interior and exterior flea elimination. Two visits spaced 2 weeks apart to break the flea lifecycle. Customer prep required before treatment.',
    pricing_model: 'one_time',
    initial_price: 199,
    recurring_price: null,
    service_frequency: '2 visits, 2 weeks apart',
    warranty_details: '30-day warranty from last service visit',
    included_pests: ['fleas'],
    included_services: ['interior treatment', 'exterior yard treatment', '2 scheduled visits', 'customer prep instructions'],
    target_customer: 'Pet owners or homeowners with flea infestations',
  },
  {
    name: 'Mosquito Standalone',
    internal_name: 'specialty_mosquito_standalone',
    description: 'Monthly mosquito barrier treatment as a standalone service. Barrier spray on vegetation and larvicide in standing water areas.',
    pricing_model: 'monthly',
    initial_price: null,
    recurring_price: 80,
    service_frequency: 'monthly',
    warranty_details: 'Re-treat between monthly visits if mosquito activity returns',
    included_pests: ['mosquitoes'],
    included_services: ['barrier spray on vegetation', 'larvicide treatment', 'standing water assessment'],
    target_customer: 'Homeowners wanting mosquito control without full pest package',
  },
  {
    name: 'One-Time Service — Single Family',
    internal_name: 'specialty_ots_single_family',
    description: 'One-time general pest treatment for single-family homes. Interior and exterior treatment for common household pests.',
    pricing_model: 'one_time',
    initial_price: 199,
    recurring_price: null,
    service_frequency: 'one-time',
    warranty_details: '30-day warranty from date of service',
    included_pests: ['ants', 'spiders', 'roaches (American)', 'earwigs', 'silverfish', 'crickets'],
    included_services: ['interior baseboard treatment', 'exterior perimeter spray', 'web removal'],
    target_customer: 'Homeowners wanting a single treatment without ongoing commitment',
  },
  {
    name: 'One-Time Service — Apt/Condo',
    internal_name: 'specialty_ots_apt_condo',
    description: 'One-time general pest treatment for apartments and condos. Interior-focused treatment. Discounted to $180 from standard $199 rate.',
    pricing_model: 'one_time',
    initial_price: 199,
    recurring_price: null,
    price_display: '$199 ($180 with discount)',
    service_frequency: 'one-time',
    warranty_details: '30-day warranty from date of service',
    included_pests: ['ants', 'spiders', 'roaches (American)', 'earwigs', 'silverfish', 'crickets'],
    included_services: ['interior baseboard treatment', 'crack and crevice treatment'],
    target_customer: 'Apartment or condo residents needing one-time pest control',
  },
  {
    name: 'TAP Insulation',
    internal_name: 'specialty_tap_insulation',
    description: 'TAP (Thermal Acoustical Pest Control) insulation installation in the attic. Provides energy efficiency, sound dampening, and pest control in one product. Minimum $2,400. Inspection required before quoting.',
    pricing_model: 'one_time',
    initial_price: 2400,
    recurring_price: null,
    service_frequency: 'one-time install (inspection required first)',
    warranty_details: 'Manufacturer warranty on insulation. Pest control properties last the life of the product.',
    included_pests: ['ants', 'roaches', 'silverfish', 'termites', 'beetles (in attic)'],
    included_services: ['attic inspection', 'TAP insulation installation', 'pest barrier in attic space'],
    target_customer: 'Homeowners wanting energy savings + pest protection, or needing attic insulation replacement',
  },
];

// ---------------------------------------------------------------------------
// seedServicePackages
// ---------------------------------------------------------------------------
async function seedServicePackages() {
  const rows = [];
  let displayOrder = 1;

  for (const pkg of RECURRING_PACKAGES) {
    for (const b of pkg.brackets) {
      rows.push({
        organization_id: ORG_ID,
        name: `${pkg.name} (${pkg.tier}) — ${b.label}`,
        internal_name: `${pkg.internal_prefix}_${b.sqft}`,
        description: pkg.description,
        pricing_model: 'monthly',
        initial_price: b.initial,
        recurring_price: b.monthly,
        price_display: `$${b.initial} initial + $${b.monthly}/mo ($${b.annual}/yr)`,
        included_pests: pkg.included_pests,
        included_services: pkg.included_services,
        service_frequency: pkg.service_frequency,
        warranty_details: pkg.warranty_details,
        target_customer: pkg.target_customer,
        ideal_situations: [
          `Price drop available: $${b.drop_initial} initial + $${b.drop_monthly}/mo ($${b.drop_annual}/yr)`,
          `Use price drop to close hesitant customers or match competitor pricing`,
        ],
        is_featured: pkg.tier === 'Diamond',
        display_order: displayOrder++,
        is_active: true,
      });
    }
  }

  for (const sp of SPECIALTY_PACKAGES) {
    rows.push({
      organization_id: ORG_ID,
      name: sp.name,
      internal_name: sp.internal_name,
      description: sp.description,
      pricing_model: sp.pricing_model,
      initial_price: sp.initial_price,
      recurring_price: sp.recurring_price,
      price_display: sp.price_display || null,
      included_pests: sp.included_pests,
      included_services: sp.included_services,
      service_frequency: sp.service_frequency,
      warranty_details: sp.warranty_details,
      target_customer: sp.target_customer,
      ideal_situations: null,
      is_featured: false,
      display_order: displayOrder++,
      is_active: true,
    });
  }

  const { data, error } = await supabase
    .from('service_packages')
    .upsert(rows, { onConflict: 'organization_id,internal_name' })
    .select('id, internal_name');

  if (error) {
    console.error('Failed to seed service packages:', error.message);
    process.exit(1);
  }

  const packageMap = {};
  for (const row of data) {
    packageMap[row.internal_name] = row.id;
  }

  console.log(`  Inserted ${data.length} service packages (${RECURRING_PACKAGES.length * 4} recurring + ${SPECIALTY_PACKAGES.length} specialty)`);
  return packageMap;
}

// ---------------------------------------------------------------------------
// Stub seed functions (to be implemented in subsequent tasks)
// ---------------------------------------------------------------------------
async function seedObjectionsAndSellingPoints(packageMap) {
  console.log('  [stub] seedObjectionsAndSellingPoints — not yet implemented');
  return {};
}

async function seedSalesGuidelines() {
  console.log('  [stub] seedSalesGuidelines — not yet implemented');
}

async function seedCustomerProfiles() {
  console.log('  [stub] seedCustomerProfiles — not yet implemented');
}

async function seedCoursesAndModules() {
  console.log('  [stub] seedCoursesAndModules — not yet implemented');
  return {};
}

async function seedScenarioTemplates(packageMap, courseMap) {
  console.log('  [stub] seedScenarioTemplates — not yet implemented');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== All U Need Pest Control — Seed Script ===\n');

  await verifyOrg();

  console.log('\n--- Service Packages ---');
  const packageMap = await seedServicePackages();

  console.log('\n--- Objections & Selling Points ---');
  const objectionMap = await seedObjectionsAndSellingPoints(packageMap);

  console.log('\n--- Sales Guidelines ---');
  await seedSalesGuidelines();

  console.log('\n--- Customer Profiles ---');
  await seedCustomerProfiles();

  console.log('\n--- Courses & Modules ---');
  const courseMap = await seedCoursesAndModules();

  console.log('\n--- Scenario Templates ---');
  await seedScenarioTemplates(packageMap, courseMap);

  console.log('\n=== Seed complete ===');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
