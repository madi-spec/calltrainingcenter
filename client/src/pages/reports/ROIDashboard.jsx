import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatCurrency(value) {
  if (value === null || value === undefined) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined) return '--';
  return `${value >= 0 ? '+' : ''}${value}%`;
}

function StatCard({ label, value, change, icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(change)} from last period
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ROICalculationForm({ config, onCalculate, calculating }) {
  const [formData, setFormData] = useState({
    periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    csatImprovement: '',
    fcrImprovement: '',
    ahtReductionSeconds: '',
    qualityScoreImprovement: '',
    platformCost: config?.platform_monthly_cost || '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCalculate({
      ...formData,
      csatImprovement: formData.csatImprovement ? parseFloat(formData.csatImprovement) : null,
      fcrImprovement: formData.fcrImprovement ? parseFloat(formData.fcrImprovement) : null,
      ahtReductionSeconds: formData.ahtReductionSeconds ? parseFloat(formData.ahtReductionSeconds) : null,
      qualityScoreImprovement: formData.qualityScoreImprovement ? parseFloat(formData.qualityScoreImprovement) : null,
      platformCost: formData.platformCost ? parseFloat(formData.platformCost) : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period Start
          </label>
          <input
            type="date"
            value={formData.periodStart}
            onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period End
          </label>
          <input
            type="date"
            value={formData.periodEnd}
            onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CSAT Improvement (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.csatImprovement}
            onChange={(e) => setFormData({ ...formData, csatImprovement: e.target.value })}
            placeholder="e.g., 2.5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            FCR Improvement (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.fcrImprovement}
            onChange={(e) => setFormData({ ...formData, fcrImprovement: e.target.value })}
            placeholder="e.g., 5.0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            AHT Reduction (seconds)
          </label>
          <input
            type="number"
            value={formData.ahtReductionSeconds}
            onChange={(e) => setFormData({ ...formData, ahtReductionSeconds: e.target.value })}
            placeholder="e.g., 30"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quality Score Improvement (pts)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.qualityScoreImprovement}
            onChange={(e) => setFormData({ ...formData, qualityScoreImprovement: e.target.value })}
            placeholder="e.g., 5"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Platform Cost ($)
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.platformCost}
          onChange={(e) => setFormData({ ...formData, platformCost: e.target.value })}
          placeholder="Monthly platform cost"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add notes about this calculation..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={calculating}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {calculating ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Calculating...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculate ROI
          </>
        )}
      </button>
    </form>
  );
}

function CalculationHistory({ calculations }) {
  if (!calculations || calculations.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 dark:text-gray-400">
        No ROI calculations yet. Create your first calculation above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calculations.map((calc) => (
        <div
          key={calc.id}
          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(calc.period_start).toLocaleDateString()} - {new Date(calc.period_end).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {calc.training_sessions} sessions | {calc.training_hours}h training
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              calc.roi_percentage >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              calc.roi_percentage >= 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {calc.roi_percentage !== null ? `${Math.round(calc.roi_percentage)}% ROI` : 'N/A'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Investment</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(calc.total_investment)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Cost Savings</p>
              <p className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(calc.estimated_cost_savings)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Revenue Gain</p>
              <p className="font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(calc.estimated_revenue_gain)}
              </p>
            </div>
          </div>

          {calc.calculation_notes && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
              {calc.calculation_notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function ROIDashboard() {
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [calculations, setCalculations] = useState([]);
  const [config, setConfig] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const headers = await getAuthHeader();

      const [summaryRes, calcsRes, configRes] = await Promise.all([
        fetch(`${API_URL}/api/roi/summary`, { headers }),
        fetch(`${API_URL}/api/roi/calculations`, { headers }),
        fetch(`${API_URL}/api/roi/config`, { headers })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (calcsRes.ok) {
        const data = await calcsRes.json();
        setCalculations(data.calculations || []);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error fetching ROI data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCalculate = async (data) => {
    setCalculating(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/roi/calculate`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error calculating ROI:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ROI Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track training investment returns and business impact
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Training This Month"
          value={`${summary?.currentMonth?.sessionCount || 0} sessions`}
          color="primary"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <StatCard
          label="YTD Total Investment"
          value={formatCurrency(summary?.yearToDate?.totalInvestment)}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="YTD Total Benefit"
          value={formatCurrency((summary?.yearToDate?.totalSavings || 0) + (summary?.yearToDate?.totalRevenue || 0))}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatCard
          label="YTD ROI"
          value={`${summary?.yearToDate?.totalROI || 0}%`}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                ROI Calculator
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Calculate ROI for a period
              </p>
            </div>
            <div className="p-4">
              <ROICalculationForm
                config={config}
                onCalculate={handleCalculate}
                calculating={calculating}
              />
            </div>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Calculation History
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Previous ROI calculations
              </p>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              <CalculationHistory calculations={calculations} />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              How ROI is calculated
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              ROI = (Total Benefit - Total Investment) / Total Investment × 100.
              Benefits include estimated cost savings from efficiency gains and revenue increases from improved customer satisfaction.
              Configure value assumptions in Settings to customize calculations for your organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ROIDashboard;
