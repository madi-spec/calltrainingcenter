-- Migration: 016_roi_metrics.sql
-- Description: ROI tracking and business metrics dashboard

-- Business metrics (configurable KPIs)
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Metric definition
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'customer_satisfaction', 'first_call_resolution', 'average_handle_time',
    'call_quality_score', 'upsell_rate', 'retention_rate', 'nps_score',
    'escalation_rate', 'training_completion_rate', 'custom'
  )),
  metric_name TEXT, -- For custom metrics
  metric_unit TEXT, -- e.g., 'percent', 'seconds', 'dollars', 'score'

  -- Value
  value NUMERIC NOT NULL,
  previous_value NUMERIC,

  -- Time period
  period_type TEXT DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Source
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'integrated', 'calculated')),
  source_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROI calculations
CREATE TABLE IF NOT EXISTS roi_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Training investment
  training_hours NUMERIC DEFAULT 0,
  training_sessions INTEGER DEFAULT 0,
  platform_cost NUMERIC DEFAULT 0,
  estimated_labor_cost NUMERIC DEFAULT 0,
  total_investment NUMERIC GENERATED ALWAYS AS (platform_cost + estimated_labor_cost) STORED,

  -- Measured improvements
  csat_improvement NUMERIC, -- Percentage point change
  fcr_improvement NUMERIC,
  aht_reduction_seconds NUMERIC,
  quality_score_improvement NUMERIC,

  -- Calculated savings/gains
  estimated_cost_savings NUMERIC,
  estimated_revenue_gain NUMERIC,
  estimated_total_benefit NUMERIC GENERATED ALWAYS AS (
    COALESCE(estimated_cost_savings, 0) + COALESCE(estimated_revenue_gain, 0)
  ) STORED,

  -- ROI
  roi_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN (platform_cost + estimated_labor_cost) > 0
    THEN ((COALESCE(estimated_cost_savings, 0) + COALESCE(estimated_revenue_gain, 0)) /
          (platform_cost + estimated_labor_cost) * 100)
    ELSE 0 END
  ) STORED,

  -- Notes
  calculation_notes TEXT,
  assumptions JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROI configuration (how to calculate)
CREATE TABLE IF NOT EXISTS roi_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Cost assumptions
  avg_hourly_labor_cost NUMERIC DEFAULT 25,
  platform_monthly_cost NUMERIC,

  -- Value assumptions
  csat_point_value NUMERIC DEFAULT 1000, -- Value of 1% CSAT improvement
  fcr_point_value NUMERIC DEFAULT 500, -- Value of 1% FCR improvement
  aht_second_value NUMERIC DEFAULT 0.05, -- Value per second saved
  quality_point_value NUMERIC DEFAULT 200, -- Value per quality point

  -- Targets
  csat_target NUMERIC DEFAULT 85,
  fcr_target NUMERIC DEFAULT 75,
  aht_target_seconds NUMERIC DEFAULT 300,
  quality_target NUMERIC DEFAULT 80,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_metrics_org ON business_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_roi_calculations_org ON roi_calculations(org_id);
CREATE INDEX IF NOT EXISTS idx_roi_calculations_period ON roi_calculations(period_start);

-- RLS Policies
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_config ENABLE ROW LEVEL SECURITY;

-- Business metrics: admin/owner only
CREATE POLICY business_metrics_policy ON business_metrics
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ROI calculations: admin/owner only
CREATE POLICY roi_calculations_policy ON roi_calculations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ROI config: admin/owner only
CREATE POLICY roi_config_policy ON roi_config
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
