-- =============================================
-- VERIFICATION QUERIES
-- Run after seed data to verify counts
-- =============================================

SELECT 'service_categories' as tbl, COUNT(*) as count FROM service_categories
UNION ALL SELECT 'pest_types', COUNT(*) FROM pest_types
UNION ALL SELECT 'package_templates', COUNT(*) FROM package_templates
UNION ALL SELECT 'objection_templates', COUNT(*) FROM objection_templates
UNION ALL SELECT 'customer_profiles', COUNT(*) FROM customer_profiles
UNION ALL SELECT 'courses', COUNT(*) FROM courses
UNION ALL SELECT 'course_modules', COUNT(*) FROM course_modules;

-- Expected results:
-- service_categories: 9
-- pest_types: 28
-- package_templates: 9
-- objection_templates: 11
-- customer_profiles: 48
-- courses: 6
-- course_modules: 18