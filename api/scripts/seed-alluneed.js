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
  const profileMap = await seedCustomerProfiles();

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
