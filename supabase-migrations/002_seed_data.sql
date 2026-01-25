-- =============================================
-- SEED DATA
-- Run after schema creation
-- =============================================

-- Service Categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
('General Pest Control', 'general-pest', 'Quarterly or monthly pest prevention', '🐜', 1),
('Termite Protection', 'termite', 'Termite inspection and treatment', '🪵', 2),
('Mosquito Control', 'mosquito', 'Seasonal mosquito reduction', '🦟', 3),
('Bed Bug Treatment', 'bed-bugs', 'Bed bug elimination', '🛏️', 4),
('Wildlife Removal', 'wildlife', 'Humane wildlife removal', '🦝', 5),
('Lawn Care', 'lawn-care', 'Fertilization and weed control', '🌱', 6),
('Rodent Control', 'rodent', 'Mouse and rat elimination', '🐀', 7),
('Commercial Services', 'commercial', 'Business pest management', '🏢', 8),
('Other/Custom', 'custom', 'Custom services', '⚙️', 99)
ON CONFLICT (slug) DO NOTHING;

-- Pest Types (45 total)
INSERT INTO pest_types (name, display_name, category, is_common, display_order) VALUES
-- Crawling pests
('ants', 'Ants', 'crawling', true, 1),
('roaches', 'Roaches/Cockroaches', 'crawling', true, 2),
('spiders', 'Spiders', 'crawling', true, 3),
('silverfish', 'Silverfish', 'crawling', true, 4),
('earwigs', 'Earwigs', 'crawling', true, 5),
('centipedes', 'Centipedes', 'crawling', true, 6),
('crickets', 'Crickets', 'crawling', true, 7),
('millipedes', 'Millipedes', 'crawling', true, 8),
('pill_bugs', 'Pill Bugs/Roly-Polies', 'crawling', true, 9),
('carpet_beetles', 'Carpet Beetles', 'crawling', false, 10),
('clothes_moths', 'Clothes Moths', 'crawling', false, 11),
-- Stinging pests
('wasps', 'Wasps', 'stinging', true, 20),
('hornets', 'Hornets', 'stinging', true, 21),
('yellow_jackets', 'Yellow Jackets', 'stinging', true, 22),
('fire_ants', 'Fire Ants', 'stinging', true, 23),
('bees', 'Bees', 'stinging', true, 24),
('mud_daubers', 'Mud Daubers', 'stinging', false, 25),
('scorpions', 'Scorpions', 'stinging', false, 26),
-- Flying pests
('mosquitoes', 'Mosquitoes', 'flying', true, 40),
('flies', 'Flies', 'flying', true, 41),
('gnats', 'Gnats', 'flying', true, 42),
('fruit_flies', 'Fruit Flies', 'flying', true, 43),
('drain_flies', 'Drain Flies', 'flying', false, 44),
('cluster_flies', 'Cluster Flies', 'flying', false, 45),
('pantry_moths', 'Pantry Moths', 'flying', false, 46),
-- Other pests
('bed_bugs', 'Bed Bugs', 'other', true, 60),
('fleas', 'Fleas', 'other', true, 61),
('ticks', 'Ticks', 'other', true, 62),
('stink_bugs', 'Stink Bugs', 'other', true, 63),
('boxelder_bugs', 'Boxelder Bugs', 'other', false, 64),
('ladybugs', 'Asian Lady Beetles', 'other', false, 65),
('weevils', 'Weevils', 'other', false, 66),
-- Rodents
('mice', 'Mice', 'rodent', true, 80),
('rats', 'Rats', 'rodent', true, 81),
('voles', 'Voles', 'rodent', false, 82),
('moles', 'Moles', 'rodent', false, 83),
-- Wildlife
('squirrels', 'Squirrels', 'wildlife', true, 100),
('raccoons', 'Raccoons', 'wildlife', true, 101),
('opossums', 'Opossums', 'wildlife', true, 102),
('skunks', 'Skunks', 'wildlife', true, 103),
('snakes', 'Snakes', 'wildlife', true, 104),
('bats', 'Bats', 'wildlife', true, 105),
('armadillos', 'Armadillos', 'wildlife', false, 106),
('groundhogs', 'Groundhogs', 'wildlife', false, 107),
-- Wood-destroying pests
('termites', 'Termites', 'wood_destroying', true, 120),
('carpenter_ants', 'Carpenter Ants', 'wood_destroying', true, 121),
('carpenter_bees', 'Carpenter Bees', 'wood_destroying', false, 122),
('powderpost_beetles', 'Powderpost Beetles', 'wood_destroying', false, 123)
ON CONFLICT (name) DO NOTHING;

-- Package Templates
INSERT INTO package_templates (service_category_slug, template_name, tier, suggested_name, suggested_pricing_model, suggested_initial_price, suggested_recurring_price, suggested_frequency, suggested_warranty, display_order) VALUES
('general-pest', 'Basic Quarterly', 'basic', 'Essential Pest Protection', 'quarterly', 149, 99, 'Every 3 months', 'Free re-service between treatments', 1),
('general-pest', 'Standard Quarterly', 'standard', 'QuarterlyShield', 'quarterly', 199, 149, 'Every 3 months', 'Satisfaction guarantee - free re-service within 30 days', 2),
('general-pest', 'Premium Quarterly', 'premium', 'Total Home Shield', 'quarterly', 249, 199, 'Every 3 months', 'Ultimate guarantee - unlimited free re-services', 3),
('mosquito', 'Seasonal Mosquito', 'standard', 'Mosquito Shield', 'monthly', 99, 79, 'Monthly (seasonal)', 'Re-treatment within 7 days if mosquitoes return', 1),
('termite', 'Liquid Treatment', 'standard', 'TermiteGuard', 'one_time', 1200, 299, 'Annual renewal', '10-year warranty with annual renewal', 1),
('termite', 'Bait System', 'premium', 'TermiteGuard Plus', 'one_time', 1800, 349, 'Annual renewal', 'Lifetime warranty with annual renewal', 2),
('bed-bugs', 'Standard Treatment', 'standard', 'Bed Bug Elimination', 'one_time', 500, NULL, 'Per room', '90-day warranty', 1),
('wildlife', 'Wildlife Removal', 'standard', 'Wildlife Solutions', 'per_service', 250, NULL, 'Per animal', '30-day warranty on exclusion', 1),
('rodent', 'Rodent Control', 'standard', 'Rodent Shield', 'one_time', 350, 99, 'Initial + quarterly', 'Warranty with ongoing monitoring', 1)
ON CONFLICT DO NOTHING;

-- Objection Templates
INSERT INTO objection_templates (objection_category, objection_text, frequency, default_response, display_order) VALUES
('price', 'That''s more expensive than I expected', 'very_common', 'I understand - pest control is an investment. Let me explain what''s included and why our customers find it worthwhile...', 1),
('price', 'I got a cheaper quote from another company', 'very_common', 'I appreciate you sharing that. Did they include a satisfaction guarantee? Our guarantee means if pests come back, we come back free.', 2),
('price', 'Can you give me a discount?', 'common', 'Our pricing includes everything without hidden costs. What I can do is make sure you''re getting the right service level.', 3),
('value', 'I can just buy spray at the hardware store', 'common', 'Store products treat the surface but don''t reach where pests live. Our treatment gets into wall voids and breeding areas.', 10),
('value', 'How do I know it will work?', 'common', 'Our satisfaction guarantee backs it up. If pests return, we return at no charge.', 11),
('timing', 'I need to think about it', 'very_common', 'Absolutely. Is there a specific concern I can address? Pest problems typically worsen over time.', 20),
('timing', 'Call me back later', 'common', 'I understand. When would be a good time to follow up?', 21),
('trust', 'I''ve never heard of your company', 'common', 'We''re locally owned, which means you get personal service. We''ve served this area for years.', 30),
('trust', 'Are your products safe for kids/pets?', 'very_common', 'All products are EPA-registered and applied by trained technicians in cracks and crevices, not where kids and pets play.', 31),
('commitment', 'I don''t want a contract', 'common', 'We don''t require long-term contracts. You can cancel anytime.', 40),
('competition', 'I''m already using another company', 'common', 'How''s it going with them? Are you seeing the results you expected?', 50)
ON CONFLICT DO NOTHING;

-- Customer Profiles (50 profiles)
INSERT INTO customer_profiles (name, gender, age_range, personality_traits, communication_style, objection_likelihood, close_difficulty, is_system) VALUES
-- Easy (close_difficulty 1-3)
('Mike Johnson', 'male', '35-44', '["friendly", "decisive"]', 'direct', 2, 2, true),
('Sarah Williams', 'female', '25-34', '["enthusiastic", "agreeable"]', 'friendly', 2, 3, true),
('Tom Bradley', 'male', '55-64', '["practical", "straightforward"]', 'direct', 3, 3, true),
('Lisa Chen', 'female', '30-39', '["organized", "polite"]', 'analytical', 3, 2, true),
('James Miller', 'male', '40-49', '["efficient", "results-focused"]', 'direct', 2, 2, true),
('Nancy Young', 'female', '35-44', '["busy mom", "practical"]', 'friendly', 4, 4, true),
('Paul Campbell', 'male', '35-44', '["innovative", "open"]', 'friendly', 3, 3, true),
('Ryan Bell', 'male', '28-35', '["convenience-focused"]', 'direct', 3, 3, true),
-- Medium (close_difficulty 4-6)
('Karen Thompson', 'female', '45-54', '["cautious", "thorough"]', 'analytical', 5, 5, true),
('Robert Garcia', 'male', '50-59', '["skeptical", "negotiator"]', 'direct', 6, 5, true),
('Jennifer Adams', 'female', '30-39', '["price-sensitive", "analytical"]', 'analytical', 6, 6, true),
('David Martinez', 'male', '35-44', '["impatient", "direct"]', 'direct', 5, 5, true),
('Michelle Brown', 'female', '40-49', '["worried", "protective"]', 'emotional', 4, 4, true),
('Christopher Lee', 'male', '28-35', '["tech-savvy", "research-driven"]', 'analytical', 5, 5, true),
('Amanda Wilson', 'female', '35-44', '["friendly but cautious"]', 'friendly', 5, 4, true),
('Daniel Taylor', 'male', '45-54', '["traditional", "loyal"]', 'friendly', 4, 4, true),
('Rachel Moore', 'female', '25-34', '["eco-conscious"]', 'emotional', 5, 5, true),
('Steven Anderson', 'male', '55-64', '["experienced", "value-driven"]', 'direct', 5, 5, true),
('Betty Allen', 'female', '60-69', '["sweet but firm"]', 'friendly', 4, 5, true),
('Jason King', 'male', '25-34', '["reviews-focused"]', 'analytical', 5, 5, true),
('Carol Wright', 'female', '45-54', '["perfectionist"]', 'analytical', 6, 6, true),
('Brian Scott', 'male', '40-49', '["logical", "methodical"]', 'analytical', 5, 5, true),
('Donna Green', 'female', '50-59', '["chatty", "relationship-builder"]', 'verbose', 3, 4, true),
('Edward Baker', 'male', '55-64', '["old school", "integrity-focused"]', 'direct', 4, 4, true),
('Sharon Hill', 'female', '40-49', '["community-focused"]', 'friendly', 4, 4, true),
('Laura Mitchell', 'female', '30-39', '["anxious", "worst-case thinker"]', 'emotional', 4, 5, true),
('Kenneth Parker', 'male', '50-59', '["disciplined", "expects follow-through"]', 'direct', 5, 4, true),
('Deborah Evans', 'female', '55-64', '["educational", "patient"]', 'analytical', 4, 4, true),
('Sandra Collins', 'female', '45-54', '["cleanliness-focused"]', 'analytical', 4, 4, true),
('Jeffrey Rogers', 'male', '35-44', '["analytical", "spreadsheet person"]', 'analytical', 6, 5, true),
('Linda Reed', 'female', '40-49', '["organized", "schedule-driven"]', 'direct', 4, 4, true),
('Elizabeth Morgan', 'female', '45-54', '["elegant", "quality-focused"]', 'friendly', 5, 5, true),
-- Hard (close_difficulty 7-8)
('Margaret Thompson', 'female', '65-74', '["frugal", "skeptical"]', 'direct', 8, 8, true),
('Richard Davis', 'male', '50-59', '["aggressive negotiator"]', 'confrontational', 8, 7, true),
('Patricia Wilson', 'female', '55-64', '["very skeptical", "trust issues"]', 'guarded', 9, 8, true),
('Barbara Mitchell', 'female', '45-54', '["emotional", "demanding"]', 'emotional', 7, 7, true),
('William Jackson', 'male', '40-49', '["know-it-all", "challenging"]', 'confrontational', 8, 8, true),
('Susan White', 'female', '50-59', '["indecisive", "fearful"]', 'emotional', 6, 8, true),
('Joseph Harris', 'male', '55-64', '["distrustful", "cynical"]', 'direct', 9, 8, true),
('Kevin Hall', 'male', '30-39', '["DIY enthusiast"]', 'direct', 7, 6, true),
('Ruth Adams', 'female', '65-74', '["widowed", "cautious"]', 'emotional', 6, 7, true),
('Mark Edwards', 'male', '40-49', '["attorney", "detail-focused"]', 'analytical', 7, 6, true),
('Donald Stewart', 'male', '60-69', '["curmudgeon", "complainer"]', 'confrontational', 8, 8, true),
('Mary Morris', 'female', '50-59', '["perfectionist", "high maintenance"]', 'emotional', 6, 6, true),
('Gary Cook', 'male', '55-64', '["penny pincher"]', 'direct', 7, 7, true),
-- Very Hard (close_difficulty 9-10)
('Charles Roberts', 'male', '60-69', '["stubborn", "argumentative"]', 'confrontational', 9, 9, true),
('Dorothy Clark', 'female', '70-79', '["extremely frugal", "resistant"]', 'guarded', 10, 10, true),
('George Lewis', 'male', '65-74', '["hostile to salespeople"]', 'confrontational', 10, 9, true),
('Henry Nelson', 'male', '45-54', '["business owner", "decisive"]', 'direct', 3, 3, true),
-- Additional Easy profiles (close_difficulty 1-3)
('Emily Watson', 'female', '28-35', '["tech-forward", "efficient"]', 'direct', 2, 2, true),
('Marcus Chen', 'male', '30-39', '["family-oriented", "safety-conscious"]', 'friendly', 3, 3, true),
('Jessica Rivera', 'female', '35-44', '["busy professional", "values convenience"]', 'direct', 2, 3, true),
('Anthony Brown', 'male', '40-49', '["homeowner pride", "proactive"]', 'friendly', 3, 2, true),
-- Additional Medium profiles (close_difficulty 4-6)
('Christina Hayes', 'female', '45-54', '["detail-oriented", "researches everything"]', 'analytical', 5, 5, true),
('Michael Foster', 'male', '35-44', '["budget-conscious", "fair"]', 'direct', 5, 5, true),
('Angela Price', 'female', '50-59', '["quality-focused", "brand-loyal"]', 'friendly', 4, 4, true),
('Timothy Ross', 'male', '45-54', '["engineer mindset", "wants data"]', 'analytical', 6, 5, true),
('Diana Crawford', 'female', '40-49', '["health-conscious", "chemical-wary"]', 'emotional', 5, 6, true),
('Gregory Palmer', 'male', '55-64', '["retired military", "expects precision"]', 'direct', 5, 4, true),
-- Additional Hard profiles (close_difficulty 7-8)
('Victoria Lane', 'female', '55-64', '["wealthy", "high expectations"]', 'direct', 7, 7, true),
('Frank Morrison', 'male', '60-69', '["fixed income", "price-focused"]', 'guarded', 8, 7, true),
('Catherine Blake', 'female', '45-54', '["attorney", "questions everything"]', 'analytical', 7, 7, true),
('Raymond Tucker', 'male', '50-59', '["contractor", "thinks he knows better"]', 'confrontational', 7, 6, true),
-- Additional Very Hard profiles (close_difficulty 9-10)
('Helen Pierce', 'female', '75-84', '["suspicious", "been burned before"]', 'guarded', 9, 9, true),
('Walter Griffin', 'male', '70-79', '["demanding", "never satisfied"]', 'confrontational', 10, 10, true)
ON CONFLICT DO NOTHING;

-- System Courses
INSERT INTO courses (id, organization_id, name, description, category, icon, badge_name, badge_icon, is_system, display_order) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Sales Fundamentals', 'Master the basics of pest control sales.', 'sales', '📞', 'Sales Rookie', '🏅', true, 1),
('00000000-0000-0000-0000-000000000002', NULL, 'Objection Handling', 'Overcome price, value, and competitor objections.', 'sales', '🛡️', 'Objection Master', '🏆', true, 2),
('00000000-0000-0000-0000-000000000003', NULL, 'Customer Service Excellence', 'Deliver exceptional service.', 'service', '⭐', 'Service Star', '🌟', true, 3),
('00000000-0000-0000-0000-000000000004', NULL, 'Cancellation Saves', 'Keep customers who want to leave.', 'retention', '🔄', 'Retention Pro', '💎', true, 4),
('00000000-0000-0000-0000-000000000005', NULL, 'Angry Customer De-escalation', 'Turn frustrated customers around.', 'service', '😤', 'De-escalation Expert', '🧘', true, 5),
('00000000-0000-0000-0000-000000000006', NULL, 'Upselling & Cross-selling', 'Add value through additional services.', 'sales', '📈', 'Upsell Champion', '💰', true, 6)
ON CONFLICT (id) DO NOTHING;

-- Modules for each course
INSERT INTO course_modules (course_id, difficulty, name, description, scenario_count, pass_threshold, unlock_order) VALUES
-- Sales Fundamentals
('00000000-0000-0000-0000-000000000001', 'easy', 'First Contact Basics', 'Great first impressions and info gathering.', 10, 60, 0),
('00000000-0000-0000-0000-000000000001', 'medium', 'Presenting Solutions', 'Match needs to services.', 12, 65, 1),
('00000000-0000-0000-0000-000000000001', 'hard', 'Closing Techniques', 'Ask for the sale confidently.', 15, 70, 2),
-- Objection Handling
('00000000-0000-0000-0000-000000000002', 'easy', 'Price Objections', 'Handle too expensive and discounts.', 10, 60, 0),
('00000000-0000-0000-0000-000000000002', 'medium', 'Value & Trust', 'Overcome effectiveness doubts.', 12, 65, 1),
('00000000-0000-0000-0000-000000000002', 'hard', 'Competitor Objections', 'Handle comparisons.', 15, 70, 2),
-- Customer Service
('00000000-0000-0000-0000-000000000003', 'easy', 'Service Basics', 'Scheduling and routine interactions.', 10, 60, 0),
('00000000-0000-0000-0000-000000000003', 'medium', 'Problem Resolution', 'Service issues and billing.', 12, 65, 1),
('00000000-0000-0000-0000-000000000003', 'hard', 'Complex Situations', 'Multi-issue complaints.', 15, 70, 2),
-- Cancellation Saves
('00000000-0000-0000-0000-000000000004', 'easy', 'Understanding Why', 'Discover real cancellation reasons.', 10, 60, 0),
('00000000-0000-0000-0000-000000000004', 'medium', 'Value Articulation', 'Re-present value.', 12, 65, 1),
('00000000-0000-0000-0000-000000000004', 'hard', 'Competitive Saves', 'Retain vs competitors.', 15, 70, 2),
-- De-escalation
('00000000-0000-0000-0000-000000000005', 'easy', 'Active Listening', 'Let customers vent.', 10, 60, 0),
('00000000-0000-0000-0000-000000000005', 'medium', 'Taking Ownership', 'Apologize and propose solutions.', 12, 65, 1),
('00000000-0000-0000-0000-000000000005', 'hard', 'Extreme Situations', 'Threats and ultimatums.', 15, 70, 2),
-- Upselling
('00000000-0000-0000-0000-000000000006', 'easy', 'Spotting Opportunities', 'Recognize upsell moments.', 10, 60, 0),
('00000000-0000-0000-0000-000000000006', 'medium', 'Natural Transitions', 'Present without being pushy.', 12, 65, 1),
('00000000-0000-0000-0000-000000000006', 'hard', 'Add-on Resistance', 'Handle upsell objections.', 15, 70, 2)
ON CONFLICT DO NOTHING;