/**
 * Seed Gecko Green with lawn care courses and modules.
 * Run: node api/scripts/seed-geckogreen-courses.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GECKO_GREEN_ORG_ID = '3fed37dd-0818-45d7-8007-8d096088205c';

const courses = [
  {
    name: 'Lawn Care Sales Fundamentals',
    description: 'Master selling lawn care programs — from first call assessment to closing the deal on fertilization, weed control, and full-program packages.',
    category: 'sales',
    icon: '🌱',
    badge_name: 'Lawn Sales Pro',
    badge_icon: '🏆',
    display_order: 1,
    modules: [
      {
        name: 'First Call — Lawn Assessment',
        description: 'Make a strong first impression. Ask the right questions to assess lawn condition, identify weed and pest issues, and build rapport with new homeowners.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Program Presentation',
        description: 'Present Gecko Green lawn care programs. Match customer needs to the right package — fertilization, weed control, aeration, or full-service.',
        difficulty: 'medium',
        scenario_count: 12,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Closing the Lawn Sale',
        description: 'Confidently ask for the business. Handle last-minute hesitations, create urgency with seasonal timing, and book the first application.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  },
  {
    name: 'Lawn Care Objection Handling',
    description: 'Handle the toughest objections — DIY lawn care, chemical safety concerns, competitor pricing, and "I\'ll think about it" stalls.',
    category: 'objection_handling',
    icon: '🛡️',
    badge_name: 'Green Defender',
    badge_icon: '🌿',
    display_order: 2,
    modules: [
      {
        name: 'DIY & "I Can Do It Myself"',
        description: 'Handle customers who think they can manage their lawn with store-bought products. Explain professional-grade products, proper timing, and the cost of mistakes.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Chemical Safety & Environmental Concerns',
        description: 'Address worries about chemicals near kids, pets, and the environment. Explain product safety, application methods, and eco-friendly options.',
        difficulty: 'medium',
        scenario_count: 10,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Price vs. Value',
        description: 'Justify the investment in professional lawn care. Compare cost of DIY mistakes, demonstrate long-term value, and handle competitor price quotes.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  },
  {
    name: 'Lawn Care Customer Service',
    description: 'Deliver exceptional service on every call — handle scheduling, application questions, lawn condition complaints, and service recovery.',
    category: 'service',
    icon: '⭐',
    badge_name: 'Service Star',
    badge_icon: '🌟',
    display_order: 3,
    modules: [
      {
        name: 'Routine Service Calls',
        description: 'Handle scheduling changes, application timing questions, watering instructions, and general lawn care inquiries with professionalism.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Lawn Problem Resolution',
        description: 'Address complaints about brown patches, persistent weeds, application damage, and unmet expectations. Diagnose issues and offer solutions.',
        difficulty: 'medium',
        scenario_count: 12,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Difficult Lawn Care Situations',
        description: 'Turn around unhappy customers — burned lawns, repeated weed issues, missed applications, and demands for refunds or free re-treatments.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  },
  {
    name: 'Tree & Shrub Care Sales',
    description: 'Sell Gecko Green tree and shrub care programs — deep root fertilization, insect & disease prevention, and dormant oil applications.',
    category: 'sales',
    icon: '🌳',
    badge_name: 'Arborist',
    badge_icon: '🌲',
    display_order: 4,
    modules: [
      {
        name: 'Identifying Tree & Shrub Needs',
        description: 'Ask the right questions about landscape health. Identify signs of disease, pest damage, and nutrient deficiency to recommend the right program.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Presenting Tree & Shrub Programs',
        description: 'Explain deep root fertilization, insect/disease control, dormant oil applications, and seasonal treatment plans in terms customers understand.',
        difficulty: 'medium',
        scenario_count: 10,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Bundling & Upselling',
        description: 'Present tree & shrub care as an add-on to existing lawn programs. Bundle services for value and handle "I just want the lawn" objections.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  },
  {
    name: 'Lawn Care Retention & Renewals',
    description: 'Save cancellations, handle seasonal drop-offs, and renew annual lawn care programs. Every saved customer is revenue protected.',
    category: 'retention',
    icon: '🔄',
    badge_name: 'Retention Champion',
    badge_icon: '💪',
    display_order: 5,
    modules: [
      {
        name: 'Seasonal Cancellation Saves',
        description: 'Handle customers wanting to cancel after winter or during slow growth periods. Re-engage them with the value of year-round lawn care.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Competitor Switch Prevention',
        description: 'Save customers being lured by cheaper competitor offers. Demonstrate Gecko Green\'s value, product quality, and service consistency.',
        difficulty: 'medium',
        scenario_count: 12,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Dissatisfied Customer Recovery',
        description: 'Win back customers who are unhappy with results. Acknowledge failures, offer concrete solutions, and rebuild trust in the program.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  },
  {
    name: 'Specialty Services Upselling',
    description: 'Upsell aeration & seeding, grub control, fire ant treatment, fungus prevention, and mosquito control to existing lawn care customers.',
    category: 'upselling',
    icon: '📈',
    badge_name: 'Upsell Expert',
    badge_icon: '💎',
    display_order: 6,
    modules: [
      {
        name: 'Aeration & Seeding',
        description: 'Explain the benefits of lawn aeration and overseeding. Handle timing questions and "my lawn looks fine" objections.',
        difficulty: 'easy',
        scenario_count: 10,
        pass_threshold: 60,
        unlock_order: 0
      },
      {
        name: 'Grub & Fire Ant Control',
        description: 'Sell preventive grub control and fire ant treatments. Explain the damage these pests cause and why proactive treatment saves money.',
        difficulty: 'medium',
        scenario_count: 10,
        pass_threshold: 65,
        unlock_order: 1
      },
      {
        name: 'Full-Service Program Upgrade',
        description: 'Move customers from basic lawn care to comprehensive programs including fungus prevention, mosquito control, and bed weed treatment.',
        difficulty: 'hard',
        scenario_count: 12,
        pass_threshold: 70,
        unlock_order: 2
      }
    ]
  }
];

async function seed() {
  console.log('Seeding Gecko Green lawn care courses...\n');

  // Check for existing Gecko Green courses
  const { data: existing } = await supabase
    .from('courses')
    .select('id, name')
    .eq('organization_id', GECKO_GREEN_ORG_ID);

  if (existing?.length > 0) {
    console.log(`Found ${existing.length} existing courses for Gecko Green:`);
    existing.forEach(c => console.log(`  - ${c.name}`));
    console.log('\nDeleting existing courses and modules...');

    const courseIds = existing.map(c => c.id);
    await supabase.from('course_modules').delete().in('course_id', courseIds);
    await supabase.from('courses').delete().eq('organization_id', GECKO_GREEN_ORG_ID);
    console.log('Cleared.\n');
  }

  for (const course of courses) {
    const { modules, ...courseData } = course;

    // Insert course
    const { data: inserted, error: courseError } = await supabase
      .from('courses')
      .insert({
        ...courseData,
        organization_id: GECKO_GREEN_ORG_ID,
        is_system: false,
        is_active: true
      })
      .select()
      .single();

    if (courseError) {
      console.error(`Failed to create course "${course.name}":`, courseError.message);
      continue;
    }

    console.log(`Created course: ${course.name} (${inserted.id})`);

    // Insert modules
    const moduleInserts = modules.map(m => ({
      ...m,
      course_id: inserted.id,
      required_completions: 1
    }));

    const { data: insertedModules, error: moduleError } = await supabase
      .from('course_modules')
      .insert(moduleInserts)
      .select();

    if (moduleError) {
      console.error(`  Failed to create modules:`, moduleError.message);
    } else {
      console.log(`  ${insertedModules.length} modules created`);
    }
  }

  console.log('\nDone! Gecko Green now has lawn care courses.');
}

seed().catch(console.error);
