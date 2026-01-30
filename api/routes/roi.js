import express from 'express';
import { createAdminClient } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../lib/auth.js';

const router = express.Router();

// All routes require admin or owner role
router.use(requireAuth);
router.use(requireRole(['admin', 'owner']));

/**
 * GET /api/roi/config
 * Get ROI configuration for the organization
 */
router.get('/config', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    const { data, error } = await supabase
      .from('roi_config')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return default config if none exists
    const config = data || {
      avg_hourly_labor_cost: 25,
      platform_monthly_cost: null,
      csat_point_value: 1000,
      fcr_point_value: 500,
      aht_second_value: 0.05,
      quality_point_value: 200,
      csat_target: 85,
      fcr_target: 75,
      aht_target_seconds: 300,
      quality_target: 80
    };

    res.json({ config });
  } catch (error) {
    console.error('Error fetching ROI config:', error);
    res.status(500).json({ error: 'Failed to fetch ROI config' });
  }
});

/**
 * PUT /api/roi/config
 * Update ROI configuration
 */
router.put('/config', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const updates = req.body;

    const { data, error } = await supabase
      .from('roi_config')
      .upsert({
        org_id: orgId,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'org_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ config: data });
  } catch (error) {
    console.error('Error updating ROI config:', error);
    res.status(500).json({ error: 'Failed to update ROI config' });
  }
});

/**
 * GET /api/roi/metrics
 * Get business metrics for the organization
 */
router.get('/metrics', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { periodType = 'monthly', startDate, endDate } = req.query;

    let query = supabase
      .from('business_metrics')
      .select('*')
      .eq('org_id', orgId)
      .order('period_start', { ascending: false });

    if (periodType) {
      query = query.eq('period_type', periodType);
    }
    if (startDate) {
      query = query.gte('period_start', startDate);
    }
    if (endDate) {
      query = query.lte('period_end', endDate);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;

    res.json({ metrics: data || [] });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * POST /api/roi/metrics
 * Add a new business metric
 */
router.post('/metrics', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { metricType, metricName, metricUnit, value, previousValue, periodType, periodStart, periodEnd, source } = req.body;

    const { data, error } = await supabase
      .from('business_metrics')
      .insert({
        org_id: orgId,
        metric_type: metricType,
        metric_name: metricName || null,
        metric_unit: metricUnit || null,
        value,
        previous_value: previousValue || null,
        period_type: periodType || 'monthly',
        period_start: periodStart,
        period_end: periodEnd,
        source: source || 'manual'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ metric: data });
  } catch (error) {
    console.error('Error creating metric:', error);
    res.status(500).json({ error: 'Failed to create metric' });
  }
});

/**
 * DELETE /api/roi/metrics/:id
 * Delete a business metric
 */
router.delete('/metrics/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { id } = req.params;

    const { error } = await supabase
      .from('business_metrics')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting metric:', error);
    res.status(500).json({ error: 'Failed to delete metric' });
  }
});

/**
 * GET /api/roi/calculations
 * Get ROI calculations for the organization
 */
router.get('/calculations', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    const { data, error } = await supabase
      .from('roi_calculations')
      .select('*')
      .eq('org_id', orgId)
      .order('period_start', { ascending: false })
      .limit(12);

    if (error) throw error;

    res.json({ calculations: data || [] });
  } catch (error) {
    console.error('Error fetching calculations:', error);
    res.status(500).json({ error: 'Failed to fetch calculations' });
  }
});

/**
 * POST /api/roi/calculate
 * Calculate ROI for a given period
 */
router.post('/calculate', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;
    const { periodStart, periodEnd, csatImprovement, fcrImprovement, ahtReductionSeconds, qualityScoreImprovement, platformCost, notes } = req.body;

    // Get ROI config for calculations
    const { data: config } = await supabase
      .from('roi_config')
      .select('*')
      .eq('org_id', orgId)
      .single();

    const hourlyRate = config?.avg_hourly_labor_cost || 25;
    const csatValue = config?.csat_point_value || 1000;
    const fcrValue = config?.fcr_point_value || 500;
    const ahtValue = config?.aht_second_value || 0.05;
    const qualityValue = config?.quality_point_value || 200;

    // Get training data for the period
    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('duration_seconds, user_id')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('ended_at', periodStart)
      .lte('ended_at', periodEnd);

    const totalTrainingSeconds = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const trainingHours = totalTrainingSeconds / 3600;
    const trainingSessionCount = sessions?.length || 0;
    const estimatedLaborCost = trainingHours * hourlyRate;

    // Calculate estimated benefits
    let estimatedCostSavings = 0;
    let estimatedRevenueGain = 0;

    if (csatImprovement) {
      estimatedRevenueGain += csatImprovement * csatValue;
    }
    if (fcrImprovement) {
      estimatedCostSavings += fcrImprovement * fcrValue;
    }
    if (ahtReductionSeconds) {
      // Assume average of 1000 calls per month for calculation
      const callsPerMonth = 1000;
      estimatedCostSavings += ahtReductionSeconds * ahtValue * callsPerMonth;
    }
    if (qualityScoreImprovement) {
      estimatedRevenueGain += qualityScoreImprovement * qualityValue;
    }

    const { data, error } = await supabase
      .from('roi_calculations')
      .insert({
        org_id: orgId,
        period_start: periodStart,
        period_end: periodEnd,
        training_hours: Math.round(trainingHours * 10) / 10,
        training_sessions: trainingSessionCount,
        platform_cost: platformCost || config?.platform_monthly_cost || 0,
        estimated_labor_cost: Math.round(estimatedLaborCost),
        csat_improvement: csatImprovement || null,
        fcr_improvement: fcrImprovement || null,
        aht_reduction_seconds: ahtReductionSeconds || null,
        quality_score_improvement: qualityScoreImprovement || null,
        estimated_cost_savings: Math.round(estimatedCostSavings),
        estimated_revenue_gain: Math.round(estimatedRevenueGain),
        calculation_notes: notes || null,
        assumptions: {
          hourlyRate,
          csatValue,
          fcrValue,
          ahtValue,
          qualityValue
        }
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ calculation: data });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({ error: 'Failed to calculate ROI' });
  }
});

/**
 * GET /api/roi/summary
 * Get ROI summary stats
 */
router.get('/summary', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { orgId } = req.user;

    // Get latest calculation
    const { data: latestCalc } = await supabase
      .from('roi_calculations')
      .select('*')
      .eq('org_id', orgId)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    // Get training stats for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: sessions } = await supabase
      .from('training_sessions')
      .select('duration_seconds')
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('ended_at', monthStart.toISOString());

    const totalMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
    const sessionCount = sessions?.length || 0;

    // Get total calculations YTD
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const { data: ytdCalcs } = await supabase
      .from('roi_calculations')
      .select('estimated_cost_savings, estimated_revenue_gain, total_investment')
      .eq('org_id', orgId)
      .gte('period_start', yearStart.toISOString());

    const ytdSavings = (ytdCalcs || []).reduce((sum, c) => sum + (c.estimated_cost_savings || 0), 0);
    const ytdRevenue = (ytdCalcs || []).reduce((sum, c) => sum + (c.estimated_revenue_gain || 0), 0);
    const ytdInvestment = (ytdCalcs || []).reduce((sum, c) => sum + (c.total_investment || 0), 0);

    res.json({
      currentMonth: {
        trainingMinutes: Math.round(totalMinutes),
        sessionCount
      },
      latest: latestCalc || null,
      yearToDate: {
        totalSavings: ytdSavings,
        totalRevenue: ytdRevenue,
        totalInvestment: ytdInvestment,
        totalROI: ytdInvestment > 0 ? Math.round(((ytdSavings + ytdRevenue) / ytdInvestment) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching ROI summary:', error);
    res.status(500).json({ error: 'Failed to fetch ROI summary' });
  }
});

export default router;
