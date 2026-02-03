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

-- Note: Scenarios are generated dynamically when users start modules
-- The system automatically matches appropriate customer profiles (listed above)
-- to each module based on difficulty level (easy/medium/hard).
