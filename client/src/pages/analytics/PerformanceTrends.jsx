import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertCircle,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PerformanceTrends() {
  const { authFetch } = useAuth();
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPerformanceTrends();
  }, [timeframe]);

  const fetchPerformanceTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/reports/performance-trends?timeframe=${timeframe}`);

      if (!response.ok) {
        throw new Error('Failed to fetch performance trends');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching performance trends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-red-400 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>Error loading performance trends</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const hasData = data && data.totalSessions > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary-500" />
            Performance Trends & Insights
          </h1>
          <p className="text-gray-400 mt-1">
            Track your progress and identify areas for improvement
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex bg-gray-800 rounded-lg p-1">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: 'all', label: 'All Time' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeframe === option.value
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasData ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center"
        >
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">No Data Yet</h2>
          <p className="text-gray-400 mb-6">
            Complete some training sessions to see your performance trends and insights.
          </p>
          <a
            href="/scenarios"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            Start Training
          </a>
        </motion.div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-100 mt-1">
                {data.totalSessions}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Award className="w-5 h-5 text-green-500" />
                </div>
                <span className={`text-sm flex items-center gap-1 ${
                  data.userAverage >= 80 ? 'text-green-400' : data.userAverage >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {data.userAverage >= 80 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              </div>
              <p className="text-gray-400 text-sm">Your Average Score</p>
              <p className="text-3xl font-bold text-gray-100 mt-1">
                {data.userAverage}%
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                {data.teamAverage && (
                  <span className={`text-sm flex items-center gap-1 ${
                    data.userAverage > data.teamAverage ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {data.userAverage > data.teamAverage ? '+' : ''}
                    {data.userAverage - data.teamAverage}%
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">Team Average</p>
              <p className="text-3xl font-bold text-gray-100 mt-1">
                {data.teamAverage ? `${data.teamAverage}%` : 'N/A'}
              </p>
            </motion.div>
          </div>

          {/* Score Trends Chart */}
          {data.scoresTrend && data.scoresTrend.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-100 mb-6">Score Trends Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.scoresTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value) => [`${value}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Category Performance Chart */}
          {data.categoryPerformance && data.categoryPerformance.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-100 mb-6">Performance by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="category"
                    stroke="#9CA3AF"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke="#9CA3AF" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value) => [`${value}%`, 'Average Score']}
                  />
                  <Bar dataKey="average" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Getting Better At */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-100">Getting Better At</h2>
              </div>
              {data.improvingCategories && data.improvingCategories.length > 0 ? (
                <div className="space-y-3">
                  {data.improvingCategories.map((category) => (
                    <div
                      key={category.key}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-200">{category.category}</span>
                        <span className="text-green-400 flex items-center gap-1 text-sm font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          +{category.change}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{category.previousAverage}% → {category.currentAverage}%</span>
                        <span className="text-green-400">+{category.percentChange}% improvement</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Keep practicing to see your improvements!
                </p>
              )}
            </motion.div>

            {/* Needs Work */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-lg font-semibold text-gray-100">Needs Work</h2>
              </div>
              {data.needsWorkCategories && data.needsWorkCategories.length > 0 ? (
                <div className="space-y-3">
                  {data.needsWorkCategories.map((category) => (
                    <div
                      key={category.key}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-200">{category.category}</span>
                        <span className={`flex items-center gap-1 text-sm font-semibold ${
                          category.change < 0 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {category.change < 0 && <TrendingDown className="w-4 h-4" />}
                          {category.currentAverage}%
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {category.change < 0 ? (
                          <span className="text-red-400">{category.change}% decline</span>
                        ) : (
                          <span>Focus area for improvement</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Great job! All categories are performing well.
                </p>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
