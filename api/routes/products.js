/**
 * Product Configuration API Routes
 *
 * Handles service categories, pest types, packages, selling points,
 * objections, competitors, and sales guidelines.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';

const router = Router();

// ============ REFERENCE DATA (Public Read) ============

/**
 * GET /api/products/service-categories
 * List all service categories (system reference data)
 */
router.get('/service-categories', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, categories: data });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/pest-types
 * List all pest types (system reference data)
 */
router.get('/pest-types', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('pest_types')
      .select('*')
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, pestTypes: data });
  } catch (error) {
    console.error('Error fetching pest types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/package-templates/:slug
 * Get package templates for a specific service category
 */
router.get('/package-templates/:slug', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_templates')
      .select('*')
      .eq('service_category_slug', req.params.slug)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, templates: data });
  } catch (error) {
    console.error('Error fetching package templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/objection-templates?industry=lawn_care
 * List objection templates filtered by industry (optional)
 */
router.get('/objection-templates', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { industry } = req.query;

    let query = adminClient
      .from('objection_templates')
      .select('*')
      .eq('is_active', true);

    // Filter by industry using display_order ranges
    // Pest control: 1-59, Lawn care: 60-119, Both: all
    if (industry === 'lawn_care') {
      query = query.gte('display_order', 60).lte('display_order', 119);
    } else if (industry === 'pest_control') {
      query = query.gte('display_order', 1).lte('display_order', 59);
    }
    // If industry === 'both' or not specified, return all

    query = query.order('display_order');

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, templates: data });
  } catch (error) {
    console.error('Error fetching objection templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVICE LINES (Org-scoped) ============

/**
 * GET /api/products/service-lines
 * List org's active service lines with category info
 */
router.get('/service-lines', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('company_service_lines')
      .select(`
        *,
        category:service_categories(*)
      `)
      .eq('organization_id', req.organization.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    res.json({ success: true, serviceLines: data });
  } catch (error) {
    console.error('Error fetching service lines:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/service-lines
 * Add a service line for the org
 */
router.post('/service-lines', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { category_id, is_primary, notes } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'category_id is required' });
    }

    const adminClient = createAdminClient();

    // If setting as primary, unset other primaries first
    if (is_primary) {
      await adminClient
        .from('company_service_lines')
        .update({ is_primary: false })
        .eq('organization_id', req.organization.id);
    }

    const { data, error } = await adminClient
      .from('company_service_lines')
      .insert({
        organization_id: req.organization.id,
        category_id,
        is_primary: is_primary || false,
        notes
      })
      .select(`
        *,
        category:service_categories(*)
      `)
      .single();

    if (error) throw error;
    res.json({ success: true, serviceLine: data });
  } catch (error) {
    console.error('Error creating service line:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/service-lines/:id
 * Remove a service line (soft delete via is_active)
 */
router.delete('/service-lines/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('company_service_lines')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service line:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PACKAGES (Org-scoped) ============

/**
 * GET /api/products/packages
 * List all packages for the org
 */
router.get('/packages', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('service_packages')
      .select(`
        *,
        service_line:company_service_lines(
          *,
          category:service_categories(*)
        ),
        selling_points:package_selling_points(*),
        objections:package_objections(*)
      `)
      .eq('organization_id', req.organization.id)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, packages: data });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/packages/:id
 * Get single package with all details
 */
router.get('/packages/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('service_packages')
      .select(`
        *,
        service_line:company_service_lines(
          *,
          category:service_categories(*)
        ),
        selling_points:package_selling_points(*),
        objections:package_objections(*)
      `)
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Package not found' });

    res.json({ success: true, package: data });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/packages
 * Create a new package
 */
router.post('/packages', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const {
      service_line_id,
      name,
      internal_name,
      description,
      pricing_model,
      initial_price,
      recurring_price,
      price_display,
      included_pests,
      included_services,
      service_frequency,
      warranty_details,
      target_customer,
      ideal_situations,
      is_featured,
      display_order
    } = req.body;

    if (!service_line_id || !name) {
      return res.status(400).json({ error: 'service_line_id and name are required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('service_packages')
      .insert({
        organization_id: req.organization.id,
        service_line_id,
        name,
        internal_name,
        description,
        pricing_model,
        initial_price,
        recurring_price,
        price_display,
        included_pests: included_pests || [],
        included_services: included_services || [],
        service_frequency,
        warranty_details,
        target_customer,
        ideal_situations: ideal_situations || [],
        is_featured: is_featured || false,
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, package: data });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/packages/from-template
 * Create a package from a template
 */
router.post('/packages/from-template', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { template_id, service_line_id, overrides } = req.body;

    if (!template_id || !service_line_id) {
      return res.status(400).json({ error: 'template_id and service_line_id are required' });
    }

    const adminClient = createAdminClient();

    // Fetch the template
    const { data: template, error: templateError } = await adminClient
      .from('package_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError) throw templateError;
    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Create package from template
    const { data, error } = await adminClient
      .from('service_packages')
      .insert({
        organization_id: req.organization.id,
        service_line_id,
        name: overrides?.name || template.suggested_name,
        internal_name: overrides?.internal_name || template.suggested_internal_name,
        description: overrides?.description || template.suggested_description,
        pricing_model: overrides?.pricing_model || template.suggested_pricing_model,
        initial_price: overrides?.initial_price ?? template.suggested_initial_price,
        recurring_price: overrides?.recurring_price ?? template.suggested_recurring_price,
        service_frequency: overrides?.service_frequency || template.suggested_frequency,
        warranty_details: overrides?.warranty_details || template.suggested_warranty,
        included_pests: overrides?.included_pests || template.suggested_pests || [],
        included_services: overrides?.included_services || template.suggested_services || [],
        display_order: overrides?.display_order || template.display_order || 0
      })
      .select()
      .single();

    if (error) throw error;

    // Add default selling points from template if available
    if (template.suggested_selling_points?.length > 0) {
      const sellingPoints = template.suggested_selling_points.map((point, idx) => ({
        package_id: data.id,
        point: typeof point === 'string' ? point : point.text,
        emphasis_level: typeof point === 'string' ? 1 : (point.emphasis || 1),
        display_order: idx
      }));

      await adminClient.from('package_selling_points').insert(sellingPoints);
    }

    res.json({ success: true, package: data });
  } catch (error) {
    console.error('Error creating package from template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/packages/:id
 * Update a package
 */
router.put('/packages/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('service_packages')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, package: data });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/packages/:id
 * Soft delete a package
 */
router.delete('/packages/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('service_packages')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SELLING POINTS ============

/**
 * GET /api/products/packages/:id/selling-points
 */
router.get('/packages/:id/selling-points', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_selling_points')
      .select('*')
      .eq('package_id', req.params.id)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, sellingPoints: data });
  } catch (error) {
    console.error('Error fetching selling points:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/packages/:id/selling-points
 */
router.post('/packages/:id/selling-points', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { point, emphasis_level, display_order } = req.body;

    if (!point) {
      return res.status(400).json({ error: 'point is required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_selling_points')
      .insert({
        package_id: req.params.id,
        point,
        emphasis_level: emphasis_level || 1,
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, sellingPoint: data });
  } catch (error) {
    console.error('Error creating selling point:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/packages/:packageId/selling-points/:id
 */
router.put('/packages/:packageId/selling-points/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_selling_points')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('package_id', req.params.packageId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, sellingPoint: data });
  } catch (error) {
    console.error('Error updating selling point:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/packages/:packageId/selling-points/:id
 */
router.delete('/packages/:packageId/selling-points/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('package_selling_points')
      .delete()
      .eq('id', req.params.id)
      .eq('package_id', req.params.packageId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting selling point:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PACKAGE OBJECTIONS ============

/**
 * GET /api/products/packages/:id/objections
 */
router.get('/packages/:id/objections', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_objections')
      .select('*')
      .eq('package_id', req.params.id)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, objections: data });
  } catch (error) {
    console.error('Error fetching package objections:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/packages/:id/objections
 */
router.post('/packages/:id/objections', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const {
      objection_text,
      objection_category,
      frequency,
      recommended_response,
      response_key_points,
      alternative_responses,
      avoid_saying,
      coaching_tip,
      display_order
    } = req.body;

    if (!objection_text || !recommended_response) {
      return res.status(400).json({ error: 'objection_text and recommended_response are required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_objections')
      .insert({
        package_id: req.params.id,
        objection_text,
        objection_category,
        frequency: frequency || 'common',
        recommended_response,
        response_key_points: response_key_points || [],
        alternative_responses: alternative_responses || [],
        avoid_saying: avoid_saying || [],
        coaching_tip,
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, objection: data });
  } catch (error) {
    console.error('Error creating package objection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/packages/:packageId/objections/:id
 */
router.put('/packages/:packageId/objections/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('package_objections')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('package_id', req.params.packageId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, objection: data });
  } catch (error) {
    console.error('Error updating package objection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/packages/:packageId/objections/:id
 */
router.delete('/packages/:packageId/objections/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('package_objections')
      .delete()
      .eq('id', req.params.id)
      .eq('package_id', req.params.packageId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting package objection:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ COMPETITORS ============

/**
 * GET /api/products/competitors
 */
router.get('/competitors', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('competitor_info')
      .select('*')
      .eq('organization_id', req.organization.id)
      .eq('is_active', true);

    if (error) throw error;
    res.json({ success: true, competitors: data });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/competitors
 */
router.post('/competitors', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const {
      name,
      nickname,
      typical_pricing,
      known_weaknesses,
      their_pitch,
      our_advantages,
      response_when_mentioned
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('competitor_info')
      .insert({
        organization_id: req.organization.id,
        name,
        nickname,
        typical_pricing,
        known_weaknesses: known_weaknesses || [],
        their_pitch: their_pitch || [],
        our_advantages: our_advantages || [],
        response_when_mentioned
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, competitor: data });
  } catch (error) {
    console.error('Error creating competitor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/competitors/:id
 */
router.put('/competitors/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('competitor_info')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, competitor: data });
  } catch (error) {
    console.error('Error updating competitor:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/competitors/:id
 */
router.delete('/competitors/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('competitor_info')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SALES GUIDELINES ============

/**
 * GET /api/products/sales-guidelines
 */
router.get('/sales-guidelines', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('sales_guidelines')
      .select('*')
      .eq('organization_id', req.organization.id)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    res.json({ success: true, guidelines: data });
  } catch (error) {
    console.error('Error fetching sales guidelines:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/sales-guidelines
 */
router.post('/sales-guidelines', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { guideline_type, title, content, examples, display_order } = req.body;

    if (!guideline_type || !content) {
      return res.status(400).json({ error: 'guideline_type and content are required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('sales_guidelines')
      .insert({
        organization_id: req.organization.id,
        guideline_type,
        title,
        content,
        examples: examples || [],
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, guideline: data });
  } catch (error) {
    console.error('Error creating sales guideline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/sales-guidelines/:id
 */
router.put('/sales-guidelines/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('sales_guidelines')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, guideline: data });
  } catch (error) {
    console.error('Error updating sales guideline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/sales-guidelines/:id
 */
router.delete('/sales-guidelines/:id', authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('sales_guidelines')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sales guideline:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ PRODUCT CONTEXT (for scenarios/coaching) ============

/**
 * GET /api/products/context
 * Get full product context for scenario generation and coaching
 */
router.get('/context', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    // Fetch all relevant data in parallel
    const [
      { data: serviceLines },
      { data: packages },
      { data: competitors },
      { data: guidelines }
    ] = await Promise.all([
      adminClient
        .from('company_service_lines')
        .select(`
          *,
          category:service_categories(*)
        `)
        .eq('organization_id', req.organization.id)
        .eq('is_active', true),
      adminClient
        .from('service_packages')
        .select(`
          *,
          selling_points:package_selling_points(*),
          objections:package_objections(*)
        `)
        .eq('organization_id', req.organization.id)
        .eq('is_active', true),
      adminClient
        .from('competitor_info')
        .select('*')
        .eq('organization_id', req.organization.id)
        .eq('is_active', true),
      adminClient
        .from('sales_guidelines')
        .select('*')
        .eq('organization_id', req.organization.id)
        .eq('is_active', true)
    ]);

    // Build context object
    const context = {
      company: {
        name: req.organization.name,
        phone: req.organization.phone,
        website: req.organization.website,
        services: req.organization.services,
        guarantees: req.organization.guarantees,
        valuePropositions: req.organization.value_propositions
      },
      serviceLines: serviceLines?.map(sl => ({
        id: sl.id,
        name: sl.category?.name,
        slug: sl.category?.slug,
        isPrimary: sl.is_primary
      })) || [],
      packages: packages?.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        pricingModel: pkg.pricing_model,
        initialPrice: pkg.initial_price,
        recurringPrice: pkg.recurring_price,
        priceDisplay: pkg.price_display,
        frequency: pkg.service_frequency,
        warranty: pkg.warranty_details,
        includedPests: pkg.included_pests,
        includedServices: pkg.included_services,
        sellingPoints: pkg.selling_points?.map(sp => sp.point) || [],
        commonObjections: pkg.objections?.map(obj => ({
          objection: obj.objection_text,
          response: obj.recommended_response
        })) || [],
        isFeatured: pkg.is_featured
      })) || [],
      competitors: competitors?.map(c => ({
        name: c.name,
        nickname: c.nickname,
        pricing: c.typical_pricing,
        weaknesses: c.known_weaknesses,
        ourAdvantages: c.our_advantages,
        responseScript: c.response_when_mentioned
      })) || [],
      salesGuidelines: guidelines?.reduce((acc, g) => {
        acc[g.guideline_type] = acc[g.guideline_type] || [];
        acc[g.guideline_type].push({
          title: g.title,
          content: g.content,
          examples: g.examples
        });
        return acc;
      }, {}) || {},
      hasProductsConfigured: (packages?.length || 0) > 0
    };

    res.json({ success: true, context });
  } catch (error) {
    console.error('Error fetching product context:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
