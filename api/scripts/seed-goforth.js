/**
 * Seed script for Go-Forth Pest Control
 * Populates org-specific training data: packages, profiles, courses, scenarios
 *
 * Usage:
 *   node api/scripts/seed-goforth.js <ORG_ID> [--clean]
 *   node api/scripts/seed-goforth.js --create-org [--clean]
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

const CREATE_ORG = process.argv.includes('--create-org');
const CLEAN = process.argv.includes('--clean');

let ORG_ID = process.argv.find(a => a !== '--clean' && a !== '--create-org' && a !== process.argv[0] && a !== process.argv[1]);

if (!ORG_ID && !CREATE_ORG) {
  console.error('Usage:\n  node api/scripts/seed-goforth.js <ORG_ID> [--clean]\n  node api/scripts/seed-goforth.js --create-org [--clean]');
  process.exit(1);
}

async function createOrg() {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 365);

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Go-Forth Pest Control',
      slug: `go-forth-${Date.now()}`,
      phone: '1-855-957-8263',
      website: 'https://www.go-forth.com',
      subscription_status: 'active',
      subscription_plan: 'professional',
      training_hours_included: 100,
      training_hours_used: 0,
      trial_ends_at: trialEndsAt.toISOString(),
      onboarding_completed: true,
      products_configured: true,
      setup_completed_at: new Date().toISOString(),
      address: '2510 Westchester Dr, High Point, NC 27262',
      services: ['Home Pest Control', 'Lawn Care', 'Termite Control', 'Mosquito Control', 'Bed Bug Treatment', 'Rodent Control', 'Wildlife Removal', 'Crawlspace Moisture Control'],
      guarantees: ['Satisfaction guarantee', 'Free re-treatments between visits', 'Same-day service available', 'Family and pet friendly treatments'],
      value_propositions: ['Serving the Carolinas since 1959', '65+ years of experience', 'Locally owned and operated', 'A+ BBB rating'],
      service_areas: [
        { state: 'NC', offices: ['High Point', 'Greensboro', 'Winston-Salem', 'Charlotte', 'Raleigh', 'Durham', 'Wilmington'] },
        { state: 'SC', offices: ['Columbia', 'Rock Hill', 'Greenville'] }
      ],
      settings: {
        aiModel: 'claude-sonnet-4-20250514',
        customPromptAdditions: 'Go-Forth Pest Control has been serving the Carolinas since 1959. Locally owned and operated for over 65 years. We offer home pest control, lawn care, termite protection, mosquito control, bed bug treatments, rodent control, wildlife removal, and crawlspace services. Toll-free: 1-855-957-8263.',
        scoringWeights: {
          empathyRapport: 20,
          problemResolution: 25,
          productKnowledge: 20,
          professionalism: 15,
          scenarioSpecific: 20
        },
        voicePreferences: {
          defaultVoiceId: '11labs-Brian'
        }
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create organization:', error.message);
    process.exit(1);
  }

  const { error: branchErr } = await supabase
    .from('branches')
    .insert({
      organization_id: org.id,
      name: 'Main Office — High Point',
      is_primary: true,
      timezone: 'America/New_York'
    });

  if (branchErr) {
    console.warn('Branch creation failed (may not have branches table):', branchErr.message);
  }

  console.log(`Created organization: ${org.name}`);
  console.log(`  ID: ${org.id}`);
  console.log(`  Slug: ${org.slug}`);
  return org.id;
}

// ---------------------------------------------------------------------------
// Clean existing data (reverse dependency order)
// ---------------------------------------------------------------------------
async function cleanExistingData() {
  if (!CLEAN) return;

  console.log('--- Cleaning existing data for org ---');

  const { error: e1 } = await supabase
    .from('scenario_templates')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e1) console.error('  Failed to delete scenario_templates:', e1.message);
  else console.log('  Deleted scenario_templates');

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

  const { error: e4 } = await supabase
    .from('courses')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e4) console.error('  Failed to delete courses:', e4.message);
  else console.log('  Deleted courses');

  const { error: e5 } = await supabase
    .from('service_packages')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e5) console.error('  Failed to delete service_packages:', e5.message);
  else console.log('  Deleted service_packages');

  const { error: e6 } = await supabase
    .from('sales_guidelines')
    .delete()
    .eq('organization_id', ORG_ID);
  if (e6) console.error('  Failed to delete sales_guidelines:', e6.message);
  else console.log('  Deleted sales_guidelines');

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
// SERVICE PACKAGES
// ---------------------------------------------------------------------------
const RECURRING_PACKAGES = [
  {
    tier: 'Basic',
    name: 'Home Pest Control',
    internal_prefix: 'basic_pest',
    description: 'Exterior and interior pest protection with quarterly service. Covers common crawling insects around the home.',
    service_frequency: 'quarterly',
    warranty_details: 'Free re-treatments between quarterly visits if pests return.',
    included_pests: ['ants', 'spiders', 'roaches (American)', 'earwigs', 'silverfish', 'crickets', 'centipedes', 'millipedes'],
    included_services: ['exterior perimeter spray', 'interior baseboard treatment', 'web removal', 'entry point treatment'],
    target_customer: 'Homeowners wanting reliable quarterly pest protection',
    brackets: [
      { label: '<2000 sq ft', sqft: '2000', initial: 149, monthly: 40, annual: 629 },
      { label: '2001-3000 sq ft', sqft: '2001_3000', initial: 169, monthly: 45, annual: 709 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 199, monthly: 50, annual: 799 },
      { label: '4001+ sq ft', sqft: '4001_plus', initial: 249, monthly: 55, annual: 909 },
    ],
  },
  {
    tier: 'Premium',
    name: 'Home Pest + Mosquito',
    internal_prefix: 'premium_mosquito',
    description: 'Home pest control plus monthly mosquito treatments. Barrier spray targets adult mosquitoes around the yard.',
    service_frequency: 'quarterly pest + monthly mosquito (seasonal)',
    warranty_details: 'Free re-treatments between visits. Mosquito re-treat available between monthly services.',
    included_pests: ['all Basic pests', 'mosquitoes'],
    included_services: ['exterior perimeter spray', 'interior treatment', 'web removal', 'monthly mosquito barrier spray'],
    target_customer: 'Homeowners with outdoor living spaces wanting mosquito relief',
    brackets: [
      { label: '<2000 sq ft', sqft: '2000', initial: 149, monthly: 75, annual: 1049 },
      { label: '2001-3000 sq ft', sqft: '2001_3000', initial: 169, monthly: 80, annual: 1129 },
      { label: '3001-4000 sq ft', sqft: '3001_4000', initial: 199, monthly: 85, annual: 1219 },
      { label: '4001+ sq ft', sqft: '4001_plus', initial: 249, monthly: 95, annual: 1389 },
    ],
  },
  {
    tier: 'Premium',
    name: 'Home Pest + Lawn Care',
    internal_prefix: 'premium_lawn',
    description: 'Home pest control combined with lawn care treatment program. Covers turf-damaging insects and weeds.',
    service_frequency: 'quarterly pest + lawn care program',
    warranty_details: 'Free re-treatments between visits for both home pest and lawn issues.',
    included_pests: ['all Basic pests', 'fire ants', 'chinch bugs', 'grubs', 'armyworms'],
    included_services: ['exterior perimeter spray', 'interior treatment', 'web removal', 'lawn fertilization', 'weed control', 'fire ant treatment'],
    target_customer: 'Homeowners who want combined pest + lawn care convenience',
    brackets: [
      { label: '<5000 sq ft lawn', sqft: '5000', initial: 149, monthly: 85, annual: 1169 },
      { label: '5001-10000 sq ft lawn', sqft: '5001_10000', initial: 169, monthly: 95, annual: 1309 },
      { label: '10001-15000 sq ft lawn', sqft: '10001_15000', initial: 199, monthly: 110, annual: 1519 },
      { label: '15001+ sq ft lawn', sqft: '15001_plus', initial: 249, monthly: 130, annual: 1809 },
    ],
  },
  {
    tier: 'Complete',
    name: 'Total Home Protection',
    internal_prefix: 'complete_total',
    description: 'Comprehensive package combining home pest control, lawn care, and monthly mosquito service. Maximum home and yard protection.',
    service_frequency: 'quarterly pest + lawn program + monthly mosquito',
    warranty_details: 'Full warranty on all services. Free re-treatments between all scheduled visits.',
    included_pests: ['all Basic pests', 'fire ants', 'chinch bugs', 'grubs', 'armyworms', 'mosquitoes'],
    included_services: ['exterior perimeter spray', 'interior treatment', 'web removal', 'lawn fertilization', 'weed control', 'fire ant treatment', 'monthly mosquito barrier spray'],
    target_customer: 'Homeowners wanting maximum protection for home, lawn, and outdoor living',
    brackets: [
      { label: '<5000 sq ft', sqft: '5000', initial: 149, monthly: 120, annual: 1589 },
      { label: '5001-10000 sq ft', sqft: '5001_10000', initial: 169, monthly: 135, annual: 1789 },
      { label: '10001-15000 sq ft', sqft: '10001_15000', initial: 199, monthly: 155, annual: 2059 },
      { label: '15001+ sq ft', sqft: '15001_plus', initial: 249, monthly: 180, annual: 2409 },
    ],
  },
];

const SPECIALTY_PACKAGES = [
  {
    name: 'Bed Bug Treatment',
    internal_name: 'specialty_bed_bug',
    description: 'Professional bed bug elimination with heat or chemical treatment. Multiple service visits to ensure complete elimination.',
    pricing_model: 'one_time',
    initial_price: 900,
    recurring_price: null,
    service_frequency: 'treatment plan (multiple visits)',
    warranty_details: '60-day warranty from completion of treatment',
    included_pests: ['bed bugs'],
    included_services: ['inspection', 'treatment application', 'follow-up visits'],
    target_customer: 'Homeowners or renters with confirmed bed bug activity',
  },
  {
    name: 'Termite Treatment (Liquid)',
    internal_name: 'specialty_termite_liquid',
    description: 'Liquid termite treatment for active infestations. Creates a chemical barrier around the home foundation.',
    pricing_model: 'one_time',
    initial_price: 1200,
    recurring_price: null,
    service_frequency: 'one-time treatment + annual inspection',
    warranty_details: '1-year warranty with annual renewal option',
    included_pests: ['subterranean termites'],
    included_services: ['full inspection', 'liquid barrier treatment', 'annual inspection'],
    target_customer: 'Homeowners with active termite activity or wanting preventive treatment',
  },
  {
    name: 'Termite Bait Station Install',
    internal_name: 'specialty_termite_bait',
    description: 'Termite baiting system installation around the perimeter. Stations monitor and eliminate termite colonies.',
    pricing_model: 'one_time',
    initial_price: 895,
    recurring_price: null,
    service_frequency: 'one-time install + annual monitoring',
    warranty_details: 'Ongoing warranty with annual renewal. Re-treatment if activity found.',
    included_pests: ['subterranean termites'],
    included_services: ['bait station installation', 'initial inspection', 'annual monitoring'],
    target_customer: 'Homeowners wanting proactive termite protection',
  },
  {
    name: 'Termite Bait Renewal',
    internal_name: 'specialty_termite_renewal',
    description: 'Annual renewal for existing termite bait system. Station inspection, bait replenishment, and continued warranty.',
    pricing_model: 'annual',
    initial_price: null,
    recurring_price: 350,
    service_frequency: 'annual',
    warranty_details: 'Renewed annual warranty with monitoring',
    included_pests: ['subterranean termites'],
    included_services: ['station inspection', 'bait replenishment', 'monitoring report'],
    target_customer: 'Existing bait system customers needing annual renewal',
  },
  {
    name: 'Rodent Control',
    internal_name: 'specialty_rodent',
    description: 'Rodent trapping, exclusion, and monitoring program. Seal entry points and eliminate active rodent populations.',
    pricing_model: 'one_time',
    initial_price: 495,
    recurring_price: null,
    service_frequency: 'initial service + follow-up visits',
    warranty_details: '90-day warranty on exclusion work',
    included_pests: ['rats', 'mice'],
    included_services: ['inspection', 'trapping setup', 'entry point sealing', 'follow-up checks'],
    target_customer: 'Homeowners with active rodent issues',
  },
  {
    name: 'Wildlife Removal',
    internal_name: 'specialty_wildlife',
    description: 'Humane wildlife removal for squirrels, raccoons, opossums, and other nuisance wildlife in attics and crawlspaces.',
    pricing_model: 'one_time',
    initial_price: 350,
    recurring_price: null,
    service_frequency: 'removal + exclusion',
    warranty_details: '1-year warranty on exclusion work',
    included_pests: ['squirrels', 'raccoons', 'opossums', 'bats'],
    included_services: ['wildlife inspection', 'humane trapping/removal', 'entry point exclusion'],
    target_customer: 'Homeowners with wildlife in attics or crawlspaces',
  },
  {
    name: 'Mosquito Standalone',
    internal_name: 'specialty_mosquito_standalone',
    description: 'Monthly mosquito barrier treatment as a standalone service. Targets adult mosquitoes and breeding areas.',
    pricing_model: 'monthly',
    initial_price: null,
    recurring_price: 75,
    service_frequency: 'monthly (seasonal)',
    warranty_details: 'Re-treat between monthly visits if activity returns',
    included_pests: ['mosquitoes'],
    included_services: ['barrier spray on vegetation', 'larvicide treatment', 'standing water assessment'],
    target_customer: 'Homeowners wanting mosquito control without full pest package',
  },
  {
    name: 'Crawlspace Moisture Control',
    internal_name: 'specialty_crawlspace',
    description: 'Crawlspace encapsulation and moisture control to prevent wood rot, mold, and pest entry. Includes vapor barrier installation.',
    pricing_model: 'one_time',
    initial_price: 3500,
    recurring_price: null,
    service_frequency: 'one-time installation',
    warranty_details: 'Manufacturer warranty on materials. Annual inspection recommended.',
    included_pests: ['moisture-related pests', 'wood-destroying organisms'],
    included_services: ['crawlspace inspection', 'vapor barrier installation', 'dehumidifier (optional)', 'vent sealing'],
    target_customer: 'Homeowners with moisture issues, mold, or wood rot in crawlspace',
  },
  {
    name: 'One-Time Pest Treatment',
    internal_name: 'specialty_ots',
    description: 'One-time general pest treatment for homes. Interior and exterior treatment for common household pests.',
    pricing_model: 'one_time',
    initial_price: 199,
    recurring_price: null,
    service_frequency: 'one-time',
    warranty_details: '30-day warranty from date of service',
    included_pests: ['ants', 'spiders', 'roaches (American)', 'earwigs', 'silverfish', 'crickets'],
    included_services: ['interior baseboard treatment', 'exterior perimeter spray', 'web removal'],
    target_customer: 'Homeowners wanting a single treatment without ongoing commitment',
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
        ideal_situations: null,
        is_featured: pkg.tier === 'Complete',
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
      price_display: null,
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
    .insert(rows)
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
  const recurringKeys = Object.keys(packageMap).filter(
    (k) => k.startsWith('basic_') || k.startsWith('premium_') || k.startsWith('complete_')
  );

  const universalObjections = [
    {
      objection_text: "That's too expensive",
      objection_category: 'price',
      frequency: 'very_common',
      recommended_response:
        "I understand wanting to make sure you're getting good value. What our customers find is that the free re-treatments between visits — which normally run $150-200 each — end up saving them more than the plan costs. Plus we back every visit with our satisfaction guarantee. We've been serving the Carolinas since 1959 with an A+ BBB rating, so you can feel confident you're in good hands.",
      response_key_points: [
        'Free re-treatments between visits normally cost $150-200 each',
        'Satisfaction guarantee on every visit',
        'Serving the Carolinas since 1959',
        'A+ BBB rating',
      ],
      alternative_responses: [
        'When you factor in the free re-treatments between visits, most customers actually save money compared to paying per visit.',
        'Our plans are designed so you never have to worry about surprise charges. If pests come back between visits, we come back at no extra cost.',
      ],
      avoid_saying: [
        "We're the cheapest option",
        'You get what you pay for',
      ],
      coaching_tip: 'Focus on total value over the year rather than the monthly number. Calculate the value of 2-3 free re-treatments to make the savings tangible.',
    },
    {
      objection_text: 'My neighbor pays less with another company',
      objection_category: 'competitor',
      frequency: 'common',
      recommended_response:
        "That's a fair comparison to make. The key difference is what's included. Our plan comes with free re-treatments between visits, a full warranty on everything we treat, and interior service any time you request it. Many companies charge extra for those, so while the base price might look lower, the total cost when you need service often ends up higher.",
      response_key_points: [
        'Different coverage levels make direct comparison difficult',
        'Go-Forth includes free re-treatments between visits',
        'Full warranty on all treated pests',
        'Interior service available on request at no extra charge',
      ],
      alternative_responses: [
        "I'd be happy to walk you through exactly what's included so you can make an apples-to-apples comparison.",
        'A lot of our customers actually switched from that kind of plan because they were getting charged extra every time they needed service between visits.',
      ],
      avoid_saying: [
        "That company isn't as good as us",
        'They probably do a bad job',
      ],
      coaching_tip: 'Never badmouth competitors. Focus on what Go-Forth includes and let the customer draw their own conclusions about the value difference.',
    },
    {
      objection_text: 'I need to think about it',
      objection_category: 'stall',
      frequency: 'very_common',
      recommended_response:
        "Absolutely, take whatever time you need — this is your home and it's an important decision. I will mention that pest activity tends to increase the longer it goes untreated, especially here in the Carolinas with our warm, humid climate. If you do decide to move forward, we can typically get you same-day or next-day service so there's no waiting around.",
      response_key_points: [
        'Respect their decision-making process',
        'Pest activity increases when left untreated',
        'Same-day or next-day service available',
        'No pressure — education-based approach',
      ],
      alternative_responses: [
        "Of course. Is there anything specific I can answer that would help with your decision?",
        "No problem at all. Just keep in mind that with Carolina weather, most pest issues get worse before they get better without treatment.",
      ],
      avoid_saying: [
        'This offer expires today',
        "You'll regret waiting",
        "I can only hold this price until...",
      ],
      coaching_tip: 'Create gentle urgency through education about pest behavior, not artificial deadlines.',
    },
  ];

  const objectionRows = [];
  for (const key of recurringKeys) {
    for (const obj of universalObjections) {
      objectionRows.push({
        package_id: packageMap[key],
        ...obj,
      });
    }
  }

  if (objectionRows.length > 0) {
    const { error } = await supabase
      .from('package_objections')
      .insert(objectionRows);

    if (error) {
      console.error('Failed to seed objections:', error.message);
    } else {
      console.log(`  Inserted ${objectionRows.length} package objections`);
    }
  }

  return {};
}

// ---------------------------------------------------------------------------
// seedSalesGuidelines
// ---------------------------------------------------------------------------
async function seedSalesGuidelines() {
  const guidelines = [
    {
      guideline_type: 'pricing_rule',
      title: 'Quoting Guidelines',
      content: 'Always collect square footage (home and/or lawn) before quoting. Use the pricing matrix to quote based on tier and size bracket. Never quote below the listed initial price without manager approval.',
      examples: [
        { scenario: 'New customer, 2500 sq ft home', action: 'Quote Basic at $169 initial + $45/mo' },
        { scenario: 'Customer wants pest + mosquito', action: 'Quote Premium Mosquito at correct bracket' },
      ],
    },
    {
      guideline_type: 'pricing_rule',
      title: 'Same-Day Service',
      content: 'Same-day service is available when scheduling allows. Check the daily route board before confirming. Priority is given to emergency situations (wildlife in home, active infestations with safety concerns).',
      examples: [
        { scenario: 'Customer requests same-day', action: 'Check route availability, confirm if possible' },
      ],
    },
    {
      guideline_type: 'qualification',
      title: 'Termite Treatment Eligibility',
      content: 'All termite quotes require a professional inspection before pricing. Do not quote a final price over the phone — provide the starting price range and schedule the inspection. Bait system installs start at $895. Liquid treatments start at $1,200. Annual renewals are $350.',
      examples: [
        { scenario: 'Customer asking about termites', action: 'Schedule inspection, mention starting price' },
        { scenario: 'Existing bait customer needs renewal', action: 'Quote $350 annual renewal' },
      ],
    },
    {
      guideline_type: 'qualification',
      title: 'Crawlspace Services Pre-Sell',
      content: 'Crawlspace encapsulation requires an in-home inspection before quoting. Minimum price is $3,500. Installation complexity varies by crawlspace size and condition. Schedule the inspection and mention the minimum.',
      examples: [
        { scenario: 'Customer mentions moisture in crawlspace', action: 'Schedule inspection, mention $3,500 minimum' },
        { scenario: 'Customer wants dehumidifier only', action: 'Explain encapsulation is recommended; schedule inspection' },
      ],
    },
    {
      guideline_type: 'process',
      title: 'Service Call Eligibility',
      content: 'A free re-treatment between visits is eligible when: the customer is not due for their next regular visit AND there is an active live pest issue covered under their plan. If pest activity is normal post-treatment (dead bugs, 1-2 occasional pests), educate the customer before scheduling.',
      examples: [
        { scenario: 'Customer seeing ants 3 weeks after visit', action: 'Schedule free re-treatment' },
        { scenario: 'Customer finding dead roaches after service', action: 'Educate — treatment is working, no visit needed' },
      ],
    },
    {
      guideline_type: 'process',
      title: 'Card Decline Protocol',
      content: 'For longstanding customers (5+ completed visits): approve the service and follow up on payment. For newer customers (under 5 visits): collect updated payment before scheduling the next service. Always document the payment issue in the account notes.',
      examples: [
        { scenario: '8 visits completed, card declined', action: 'Approve service, note for follow-up' },
        { scenario: '2 visits completed, card declined', action: 'Collect payment before next service' },
      ],
    },
    {
      guideline_type: 'communication',
      title: 'Approved Product Language',
      content: 'When discussing products and treatments: Say "EPA registered" for product safety. Say "applied per label" for application method. Never say "harmless" or "works instantly." Stick to factual, label-compliant language.',
      examples: [
        { scenario: 'Customer asks if spray is safe', correct: '"Our products are EPA registered and applied per label instructions"' },
        { scenario: 'Customer asks how fast it works', correct: '"You should see a significant reduction within the first few days"' },
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
    .insert(rows);

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
      pain_points: ['Just moved to the Carolinas', 'Unfamiliar with local pests', 'Wants family protection'],
      buying_motivations: ['Protecting family from pests', 'Neighbor recommended Go-Forth', 'Wants proactive prevention'],
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
      buying_motivations: ['Friend referred Go-Forth', 'Wants consistent reliable service', 'Values a company with 65+ years experience'],
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
      buying_motivations: ['Protecting grandchildren from fire ant stings', 'Wants to understand what chemicals are used', 'Safety-first mindset'],
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
      pain_points: ['Roaches appearing after renovation', 'No time for extensive prep', 'Wants fast resolution'],
      buying_motivations: ['Immediate problem needs solving', 'Willing to pay for speed', 'Values no-nonsense approach'],
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
      pain_points: ['Bed bugs after vacation', 'Read conflicting info online', 'Worried about chemical exposure'],
      buying_motivations: ['Wants evidence-based treatment', 'Needs to understand the science', 'Values data and reviews'],
      objection_likelihood: 6,
      close_difficulty: 6,
    },
    {
      name: 'Sandra Williams',
      gender: 'female',
      age_range: '40-49',
      personality_traits: ['loyal', 'reasonable', 'polite'],
      communication_style: 'friendly',
      pain_points: ['Credit card on file was declined', 'Embarrassed', 'Worried about service interruption'],
      buying_motivations: ['Wants to keep service active', 'Values the relationship', 'Willing to resolve payment quickly'],
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
      pain_points: ['Had 3 services and still seeing ants', 'Feels like service is not working', 'Threatening to cancel'],
      buying_motivations: ['Wants immediate resolution', 'Needs to feel heard', 'May retain if given concrete action plan'],
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
      buying_motivations: ['Desperate for relief', 'Needs reassurance treatment is working', 'Will stay if expectations are reset'],
      objection_likelihood: 8,
      close_difficulty: 7,
    },
    {
      name: 'Gary Lawson',
      gender: 'male',
      age_range: '40-49',
      personality_traits: ['DIY mindset', 'distrustful', 'stubborn'],
      communication_style: 'guarded',
      pain_points: ['Tried DIY pest control for months', 'Problem has gotten worse', 'Reluctant to pay a professional'],
      buying_motivations: ['DIY has failed', 'Needs to save face while accepting help', 'Responds to expertise and credentials'],
      objection_likelihood: 8,
      close_difficulty: 7,
    },
    {
      name: 'Karen Mitchell',
      gender: 'female',
      age_range: '50-59',
      personality_traits: ['demanding', 'entitled', 'vocal'],
      communication_style: 'confrontational',
      pain_points: ['Technician no-showed for appointment', 'Took a day off work', 'Wants compensation'],
      buying_motivations: ['Wants to feel valued', 'Needs acknowledgment of inconvenience', 'May accept service credit'],
      objection_likelihood: 9,
      close_difficulty: 8,
    },
    {
      name: 'James Wright',
      gender: 'male',
      age_range: '35-44',
      personality_traits: ['stubborn', 'insistent', 'skeptical'],
      communication_style: 'direct',
      pain_points: ['Wants termite treatment but home has issues', 'Another company told him they could do it', 'Frustrated by limitations'],
      buying_motivations: ['Desperate to solve the problem', 'Will respect honesty', 'May accept alternatives'],
      objection_likelihood: 7,
      close_difficulty: 8,
    },
    {
      name: 'Betty Thompson',
      gender: 'female',
      age_range: '65-74',
      personality_traits: ['frugal', 'suspicious', 'set in her ways'],
      communication_style: 'guarded',
      pain_points: ['Been with another company for 20 years', 'Comparing prices', 'Suspicious of new companies'],
      buying_motivations: ['Looking for better value but afraid of change', 'Responds to trustworthiness', 'Needs social proof'],
      objection_likelihood: 8,
      close_difficulty: 9,
    },
    {
      name: 'Miguel Torres',
      gender: 'male',
      age_range: '30-39',
      personality_traits: ['frustrated', 'embarrassed', 'private'],
      communication_style: 'emotional',
      pain_points: ['Roaches in apartment', 'Landlord won\'t help', 'Wants discretion'],
      buying_motivations: ['Desperate to solve the problem', 'Values discretion', 'Budget-conscious but willing to pay for results'],
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
    .insert(rows)
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
// seedCoursesAndModules — 7 Courses
// ---------------------------------------------------------------------------
async function seedCoursesAndModules() {
  const COURSES = [
    {
      name: 'Service Knowledge Fundamentals',
      description: 'Core knowledge of Go-Forth pest control services, treatment types, covered pests, and service terminology.',
      category: 'product_knowledge',
      icon: '🏠',
      badge_name: 'Service Expert',
      badge_icon: '🎓',
      display_order: 1,
      modules: [
        { name: 'Home Pest Control Basics', description: 'General home pest service coverage, included pests, treatment methods, and warranty details.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
        { name: 'Lawn Care Program', description: 'Lawn care service offerings including fertilization, weed control, fire ant treatment, and turf pest management.', difficulty: 'easy', scenario_count: 8, pass_threshold: 65 },
        { name: 'Specialty Services Overview', description: 'Overview of all specialty services including bed bugs, termite treatment, rodent control, wildlife removal, and crawlspace services.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Non-Covered Pests', description: 'Identifying and explaining pests not covered under standard plans — bed bugs, termites, rodents, and other specialty-only pests.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Service Terminology', description: 'Key terminology and abbreviations used at Go-Forth — re-treatment, service call, initial service, recurring service, and more.', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 },
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
        { name: 'Package Tiers (Basic → Premium → Complete)', description: 'Understanding and presenting the three package tiers, what each includes, and when to recommend each level.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Upselling & Bundling', description: 'Techniques for upgrading customers from Basic to Premium or Complete, and bundling add-on services.', difficulty: 'hard', scenario_count: 12, pass_threshold: 55 },
        { name: 'Handling Price Objections', description: 'Responding to price concerns with value-based selling and competitive positioning.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
        { name: 'Specialty Service Sales', description: 'Selling specialty services — bed bug treatment, termite protection, rodent control, wildlife removal, crawlspace services, and more.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
      ],
    },
    {
      name: 'Scheduling & Service Call Triage',
      description: 'Efficiently booking services, triaging re-treatment calls vs. full services, and managing scheduling workflows.',
      category: 'customer_service',
      icon: '📋',
      badge_name: 'Scheduling Expert',
      badge_icon: '📅',
      display_order: 3,
      modules: [
        { name: 'Booking Initial Services', description: 'Scheduling first-time services including same-day requests and service area confirmation.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
        { name: 'Re-Treatment vs. Regular Service', description: 'Determining when a customer needs a free re-treatment vs. waiting for their next regular service visit.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Avoiding Unnecessary Visits', description: 'Educating customers on normal post-treatment activity, expected timelines, and when to wait vs. schedule.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Rescheduling & Follow-Up', description: 'Handling reschedule requests, missed appointments, and proactive follow-up communication.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Multi-Visit Scheduling', description: 'Coordinating multi-visit treatments like bed bug and rodent exclusion service schedules.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
      ],
    },
    {
      name: 'Customer Retention & De-escalation',
      description: 'Retaining customers through payment handling, cancellation saves, and de-escalation techniques.',
      category: 'retention',
      icon: '🛡️',
      badge_name: 'Retention Champion',
      badge_icon: '💎',
      display_order: 4,
      modules: [
        { name: 'Card Decline Handling', description: 'Following card decline protocols for longstanding vs. new customers and payment follow-up.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
        { name: 'Seasonal Hold Management', description: 'Managing seasonal holds, snowbird accounts, and service pause requests per company policy.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Cancellation Saves', description: 'Techniques for saving customers who want to cancel — identifying root cause, offering solutions, and knowing when to let go.', difficulty: 'hard', scenario_count: 12, pass_threshold: 50 },
        { name: 'Access Issues & Not-Home', description: 'Handling locked gates, no-access situations, and customers who are not home during scheduled service.', difficulty: 'easy', scenario_count: 8, pass_threshold: 70 },
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
        { name: 'Rodent Control Qualification', description: 'Qualifying homes for rodent services — extent of activity, entry points, trapping vs. exclusion.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
        { name: 'Termite Treatment Qualification', description: 'Pre-qualifying termite treatments — identifying subterranean vs. drywood, scheduling inspections, explaining treatment options.', difficulty: 'hard', scenario_count: 10, pass_threshold: 60 },
        { name: 'Bed Bug Qualification', description: 'Qualifying bed bug treatments — confirming activity, setting timeline expectations, and explaining the treatment process.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
        { name: 'Wildlife Removal Qualification', description: 'Qualifying wildlife jobs — species identification, safety concerns, humane removal process, and exclusion.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Crawlspace Service Qualification', description: 'Pre-selling crawlspace encapsulation — inspection scheduling, moisture indicators, and pricing guidance.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
      ],
    },
    {
      name: 'Communication & Documentation',
      description: 'Professional call handling, templates, documentation, and service area routing.',
      category: 'customer_service',
      icon: '📝',
      badge_name: 'Communication Pro',
      badge_icon: '✍️',
      display_order: 6,
      modules: [
        { name: 'Professional Call Handling', description: 'Greeting, tone, call flow, hold procedures, and professional closing techniques.', difficulty: 'easy', scenario_count: 6, pass_threshold: 70 },
        { name: 'Follow-Up Templates', description: 'Using approved text and voicemail templates for payment follow-ups, scheduling confirmations, and service reminders.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Account Documentation', description: 'Creating clear, actionable notes in the CRM for technicians, billing, and management follow-up.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Service Area Routing', description: 'Confirming service areas across NC and SC, routing customers to correct branches, and handling out-of-area requests.', difficulty: 'easy', scenario_count: 6, pass_threshold: 75 },
      ],
    },
    {
      name: 'Complex Service Coordination',
      description: 'Managing multi-step service workflows, approvals, technician issues, and business continuity.',
      category: 'advanced',
      icon: '⚙️',
      badge_name: 'Operations Expert',
      badge_icon: '🔧',
      display_order: 7,
      modules: [
        { name: 'Initial Service Workflow', description: 'Processing initial service approvals including payment verification, scheduling, and technician assignment.', difficulty: 'medium', scenario_count: 8, pass_threshold: 65 },
        { name: 'Recurring Service Management', description: 'Managing recurring service workflows, auto-pay verification, and service continuation.', difficulty: 'medium', scenario_count: 8, pass_threshold: 60 },
        { name: 'Technician No-Show Recovery', description: 'Handling missed technician appointments — customer communication, rescheduling, compensation, and escalation.', difficulty: 'hard', scenario_count: 10, pass_threshold: 55 },
        { name: 'Post-Treatment Follow-Up', description: 'Following up after specialty treatments to set expectations, check satisfaction, and schedule next steps.', difficulty: 'medium', scenario_count: 10, pass_threshold: 60 },
        { name: 'Service During Disruptions', description: 'Business continuity procedures during weather events, system outages, and other disruptions.', difficulty: 'medium', scenario_count: 6, pass_threshold: 60 },
      ],
    },
  ];

  const courseModuleMap = {};

  for (const course of COURSES) {
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
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
      })
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
      .insert(moduleRows)
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

// ---------------------------------------------------------------------------
// getScenarioTemplates
// ---------------------------------------------------------------------------
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

  addTemplates('Service Knowledge Fundamentals', 'Home Pest Control Basics', [
    {
      name: 'New Customer — What Does Pest Control Cover?',
      category: 'product_knowledge',
      base_situation: 'A new homeowner in Charlotte is calling to ask about basic pest control options. They just moved from up north and are unfamiliar with Carolina pests. They want to understand what is and isn\'t covered.',
      customer_goals: 'Understand what pests are covered, what the service includes, and how often the technician visits.',
      csr_objectives: 'Explain Basic Home Pest coverage: ants, spiders, roaches (American), silverfish, earwigs, crickets, centipedes, millipedes. Describe interior + exterior treatment and quarterly visit schedule. Identify upsell opportunities for lawn care or mosquito add-ons.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "needs_discovery": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer clearly understands coverage, exclusions, visit frequency, and feels confident about what they\'re getting.',
    },
    {
      name: 'Customer Reports Ants — Is It Covered?',
      category: 'product_knowledge',
      base_situation: 'An existing pest control customer is calling because they have ants in their kitchen. They\'re not sure what type of ants they are and want to know if a re-treatment is covered under their plan.',
      customer_goals: 'Get the ant problem resolved. Understand if this is covered or if there\'s an additional charge.',
      csr_objectives: 'Determine ant type through questioning (size, color, location, mound shape). If common household ants, confirm coverage and check re-treatment eligibility. If fire ants in the yard, explain these require the lawn care add-on or Premium tier.',
      scoring_focus: '{"needs_discovery": 0.35, "product_knowledge": 0.35, "clarity": 0.2, "professionalism": 0.1}',
      escalation_triggers: 'Customer insists all ants should be covered and threatens cancellation.',
      resolution_conditions: 'Ant type is identified. If covered, re-treatment is scheduled. If not covered, upgrade options are presented clearly.',
    },
    {
      name: 'Interior Treatment Request',
      category: 'product_knowledge',
      base_situation: 'A customer is calling ahead of their upcoming quarterly service. They want to make sure the technician treats inside the home, not just outside. They\'ve noticed a few live bugs indoors.',
      customer_goals: 'Ensure the technician treats the interior during the next visit.',
      csr_objectives: 'Explain that quarterly service includes both exterior and interior. Note the specific interior request on the account so the technician is prepared. Reassure the customer this is included at no extra cost.',
      scoring_focus: '{"product_knowledge": 0.35, "clarity": 0.3, "customer_service": 0.25, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands interior service is included, request is noted on the account, and customer is satisfied.',
    },
  ]);

  addTemplates('Service Knowledge Fundamentals', 'Lawn Care Program', [
    {
      name: 'Fire Ants in Lawn — What\'s Covered?',
      category: 'product_knowledge',
      base_situation: 'A Basic pest control customer is calling about fire ant mounds in their yard. Their child was stung yesterday. They\'re upset and want this taken care of immediately.',
      customer_goals: 'Get rid of the fire ants as quickly as possible. Understand why this isn\'t already covered.',
      csr_objectives: 'Identify fire ants from the mound description. Explain Basic Home Pest covers interior/perimeter pests but not lawn pests like fire ants. Recommend the Premium Lawn tier or standalone lawn care program for fire ant coverage. Present pricing and schedule the upgrade.',
      scoring_focus: '{"product_knowledge": 0.35, "needs_discovery": 0.25, "empathy": 0.2, "sales_technique": 0.2}',
      escalation_triggers: 'Customer is angry their child was stung and demands immediate free service.',
      deescalation_triggers: 'Acknowledge the child\'s safety concern first before transitioning to the solution.',
      resolution_conditions: 'Customer understands coverage distinction and either upgrades or has clear next steps.',
    },
    {
      name: 'Lawn Damage — Weed and Feed Questions',
      category: 'product_knowledge',
      base_situation: 'A customer notices weeds spreading across their lawn. They want to know if Go-Forth can help with lawn care in addition to their existing pest control.',
      customer_goals: 'Get professional lawn care including weed control and fertilization.',
      csr_objectives: 'Explain Go-Forth\'s lawn care program — includes fertilization, weed control, fire ant treatment, and turf pest management. Present the Premium Lawn tier as a bundled option or standalone lawn care. Explain the seasonal treatment schedule.',
      scoring_focus: '{"product_knowledge": 0.4, "sales_technique": 0.3, "clarity": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands lawn care offerings and has a clear path to sign up.',
    },
  ]);

  addTemplates('Service Knowledge Fundamentals', 'Non-Covered Pests', [
    {
      name: 'Pantry Moths — Customer Wants Service Call',
      category: 'product_knowledge',
      base_situation: 'A customer is finding small moths in their kitchen and pantry, especially near cereal boxes and flour. They want to schedule a service call.',
      customer_goals: 'Eliminate the moths in the kitchen. Expects this is covered.',
      csr_objectives: 'Identify the issue as pantry pests (Indian meal moths). Explain that pantry pests are not covered under standard plans and treatment is not effective — the source must be found and removed. Guide the customer on DIY steps: find and discard infested products, clean shelves, store dry goods in airtight containers. Do NOT schedule a visit.',
      scoring_focus: '{"product_knowledge": 0.35, "customer_education": 0.3, "empathy": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer insists on a visit and threatens to cancel.',
      resolution_conditions: 'Customer understands pantry moths are not covered, receives DIY guidance, and no unnecessary visit is scheduled.',
    },
    {
      name: 'Drywood Termites vs. Subterranean',
      category: 'product_knowledge',
      base_situation: 'A customer found small pellet-like droppings near their windowsill. They looked it up online and think it might be termites. They want to know if their termite bait system covers this.',
      customer_goals: 'Determine if it\'s termites and get it treated.',
      csr_objectives: 'Distinguish between drywood and subterranean termites based on the frass description. Explain that bait systems target subterranean termites and do not cover drywood termites. Drywood termites require a different treatment approach — schedule an inspection to confirm and provide treatment options.',
      scoring_focus: '{"product_knowledge": 0.4, "clarity": 0.3, "customer_education": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer understands the difference between termite types and an inspection is scheduled.',
    },
  ]);

  // =========================================================================
  // COURSE 2: Pricing & Sales
  // =========================================================================

  addTemplates('Pricing & Sales', 'Quoting New Customers', [
    {
      name: 'New Customer — 2500 sq ft Home',
      category: 'sales',
      base_situation: 'A new customer is calling to get a quote for pest control on their 2,500 square foot home in Greensboro. They\'ve been seeing ants and spiders.',
      customer_goals: 'Get a clear price quote for pest control service.',
      csr_objectives: 'Quote Basic tier for 2001-3000 sq ft bracket: $169 initial, $45/month. Explain what\'s included (exterior + interior, quarterly visits, free re-treatments). Ask about lawn or mosquito concerns to identify Premium or Complete upsell opportunities.',
      scoring_focus: '{"pricing_accuracy": 0.35, "needs_discovery": 0.25, "sales_technique": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Accurate quote is provided. Customer understands what\'s included. Upsell explored naturally.',
    },
    {
      name: 'Customer Wants Pest + Lawn Bundle',
      category: 'sales',
      base_situation: 'A customer with a 7,000 sq ft lawn in Raleigh wants both pest control and lawn care. They want to know the total cost for a combined plan.',
      customer_goals: 'Get pricing for a combined pest + lawn care package.',
      csr_objectives: 'Quote Premium Lawn tier for 5001-10000 sq ft: $169 initial, $95/month. Explain the bundled value vs. purchasing separately. Highlight included services: home pest control, fertilization, weed control, and fire ant treatment. If they mention mosquitoes, present the Complete tier.',
      scoring_focus: '{"pricing_accuracy": 0.35, "sales_technique": 0.3, "product_knowledge": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer receives accurate bundled pricing and understands the value of combining services.',
    },
  ]);

  addTemplates('Pricing & Sales', 'Upselling & Bundling', [
    {
      name: 'Basic Customer Mentions Mosquitoes',
      category: 'sales',
      base_situation: 'An existing Basic pest control customer calls to schedule their quarterly service and casually mentions they can\'t enjoy their porch because of mosquitoes. They have a nice backyard with a pool.',
      customer_goals: 'Schedule regular service. Get advice on mosquito issue.',
      csr_objectives: 'Schedule the regular service first. Then naturally pivot to the mosquito concern. Present the Premium Mosquito upgrade — explain the monthly barrier treatment, how it targets mosquitoes around their pool and porch area. Frame it around their lifestyle (outdoor entertaining, pool, kids). Avoid hard-sell tactics.',
      scoring_focus: '{"sales_technique": 0.35, "active_listening": 0.3, "needs_discovery": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Regular service is scheduled. Mosquito upgrade is presented naturally. Customer makes an informed decision.',
    },
  ]);

  addTemplates('Pricing & Sales', 'Handling Price Objections', [
    {
      name: 'Customer Says Too Expensive',
      category: 'sales',
      base_situation: 'A potential customer was quoted Premium Lawn at $95/month. They say it\'s too expensive and are considering a cheaper competitor.',
      customer_goals: 'Get pest and lawn service at a lower price.',
      csr_objectives: 'Lead with value first: free re-treatments (normally $150-200 each), satisfaction guarantee, 65+ years serving the Carolinas, A+ BBB rating. Explain the convenience of bundling pest + lawn with one company. Only if needed, discuss adjusting the plan — dropping to Basic pest + standalone lawn care if budget is the primary concern.',
      scoring_focus: '{"sales_technique": 0.35, "objection_handling": 0.3, "product_knowledge": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer demands a price match or asks to speak to a manager.',
      resolution_conditions: 'Value is presented before any price adjustment. Customer either commits or has clear next steps.',
    },
  ]);

  // =========================================================================
  // COURSE 3: Scheduling & Service Call Triage
  // =========================================================================

  addTemplates('Scheduling & Service Call Triage', 'Re-Treatment vs. Regular Service', [
    {
      name: 'Customer Due Next Week — Move Up Service',
      category: 'service_triage',
      base_situation: 'A customer is calling about live ants in their kitchen. Their next quarterly service is scheduled for 8 days from now. They want someone to come out today.',
      customer_goals: 'Get the ant problem addressed ASAP.',
      csr_objectives: 'Recognize the customer is due within 10 days. Instead of a separate re-treatment, move up the scheduled quarterly service. This is more efficient. Explain you\'re moving their regular service up.',
      scoring_focus: '{"process_adherence": 0.35, "efficiency": 0.3, "customer_service": 0.25, "professionalism": 0.1}',
      resolution_conditions: 'Quarterly service is moved up. Customer is satisfied with the earlier date.',
    },
    {
      name: 'Incomplete Service — Tech Had No Access',
      category: 'service_triage',
      base_situation: 'A customer is calling because the technician came yesterday but couldn\'t access the backyard — the gate was locked and nobody was home. They want to schedule a re-treatment.',
      customer_goals: 'Get the full service completed.',
      csr_objectives: 'Identify this as an access issue, NOT a pest recurrence. The technician didn\'t complete the service — this requires rescheduling the incomplete service, not a re-treatment. Schedule the completion visit and note the access situation on the account.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "clarity": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Issue is correctly identified. Completion visit is scheduled. Access notes are added to the account.',
    },
  ]);

  addTemplates('Scheduling & Service Call Triage', 'Avoiding Unnecessary Visits', [
    {
      name: 'Dead Bugs — Treatment Working',
      category: 'service_triage',
      base_situation: 'A customer had their service 5 days ago and is finding dead roaches in the kitchen and bathroom. They\'re concerned the treatment isn\'t working.',
      customer_goals: 'Understand why they\'re seeing dead bugs.',
      csr_objectives: 'Reassure: finding dead bugs means the treatment IS working. Non-repellent products take 7-10 days for full effect. This is a sign of success. Do NOT schedule a visit. Set expectation that dead bugs taper off within 2 weeks.',
      scoring_focus: '{"customer_education": 0.35, "empathy": 0.25, "process_adherence": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands dead bugs = treatment working. No unnecessary visit scheduled.',
    },
    {
      name: 'Customer Insists — Always Schedule',
      category: 'service_triage',
      base_situation: 'A customer is calling about 1-2 occasional ants near the kitchen window. After explanation, they become insistent and threaten to cancel.',
      customer_goals: 'Get a technician out. Feels their concern isn\'t being taken seriously.',
      csr_objectives: 'Educate that 1-2 ants is normal. HOWEVER, if the customer insists or threatens cancellation, ALWAYS schedule the re-treatment. Losing a customer over a service call is never worth it.',
      scoring_focus: '{"customer_retention": 0.35, "empathy": 0.25, "customer_education": 0.2, "process_adherence": 0.2}',
      escalation_triggers: 'Customer threatens cancellation.',
      deescalation_triggers: 'Validate concern, express willingness to help, offer to schedule.',
      resolution_conditions: 'Education attempted first but visit scheduled when customer insists. Customer retained.',
    },
  ]);

  // =========================================================================
  // COURSE 4: Customer Retention & De-escalation
  // =========================================================================

  addTemplates('Customer Retention & De-escalation', 'Card Decline Handling', [
    {
      name: 'Longstanding Customer — Card Declined',
      category: 'retention',
      base_situation: 'A customer who has been with Go-Forth for 2 years with 8 completed visits is due for service today. The card on file was declined.',
      customer_goals: 'Get their service completed.',
      csr_objectives: 'Identify as longstanding customer (8 visits = above 5-visit threshold). Approve the service — do NOT delay for longstanding customers. Document the payment issue for billing follow-up.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Service is approved. Payment issue documented. Customer has no service interruption.',
    },
    {
      name: 'New Customer — Wants to Pay Later',
      category: 'retention',
      base_situation: 'A customer with only 3 completed visits has their card declined. The technician is en route. The customer says they can update their card on Friday.',
      customer_goals: 'Get today\'s service and update payment later.',
      csr_objectives: 'Identify as new customer (3 visits = under 5-visit threshold). Collect updated payment information before service can proceed. If customer can\'t provide payment now, offer to reschedule for Friday when payment is ready. Document everything.',
      scoring_focus: '{"process_adherence": 0.4, "risk_awareness": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'New customer protocol followed. Payment situation resolved or service rescheduled.',
    },
  ]);

  addTemplates('Customer Retention & De-escalation', 'Cancellation Saves', [
    {
      name: 'Competitor Mailer — Price Comparison',
      category: 'retention',
      base_situation: 'A customer of 3 years wants to cancel because they received a competitor mailer offering lower pricing. They\'ve been happy with Go-Forth but want to save money.',
      customer_goals: 'Cancel service to save money, unless given a reason to stay.',
      csr_objectives: 'Acknowledge loyalty. Ask what the competitor is offering. Compare what\'s included (many competitors charge for re-treatments, don\'t include interior, or have limited warranties). Emphasize Go-Forth\'s 65+ years, satisfaction guarantee, and included re-treatments. If needed, discuss plan options that might lower their monthly cost.',
      scoring_focus: '{"retention_technique": 0.35, "empathy": 0.25, "value_articulation": 0.25, "professionalism": 0.15}',
      escalation_triggers: 'Customer is firm on cancellation and doesn\'t want to negotiate.',
      deescalation_triggers: 'Acknowledge loyalty, listen without being defensive, present genuine value.',
      resolution_conditions: 'Customer either stays or cancellation is processed respectfully with the door left open.',
    },
  ]);

  addTemplates('Customer Retention & De-escalation', 'Angry Customer De-escalation', [
    {
      name: 'Tech No-Show — Furious Customer',
      category: 'de_escalation',
      base_situation: 'A customer took a day off work for their scheduled service. The technician never showed. The customer is furious and threatening to cancel and leave a negative review.',
      customer_goals: 'Acknowledgment of the inconvenience. Service completed ASAP. Possible compensation.',
      csr_objectives: 'Lead with empathy — acknowledge the wasted day. Apologize sincerely. Offer priority rescheduling for the next available slot. Document the no-show. Do NOT make excuses.',
      scoring_focus: '{"empathy": 0.35, "de_escalation": 0.3, "process_adherence": 0.2, "professionalism": 0.15}',
      escalation_triggers: 'Customer demands refund or insists on speaking to a manager.',
      deescalation_triggers: 'Sincere apology, acknowledgment of wasted time, immediate action.',
      resolution_conditions: 'Customer feels heard. Priority reschedule arranged. No-show documented.',
    },
    {
      name: 'Bed Bug — 2 Weeks Post-Treatment',
      category: 'de_escalation',
      base_situation: 'A customer had bed bug treatment 14 days ago. They\'re still getting bitten and are extremely frustrated. They want either a retreatment or a full refund.',
      customer_goals: 'Stop getting bitten. Get a refund or retreatment.',
      csr_objectives: 'Empathize with frustration. Educate on treatment timeline: most treatments require multiple weeks for full resolution. Stress following all post-treatment instructions (don\'t disturb treated areas). If customer used over-the-counter products, note this as it may interfere with professional treatment. Schedule a follow-up inspection if within warranty period.',
      scoring_focus: '{"empathy": 0.3, "customer_education": 0.3, "de_escalation": 0.25, "process_adherence": 0.15}',
      escalation_triggers: 'Customer used OTC products or demands immediate refund.',
      deescalation_triggers: 'Validate feelings, provide specific timeline data, explain the process.',
      resolution_conditions: 'Customer understands timeline. Appropriate next step (follow-up or inspection) is scheduled.',
    },
  ]);

  // =========================================================================
  // COURSE 5: Specialty Service Qualification
  // =========================================================================

  addTemplates('Specialty Service Qualification', 'Rodent Control Qualification', [
    {
      name: 'Attic Noises — Rodent vs. Wildlife',
      category: 'qualification',
      base_situation: 'A customer is hearing scratching in their attic at night. They\'re not sure if it\'s mice, rats, or something else. They want someone to come out.',
      customer_goals: 'Identify what\'s in the attic and get it removed.',
      csr_objectives: 'Ask qualifying questions: When do they hear noises? (Night = rodents, day = squirrels). What does it sound like? (Scratching/running = rodents, thumping = wildlife). Have they found droppings? (Size indicates rat vs. mouse vs. wildlife). Based on answers, route to rodent control or wildlife removal. Schedule the appropriate inspection.',
      scoring_focus: '{"qualification_accuracy": 0.35, "needs_discovery": 0.3, "product_knowledge": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Correct service type identified. Inspection scheduled.',
    },
    {
      name: 'Rat Problem — Exclusion Discussion',
      category: 'qualification',
      base_situation: 'A customer found rat droppings in their garage and kitchen. They want the problem solved permanently, not just trapping.',
      customer_goals: 'Permanent rodent solution. Understand their options.',
      csr_objectives: 'Explain the two-phase approach: 1) Trapping to eliminate active rodents, 2) Exclusion to seal entry points and prevent re-entry. Quote rodent control starting at $495. Explain follow-up visits are included. An inspection is needed to determine the full scope of exclusion work.',
      scoring_focus: '{"product_knowledge": 0.35, "qualification_accuracy": 0.3, "clarity": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands trapping + exclusion approach. Inspection is scheduled.',
    },
  ]);

  addTemplates('Specialty Service Qualification', 'Termite Treatment Qualification', [
    {
      name: 'Active Termites — Treatment Options',
      category: 'qualification',
      base_situation: 'A homeowner found what they believe are termite swarmers in their bathroom. They\'re panicked and want to know their treatment options and costs.',
      customer_goals: 'Understand treatment options and get started ASAP.',
      csr_objectives: 'Calm the customer. Explain that an inspection is required before quoting — every home is different. Describe the two main options: liquid barrier treatment (starts at $1,200) and bait station system (starts at $895). Both include warranties. Schedule the inspection as soon as possible.',
      scoring_focus: '{"product_knowledge": 0.35, "qualification_accuracy": 0.25, "empathy": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands both options. Inspection is scheduled. Customer feels calm and informed.',
    },
    {
      name: 'Bait System Renewal Customer',
      category: 'qualification',
      base_situation: 'An existing termite bait customer is due for their annual renewal. They\'re not sure if they still need it and are considering letting it lapse.',
      customer_goals: 'Decide whether to renew their termite protection.',
      csr_objectives: 'Explain the value of continued monitoring: termites are always present in the soil, the bait system provides ongoing detection and elimination. If they let it lapse, they lose warranty protection and would need a full reinstall if termites return. Quote $350 for annual renewal. Emphasize peace of mind.',
      scoring_focus: '{"retention_technique": 0.35, "product_knowledge": 0.3, "value_articulation": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands the risk of lapsing. Renewal is processed or customer has clear next steps.',
    },
  ]);

  addTemplates('Specialty Service Qualification', 'Bed Bug Qualification', [
    {
      name: 'First-Time Bed Bug — Setting Expectations',
      category: 'qualification',
      base_situation: 'A customer found bugs in their bed and blood spots on the sheets. They\'ve never dealt with bed bugs before and are upset and embarrassed.',
      customer_goals: 'Eliminate the bed bugs. Understand the process and timeline.',
      csr_objectives: 'Normalize the situation — bed bugs have nothing to do with cleanliness. Explain the treatment process: inspection to confirm, treatment plan (multiple visits typically), post-treatment expectations (full resolution takes several weeks). Quote starting at $900. Stress the importance of following all post-treatment instructions.',
      scoring_focus: '{"empathy": 0.3, "qualification_accuracy": 0.3, "customer_education": 0.25, "professionalism": 0.15}',
      resolution_conditions: 'Customer feels reassured. Treatment process and timeline are understood. Inspection/treatment is scheduled.',
    },
  ]);

  addTemplates('Specialty Service Qualification', 'Wildlife Removal Qualification', [
    {
      name: 'Raccoon in Attic',
      category: 'qualification',
      base_situation: 'A homeowner hears heavy thumping in their attic during the early morning. They looked up and saw what appears to be raccoon droppings near a soffit vent.',
      customer_goals: 'Get the animal removed safely and prevent it from coming back.',
      csr_objectives: 'Identify likely raccoon based on the description (heavy sounds, early morning activity, soffit entry). Explain Go-Forth\'s humane wildlife removal process: inspection, humane trapping/removal, and entry point exclusion to prevent re-entry. Quote starting at $350 with 1-year warranty on exclusion. Schedule the inspection.',
      scoring_focus: '{"qualification_accuracy": 0.35, "product_knowledge": 0.3, "empathy": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Wildlife situation correctly assessed. Humane approach explained. Inspection scheduled.',
    },
  ]);

  addTemplates('Specialty Service Qualification', 'Crawlspace Service Qualification', [
    {
      name: 'Moisture and Mold Concerns',
      category: 'qualification',
      base_situation: 'A homeowner notices a musty smell coming from under the house. They looked in the crawlspace and saw moisture on the floor joists and what might be mold.',
      customer_goals: 'Address the moisture problem and protect their home.',
      csr_objectives: 'Explain Go-Forth\'s crawlspace encapsulation service: vapor barrier installation, optional dehumidifier, vent sealing. This addresses moisture, prevents mold, and reduces pest entry. An inspection is required for accurate pricing — mention the $3,500 minimum. Schedule the crawlspace inspection.',
      scoring_focus: '{"product_knowledge": 0.35, "qualification_accuracy": 0.3, "clarity": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer understands the service. Inspection scheduled. Minimum pricing communicated.',
    },
  ]);

  // =========================================================================
  // COURSE 6: Communication & Documentation
  // =========================================================================

  addTemplates('Communication & Documentation', 'Follow-Up Templates', [
    {
      name: 'Card Decline — Select Correct Follow-Up',
      category: 'communication',
      base_situation: 'A customer\'s card was declined. They have 7 completed visits (longstanding). You need to send the appropriate follow-up communication.',
      customer_goals: 'Resolve the payment issue.',
      csr_objectives: 'Identify the customer as longstanding (7 visits, above 5-visit threshold). Use the longstanding customer card decline follow-up, which acknowledges service was completed. Do NOT use the new customer template. Document for billing follow-up.',
      scoring_focus: '{"process_adherence": 0.4, "product_knowledge": 0.3, "attention_to_detail": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Correct template selected. Billing follow-up documented.',
    },
  ]);

  addTemplates('Communication & Documentation', 'Service Area Routing', [
    {
      name: 'Out-of-Area Request',
      category: 'communication',
      base_situation: 'A customer from Asheville, NC is calling for pest control service. Go-Forth does not currently service the Asheville area.',
      customer_goals: 'Get pest control service at their home.',
      csr_objectives: 'Check the service area map. Asheville is outside Go-Forth\'s current service footprint. Explain politely that the area is not currently serviced. Offer to check if service is expanding to their area. Provide a professional recommendation if possible.',
      scoring_focus: '{"process_adherence": 0.4, "accuracy": 0.3, "customer_service": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Customer is informed their area is not serviced. Handled professionally.',
    },
  ]);

  // =========================================================================
  // COURSE 7: Complex Service Coordination
  // =========================================================================

  addTemplates('Complex Service Coordination', 'Initial Service Workflow', [
    {
      name: 'Payment Not Collected — Cannot Start',
      category: 'operations',
      base_situation: 'A technician is on-site for an initial service. The customer hasn\'t provided payment yet. The technician is asking for approval to proceed.',
      customer_goals: 'Get the initial service completed today.',
      csr_objectives: 'Payment is required before initial service can begin. Contact the customer to collect payment. If customer can\'t pay, the technician must wait or the service must be rescheduled.',
      scoring_focus: '{"process_adherence": 0.45, "risk_awareness": 0.25, "problem_solving": 0.2, "professionalism": 0.1}',
      resolution_conditions: 'Payment is collected before service proceeds, or service is rescheduled.',
    },
  ]);

  addTemplates('Complex Service Coordination', 'Technician No-Show Recovery', [
    {
      name: 'Missed Appointment — Customer Called In',
      category: 'operations',
      base_situation: 'A customer\'s appointment was scheduled for today between 1-3pm. It\'s now 4pm and no one showed or called. The customer is upset.',
      customer_goals: 'Get their service completed. Understand what happened.',
      csr_objectives: 'Apologize sincerely for the no-show. Do not make excuses. Document the missed appointment in the account. Offer priority rescheduling for the next available slot. If customer mentions taking time off work, acknowledge the inconvenience and offer a service credit or other goodwill gesture.',
      scoring_focus: '{"empathy": 0.35, "de_escalation": 0.25, "process_adherence": 0.25, "professionalism": 0.15}',
      escalation_triggers: 'Customer demands compensation or immediate cancellation.',
      deescalation_triggers: 'Sincere apology, immediate rescheduling action.',
      resolution_conditions: 'No-show is documented. Priority reschedule arranged. Customer feels heard.',
    },
  ]);

  addTemplates('Complex Service Coordination', 'Service During Disruptions', [
    {
      name: 'Hurricane Season — Service Delays',
      category: 'operations',
      base_situation: 'A tropical storm is approaching the Carolina coast. Several customers are calling about their scheduled services for the next few days. Routes are being cancelled for safety.',
      customer_goals: 'Know when their service will happen.',
      csr_objectives: 'Communicate that services are being rescheduled due to the weather event for the safety of both customers and technicians. Offer the earliest available date once routes resume. Document all postponements. Do not promise specific reschedule dates during active weather events.',
      scoring_focus: '{"customer_service": 0.35, "clarity": 0.3, "process_adherence": 0.2, "professionalism": 0.15}',
      resolution_conditions: 'Customer is informed of the delay. Postponement is documented. Professional and reassuring tone maintained.',
    },
  ]);

  return templates;
}

// ---------------------------------------------------------------------------
// seedScenarioTemplates
// ---------------------------------------------------------------------------
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
      .insert(chunk);

    if (error) {
      console.error(`Failed to seed scenario templates (chunk ${Math.floor(i / chunkSize) + 1}):`, error.message);
      process.exit(1);
    }

    inserted += chunk.length;
  }

  console.log(`  Inserted ${inserted} scenario templates across ${Object.keys(courseModuleMap).length} courses`);
}

// ---------------------------------------------------------------------------
// Print summary
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
  if (packageIdList.length > 0) {
    const { count: oc } = await supabase
      .from('package_objections')
      .select('*', { count: 'exact', head: true })
      .in('package_id', packageIdList);
    objectionCount = oc || 0;
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
  console.log('=== Go-Forth Pest Control — Seed Script ===\n');

  if (CREATE_ORG) {
    ORG_ID = await createOrg();
  } else {
    await verifyOrg();
  }

  await cleanExistingData();

  console.log('\n--- Service Packages ---');
  const packageMap = await seedServicePackages();

  console.log('\n--- Objections ---');
  await seedObjectionsAndSellingPoints(packageMap);

  console.log('\n--- Sales Guidelines ---');
  await seedSalesGuidelines();

  console.log('\n--- Customer Profiles ---');
  await seedCustomerProfiles();

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
