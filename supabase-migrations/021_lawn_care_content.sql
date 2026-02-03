-- =============================================
-- LAWN CARE INDUSTRY CONTENT
-- Adds lawn care scenarios, objections, and content
-- =============================================

-- Lawn Care Service Categories (add to existing)
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
('Lawn Fertilization', 'lawn-fertilization', 'Seasonal fertilizer programs', '🌿', 10),
('Weed Control', 'weed-control', 'Pre-emergent and post-emergent weed control', '🥀', 11),
('Grub Control', 'grub-control', 'Preventive grub treatment', '🪱', 12),
('Aeration & Seeding', 'aeration-seeding', 'Core aeration and overseeding', '🌱', 13),
('Disease Control', 'disease-control', 'Lawn disease treatment and prevention', '🍄', 14),
('Tree & Shrub Care', 'tree-shrub', 'Ornamental plant care', '🌳', 15)
ON CONFLICT (slug) DO NOTHING;

-- Lawn Care Issue Types
INSERT INTO pest_types (name, display_name, category, is_common, display_order) VALUES
-- Lawn Issues
('grubs', 'Grubs', 'lawn_pests', true, 200),
('chinch_bugs', 'Chinch Bugs', 'lawn_pests', true, 201),
('sod_webworms', 'Sod Webworms', 'lawn_pests', false, 202),
('armyworms', 'Armyworms', 'lawn_pests', false, 203),
-- Lawn Diseases
('brown_patch', 'Brown Patch', 'lawn_disease', true, 220),
('dollar_spot', 'Dollar Spot', 'lawn_disease', true, 221),
('red_thread', 'Red Thread', 'lawn_disease', false, 222),
('rust', 'Rust', 'lawn_disease', false, 223),
('snow_mold', 'Snow Mold', 'lawn_disease', false, 224),
-- Weeds
('crabgrass', 'Crabgrass', 'weeds', true, 240),
('dandelions', 'Dandelions', 'weeds', true, 241),
('clover', 'Clover', 'weeds', true, 242),
('nutsedge', 'Nutsedge', 'weeds', true, 243),
('broadleaf_weeds', 'Broadleaf Weeds', 'weeds', true, 244)
ON CONFLICT (name) DO NOTHING;

-- Lawn Care Package Templates
INSERT INTO package_templates (service_category_slug, template_name, tier, suggested_name, suggested_pricing_model, suggested_initial_price, suggested_recurring_price, suggested_frequency, suggested_warranty, display_order) VALUES
('lawn-fertilization', 'Basic 4-Step', 'basic', 'Essential Lawn Program', 'quarterly', 99, 65, 'Quarterly (4 applications)', 'Satisfaction guarantee or free re-application', 1),
('lawn-fertilization', 'Premium 6-Step', 'standard', 'Complete Lawn Care', 'bi-monthly', 149, 95, 'Bi-monthly (6 applications)', 'Healthy lawn guarantee with free spot treatments', 2),
('lawn-fertilization', 'Ultimate 8-Step', 'premium', 'Premium Turf Management', 'monthly', 199, 135, 'Monthly (8+ applications)', 'Best lawn guarantee with unlimited service calls', 3),
('grub-control', 'Preventive Treatment', 'standard', 'Grub Protection', 'seasonal', 89, NULL, 'Spring application', 'Season-long grub protection', 1),
('aeration-seeding', 'Core Aeration', 'standard', 'Fall Aeration Service', 'seasonal', 149, NULL, 'Fall service', 'One-time service', 1),
('weed-control', 'Weed Management', 'standard', 'Weed-Free Lawn', 'quarterly', 79, 55, 'Quarterly applications', 'Weed-free guarantee or free retreatment', 1)
ON CONFLICT DO NOTHING;

-- Lawn Care Specific Objections
INSERT INTO objection_templates (objection_category, objection_text, frequency, default_response, display_order) VALUES
-- Price Objections
('price', 'I can fertilize my lawn myself from the hardware store', 'very_common', 'Store products treat the surface, but professional-grade fertilizers release slowly over time and include micronutrients your lawn needs. Plus, we time applications perfectly for your grass type.', 60),
('price', 'Why is lawn care so expensive?', 'common', 'Professional lawn care includes commercial-grade products, proper timing, soil analysis, and expertise. Most customers spend more trying DIY approaches that don''t work.', 61),
('price', 'My neighbor does his own lawn and it looks fine', 'common', 'That''s great! Though you might notice ours get progressively better while DIY lawns plateau. We''re addressing soil health, not just feeding grass.', 62),
-- Value Objections
('value', 'How do I know the treatment will work?', 'very_common', 'Our satisfaction guarantee backs it up. If you''re not seeing results, we''ll retreat at no charge. Most customers see improvement within 2-3 weeks.', 70),
('value', 'What if it rains after you apply?', 'common', 'Our products are designed to activate with water. Light rain actually helps them penetrate the soil. Heavy rain within hours would require a free re-application.', 71),
('value', 'Will you damage my lawn?', 'common', 'Our specialists are trained and certified. We use professional equipment calibrated for your grass type. Damage is extremely rare and fully covered by our guarantee.', 72),
('value', 'My lawn is already pretty good', 'common', 'That''s great to hear! Our program maintains that quality while preventing common issues like grubs, disease, and weed takeover. Prevention is easier than recovery.', 73),
-- Timing Objections
('timing', 'I need to see how my lawn looks in spring', 'common', 'I understand. The challenge is pre-emergent applications work best before weeds germinate. Starting now prevents problems rather than reacting to them.', 80),
('timing', 'Can I just do one application and see how it goes?', 'common', 'Lawn care works best as a program. One application is like taking one vitamin and expecting health improvements. The results come from consistent, timed applications.', 81),
-- Trust Objections
('trust', 'Are these chemicals safe for my kids and pets?', 'very_common', 'All products are EPA-registered and safe when applied properly. We recommend staying off treated areas until dry, usually 2-4 hours. Many customers use their yards the same day.', 90),
('trust', 'I heard lawn chemicals cause cancer', 'common', 'That''s a common concern. Our products have been extensively tested and approved by the EPA. The amounts used are minimal, and modern formulations are far safer than older products.', 91),
('trust', 'Will this kill the bees?', 'common', 'We share your concern for pollinators. We use products specifically designed to be safe for bees when applied to turf. We don''t spray blooming flowers or clover unless requested.', 92),
-- Commitment Objections
('commitment', 'I don''t want to be locked into a contract', 'very_common', 'We don''t require contracts. You can cancel anytime. We find most customers continue because they love having the best lawn on the block.', 100),
('commitment', 'What if I want to skip an application?', 'common', 'You certainly can, though skipping applications often leads to breakthrough issues. Our program is designed as a system where each application builds on the previous one.', 101)
ON CONFLICT DO NOTHING;

-- Lawn Care Customer Profiles
INSERT INTO customer_profiles (name, gender, age_range, personality_traits, communication_style, objection_likelihood, close_difficulty, is_system) VALUES
-- Easy Lawn Care Customers
('Brad Henderson', 'male', '35-44', '["new homeowner", "wants nice yard"]', 'friendly', 2, 2, true),
('Kelly Anderson', 'female', '30-39', '["busy mom", "hates weeds"]', 'direct', 3, 3, true),
('Mike Patterson', 'male', '45-54', '["pride in property", "competitive neighbor"]', 'friendly', 2, 2, true),
('Amy Rodriguez', 'female', '35-44', '["organic-curious but practical"]', 'friendly', 3, 3, true),
-- Medium Difficulty Lawn Care Customers
('Steve Morrison', 'male', '50-59', '["DIY type", "wants to understand process"]', 'analytical', 5, 5, true),
('Janet Hughes', 'female', '45-54', '["worried about chemicals"]', 'emotional', 5, 5, true),
('Rick Thompson', 'male', '40-49', '["budget-conscious", "had bad experience"]', 'guarded', 6, 5, true),
('Patricia Walsh', 'female', '55-64', '["perfectionist", "high standards"]', 'analytical', 5, 6, true),
-- Hard Lawn Care Customers
('Frank DiMaggio', 'male', '60-69', '["retired", "does own lawn", "skeptical"]', 'confrontational', 8, 7, true),
('Cheryl Bennett', 'female', '50-59', '["environmental activist"]', 'emotional', 7, 7, true),
('Doug Martinez', 'male', '45-54', '["landscaper", "thinks he knows better"]', 'confrontational', 8, 8, true)
ON CONFLICT DO NOTHING;

-- Lawn Care Courses
INSERT INTO courses (id, organization_id, name, description, category, icon, badge_name, badge_icon, is_system, display_order) VALUES
('00000000-0000-0000-0000-000000000010', NULL, 'Lawn Care Sales Fundamentals', 'Master lawn care service sales.', 'sales', '🌱', 'Lawn Care Pro', '🏆', true, 10),
('00000000-0000-0000-0000-000000000011', NULL, 'Lawn Care Objections', 'Handle chemical safety, DIY, and value objections.', 'sales', '🛡️', 'Green Defender', '🌿', true, 11),
('00000000-0000-0000-0000-000000000012', NULL, 'Lawn Care Customer Service', 'Deliver exceptional lawn care service.', 'service', '⭐', 'Service Excellence', '🌟', true, 12)
ON CONFLICT (id) DO NOTHING;

-- Lawn Care Course Modules
INSERT INTO course_modules (course_id, difficulty, name, description, scenario_count, pass_threshold, unlock_order) VALUES
-- Lawn Care Sales Fundamentals
('00000000-0000-0000-0000-000000000010', 'easy', 'First Call Basics', 'Great first impressions and lawn assessment.', 10, 60, 0),
('00000000-0000-0000-0000-000000000010', 'medium', 'Program Presentation', 'Match lawn needs to service packages.', 12, 65, 1),
('00000000-0000-0000-0000-000000000010', 'hard', 'Closing the Sale', 'Confidently ask for the business.', 15, 70, 2),
-- Lawn Care Objections
('00000000-0000-0000-0000-000000000011', 'easy', 'DIY Objections', 'Handle "I can do it myself" responses.', 10, 60, 0),
('00000000-0000-0000-0000-000000000011', 'medium', 'Chemical Safety Concerns', 'Address environmental and safety worries.', 12, 65, 1),
('00000000-0000-0000-0000-000000000011', 'hard', 'Price & Value', 'Justify professional lawn care investment.', 15, 70, 2),
-- Lawn Care Customer Service
('00000000-0000-0000-0000-000000000012', 'easy', 'Service Call Basics', 'Handle routine inquiries professionally.', 10, 60, 0),
('00000000-0000-0000-0000-000000000012', 'medium', 'Problem Resolution', 'Address lawn issues and complaints.', 12, 65, 1),
('00000000-0000-0000-0000-000000000012', 'hard', 'Difficult Situations', 'Turn around unhappy lawn care customers.', 15, 70, 2)
ON CONFLICT DO NOTHING;

-- Lawn Care Training Scenarios
INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Fertilization Program Inquiry',
  'New customer calling about lawn fertilization program. Wants to know what''s included and pricing.',
  'easy',
  (SELECT id FROM customer_profiles WHERE name = 'Brad Henderson' LIMIT 1),
  'Hi, I saw your truck in my neighborhood and I''m interested in getting my lawn fertilized. Can you tell me about your programs?',
  'Get information about lawn care services and pricing',
  '{"requirements": ["Presented fertilization program options", "Explained timing and application schedule", "Addressed any questions about products", "Provided clear pricing", "Attempted to close or schedule"]}',
  '{"avoid": ["Being pushy before building rapport", "Failing to educate about process", "Not addressing chemical safety if asked", "Providing unclear pricing"]}',
  600,
  'sales',
  '["lawn_care", "fertilization", "easy", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Fertilization Program Inquiry');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Grub Damage Complaint',
  'Existing customer calling because they found grub damage in their lawn. Frustrated because they thought they were protected.',
  'medium',
  (SELECT id FROM customer_profiles WHERE name = 'Rick Thompson' LIMIT 1),
  'I need to speak to someone about my lawn. I just found a huge section with grub damage! I thought you guys were supposed to prevent this?',
  'Get resolution for lawn damage and understand what happened',
  '{"requirements": ["Showed empathy and took ownership", "Explained grub control timing and coverage", "Offered solution (inspection, treatment, repair)", "Rebuilt confidence in service", "Scheduled follow-up"]}',
  '{"avoid": ["Being defensive or dismissive", "Blaming the customer", "Not offering concrete solution", "Failing to rebuild trust"]}',
  600,
  'service',
  '["lawn_care", "complaint", "grubs", "medium", "existing_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Grub Damage Complaint');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Weed Control Questions',
  'Potential customer has lots of weeds and wants to know if you can fix it and how long it will take.',
  'easy',
  (SELECT id FROM customer_profiles WHERE name = 'Kelly Anderson' LIMIT 1),
  'My yard is full of dandelions and crabgrass. Can you get rid of these? How long does it take to work?',
  'Understand if lawn care can solve weed problem and timeframe',
  '{"requirements": ["Assessed current weed situation", "Explained treatment approach (pre/post emergent)", "Set realistic timeframe expectations", "Presented appropriate program", "Attempted to start service"]}',
  '{"avoid": ["Making unrealistic promises", "Not explaining the process", "Overselling when customer is ready", "Failing to manage expectations"]}',
  600,
  'sales',
  '["lawn_care", "weeds", "easy", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Weed Control Questions');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Chemical Safety Concerns',
  'Parent calling about lawn care services but very worried about chemical safety for kids and pets.',
  'medium',
  (SELECT id FROM customer_profiles WHERE name = 'Janet Hughes' LIMIT 1),
  'I''m interested in lawn care but I have young children and a dog. Are your products safe? I''m really worried about chemicals.',
  'Get reassurance about safety before considering service',
  '{"requirements": ["Acknowledged safety concerns empathetically", "Explained EPA registration and safety testing", "Provided specific re-entry guidelines", "Offered to share product information", "Built trust before closing"]}',
  '{"avoid": ["Dismissing concerns", "Being defensive", "Using technical jargon", "Pushing sale before addressing fears"]}',
  600,
  'sales',
  '["lawn_care", "objection", "safety", "medium", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Chemical Safety Concerns');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'DIY Competitor - Hardware Store',
  'Homeowner who currently does own lawn care with products from hardware store. Skeptical about professional service value.',
  'hard',
  (SELECT id FROM customer_profiles WHERE name = 'Frank DiMaggio' LIMIT 1),
  'My wife wanted me to call, but honestly I do my own lawn. I buy the stuff at the hardware store and it works fine. Why would I pay someone to do what I can do myself?',
  'Defend DIY approach but willing to listen if value is clear',
  '{"requirements": ["Respected customer''s DIY efforts", "Differentiated professional vs retail products", "Highlighted expertise and timing advantages", "Addressed time/convenience value", "Used trial close or guarantee to reduce risk"]}',
  '{"avoid": ["Insulting customer''s work", "Being condescending", "Only focusing on product quality", "Not addressing convenience factor"]}',
  600,
  'sales',
  '["lawn_care", "objection", "DIY", "hard", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'DIY Competitor - Hardware Store');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Aeration Upsell',
  'Existing fertilization customer calling to schedule next application. Perfect opportunity to recommend aeration service.',
  'medium',
  (SELECT id FROM customer_profiles WHERE name = 'Mike Patterson' LIMIT 1),
  'Hey, I wanted to make sure my next fertilizer treatment is scheduled. When are you guys coming out?',
  'Confirm service scheduling',
  '{"requirements": ["Confirmed existing service schedule", "Identified opportunity to discuss aeration", "Explained aeration benefits for current lawn condition", "Presented timing and pricing", "Asked for the upsell or scheduled inspection"]}',
  '{"avoid": ["Failing to upsell when appropriate", "Being too aggressive", "Not connecting to customer''s lawn goals", "Unclear about additional value"]}',
  600,
  'sales',
  '["lawn_care", "upsell", "aeration", "medium", "existing_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Aeration Upsell');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Brown Patch Disease',
  'Customer calling because they noticed brown circular patches in their lawn and are worried about disease.',
  'medium',
  (SELECT id FROM customer_profiles WHERE name = 'Patricia Walsh' LIMIT 1),
  'I have these brown circles showing up in my lawn. Someone told me it might be a fungus? What should I do?',
  'Get help identifying lawn problem and find solution',
  '{"requirements": ["Asked diagnostic questions about symptoms", "Explained brown patch disease", "Recommended treatment approach", "Discussed prevention options", "Scheduled inspection or treatment"]}',
  '{"avoid": ["Diagnosing without enough information", "Overselling treatment", "Not explaining prevention", "Failing to schedule follow-up"]}',
  600,
  'service',
  '["lawn_care", "disease", "diagnosis", "medium", "existing_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Brown Patch Disease');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Environmental Activist',
  'Very environmentally conscious customer who wants a nice lawn but is against "chemicals" and wants organic options.',
  'hard',
  (SELECT id FROM customer_profiles WHERE name = 'Cheryl Bennett' LIMIT 1),
  'Do you offer organic lawn care? I refuse to use chemicals on my property. Everything has to be natural and safe for the environment.',
  'Find lawn care solution that aligns with environmental values',
  '{"requirements": ["Acknowledged environmental concerns positively", "Explained EPA testing and environmental considerations", "Discussed any organic or reduced-chemical options", "Focused on responsible application practices", "Either closed sale or educated respectfully"]}',
  '{"avoid": ["Arguing about chemicals vs natural", "Dismissing environmental concerns", "Lying about product composition", "Not offering alternatives if available"]}',
  600,
  'sales',
  '["lawn_care", "objection", "environmental", "hard", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Environmental Activist');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Competitive Neighbor Motivation',
  'Homeowner whose neighbor just got lawn care and now their lawn looks better. Pride and competition are key motivators.',
  'easy',
  (SELECT id FROM customer_profiles WHERE name = 'Amy Rodriguez' LIMIT 1),
  'My neighbor''s lawn is looking really great lately, and honestly mine is looking rough in comparison. What can you do for me?',
  'Get lawn care to match or beat neighbor''s lawn appearance',
  '{"requirements": ["Leveraged competitive motivation positively", "Assessed current lawn condition", "Presented program to achieve goals", "Set realistic expectations for improvement", "Closed sale or scheduled assessment"]}',
  '{"avoid": ["Negative talk about neighbor", "Overpromising results", "Not capitalizing on motivation", "Failing to close when customer is ready"]}',
  600,
  'sales',
  '["lawn_care", "motivation", "easy", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Competitive Neighbor Motivation');

INSERT INTO training_scenarios (
  organization_id,
  title,
  description,
  difficulty,
  customer_profile_id,
  initial_message,
  customer_goal,
  success_criteria,
  failure_criteria,
  time_limit_seconds,
  category,
  tags,
  is_active,
  is_system
)
SELECT
  NULL,
  'Professional Landscaper Skeptic',
  'Customer who is a landscaper or groundskeeper and thinks they know more than you. Very challenging sale.',
  'hard',
  (SELECT id FROM customer_profiles WHERE name = 'Doug Martinez' LIMIT 1),
  'Look, I''m a landscaper myself. I know about fertilizer and lawn care. My wife thinks I should hire someone but I probably know more than your technicians. What makes you different?',
  'Defend professional expertise while considering outside service',
  '{"requirements": ["Respected customer''s expertise genuinely", "Differentiated your service (time, expertise, equipment, products)", "Focused on convenience and specialization", "Used technical knowledge to build credibility", "Addressed spouse''s concerns"]}',
  '{"avoid": ["Getting into technical arguments", "Being intimidated", "Claiming to know more", "Not acknowledging valid expertise"]}',
  600,
  'sales',
  '["lawn_care", "objection", "expert", "hard", "new_customer"]',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM training_scenarios WHERE title = 'Professional Landscaper Skeptic');
