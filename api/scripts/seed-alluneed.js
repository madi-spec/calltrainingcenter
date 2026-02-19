/**
 * Seed script for All U Need Pest Control
 * Populates org-specific training data: packages, objections, guidelines, profiles, courses, scenarios
 *
 * Usage: node api/scripts/seed-alluneed.js <ORG_ID> [--clean]
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
  console.error('Usage: node api/scripts/seed-alluneed.js <ORG_ID> [--clean]');
  process.exit(1);
}

const CLEAN = process.argv.includes('--clean');

// ---------------------------------------------------------------------------
// Clean existing data (reverse dependency order)
// ---------------------------------------------------------------------------
async function cleanExistingData() {
  if (!CLEAN) return;

  console.log('--- Cleaning existing data for org ---');

  // 1. Delete scenario_templates
  const { error: e1 } = await supabase
    .from('scenario_templates')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e1) console.error('  Failed to delete scenario_templates:', e1.message);
  else console.log('  Deleted scenario_templates');

  // 2. Get service_package ids, then delete package_selling_points and package_objections
  const { data: packages } = await supabase
    .from('service_packages')
    .select('id')
    .eq('organization_id', ORG_ID);

  if (packages && packages.length > 0) {
    const packageIds = packages.map((p) => p.id);

    const { error: e2a } = await supabase
      .from('package_selling_points')
      .delete()
      .in('package_id', packageIds);
    if (e2a) console.error('  Failed to delete package_selling_points:', e2a.message);
    else console.log('  Deleted package_selling_points');

    const { error: e2b } = await supabase
      .from('package_objections')
      .delete()
      .in('package_id', packageIds);
    if (e2b) console.error('  Failed to delete package_objections:', e2b.message);
    else console.log('  Deleted package_objections');
  }

  // 3. Get course ids, then delete course_modules
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('organization_id', ORG_ID);

  if (courses && courses.length > 0) {
    const courseIds = courses.map((c) => c.id);

    const { error: e3 } = await supabase
      .from('course_modules')
      .delete()
      .in('course_id', courseIds);
    if (e3) console.error('  Failed to delete course_modules:', e3.message);
    else console.log('  Deleted course_modules');
  }

  // 4. Delete courses
  const { error: e4 } = await supabase
    .from('courses')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e4) console.error('  Failed to delete courses:', e4.message);
  else console.log('  Deleted courses');

  // 5. Delete service_packages
  const { error: e5 } = await supabase
    .from('service_packages')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e5) console.error('  Failed to delete service_packages:', e5.message);
  else console.log('  Deleted service_packages');

  // 6. Delete sales_guidelines
  const { error: e6 } = await supabase
    .from('sales_guidelines')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e6) console.error('  Failed to delete sales_guidelines:', e6.message);
  else console.log('  Deleted sales_guidelines');

  // 7. Delete customer_profiles (non-system only)
  const { error: e7 } = await supabase
    .from('customer_profiles')
    .delete()
    .eq('organization_id', ORG_ID)
    .eq('is_system', false);
  if (e7) console.error('  Failed to delete customer_profiles:', e7.message);
  else console.log('  Deleted customer_profiles (non-system)');

  console.log('  Clean complete.\n');
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
// seedObjectionsAndSellingPoints
// ---------------------------------------------------------------------------
async function seedObjectionsAndSellingPoints(packageMap) {
  // -----------------------------------------------------------------------
  // OBJECTIONS — universal (all recurring packages)
  // -----------------------------------------------------------------------
  const recurringKeys = Object.keys(packageMap).filter(
    (k) => k.startsWith('silver_') || k.startsWith('gold_') || k.startsWith('diamond_')
  );

  const universalObjections = [
    {
      objection_text: "That's too expensive",
      objection_category: 'price',
      frequency: 'very_common',
      recommended_response:
        'I completely understand wanting to make sure you\'re getting good value. What a lot of our customers find is that the free service calls between visits — which normally run $150-200 each — end up saving them more than the plan costs. Plus you get our satisfaction guarantee backing every visit. We\'re a company with over 30,000 five-star reviews and we\'ve been named to the Inc. 5000 three times, so you can feel confident you\'re in good hands.',
      response_key_points: [
        'Free service calls between visits normally cost $150-200 each',
        'Satisfaction guarantee on every visit',
        '30,000+ five-star reviews',
        '3x Inc. 5000 fastest-growing company',
      ],
      alternative_responses: [
        'When you factor in the free service calls between visits, most customers actually save money compared to paying per visit.',
        'Our plans are designed so you never have to worry about surprise charges. If pests come back between visits, we come back at no extra cost.',
      ],
      avoid_saying: [
        "We're the cheapest option",
        'You get what you pay for',
      ],
      coaching_tip: 'Focus on total value over the year rather than the monthly number. Calculate the value of 2-3 free service calls to make the savings tangible.',
    },
    {
      objection_text: 'My neighbor pays less with another company',
      objection_category: 'competitor',
      frequency: 'common',
      recommended_response:
        "That's a fair comparison to make. The key difference is what's included. Our plan comes with free service calls between visits, a full warranty on everything we treat, and interior service any time you request it. Many companies charge extra for those, so while the base price might look lower, the total cost when you need service often ends up higher.",
      response_key_points: [
        'Different coverage levels make direct comparison difficult',
        'AUN includes free service calls between visits',
        'Full warranty on all treated pests',
        'Interior service available on request at no extra charge',
      ],
      alternative_responses: [
        "I'd be happy to walk you through exactly what's included so you can make an apples-to-apples comparison.",
        'A lot of our customers actually switched from that kind of plan because they were getting charged extra every time they needed service between visits.',
      ],
      avoid_saying: [
        'That company isn\'t as good as us',
        'They probably do a bad job',
        'You shouldn\'t trust them',
      ],
      coaching_tip: 'Never badmouth competitors. Focus on what All U Need includes and let the customer draw their own conclusions about the value difference.',
    },
    {
      objection_text: 'I need to think about it',
      objection_category: 'stall',
      frequency: 'very_common',
      recommended_response:
        "Absolutely, take whatever time you need — this is your home and it's an important decision. I will mention that pest activity tends to increase the longer it goes untreated, especially here in Florida. If you do decide to move forward, we can typically get you same-day or next-day service so there's no waiting around.",
      response_key_points: [
        'Respect their decision-making process',
        'Pest activity increases when left untreated',
        'Same-day or next-day service available',
        'No pressure — education-based approach',
      ],
      alternative_responses: [
        "Of course. Is there anything specific I can answer that would help with your decision?",
        "No problem at all. Just keep in mind that with Florida's climate, most pest issues get worse before they get better without treatment.",
      ],
      avoid_saying: [
        'This offer expires today',
        "You'll regret waiting",
        "I can only hold this price until...",
      ],
      coaching_tip: 'Create gentle urgency through education about pest behavior, not artificial deadlines. The goal is to inform, not pressure.',
    },
  ];

  // -----------------------------------------------------------------------
  // OBJECTIONS — specialty-specific
  // -----------------------------------------------------------------------
  const specialtyObjections = [
    {
      packageKey: 'specialty_german_roach',
      objections: [
        {
          objection_text: "Why aren't German roaches covered under regular pest control?",
          objection_category: 'coverage',
          frequency: 'very_common',
          recommended_response:
            "Great question. German roaches are the only indoor-dwelling cockroach species we deal with here — they don't come in from outside like American roaches. They reproduce incredibly fast and are almost always introduced from an external source like deliveries, used furniture, or visitors. Because of that, they require a completely different treatment approach — three specialized visits spaced two weeks apart to break their lifecycle.",
          response_key_points: [
            'Only indoor-dwelling cockroach species',
            'Rapid reproduction cycle',
            'Introduced from external sources, not covered by perimeter treatment',
            'Requires 3 specialized visits to fully eliminate',
          ],
          alternative_responses: [
            'Regular pest control targets pests that enter from outside. German roaches live entirely indoors and breed so quickly that they need a dedicated treatment protocol.',
          ],
          avoid_saying: ['Your regular plan should cover that'],
          coaching_tip: 'Educate on why German roaches are biologically different from other roaches. Customers often assume all roaches are the same.',
        },
        {
          objection_text: 'How did I get them? My house is clean.',
          objection_category: 'education',
          frequency: 'common',
          recommended_response:
            "I hear this a lot, and I want to reassure you — German roaches have absolutely nothing to do with cleanliness. They're hitchhikers. They come in through delivered packages, used appliances, grocery bags, even visitors' belongings. A spotless home can get them just as easily as any other. The good news is our treatment is very effective at eliminating them.",
          response_key_points: [
            'Nothing to do with cleanliness',
            'Carried in via packages, appliances, grocery bags, visitors',
            'Can happen to anyone',
            'Treatment is highly effective',
          ],
          alternative_responses: [
            "Cleanliness doesn't prevent German roaches — they're brought in unknowingly. The important thing is catching them early and treating properly.",
          ],
          avoid_saying: [
            'You must have brought them in somehow',
            'Maybe check your hygiene',
          ],
          coaching_tip: 'Customers are often embarrassed. Normalize it immediately and redirect to the solution.',
        },
      ],
    },
    {
      packageKey: 'specialty_bed_bug',
      objections: [
        {
          objection_text: "It's been a week and I'm still getting bitten. Why isn't it working?",
          objection_category: 'timeline',
          frequency: 'very_common',
          recommended_response:
            "I understand the frustration — nobody wants to keep getting bitten. Here's the good news: the Aprehend treatment is actually working exactly as designed. The fungal spores take 3-7 days to fully activate, and you'll see a sharp decline in activity between days 7-21. Full resolution typically happens within 3-6 weeks. It's really important to keep sleeping in the treated bed during this time, because the bugs need to cross the treated barrier for the spores to spread through the colony.",
          response_key_points: [
            'Aprehend fungal spores take 3-7 days to activate',
            'Sharp decline between days 7-21',
            'Full resolution within 3-6 weeks',
            'Must keep sleeping in treated bed for treatment to work',
          ],
          alternative_responses: [
            'The bites you\'re seeing now are likely from bugs that were already active before treatment. The Aprehend barrier is working — as bugs cross it, the fungal spores spread through the colony.',
          ],
          avoid_saying: [
            'It should have worked by now',
            'That\'s unusual',
          ],
          coaching_tip: 'Set timeline expectations proactively during initial sale so customers know what to expect. This is the #1 post-treatment concern.',
        },
        {
          objection_text: "Why can't I clean or vacuum after the treatment?",
          objection_category: 'post_treatment',
          frequency: 'common',
          recommended_response:
            "The Aprehend treatment creates a 90-day barrier that the bed bugs need to walk through. When they cross it, the fungal spores attach to them and they carry it back to the colony, spreading it to other bugs. If you clean or vacuum the treated areas, you remove those spores and the barrier breaks down. That's why we ask you to avoid cleaning those specific treated areas for the full treatment period.",
          response_key_points: [
            '90-day barrier is critical to treatment success',
            'Spores attach to bugs as they cross the barrier',
            'Bugs spread spores to the rest of the colony',
            'Cleaning removes the spores and breaks the barrier',
          ],
          alternative_responses: [
            'Think of it like a landmine field for bed bugs — every time one crosses the treated area, it picks up spores. Cleaning removes those landmines.',
          ],
          avoid_saying: [
            'Just don\'t clean',
            'It\'s not a big deal',
          ],
          coaching_tip: 'Use the spreading mechanism as a positive — the treatment keeps working for 90 days without any additional visits.',
        },
      ],
    },
    {
      packageKey: 'specialty_sentricon_install',
      objections: [
        {
          objection_text: 'Does this cover drywood termites too?',
          objection_category: 'coverage',
          frequency: 'common',
          recommended_response:
            "The Sentricon system is specifically designed for subterranean termites — the ones that come up from the ground. Drywood termites are a completely different species that live inside the wood itself and require a different treatment approach. For drywood termites, I'd recommend reaching out to Baton Service Pros at 844-699-4138 — they specialize in that type of treatment.",
          response_key_points: [
            'Sentricon targets subterranean termites only',
            'Drywood termites are a different species',
            'Drywood termites require different treatment',
            'Refer to Baton Service Pros at 844-699-4138',
          ],
          alternative_responses: [
            'Sentricon works underground where subterranean termites travel. Drywood termites live inside the wood itself, so they need a different approach entirely.',
          ],
          avoid_saying: [
            'It covers all termites',
            'You probably don\'t have drywood termites',
          ],
          coaching_tip: 'Always clarify termite species. Promising coverage for drywood termites when selling Sentricon creates major customer trust issues.',
        },
      ],
    },
    {
      packageKey: 'specialty_rodent_exclusion',
      objections: [
        {
          objection_text: "Why can't you do rodent exclusion on my crawlspace home?",
          objection_category: 'eligibility',
          frequency: 'common',
          recommended_response:
            "I understand the frustration. The reason is that our exclusion service works by completely sealing every possible entry point so rodents can't get in. Crawlspace homes have too many access points underneath — vents, pipe penetrations, foundation gaps — that can't be fully sealed while still maintaining proper airflow. Without being able to guarantee a complete seal, we can't back it with our warranty. I don't want to take your money for something we can't guarantee.",
          response_key_points: [
            'Exclusion requires complete sealing of all entry points',
            'Crawlspaces have too many access points to fully seal',
            'Proper airflow must be maintained',
            'Cannot guarantee warranty without complete seal',
          ],
          alternative_responses: [
            'We could seal some entry points, but rodents would find the ones we can\'t reach. It wouldn\'t be fair to charge you for a service we can\'t fully deliver.',
          ],
          avoid_saying: [
            'We just don\'t do crawlspaces',
            'That\'s our policy',
          ],
          coaching_tip: 'Frame the limitation as protecting the customer from paying for an incomplete solution. Honesty builds trust even when we can\'t help.',
        },
      ],
    },
  ];

  // -----------------------------------------------------------------------
  // Build objection rows
  // -----------------------------------------------------------------------
  const objectionRows = [];
  let objDisplayOrder = 1;

  for (const pkgKey of recurringKeys) {
    const pkgId = packageMap[pkgKey];
    for (const obj of universalObjections) {
      objectionRows.push({
        package_id: pkgId,
        objection_text: obj.objection_text,
        objection_category: obj.objection_category,
        frequency: obj.frequency,
        recommended_response: obj.recommended_response,
        response_key_points: obj.response_key_points,
        alternative_responses: obj.alternative_responses,
        avoid_saying: obj.avoid_saying,
        coaching_tip: obj.coaching_tip,
        display_order: objDisplayOrder++,
      });
    }
  }

  for (const spec of specialtyObjections) {
    const pkgId = packageMap[spec.packageKey];
    if (!pkgId) {
      console.warn(`  Warning: package key "${spec.packageKey}" not found in packageMap`);
      continue;
    }
    for (const obj of spec.objections) {
      objectionRows.push({
        package_id: pkgId,
        objection_text: obj.objection_text,
        objection_category: obj.objection_category,
        frequency: obj.frequency,
        recommended_response: obj.recommended_response,
        response_key_points: obj.response_key_points,
        alternative_responses: obj.alternative_responses,
        avoid_saying: obj.avoid_saying,
        coaching_tip: obj.coaching_tip,
        display_order: objDisplayOrder++,
      });
    }
  }

  const { error: objError } = await supabase
    .from('package_objections')
    .upsert(objectionRows, { onConflict: 'package_id,objection_text' });

  if (objError) {
    console.error('Failed to seed objections:', objError.message);
    process.exit(1);
  }

  console.log(`  Inserted ${objectionRows.length} package objections`);

  // -----------------------------------------------------------------------
  // SELLING POINTS — by tier prefix
  // -----------------------------------------------------------------------
  const sellingPointsByPrefix = {
    silver_: [
      'Affordable protection for your home',
      'Free service calls between visits (normally $150-200 each)',
      'Bi-monthly coverage keeps pests away year-round',
      'Lanai and pool cage included at no extra charge',
      'Interior service available on request',
      'Satisfaction guarantee on every visit',
    ],
    gold_granular_: [
      'Everything in Silver plus quarterly ant treatment',
      'Quarterly granular application targets fire ants and yard ants',
      'Covers BHA (big-headed ants) and fire ants',
      'Full lawn coverage for ant colonies',
      'Upgrade to SLP available for additional lawn pest protection',
    ],
    gold_slp_: [
      'Everything in Silver plus standard lawn pest treatment',
      'Covers fleas, ticks, and millipedes in the lawn',
      'Power sprayer application for thorough coverage',
      'Protects turf from chinch bugs, sod webworms, and more',
      'Upgrade to SLP+ available for enhanced coverage',
    ],
    gold_mosquito_: [
      'Everything in Silver plus monthly mosquito treatment',
      'Trees, shrubs, and standing water areas treated',
      'Repellent plus insect growth regulator (IGR)',
      'Monthly visits for consistent mosquito control',
      'Seasonal option available for snowbird customers',
    ],
    diamond_granular_mosquito_: [
      'Most comprehensive ant + mosquito bundle available',
      'Best value per service compared to separate plans',
      'Year-round protection for home, yard, and outdoor spaces',
      'Quarterly granular ant treatment plus monthly mosquito service',
      'Complete peace of mind — nothing left uncovered',
    ],
    diamond_slp_mosquito_: [
      'Ultimate protection — our most comprehensive plan',
      'Home + lawn + mosquito coverage in one plan',
      'Best value per service of any package we offer',
      'Nothing left unprotected — pests, lawn pests, and mosquitoes',
      'Premium service for homeowners who want it all',
    ],
  };

  const sellingPointRows = [];

  for (const [prefix, points] of Object.entries(sellingPointsByPrefix)) {
    const matchingKeys = Object.keys(packageMap).filter((k) => k.startsWith(prefix));
    for (const pkgKey of matchingKeys) {
      const pkgId = packageMap[pkgKey];
      points.forEach((point, idx) => {
        sellingPointRows.push({
          package_id: pkgId,
          point,
          emphasis_level: idx === 0 ? 3 : idx < 3 ? 2 : 1,
          display_order: idx + 1,
        });
      });
    }
  }

  const { error: spError } = await supabase
    .from('package_selling_points')
    .upsert(sellingPointRows, { onConflict: 'package_id,point' });

  if (spError) {
    console.error('Failed to seed selling points:', spError.message);
    process.exit(1);
  }

  console.log(`  Inserted ${sellingPointRows.length} selling points`);

  return { objectionCount: objectionRows.length, sellingPointCount: sellingPointRows.length };
}

// ---------------------------------------------------------------------------
// seedSalesGuidelines
// ---------------------------------------------------------------------------
async function seedSalesGuidelines() {
  const guidelines = [
    {
      guideline_type: 'pricing_rule',
      title: 'Minimum Initial Service Price',
      content: 'The minimum initial service price is $99 for all recurring plans. Exceptions: Sentricon takeover and exterior-only plans can go to $79 initial. Lead generation from Facebook or Thumbtack campaigns can go to $49 initial. Never go below these minimums without management approval.',
      examples: [
        { scenario: 'New Silver customer', minimum: '$99 initial' },
        { scenario: 'Sentricon takeover', minimum: '$79 initial' },
        { scenario: 'Facebook lead gen promotion', minimum: '$49 initial' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Double Lot Pricing',
      content: 'Add $5/month to any recurring plan for double-lot properties. This applies regardless of the plan tier or square footage bracket. Confirm lot size during the sales conversation if the customer mentions a large property.',
      examples: [
        { scenario: 'Silver <3000 sqft on double lot', price: '$45/mo + $5 = $50/mo' },
        { scenario: 'Gold Granular 3001-4000 sqft on double lot', price: '$60/mo + $5 = $65/mo' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Price Drops',
      content: 'Price drops are only available when approved by management. Each tier and square footage bracket has defined drop prices (lower initial and/or lower monthly). Never offer a price drop proactively — only use it as a retention or close tool when the customer has a genuine objection. Always exhaust value-based selling first.',
      examples: [
        { scenario: 'Customer objects to Silver <3000 pricing', drop: '$99 initial + $42/mo (from $150/$45)' },
        { scenario: 'Customer comparing to competitor', action: 'Sell value first, then offer drop only if needed to close' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Same-Day Service',
      content: 'Same-day service requires manager approval before confirming with the customer. Do not promise same-day service without checking availability and getting explicit manager approval first.',
      examples: [
        { scenario: 'Customer requests same-day', action: 'Place on hold or callback, confirm with manager' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'SLP Paired with GHP Discount',
      content: 'When a customer has a General Home Pest (GHP) plan and adds Standard Lawn Pest (SLP), the SLP rate is discounted to $60/quarter for lots 7,500 sqft or smaller. This only applies when SLP is paired with an active GHP plan.',
      examples: [
        { scenario: 'Silver customer adds SLP, lot <=7500 sqft', price: '$60/quarter for SLP' },
        { scenario: 'Lot over 7500 sqft', price: 'Standard SLP pricing applies' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'In-Wall System Surcharge',
      content: 'Homes with an in-wall pest system (tubes in the walls) require an additional $5/month on any recurring plan. The technician needs to use the in-wall system during service, which adds time and product.',
      examples: [
        { scenario: 'Gold Granular <3000 sqft with in-wall', price: '$55/mo + $5 = $60/mo' },
      ],
    },
    {
      guideline_type: 'qualification',
      title: 'Rodent Exclusion Eligibility',
      content: 'Rodent exclusion is available for single-family homes only. Not eligible: crawlspace homes, townhomes, condos, manufactured homes. Not available in Texas. Not available for 2-story homes in Jacksonville. Always confirm home type and location before quoting rodent exclusion.',
      examples: [
        { scenario: 'Single-family slab home in FL', eligible: true },
        { scenario: 'Townhome', eligible: false, reason: 'Shared walls — cannot guarantee seal' },
        { scenario: 'Crawlspace home', eligible: false, reason: 'Too many access points' },
        { scenario: '2-story home in Jacksonville', eligible: false, reason: 'Jacksonville 2-story restriction' },
        { scenario: 'Any home in Texas', eligible: false, reason: 'Texas not serviced for exclusion' },
      ],
    },
    {
      guideline_type: 'qualification',
      title: 'Sentricon Spray Foam Policy',
      content: 'For NEW Sentricon installs: Do NOT approve if the home has spray foam insulation in the walls or foundation. Spray foam interferes with termite detection. For RENEWAL customers who already have Sentricon installed: Honor the current contract period. At renewal, offer to uninstall the system and explain that spray foam limits the system\'s effectiveness.',
      examples: [
        { scenario: 'New install, home has spray foam', action: 'Decline installation, explain interference' },
        { scenario: 'Existing customer renewal, spray foam', action: 'Honor contract, then offer uninstall at renewal' },
      ],
    },
    {
      guideline_type: 'qualification',
      title: 'TAP Insulation Pre-sell Requirements',
      content: 'TAP insulation requires an inspection before quoting. Minimum price is $2,400. Must be whole-home attic installation — no partial attic jobs. Schedule the inspection with Ryan. Financing is available for qualified customers. Do not quote a final price without inspection.',
      examples: [
        { scenario: 'Customer interested in TAP', action: 'Schedule inspection with Ryan, mention $2,400 minimum' },
        { scenario: 'Customer wants just part of attic', action: 'Explain whole-home requirement' },
        { scenario: 'Customer asks about financing', action: 'Confirm financing is available, details after inspection' },
      ],
    },
    {
      guideline_type: 'process',
      title: 'Card Decline — Longstanding Customer (5+ Visits)',
      content: 'For longstanding customers (5 or more completed visits) with a declined card: Approve the service. Send the longstanding customer card decline template. Add a note to the account for Accounts Receivable follow-up. Do not delay or cancel service for longstanding customers over a payment issue.',
      examples: [
        { scenario: '8 visits completed, card declined', action: 'Approve service, send longstanding template, note for AR' },
      ],
    },
    {
      guideline_type: 'process',
      title: 'Card Decline — New Customer (Under 5 Visits)',
      content: 'For new customers (fewer than 5 completed visits) with a declined card: Do NOT approve the service. Send the non-longstanding customer card decline template. Follow up with the customer for updated payment before scheduling the next service.',
      examples: [
        { scenario: '2 visits completed, card declined', action: 'Do not approve, send non-longstanding template, follow up for payment' },
      ],
    },
    {
      guideline_type: 'process',
      title: 'Service Call Eligibility',
      content: 'A service call (free re-treat between visits) is eligible when: the customer is not due for their next regular visit AND there is an active live pest issue. If the issue is that the technician didn\'t have access on the last visit (couldn\'t enter home, gate locked, etc.), use CES (Customer Experience Specialist) or CIS (Customer Issue Specialist) workflow instead of a service call.',
      examples: [
        { scenario: 'Customer seeing ants 3 weeks after last visit, next visit not for 5 weeks', action: 'Schedule free service call' },
        { scenario: 'Tech couldn\'t get into backyard last visit', action: 'Use CES/CIS workflow, not a service call' },
      ],
    },
    {
      guideline_type: 'referral',
      title: 'Baton Service Pros Referral',
      content: 'Refer customers to Baton Service Pros at (844) 699-4138 for services All U Need does not provide: drywood termite treatment, lawn care and maintenance, grub treatment, and any non-pest-control home services. Always provide the phone number and a warm handoff when possible.',
      examples: [
        { scenario: 'Customer asks about drywood termites', action: 'Explain Sentricon is subterranean only, refer to Baton at 844-699-4138' },
        { scenario: 'Customer asks about lawn care', action: 'Refer to Baton at 844-699-4138' },
        { scenario: 'Customer asks about grub treatment', action: 'Refer to Baton at 844-699-4138' },
      ],
    },
    {
      guideline_type: 'communication',
      title: 'Approved Product Language',
      content: 'When discussing products and treatments, always use approved language. Say: "EPA registered" when referring to product safety. Say: "applied per label" when describing how products are used. Never say: "harmless" (no pesticide is harmless). Never say: "works instantly" (sets unrealistic expectations). Stick to factual, label-compliant language at all times.',
      examples: [
        { scenario: 'Customer asks if spray is safe', correct: '"Our products are EPA registered and applied per label instructions"', incorrect: '"It\'s completely harmless"' },
        { scenario: 'Customer asks how fast it works', correct: '"You should see a significant reduction within the first few days"', incorrect: '"It works instantly"' },
      ],
    },
  ];

  const rows = guidelines.map((g, idx) => ({
    organization_id: ORG_ID,
    guideline_type: g.guideline_type,
    title: g.title,
    content: g.content,
    examples: g.examples,
    is_active: true,
    display_order: idx + 1,
  }));

  const { error } = await supabase
    .from('sales_guidelines')
    .upsert(rows, { onConflict: 'organization_id,title' });

  if (error) {
    console.error('Failed to seed sales guidelines:', error.message);
    process.exit(1);
  }

  console.log(`  Inserted ${rows.length} sales guidelines`);
}

// ---------------------------------------------------------------------------
// seedCustomerProfiles
// ---------------------------------------------------------------------------
async function seedCustomerProfiles() {
  const profiles = [
    // --- Easy (close_difficulty 2-3) ---
    {
      name: 'Amanda Rivera',
      gender: 'female',
      age_range: '30-39',
      personality_traits: ['friendly', 'eager', 'trusting'],
      communication_style: 'friendly',
      pain_points: ['Just moved to Florida', 'Unfamiliar with local pests', 'Wants family protection'],
      buying_motivations: ['Protecting family from pests', 'Neighbor recommended All U Need', 'Wants proactive prevention'],
      objection_likelihood: 2,
      close_difficulty: 2,
    },
    {
      name: 'Jake Morrison',
      gender: 'male',
      age_range: '25-34',
      personality_traits: ['laid-back', 'agreeable', 'easygoing'],
      communication_style: 'direct',
      pain_points: ['Spiders in the garage', 'Girlfriend terrified of bugs', 'Wants quick solution'],
      buying_motivations: ['Girlfriend insists on pest control', 'Wants peace of mind', 'Prefers hands-off solution'],
      objection_likelihood: 2,
      close_difficulty: 3,
    },
    {
      name: 'Linda Chen',
      gender: 'female',
      age_range: '40-49',
      personality_traits: ['organized', 'decisive', 'loyal'],
      communication_style: 'direct',
      pain_points: ['Previous pest company was unreliable', 'Missed appointments', 'Inconsistent service quality'],
      buying_motivations: ['Friend referred All U Need', 'Wants consistent reliable service', 'Values professionalism'],
      objection_likelihood: 1,
      close_difficulty: 2,
    },
    // --- Medium (close_difficulty 4-6) ---
    {
      name: 'Robert Fitzgerald',
      gender: 'male',
      age_range: '50-59',
      personality_traits: ['cautious', 'research-oriented', 'thorough'],
      communication_style: 'analytical',
      pain_points: ['Fire ants in the yard', 'Grandkids visit regularly', 'Concerned about chemical safety'],
      buying_motivations: ['Protecting grandchildren from fire ant stings', 'Wants to understand exactly what chemicals are used', 'Safety-first mindset'],
      objection_likelihood: 5,
      close_difficulty: 5,
    },
    {
      name: 'Maria Santos',
      gender: 'female',
      age_range: '35-44',
      personality_traits: ['price-conscious', 'comparison shopper', 'methodical'],
      communication_style: 'analytical',
      pain_points: ['Comparing three pest control companies', 'Budget is tight', 'Worried about being locked into a contract'],
      buying_motivations: ['Getting the best value for money', 'Wants transparent pricing', 'Needs to justify cost to spouse'],
      objection_likelihood: 6,
      close_difficulty: 5,
    },
    {
      name: 'Tom Patterson',
      gender: 'male',
      age_range: '45-54',
      personality_traits: ['busy', 'impatient', 'results-oriented'],
      communication_style: 'direct',
      pain_points: ['Found roaches after buying a used refrigerator', 'No time for extensive prep work', 'Wants fast resolution'],
      buying_motivations: ['Immediate problem needs solving', 'Willing to pay for speed and convenience', 'Values no-nonsense approach'],
      objection_likelihood: 4,
      close_difficulty: 5,
    },
    {
      name: 'Diane Crawford',
      gender: 'female',
      age_range: '60-69',
      personality_traits: ['detail-oriented', 'worried', 'talkative'],
      communication_style: 'emotional',
      pain_points: ['Found droppings in the attic', 'Lives alone', 'Worried about disease from rodents'],
      buying_motivations: ['Fear of health risks', 'Needs reassurance and someone to trust', 'Wants thorough explanation of service'],
      objection_likelihood: 4,
      close_difficulty: 4,
    },
    {
      name: 'Chris Nguyen',
      gender: 'male',
      age_range: '30-39',
      personality_traits: ['tech-savvy', 'skeptical', 'research-driven'],
      communication_style: 'analytical',
      pain_points: ['Bed bugs after vacation', 'Read conflicting information online', 'Worried about chemical exposure'],
      buying_motivations: ['Wants evidence-based treatment approach', 'Needs to understand the science behind the treatment', 'Values data and reviews'],
      objection_likelihood: 6,
      close_difficulty: 6,
    },
    {
      name: 'Sandra Williams',
      gender: 'female',
      age_range: '40-49',
      personality_traits: ['loyal', 'reasonable', 'polite'],
      communication_style: 'friendly',
      pain_points: ['Credit card on file was declined', 'Embarrassed about the situation', 'Worried about service interruption'],
      buying_motivations: ['Wants to keep her service active', 'Values the relationship with All U Need', 'Willing to resolve payment quickly'],
      objection_likelihood: 3,
      close_difficulty: 4,
    },
    // --- Hard (close_difficulty 7-9) ---
    {
      name: 'Frank Henderson',
      gender: 'male',
      age_range: '55-64',
      personality_traits: ['confrontational', 'feels ripped off', 'aggressive'],
      communication_style: 'confrontational',
      pain_points: ['Had 3 GHP services and still seeing ants', 'Feels like service is not working', 'Threatening to cancel and leave bad review'],
      buying_motivations: ['Wants immediate resolution', 'Needs to feel heard and validated', 'May retain if given concrete action plan'],
      objection_likelihood: 9,
      close_difficulty: 8,
    },
    {
      name: 'Patricia Donovan',
      gender: 'female',
      age_range: '45-54',
      personality_traits: ['anxious', 'frustrated', 'impatient'],
      communication_style: 'emotional',
      pain_points: ['Bed bug treatment 2 weeks ago, still getting bitten', 'Losing sleep', 'Wants a refund'],
      buying_motivations: ['Desperate for relief', 'Needs reassurance the treatment is working', 'Will stay if timeline expectations are reset'],
      objection_likelihood: 8,
      close_difficulty: 7,
    },
    {
      name: 'Gary Lawson',
      gender: 'male',
      age_range: '40-49',
      personality_traits: ['DIY mindset', 'distrustful of companies', 'stubborn'],
      communication_style: 'guarded',
      pain_points: ['Tried DIY pest control for months', 'Problem has gotten worse', 'Reluctant to pay a professional'],
      buying_motivations: ['DIY has failed and he knows it', 'Needs to save face while accepting help', 'Responds to expertise and credentials'],
      objection_likelihood: 8,
      close_difficulty: 7,
    },
    {
      name: 'Karen Mitchell',
      gender: 'female',
      age_range: '50-59',
      personality_traits: ['demanding', 'entitled', 'vocal'],
      communication_style: 'confrontational',
      pain_points: ['Technician no-showed for appointment', 'Took a day off work to be home', 'Wants compensation for lost time'],
      buying_motivations: ['Wants to feel valued as a customer', 'Needs acknowledgment of the inconvenience', 'May accept service credit or priority scheduling'],
      objection_likelihood: 9,
      close_difficulty: 8,
    },
    {
      name: 'James Wright',
      gender: 'male',
      age_range: '35-44',
      personality_traits: ['stubborn', 'insistent', 'skeptical'],
      communication_style: 'direct',
      pain_points: ['Wants rodent exclusion but has a crawlspace home', 'Another company told him they could do it', 'Frustrated that AUN won\'t service his home'],
      buying_motivations: ['Desperate to solve rodent problem', 'Will respect honesty if explained properly', 'May accept alternative solutions'],
      objection_likelihood: 7,
      close_difficulty: 8,
    },
    {
      name: 'Betty Thompson',
      gender: 'female',
      age_range: '65-74',
      personality_traits: ['frugal', 'suspicious', 'set in her ways'],
      communication_style: 'guarded',
      pain_points: ['Been with another pest company for 20 years', 'Comparing prices and service', 'Suspicious of new companies'],
      buying_motivations: ['Looking for better value but afraid of change', 'Responds to trustworthiness and track record', 'Needs social proof and guarantees'],
      objection_likelihood: 8,
      close_difficulty: 9,
    },
    {
      name: 'Miguel Torres',
      gender: 'male',
      age_range: '30-39',
      personality_traits: ['frustrated', 'embarrassed', 'private'],
      communication_style: 'emotional',
      pain_points: ['German roaches in apartment', 'Landlord won\'t help or pay', 'Wants discretion — embarrassed about the issue'],
      buying_motivations: ['Desperate to solve the problem himself', 'Values discretion and non-judgmental service', 'Budget-conscious but willing to pay for results'],
      objection_likelihood: 5,
      close_difficulty: 7,
    },
  ];

  const rows = profiles.map((p) => ({
    organization_id: ORG_ID,
    name: p.name,
    gender: p.gender,
    age_range: p.age_range,
    personality_traits: p.personality_traits,
    communication_style: p.communication_style,
    pain_points: p.pain_points,
    buying_motivations: p.buying_motivations,
    objection_likelihood: p.objection_likelihood,
    close_difficulty: p.close_difficulty,
    is_system: false,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from('customer_profiles')
    .upsert(rows, { onConflict: 'organization_id,name' })
    .select('id, name');

  if (error) {
    console.error('Failed to seed customer profiles:', error.message);
    process.exit(1);
  }

  const profileMap = {};
  for (const row of data) {
    profileMap[row.name] = row.id;
  }

  console.log(`  Inserted ${data.length} customer profiles`);
  return profileMap;
}

// ---------------------------------------------------------------------------
// Stub seed functions (to be implemented in subsequent tasks)
// ---------------------------------------------------------------------------
async function seedCoursesAndModules() {
  const AUN_COURSES = [
    {
      name: 'Service Knowledge Fundamentals',
      description: 'Core knowledge of All U Need pest control services, treatment types, covered pests, and service terminology.',
      category: 'product_knowledge',
      icon: '🏠',
      badge_name: 'Service Expert',
      badge_icon: '🎓',
      display_order: 1,
      modules: [
        { name: 'Home Pest Control (GHP)', description: 'General Home Pest service coverage, included pests, treatment methods, and warranty details.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
        { name: 'Lawn Pest Control (SLP/QGG)', description: 'Standard Lawn Pest and Quarterly Granular programs, covered lawn pests, and application methods.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
        { name: 'Specialty Services Overview', description: 'Overview of all specialty services including bed bugs, German roaches, Sentricon, rodent exclusion, TAP insulation, and more.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Non-Warrantied Pests', description: 'Identifying and explaining pests not covered under standard plans — German roaches, bed bugs, rodents, drywood termites, and more.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Service Lingo Fluency', description: 'Key terminology and abbreviations used at All U Need — GHP, SLP, QGG, CES, CIS, OTS, and more.', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 },
      ],
    },
    {
      name: 'Pricing & Sales',
      description: 'Mastering pricing structures, package tiers, upselling techniques, and handling price objections.',
      category: 'sales_skills',
      icon: '💰',
      badge_name: 'Sales Pro',
      badge_icon: '🏆',
      display_order: 2,
      modules: [
        { name: 'Quoting New Customers', description: 'Building accurate quotes based on home size, location, and pest concerns. Includes initial and recurring pricing.', difficulty: 'medium', scenario_count: 10, pass_threshold: 65 },
        { name: 'Package Tiers (Silver → Gold → Diamond)', description: 'Understanding and presenting the three package tiers, what each includes, and when to recommend each level.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Upselling & Bundling', description: 'Techniques for upgrading customers from Silver to Gold or Diamond, and bundling add-on services.', difficulty: 'hard', scenario_count: 12, pass_threshold: 55 },
        { name: 'Handling Price Objections', description: 'Responding to price concerns with value-based selling, price drop guidelines, and competitive positioning.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
        { name: 'Specialty Service Sales', description: 'Selling specialty services — bed bug treatment, Sentricon, rodent exclusion, TAP insulation, and more.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
      ],
    },
    {
      name: 'Scheduling & Service Call Triage',
      description: 'Efficiently booking services, triaging service calls vs. full services, and managing scheduling workflows.',
      category: 'customer_service',
      icon: '📋',
      badge_name: 'Scheduling Expert',
      badge_icon: '📅',
      display_order: 3,
      modules: [
        { name: 'Booking Initial Services', description: 'Scheduling first-time services including same-day requests, manager approvals, and service area confirmation.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
        { name: 'Service Call vs. Full Service', description: 'Determining when a customer needs a free service call vs. waiting for their next regular service visit.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Avoiding Unnecessary Visits', description: 'Educating customers on normal post-treatment activity, expected timelines, and when to wait vs. schedule.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Rescheduling & Follow-Up', description: 'Handling reschedule requests, missed appointments, and proactive follow-up communication.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Multi-Visit Scheduling', description: 'Coordinating multi-visit treatments like German roach (3 visits) and flea (2 visits) service schedules.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
      ],
    },
    {
      name: 'Customer Retention & De-escalation',
      description: 'Retaining customers through card decline handling, hold policies, cancellation saves, and de-escalation techniques.',
      category: 'retention',
      icon: '🛡️',
      badge_name: 'Retention Champion',
      badge_icon: '💎',
      display_order: 4,
      modules: [
        { name: 'Card Decline Handling', description: 'Following card decline protocols for longstanding vs. new customers, templates, and AR follow-up.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
        { name: 'Hold Policy Execution', description: 'Managing seasonal holds, snowbird accounts, and service pause requests per company policy.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Cancellation Saves', description: 'Techniques for saving customers who want to cancel — identifying root cause, offering solutions, and knowing when to let go.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
        { name: 'Gate Access & Not-Home', description: 'Handling locked gates, no-access situations, and customers who are not home during scheduled service.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
        { name: 'Angry Customer De-escalation', description: 'De-escalating frustrated or angry customers using empathy, acknowledgment, and concrete action plans.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
      ],
    },
    {
      name: 'Specialty Service Qualification',
      description: 'Qualifying customers for specialty services through proper questioning, eligibility checks, and expectation setting.',
      category: 'sales_skills',
      icon: '🔍',
      badge_name: 'Qualification Expert',
      badge_icon: '🎯',
      display_order: 5,
      modules: [
        { name: 'Rodent Qualification', description: 'Qualifying homes for rodent exclusion — home type, foundation, location restrictions, and alternative solutions.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
        { name: 'German Roach Qualification', description: 'Pre-qualifying German roach treatments — species confirmation, infestation source, prep requirements.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
        { name: 'Bed Bug Qualification', description: 'Qualifying bed bug treatments — confirming activity, setting timeline expectations, and explaining Aprehend process.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
        { name: 'Sentricon Qualification', description: 'Qualifying Sentricon installations — subterranean vs. drywood, spray foam policy, new install vs. takeover vs. renewal.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
        { name: 'TAP Insulation Qualification', description: 'Pre-selling TAP insulation — inspection scheduling, minimum pricing, whole-home requirement, and financing options.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      ],
    },
    {
      name: 'Communication & Documentation',
      description: 'Professional call handling, templates, task documentation, and service area routing.',
      category: 'customer_service',
      icon: '📝',
      badge_name: 'Communication Pro',
      badge_icon: '✍️',
      display_order: 6,
      modules: [
        { name: 'Professional Call Handling', description: 'Greeting, tone, call flow, hold procedures, and professional closing techniques.', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 },
        { name: 'Text & Voicemail Templates', description: 'Using approved text and voicemail templates for card declines, follow-ups, scheduling confirmations, and more.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Task Documentation', description: 'Creating clear, actionable tasks in the CRM for technicians, AR, and management follow-up.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Service Area Routing', description: 'Confirming service areas, routing customers to correct branches, and handling out-of-area requests.', difficulty: 'easy', scenario_count: 6, pass_threshold: 75 },
      ],
    },
    {
      name: 'Complex Service Coordination',
      description: 'Managing multi-step service workflows, approvals, technician issues, and business continuity procedures.',
      category: 'advanced',
      icon: '⚙️',
      badge_name: 'Operations Expert',
      badge_icon: '🔧',
      display_order: 7,
      modules: [
        { name: 'Initial Service Approval Workflow', description: 'Processing initial service approvals including payment verification, scheduling confirmation, and technician assignment.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
        { name: 'Recurring Service Approval', description: 'Managing recurring service approvals, auto-pay verification, and service continuation workflows.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Technician No-Show Recovery', description: 'Handling missed technician appointments — customer communication, rescheduling, compensation, and escalation.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
        { name: 'Post-Treatment Follow-Up', description: 'Following up after specialty treatments to set expectations, check satisfaction, and schedule next steps.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'BCP — Service During Disruptions', description: 'Business continuity procedures during weather events, system outages, staffing shortages, and other disruptions.', difficulty: 'medium', scenario_count: 6, pass_threshold: 60 },
      ],
    },
  ];

  const courseModuleMap = {};

  for (const course of AUN_COURSES) {
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .upsert(
        {
          organization_id: ORG_ID,
          name: course.name,
          description: course.description,
          category: course.category,
          icon: course.icon,
          badge_name: course.badge_name,
          badge_icon: course.badge_icon,
          is_system: false,
          is_active: true,
          display_order: course.display_order,
        },
        { onConflict: 'organization_id,name' }
      )
      .select('id')
      .single();

    if (courseError) {
      console.error(`Failed to seed course "${course.name}":`, courseError.message);
      process.exit(1);
    }

    const courseId = courseData.id;

    const moduleRows = course.modules.map((mod, idx) => ({
      course_id: courseId,
      name: mod.name,
      description: mod.description,
      difficulty: mod.difficulty,
      scenario_count: mod.scenario_count,
      pass_threshold: mod.pass_threshold,
      required_completions: 1,
      unlock_order: idx,
    }));

    const { data: moduleData, error: moduleError } = await supabase
      .from('course_modules')
      .upsert(moduleRows, { onConflict: 'course_id,name' })
      .select('id, name');

    if (moduleError) {
      console.error(`Failed to seed modules for "${course.name}":`, moduleError.message);
      process.exit(1);
    }

    const modules = {};
    for (const row of moduleData) {
      modules[row.name] = row.id;
    }

    courseModuleMap[course.name] = { courseId, modules };

    console.log(`  ${course.name}: ${moduleData.length} modules`);
  }

  return courseModuleMap;
}

function getScenarioTemplates(courseModuleMap) {
  const templates = [];

  function addTemplates(courseName, moduleName, templateArray) {
    const course = courseModuleMap[courseName];
    if (!course) {
      console.warn(`  Warning: course "${courseName}" not found in courseModuleMap`);
      return;
    }
    const moduleId = course.modules[moduleName];
    if (!moduleId) {
      console.warn(`  Warning: module "${moduleName}" not found in course "${courseName}"`);
      return;
    }
    for (const t of templateArray) {
      templates.push({
        organization_id: ORG_ID,
        module_id: moduleId,
        name: t.name,
        category: t.category,
        base_situation: t.base_situation,
        customer_goals: t.customer_goals,
        csr_objectives: t.csr_objectives,
        scoring_focus: t.scoring_focus,
        escalation_triggers: t.escalation_triggers || null,
        deescalation_triggers: t.deescalation_triggers || null,
        resolution_conditions: t.resolution_conditions,
        is_system: false,
        is_active: true,
      });
    }
  }

  // =========================================================================
  // COURSE 1: Service Knowledge Fundamentals
  // =========================================================================

  // --- Module: Home Pest Control (GHP) ---
  addTemplates('Service Knowledge Fundamentals', 'Home Pest Control (GHP)', [
    {
      name: 'New Customer — What Does GHP Cover?',
      category: 'product_knowledge',
      base_situation: 'A new Florida homeowner is calling to ask about basic pest control options. They just moved from up north and are unfamiliar with Florida pests. They want to understand exactly what is and isn\'t covered before committing.',
      customer_goals: 'Understand what pests GHP covers, what the service includes, and how often the technician visits.',
      csr_objectives: 'Explain GHP coverage: ants (excluding BHA and fire ants), spiders, roaches (excluding German), silverfish, earwigs. Describe interior + exterior treatment, quarterly maintenance schedule, and lanai inclusion. Identify upsell opportunities for lawn or mosquito add-ons.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "needs_discovery": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer clearly understands GHP coverage, exclusions, visit frequency, and feels confident about what they\'re getting.',
    },
    {
      name: 'Customer Reports Ants — Is It Covered?',
      category: 'product_knowledge',
      base_situation: 'An existing GHP customer is calling because they have ants in their kitchen. They\'re not sure what type of ants they are and want to know if a service call is covered under their plan.',
      customer_goals: 'Get the ant problem resolved. Understand if this is covered or if there\'s an additional charge.',
      csr_objectives: 'Determine ant type through questioning (size, color, location, mound shape). If regular ants, confirm coverage and check service call eligibility. If BHA or fire ants, explain these require QGG upgrade and present the option.',
      scoring_focus: '{"needs_discovery": 0.35, "product_knowledge": 0.35, "clarity": 0.2, "professionalism": 0.1}',
      escalation_triggers: 'Customer insists all ants should be covered and threatens cancellation.',
      resolution_conditions: 'Ant type is identified. If covered, service call is scheduled or customer is reassured. If not covered, QGG upgrade is presented clearly.',
    },
    {
      name: 'Quarterly Visit — Interior Request',
      category: 'product_knowledge',
      base_situation: 'A GHP customer is calling ahead of their upcoming quarterly service. They want to make sure the technician treats inside the home, not just outside. They\'ve noticed a few live bugs indoors recently.',
      customer_goals: 'Ensure the technician treats the interior of the home during the next quarterly visit.',
      csr_objectives: 'Explain that quarterly GHP service is exterior by default. Interior treatment is available on request when there is live activity. Note the interior request on the account so the technician is prepared. Reassure the customer this is included at no extra cost.',
      scoring_focus: '{"product_knowledge": 0.35, "clarity": 0.3, "customer_service": 0.25, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands exterior-default policy, interior request is noted on the account, and customer is satisfied.',
    },
  ]);

  // --- Module: Lawn Pest Control (SLP/QGG) ---
  addTemplates('Service Knowledge Fundamentals', 'Lawn Pest Control (SLP/QGG)', [
    {
      name: 'Fire Ants in Lawn — SLP vs QGG',
      category: 'product_knowledge',
      base_situation: 'A GHP-only customer is calling about dome-shaped mounds in their yard. Their child was stung yesterday while playing outside. They\'re upset and want this taken care of immediately.',
      customer_goals: 'Get rid of the fire ants in the yard as quickly as possible. Understand why this isn\'t already covered.',
      csr_objectives: 'Identify fire ants from the dome mound description and stinging behavior. Explain GHP covers interior/perimeter pests but not lawn pests like fire ants. Recommend QGG (Quarterly Granular) specifically for fire ant coverage. Present pricing and schedule the upgrade.',
      scoring_focus: '{"product_knowledge": 0.35, "needs_discovery": 0.25, "empathy": 0.2, "sales_technique": 0.2}',
      escalation_triggers: 'Customer is angry their child was stung and demands immediate free service.',
      deescalation_triggers: 'Acknowledge the child\'s safety concern. Express urgency and empathy before transitioning to the solution.',
      resolution_conditions: 'Customer understands GHP vs QGG coverage distinction and either upgrades or has clear next steps.',
    },
    {
      name: 'Grubs Damaging Lawn',
      category: 'product_knowledge',
      base_situation: 'A customer notices brown patches spreading across their St. Augustine lawn. When they pulled up a section, they found white C-shaped larvae underneath. They want All U Need to treat it.',
      customer_goals: 'Stop the lawn damage and eliminate the grubs.',
      csr_objectives: 'Identify the pest as grubs based on the description. Explain that grub treatment is not warrantied and AUN cannot reverse existing lawn damage. Refer the customer to Baton Service Pros at (844) 699-4138 for lawn care and grub treatment. Do NOT schedule a visit.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "empathy": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands grubs are not covered, has Baton referral information, and no unnecessary visit is scheduled.',
    },
  ]);

  // --- Module: Non-Warrantied Pests ---
  addTemplates('Service Knowledge Fundamentals', 'Non-Warrantied Pests', [
    {
      name: 'Pantry Moths — Customer Wants Service Call',
      category: 'product_knowledge',
      base_situation: 'A GHP customer is finding small moths flying around their kitchen and pantry. They\'ve noticed them especially near cereal boxes and flour. They want to schedule a service call to get them treated.',
      customer_goals: 'Eliminate the moths in the kitchen. Expects this is covered under their GHP plan.',
      csr_objectives: 'Identify the issue as pantry pests (Indian meal moths). Explain that pantry pests are not warrantied under GHP and insecticide treatment is not effective — the source must be found and removed. Guide the customer on DIY steps: find and discard the infested product, clean shelves, store dry goods in airtight containers. Do NOT schedule a service visit.',
      scoring_focus: '{"product_knowledge": 0.35, "customer_education": 0.3, "empathy": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer insists on a technician visit and threatens to cancel if they don\'t get one.',
      resolution_conditions: 'Customer understands pantry moths are not warrantied, receives actionable DIY guidance, and no visit is scheduled.',
    },
    {
      name: 'Drywood Termite — Baton Referral',
      category: 'product_knowledge',
      base_situation: 'A customer found small pellet-like droppings (frass) near their windowsill. They looked it up online and think it might be termites. They want to know if their Sentricon system covers this.',
      customer_goals: 'Determine if it\'s termites and get it treated under their existing Sentricon coverage.',
      csr_objectives: 'Distinguish between drywood and subterranean termites based on frass description. Explain that Sentricon targets subterranean termites (underground) and does not cover drywood termites (live inside the wood). Provide Baton Service Pros referral at (844) 699-4138 for drywood termite treatment.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "customer_education": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands the difference between drywood and subterranean termites, knows Sentricon doesn\'t cover drywood, and has Baton referral.',
    },
  ]);

  // =========================================================================
  // COURSE 2: Pricing & Sales
  // =========================================================================

  // --- Module: Quoting New Customers ---
  addTemplates('Pricing & Sales', 'Quoting New Customers', [
    {
      name: 'New Customer — 2800 sq ft Home',
      category: 'sales',
      base_situation: 'A new customer is calling to get a quote for pest control on their 2,800 square foot home. They\'ve been seeing ants and spiders and want to know what it costs to get started.',
      customer_goals: 'Get a clear price quote for pest control service. Understand what\'s included and when they can start.',
      csr_objectives: 'Quote Silver tier for <3,000 sq ft bracket: $150 initial, $45/month. Explain what\'s included (exterior + interior on request, quarterly visits, free service calls). Ask about lawn pest or mosquito concerns to identify Gold or Diamond upsell opportunities.',
      scoring_focus: '{"pricing_accuracy": 0.35, "needs_discovery": 0.25, "sales_technique": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Accurate quote is provided. Customer understands what\'s included. CSR explored upsell opportunities without being pushy.',
    },
    {
      name: 'Facebook Lead — $49 Initial',
      category: 'sales',
      base_situation: 'A customer is calling after seeing an All U Need ad on Facebook with a $49 initial service offer. They want to sign up for pest control and expect to pay the promotional price they saw.',
      customer_goals: 'Sign up for pest control at the $49 promotional rate they saw on Facebook.',
      csr_objectives: 'Recognize this as a lead generation customer — $49 initial applies (not standard $99 or $150). Collect square footage to determine the correct monthly rate. Complete the sign-up process efficiently. Do not upsell aggressively on the first call — focus on getting them started.',
      scoring_focus: '{"pricing_accuracy": 0.35, "process_adherence": 0.3, "customer_service": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer is quoted correctly with $49 initial. Correct monthly rate based on square footage is communicated. Sign-up is initiated.',
    },
  ]);

  // --- Module: Upselling & Bundling ---
  addTemplates('Pricing & Sales', 'Upselling & Bundling', [
    {
      name: 'Silver Customer Wants Lawn Treatment',
      category: 'sales',
      base_situation: 'An existing Silver (GHP) customer calls because they\'re seeing chinch bugs damaging their lawn. They assumed their pest control covered the lawn too. Their lot is approximately 6,000 square feet.',
      customer_goals: 'Get their lawn treated for chinch bugs. Understand why it\'s not already covered.',
      csr_objectives: 'Explain Silver covers perimeter/home pests only, not lawn pests. Present Gold SLP upgrade as the solution. Since they have GHP and lot is <=7,500 sqft, SLP can be paired at $60/quarter. Emphasize the value of bundling vs. standalone lawn treatment.',
      scoring_focus: '{"sales_technique": 0.35, "product_knowledge": 0.3, "needs_discovery": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands the coverage gap. Gold SLP upgrade is presented with the paired discount. Customer makes an informed decision.',
    },
  ]);

  // --- Module: Handling Price Objections ---
  addTemplates('Pricing & Sales', 'Handling Price Objections', [
    {
      name: 'Customer Says Too Expensive',
      category: 'sales',
      base_situation: 'A potential customer with a 3,500 sq ft home was quoted Gold SLP at $190 initial and $70/month. They say it\'s too expensive and are considering a cheaper competitor. They\'re price-sensitive but clearly have a pest problem that needs solving.',
      customer_goals: 'Get pest control at a lower price. Feel like they\'re getting a good deal.',
      csr_objectives: 'Do NOT immediately offer a discount. First, emphasize value: free service calls between visits (normally $150-200 each), full warranty, 30,000+ five-star reviews, 3x Inc. 5000 company. If customer remains resistant after value pitch, present price drop option: $150 initial, $65/month. Never go below $99 initial for any reason.',
      scoring_focus: '{"sales_technique": 0.35, "objection_handling": 0.3, "product_knowledge": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer demands a price lower than the approved drop or asks to speak to a manager about pricing.',
      resolution_conditions: 'CSR leads with value before price drop. If price drop is used, stays within approved limits. Customer either commits or has clear next steps.',
    },
  ]);

  // =========================================================================
  // COURSE 3: Scheduling & Service Call Triage
  // =========================================================================

  // --- Module: Service Call vs. Full Service ---
  addTemplates('Scheduling & Service Call Triage', 'Service Call vs. Full Service', [
    {
      name: 'Customer Due Next Week — Move Up Service',
      category: 'service_triage',
      base_situation: 'A GHP customer is calling about live ants in their kitchen. When you check their account, their next quarterly service is scheduled for 8 days from now. They want someone to come out today.',
      customer_goals: 'Get the ant problem addressed as soon as possible.',
      csr_objectives: 'Recognize that the customer is due within 10 days. Instead of creating a separate service call, move up the scheduled quarterly service to an earlier date. This is more efficient and avoids unnecessary extra visits. Explain to the customer that you\'re moving their regular service up.',
      scoring_focus: '{"process_adherence": 0.35, "efficiency": 0.3, "customer_service": 0.25, "professionalism": 0.1}',
      resolution_conditions: 'Quarterly service is moved up rather than a separate service call being created. Customer is satisfied with the earlier date.',
    },
    {
      name: 'Incomplete Service — CES Not Service Call',
      category: 'service_triage',
      base_situation: 'A customer is calling because the technician came yesterday but couldn\'t access the backyard — the gate was locked and nobody was home. The customer wants to schedule a service call to complete the treatment.',
      customer_goals: 'Get the full service completed since the backyard was missed.',
      csr_objectives: 'Identify this as a CES (Customer Experience Specialist) issue, NOT a free service call. The technician didn\'t have full access, so the service was incomplete — this is different from pests returning between visits. Route through CES/CIS workflow. Do NOT schedule this as a regular service call.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "clarity": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Issue is correctly identified as CES, not a service call. Correct workflow is initiated. Customer understands next steps.',
    },
  ]);

  // --- Module: Avoiding Unnecessary Visits ---
  addTemplates('Scheduling & Service Call Triage', 'Avoiding Unnecessary Visits', [
    {
      name: 'Dead Bugs — Treatment Working',
      category: 'service_triage',
      base_situation: 'A GHP customer had their service 5 days ago and is now finding dead roaches in the kitchen and bathroom. They\'re concerned the treatment isn\'t working because they\'re seeing so many bugs.',
      customer_goals: 'Understand why they\'re seeing dead bugs. Determine if the treatment was done correctly.',
      csr_objectives: 'Reassure the customer: finding dead bugs means the treatment IS working. Non-repellent products take 7-10 days for full effect — bugs are contacting the treated surfaces and dying. This is a sign of success, not failure. Do NOT schedule a service visit. Set the expectation that dead bug sightings will taper off within 2 weeks.',
      scoring_focus: '{"customer_education": 0.35, "empathy": 0.25, "process_adherence": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands dead bugs indicate treatment is working. No unnecessary visit is scheduled. Customer is reassured.',
    },
    {
      name: 'Customer Insists — Always Schedule',
      category: 'service_triage',
      base_situation: 'A GHP customer is calling about 1-2 occasional ants they\'re seeing near the kitchen window. This is normal Florida ant activity. After you explain that a few ants are expected and treatment is working, the customer becomes insistent and threatens to cancel if someone doesn\'t come out.',
      customer_goals: 'Get a technician out to the house. Feels their concern isn\'t being taken seriously.',
      csr_objectives: 'Educate the customer that 1-2 occasional ants is normal in Florida and doesn\'t indicate treatment failure. HOWEVER, if the customer insists or threatens cancellation, ALWAYS schedule the service call. Losing a customer over a service call is never worth it. Schedule the visit and note the account.',
      scoring_focus: '{"customer_retention": 0.35, "empathy": 0.25, "customer_education": 0.2, "process_adherence": 0.2}',
      escalation_triggers: 'Customer threatens cancellation or demands to speak with a manager.',
      deescalation_triggers: 'Validate the customer\'s concern, express willingness to help, and offer to schedule.',
      resolution_conditions: 'CSR attempts education first but schedules the visit when customer insists. Customer is retained. Cancellation is avoided.',
    },
    {
      name: 'Plaster Bagworms — Never Schedule',
      category: 'service_triage',
      base_situation: 'A customer is calling about small cocoon-like cases hanging on their walls and ceiling. They think they\'re some kind of bug and want a technician to come spray for them.',
      customer_goals: 'Get rid of the cocoon cases on the walls.',
      csr_objectives: 'Identify the issue as plaster bagworms based on the description. Explain that plaster bagworms do NOT respond to insecticide treatment — scheduling a visit would be ineffective and waste the customer\'s time. Educate on the real solutions: reduce indoor humidity, increase cleaning frequency (vacuum webs/cases), reduce exterior lighting that attracts moths. This is a firm "do not schedule" situation.',
      scoring_focus: '{"product_knowledge": 0.35, "customer_education": 0.3, "process_adherence": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands plaster bagworms don\'t respond to treatment. Practical DIY advice is provided. No visit is scheduled.',
    },
  ]);

  // =========================================================================
  // COURSE 4: Customer Retention & De-escalation
  // =========================================================================

  // --- Module: Card Decline Handling ---
  addTemplates('Customer Retention & De-escalation', 'Card Decline Handling', [
    {
      name: 'Longstanding Customer — Card Declined',
      category: 'retention',
      base_situation: 'A customer who has been with All U Need for 2 years with 8 completed paid visits is due for service today. The technician is on-site but the card on file was declined when the office tried to process payment.',
      customer_goals: 'Get their scheduled service completed without interruption.',
      csr_objectives: 'Identify this as a longstanding customer (8 visits = well above the 5-visit threshold). Approve the service — do NOT delay or cancel for longstanding customers. Send the longstanding customer card decline template (acknowledges service was completed). Add a note to the account for Accounts Receivable follow-up.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Service is approved. Correct template (longstanding) is identified. AR note is created. Customer experiences no service interruption.',
    },
    {
      name: 'New Customer — Wants to Pay Later',
      category: 'retention',
      base_situation: 'A customer with only 3 completed visits has their card declined. The technician is en route. The customer calls and says they can update their card on Friday (3 days from now) and asks if the tech can still come today.',
      customer_goals: 'Get today\'s service completed and update payment later.',
      csr_objectives: 'Identify this as a new customer (3 visits = under 5-visit threshold, new protocol applies). If allowing pay-later: obtain verbal approval (call is recorded), require signed agreement, get specific payment date, add RED NOTE to the account, and set a reminder for follow-up. Do NOT simply approve and forget — new customer card declines require documentation.',
      scoring_focus: '{"process_adherence": 0.4, "risk_awareness": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'New customer protocol is followed. All required documentation steps are completed or communicated. Payment date is specific and recorded.',
    },
  ]);

  // --- Module: Angry Customer De-escalation ---
  addTemplates('Customer Retention & De-escalation', 'Angry Customer De-escalation', [
    {
      name: 'Tech No-Show — Furious Customer',
      category: 'de_escalation',
      base_situation: 'A customer took a day off work to be home for their scheduled pest control service. The technician never showed up. The customer is furious, threatening to cancel their service and leave a 1-star review on Google.',
      customer_goals: 'Wants acknowledgment of the inconvenience. Wants their service completed immediately. May want compensation.',
      csr_objectives: 'Lead with empathy — acknowledge the wasted day and validate the frustration. Determine if this was an office-booked sale or a door-to-door (D2D) sale, as this affects who handles the follow-up. Apologize sincerely. Offer priority rescheduling. Add DNS (Did Not Service) notes to the account. Do NOT make excuses for the no-show.',
      scoring_focus: '{"empathy": 0.35, "de_escalation": 0.3, "process_adherence": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer demands refund, insists on speaking to a manager, or becomes verbally abusive.',
      deescalation_triggers: 'Sincere apology, acknowledgment of wasted time, immediate action to reschedule with priority.',
      resolution_conditions: 'Customer feels heard. Priority reschedule is arranged. DNS notes are added. Sale source (office vs D2D) is identified for proper follow-up routing.',
    },
    {
      name: 'Bed Bug — 2 Weeks Post-Treatment',
      category: 'de_escalation',
      base_situation: 'A customer had Aprehend bed bug treatment 14 days ago. They\'re still getting bitten at night and are extremely frustrated. They want either a retreatment immediately or a full refund. They feel the treatment failed.',
      customer_goals: 'Stop getting bitten. Get a refund or retreatment. Feels the $1,000 was wasted.',
      csr_objectives: 'Empathize with the frustration and validate the discomfort. Educate on the Aprehend timeline: days 7-21 is when sharp decline begins, full resolution takes 3-6 weeks. Stress that the customer MUST keep sleeping in the treated bed for the treatment to work. Do NOT schedule a retreatment yet — it\'s too early. Ask if the customer used any over-the-counter products like Raid or cleaned the treated areas. If they did, escalate to Operations (these actions compromise the treatment).',
      scoring_focus: '{"empathy": 0.3, "customer_education": 0.3, "de_escalation": 0.25, "process_adherence": 0.15}',
      escalation_triggers: 'Customer used Raid or other OTC products, cleaned treated areas, or demands immediate refund.',
      deescalation_triggers: 'Validate feelings, provide specific timeline data, explain the science behind the treatment working.',
      resolution_conditions: 'Customer understands the treatment timeline. Retreatment is not prematurely scheduled. If OTC products were used, issue is escalated to Operations.',
    },
  ]);

  // =========================================================================
  // COURSE 5: Specialty Service Qualification
  // =========================================================================

  // --- Module: Rodent Qualification ---
  addTemplates('Specialty Service Qualification', 'Rodent Qualification', [
    {
      name: 'Crawlspace Home — Must Decline',
      category: 'qualification',
      base_situation: 'A customer is hearing scratching sounds in their attic at night. They want rodent exclusion service. During the prequalification questions, they mention their home has a crawlspace foundation.',
      customer_goals: 'Get rodent exclusion to stop the scratching in the attic.',
      csr_objectives: 'Run through the full rodent exclusion prequalification checklist. When the customer mentions crawlspace, identify this as a disqualifying factor — crawlspace homes cannot be fully sealed. Explain WHY honestly (too many access points, can\'t guarantee complete seal, wouldn\'t be fair to charge for incomplete work). Suggest bait boxes as an alternative solution.',
      scoring_focus: '{"qualification_accuracy": 0.35, "product_knowledge": 0.3, "empathy": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer is correctly disqualified. Reason is explained clearly and empathetically. Alternative solution (bait boxes) is offered.',
    },
    {
      name: 'Houston Customer — Texas Exclusion',
      category: 'qualification',
      base_situation: 'A customer from Katy, Texas (ZIP 77494) is calling about rodent problems in their attic. They want to schedule rodent exclusion service after finding droppings and hearing noises at night.',
      customer_goals: 'Get rodent exclusion for their Texas home.',
      csr_objectives: 'Identify the location as Texas. Rodent exclusion is not available in Texas — this is a location-based restriction. Explain the limitation clearly. If the customer has exterior-only rodent issues, offer bait boxes as an alternative. Do not attempt to schedule exclusion for Texas locations.',
      scoring_focus: '{"qualification_accuracy": 0.4, "process_adherence": 0.3, "empathy": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Texas exclusion restriction is identified. Customer is informed. Alternative options are presented where applicable.',
    },
    {
      name: 'Qualified Customer — Full Scheduling',
      category: 'qualification',
      base_situation: 'A customer in Fort Myers, Florida has a single-family home on a slab foundation. They\'re hearing rodent activity in the attic and want to discuss exclusion. The home is single-story and not a crawlspace, townhome, or condo.',
      customer_goals: 'Get a quote and schedule rodent exclusion service.',
      csr_objectives: 'Run the full prequalification — single-family, slab, not in Texas, not a crawlspace. Customer qualifies. Quote starting at $1,295+. Explain the full service: entry point sealing, trap installation, 4 trap checks on Monday/Thursday schedule, optional DSV (Attic Sanitization). Payment in full required before service begins. Signed agreement required.',
      scoring_focus: '{"qualification_accuracy": 0.3, "pricing_accuracy": 0.25, "process_adherence": 0.25, "sales_technique": 0.2}',
      resolution_conditions: 'Customer is correctly qualified. Accurate pricing is quoted. Service details are explained including trap check schedule. Payment and agreement requirements are communicated.',
    },
  ]);

  // --- Module: German Roach Qualification ---
  addTemplates('Specialty Service Qualification', 'German Roach Qualification', [
    {
      name: 'Used Refrigerator — Classic Vector',
      category: 'qualification',
      base_situation: 'A customer recently bought a used refrigerator from a neighbor. Within a week, they started seeing small, fast-moving roaches in the kitchen, especially at night. They want pest control to come spray.',
      customer_goals: 'Eliminate the roaches they\'re seeing in the kitchen.',
      csr_objectives: 'Identify German roaches from the description (small, fast, kitchen-concentrated, appeared after used appliance). Ask all 5 prequalification questions. Prequalify at $500 ($400 minimum). Explain the 3-visit protocol spaced 14 days apart — all 3 visits must be booked on this call. Communicate customer prep requirements: clean out all kitchen cabinets, dispose of cardboard boxes, clear under sinks.',
      scoring_focus: '{"qualification_accuracy": 0.3, "needs_discovery": 0.25, "process_adherence": 0.25, "pricing_accuracy": 0.2}',
      resolution_conditions: 'German roaches are correctly identified. All prequalification questions are asked. 3-visit schedule is booked. Customer prep requirements are clearly communicated.',
    },
  ]);

  // --- Module: Bed Bug Qualification ---
  addTemplates('Specialty Service Qualification', 'Bed Bug Qualification', [
    {
      name: 'Customer Already Used Raid',
      category: 'qualification',
      base_situation: 'A customer has confirmed bed bugs — they found live bugs and blood spots on their mattress. Before calling All U Need, they bought Raid bed bug spray and treated the room themselves. They want professional treatment now.',
      customer_goals: 'Get professional bed bug treatment. Already tried DIY and it didn\'t work.',
      csr_objectives: 'Identify the prior Raid use as a failure risk indicator. OTC products like Raid can scatter bed bugs to other rooms and interfere with professional treatments. This situation requires escalation to Operations before quoting or scheduling. Quote $1,000. Explain 4-hour vacate requirement and full payment required before service. Escalate to Operations for approval due to the Raid complication.',
      scoring_focus: '{"qualification_accuracy": 0.35, "risk_awareness": 0.3, "process_adherence": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Prior OTC product use is identified — automatic escalation to Operations.',
      resolution_conditions: 'Raid use is identified and flagged. Case is escalated to Operations. Customer is informed about pricing and requirements pending Operations approval.',
    },
  ]);

  // --- Module: Sentricon Qualification ---
  addTemplates('Specialty Service Qualification', 'Sentricon Qualification', [
    {
      name: 'Spray Foam — New Install Declined',
      category: 'qualification',
      base_situation: 'A homeowner wants to install Sentricon termite protection. During prequalification, they mention their home has spray foam insulation in the walls and around the foundation. They don\'t understand why this would be a problem.',
      customer_goals: 'Get Sentricon installed for termite protection.',
      csr_objectives: 'Identify spray foam insulation as a non-negotiable disqualifier for NEW Sentricon installations. Explain why: spray foam hides termite activity, covers critical inspection points, and traps moisture which can mask or worsen termite damage. This policy is non-negotiable — do NOT approve the installation under any circumstances. Explain clearly and empathetically.',
      scoring_focus: '{"qualification_accuracy": 0.4, "product_knowledge": 0.3, "clarity": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Spray foam is correctly identified as a disqualifier. Installation is declined. Customer understands the reasoning. No exceptions are made.',
    },
    {
      name: 'Sentricon Takeover',
      category: 'qualification',
      base_situation: 'A customer has an existing Sentricon system installed by a different pest control company. They\'re switching to All U Need for their general pest control and want to transfer their Sentricon monitoring as well.',
      customer_goals: 'Transfer their existing Sentricon system to All U Need\'s monitoring and warranty program.',
      csr_objectives: 'Quote the Sentricon takeover at $375. Explain the process: the old provider\'s stations will be uninstalled and new stations installed by AUN. Interior access to the home is required during the service. Payment is required before service. Annual renewal is $375/year. Schedule both the uninstall and new install appointments.',
      scoring_focus: '{"pricing_accuracy": 0.3, "process_adherence": 0.3, "product_knowledge": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Correct takeover pricing is quoted ($375). Process is explained clearly. Payment-before-service requirement is communicated. Both appointments are scheduled.',
    },
  ]);

  // --- Module: TAP Insulation Qualification ---
  addTemplates('Specialty Service Qualification', 'TAP Insulation Qualification', [
    {
      name: 'Customer Wants One Room Only',
      category: 'qualification',
      base_situation: 'A customer is interested in TAP insulation but only wants it installed in their master bedroom area of the attic. They think they can save money by doing just one section rather than the whole attic.',
      customer_goals: 'Get TAP insulation installed in just the master bedroom section. Save money on a partial install.',
      csr_objectives: 'Explain that TAP insulation requires whole-home attic installation — partial attic jobs are not available. The product works as a complete system. Quote the minimum of $2,400. An inspection is required before a final price can be given — schedule the inspection with Ryan. Mention that financing is available for qualified customers.',
      scoring_focus: '{"product_knowledge": 0.35, "process_adherence": 0.3, "clarity": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands whole-home requirement. Minimum pricing is communicated. Inspection is scheduled with Ryan. Financing option is mentioned.',
    },
  ]);

  // =========================================================================
  // COURSE 6: Communication & Documentation
  // =========================================================================

  // --- Module: Text & Voicemail Templates ---
  addTemplates('Communication & Documentation', 'Text & Voicemail Templates', [
    {
      name: 'Card Decline — Select Correct Template',
      category: 'communication',
      base_situation: 'A customer\'s card was declined. The technician is currently on-site completing the service. The customer has 7 completed paid visits (longstanding). You need to send the appropriate card decline notification.',
      customer_goals: 'Resolve the payment issue without service interruption.',
      csr_objectives: 'Identify the customer as longstanding (7 visits, well above 5-visit threshold). Select the LONGSTANDING customer card decline template, which acknowledges that service has been completed. Do NOT use the non-longstanding template (which says the technician is waiting). The distinction matters because longstanding customers get service completed regardless of payment status.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "attention_to_detail": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Correct template (longstanding) is selected. CSR can articulate why the longstanding template is appropriate vs. the non-longstanding template.',
    },
    {
      name: 'Not Home — Determine Correct Template',
      category: 'communication',
      base_situation: 'A GHP quarterly service is scheduled for today. The technician arrives and nobody is home. You need to send the appropriate notification template to the customer.',
      customer_goals: 'Be informed about what happened with their scheduled service.',
      csr_objectives: 'Identify this as a GHP service where nobody is home. Select the "Exterior Completed" template — GHP services can proceed with exterior-only treatment when nobody is home. Do NOT use the "Customer Required" template, which is for services that require the customer to be present (Sentricon interior inspection, German roach prep verification, etc.).',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "attention_to_detail": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Correct template ("Exterior Completed") is selected. CSR understands the distinction between services that can proceed without the customer and those that cannot.',
    },
  ]);

  // --- Module: Service Area Routing ---
  addTemplates('Communication & Documentation', 'Service Area Routing', [
    {
      name: 'ZIP Code to Office Routing',
      category: 'communication',
      base_situation: 'A new customer is calling from ZIP code 33916. They want to schedule pest control service. You need to confirm they\'re in a serviced area and route them to the correct branch office.',
      customer_goals: 'Confirm their area is serviced and get connected to schedule.',
      csr_objectives: 'Identify ZIP 33916 as the Fort Myers service area. Know the dial code (*3011) and local office number: (239) 424-8742. Route the customer correctly. If the ZIP were outside the service area, explain politely and provide the nearest serviced area if applicable.',
      scoring_focus: '{"process_adherence": 0.4, "accuracy": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Correct office (Fort Myers) is identified. Dial code and local number are known. Customer is routed correctly.',
    },
  ]);

  // =========================================================================
  // COURSE 7: Complex Service Coordination
  // =========================================================================

  // --- Module: Initial Service Approval Workflow ---
  addTemplates('Complex Service Coordination', 'Initial Service Approval Workflow', [
    {
      name: 'Agreement Not Signed — Cannot Approve',
      category: 'operations',
      base_situation: 'A technician is on-site for an initial service. The gate is open and the property is accessible, but the customer hasn\'t signed the service agreement yet. The technician is asking for approval to proceed with the treatment.',
      customer_goals: 'Get the initial service completed today.',
      csr_objectives: 'Do NOT approve the service without a signed agreement. The agreement is required before any service can be performed — this is non-negotiable regardless of property access. Attempt to contact the customer to get the agreement signed (phone, text, email). If the customer cannot be reached, the technician must wait or the service must be rescheduled.',
      scoring_focus: '{"process_adherence": 0.45, "risk_awareness": 0.25, "problem_solving": 0.2, "professionalism": 0.1}',
      escalation_triggers: 'Technician pressures to proceed without the agreement. Customer cannot be reached after multiple attempts.',
      resolution_conditions: 'Service is NOT approved without a signed agreement. Attempt to contact the customer is made. If unsuccessful, service is rescheduled.',
    },
  ]);

  // --- Module: Technician No-Show Recovery ---
  addTemplates('Complex Service Coordination', 'Technician No-Show Recovery', [
    {
      name: 'D2D Sale No-Show',
      category: 'operations',
      base_situation: 'A customer signed up through a door-to-door sales rep 3 days ago. Their initial service was scheduled for today but the technician never showed up. The customer is upset and calls in wanting to know what happened.',
      customer_goals: 'Get their service completed. Understand why nobody showed up. Considering cancellation.',
      csr_objectives: 'Identify this as a D2D (door-to-door) sale — the scheduler handles ALL follow-ups for D2D sales, not the original rep. Apologize sincerely for the no-show. Add DNS (Did Not Service) notes to the account. Follow the 3-attempt protocol: attempt 1 is same-day reschedule, attempt 2 is 2-3 days later, attempt 3 is 1 week later. If all 3 attempts fail, cancel as "Initial Appointment Cancelled."',
      scoring_focus: '{"process_adherence": 0.35, "empathy": 0.25, "de_escalation": 0.2, "accuracy": 0.2}',
      escalation_triggers: 'Customer demands to speak to the D2D rep directly. Customer wants immediate cancellation and refund.',
      deescalation_triggers: 'Sincere apology, immediate action to reschedule, clear communication of next steps.',
      resolution_conditions: 'D2D follow-up routing is correctly identified. DNS notes are added. 3-attempt protocol is initiated. Customer is offered same-day reschedule as first attempt.',
    },
  ]);

  // --- Module: BCP — Service During Disruptions ---
  addTemplates('Complex Service Coordination', 'BCP — Service During Disruptions', [
    {
      name: 'Internet Outage — Phones Working',
      category: 'operations',
      base_situation: 'The office internet is down but the phone system is still working. You\'re receiving calls but cannot access customer accounts, the CRM, or scheduling system. Customers are calling with service requests and questions.',
      customer_goals: 'Get their service request handled despite the outage.',
      csr_objectives: 'Switch to the mobile app using BCP binder credentials for limited account access. Use the approved script: "We are experiencing a temporary internet outage..." Document EVERY call manually with: customer name, phone number, callback time, address, reason for call, and urgency level. Use the paper log from the BCP binder. Prioritize urgent calls (active infestations, technician issues) over routine scheduling.',
      scoring_focus: '{"process_adherence": 0.35, "problem_solving": 0.25, "customer_service": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'BCP procedure is followed. Mobile app is used for limited access. All calls are documented with required fields. Customers are informed of the situation professionally.',
    },
  ]);

  return templates;
}

async function seedScenarioTemplates(packageMap, courseModuleMap) {
  const templates = getScenarioTemplates(courseModuleMap);

  if (templates.length === 0) {
    console.log('  No scenario templates generated — check courseModuleMap');
    return;
  }

  const chunkSize = 20;
  let inserted = 0;

  for (let i = 0; i < templates.length; i += chunkSize) {
    const chunk = templates.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('scenario_templates')
      .upsert(chunk, { onConflict: 'organization_id,module_id,name' });

    if (error) {
      console.error(`Failed to seed scenario templates (chunk ${Math.floor(i / chunkSize) + 1}):`, error.message);
      process.exit(1);
    }

    inserted += chunk.length;
  }

  console.log(`  Inserted ${inserted} scenario templates across ${Object.keys(courseModuleMap).length} courses`);
}

// ---------------------------------------------------------------------------
// Print summary stats
// ---------------------------------------------------------------------------
async function printSummary() {
  console.log('\n--- Summary ---');

  const { count: packageCount } = await supabase
    .from('service_packages')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID);

  const { data: pkgIds } = await supabase
    .from('service_packages')
    .select('id')
    .eq('organization_id', ORG_ID);
  const packageIdList = (pkgIds || []).map((p) => p.id);

  let objectionCount = 0;
  let sellingPointCount = 0;
  if (packageIdList.length > 0) {
    const { count: oc } = await supabase
      .from('package_objections')
      .select('*', { count: 'exact', head: true })
      .in('package_id', packageIdList);
    objectionCount = oc || 0;

    const { count: sc } = await supabase
      .from('package_selling_points')
      .select('*', { count: 'exact', head: true })
      .in('package_id', packageIdList);
    sellingPointCount = sc || 0;
  }

  const { count: guidelineCount } = await supabase
    .from('sales_guidelines')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID);

  const { count: profileCount } = await supabase
    .from('customer_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID)
    .eq('is_system', false);

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID);

  const { data: courseIds } = await supabase
    .from('courses')
    .select('id')
    .eq('organization_id', ORG_ID);
  const courseIdList = (courseIds || []).map((c) => c.id);

  let moduleCount = 0;
  if (courseIdList.length > 0) {
    const { count: mc } = await supabase
      .from('course_modules')
      .select('*', { count: 'exact', head: true })
      .in('course_id', courseIdList);
    moduleCount = mc || 0;
  }

  const { count: scenarioCount } = await supabase
    .from('scenario_templates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', ORG_ID);

  const rows = [
    ['service_packages', packageCount || 0],
    ['package_objections', objectionCount],
    ['package_selling_points', sellingPointCount],
    ['sales_guidelines', guidelineCount || 0],
    ['customer_profiles', profileCount || 0],
    ['courses', courseCount || 0],
    ['course_modules', moduleCount],
    ['scenario_templates', scenarioCount || 0],
  ];

  const maxLabel = Math.max(...rows.map(([label]) => label.length));
  for (const [label, count] of rows) {
    console.log(`  ${label.padEnd(maxLabel)}  ${count}`);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== All U Need Pest Control — Seed Script ===\n');

  await verifyOrg();
  await cleanExistingData();

  console.log('\n--- Service Packages ---');
  const packageMap = await seedServicePackages();

  console.log('\n--- Objections & Selling Points ---');
  const objectionMap = await seedObjectionsAndSellingPoints(packageMap);

  console.log('\n--- Sales Guidelines ---');
  await seedSalesGuidelines();

  console.log('\n--- Customer Profiles ---');
  const profileMap = await seedCustomerProfiles();

  console.log('\n--- Courses & Modules ---');
  const courseMap = await seedCoursesAndModules();

  console.log('\n--- Scenario Templates ---');
  await seedScenarioTemplates(packageMap, courseMap);

  await printSummary();

  console.log('\n=== Seed complete ===');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
