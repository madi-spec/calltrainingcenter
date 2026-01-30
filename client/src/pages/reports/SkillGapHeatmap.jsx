import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { HeatmapGrid, HeatmapLegend } from '../../components/heatmap';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatCategoryName(category) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function CriticalGapsPanel({ gaps, onCreatePlan }) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 dark:text-gray-400">
        No critical skill gaps found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {gaps.map((gap) => (
        <div
          key={gap.id}
          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {gap.user?.full_name || 'Unknown User'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                {formatCategoryName(gap.skill_category)}: {gap.current_score}% (Gap: {gap.gap_size}pts)
              </p>
            </div>
          </div>
          <button
            onClick={() => onCreatePlan(gap)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            Create Plan
          </button>
        </div>
      ))}
    </div>
  );
}

function ImprovementPlanModal({ isOpen, onClose, gap, onSubmit }) {
  const [formData, setFormData] = useState({
    targetScore: 80,
    targetDate: '',
    notes: ''
  });

  if (!isOpen || !gap) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      userId: gap.user_id,
      targetSkill: gap.skill_category,
      ...formData
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Create Improvement Plan
        </h2>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{gap.user?.full_name}</strong> - {formatCategoryName(gap.skill_category)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current: {gap.current_score}% | Target: {gap.target_score}%
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.targetScore}
              onChange={(e) => setFormData({ ...formData, targetScore: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Date (Optional)
            </label>
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add coaching notes or specific focus areas..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Plan
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SkillGapHeatmap() {
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [heatmapData, setHeatmapData] = useState({ users: [], categories: [], averages: {} });
  const [criticalGaps, setCriticalGaps] = useState([]);
  const [selectedGap, setSelectedGap] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = await getAuthHeader();

      const [heatmapRes, criticalRes] = await Promise.all([
        fetch(`${API_URL}/api/skill-gaps/team-assessment`, { headers }),
        fetch(`${API_URL}/api/skill-gaps/critical`, { headers })
      ]);

      if (heatmapRes.ok) {
        const data = await heatmapRes.json();
        setHeatmapData(data);
      }

      if (criticalRes.ok) {
        const data = await criticalRes.json();
        setCriticalGaps(data.criticalGaps || []);
      }
    } catch (error) {
      console.error('Error fetching skill gap data:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_URL}/api/skill-gaps/refresh`, {
        method: 'POST',
        headers
      });
      await fetchData();
    } catch (error) {
      console.error('Error refreshing skill gaps:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreatePlan = (gap) => {
    setSelectedGap(gap);
    setShowPlanModal(true);
  };

  const handleSubmitPlan = async (planData) => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/skill-gaps/improvement-plan`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        setShowPlanModal(false);
        setSelectedGap(null);
        // Refresh data
        fetchData();
      }
    } catch (error) {
      console.error('Error creating improvement plan:', error);
    }
  };

  const handleUserClick = (user) => {
    // Could navigate to user detail or show modal
    console.log('User clicked:', user);
  };

  const handleCategoryClick = (user, category) => {
    // Could show detailed history or create improvement plan
    console.log('Category clicked:', user, category);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Skill Gap Analysis
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Identify training needs and track team skill development
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6">
        <HeatmapLegend />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Heatmap */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Team Skill Heatmap
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {heatmapData.totalUsers} team members
              </p>
            </div>
            <div className="p-4">
              <HeatmapGrid
                users={heatmapData.users}
                categories={heatmapData.categories}
                averages={heatmapData.averages}
                onUserClick={handleUserClick}
                onCategoryClick={handleCategoryClick}
              />
            </div>
          </div>
        </div>

        {/* Critical Gaps Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Critical Gaps
                </h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {criticalGaps.length} requiring attention
              </p>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              <CriticalGapsPanel
                gaps={criticalGaps}
                onCreatePlan={handleCreatePlan}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Plan Modal */}
      <ImprovementPlanModal
        isOpen={showPlanModal}
        onClose={() => {
          setShowPlanModal(false);
          setSelectedGap(null);
        }}
        gap={selectedGap}
        onSubmit={handleSubmitPlan}
      />
    </div>
  );
}

export default SkillGapHeatmap;
