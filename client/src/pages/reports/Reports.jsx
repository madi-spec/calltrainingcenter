import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Users,
  Target,
  Clock,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const { authFetch, role, hasPermission } = useAuth();

  const [reportType, setReportType] = useState('personal');
  const [dateRange, setDateRange] = useState('month');
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const canViewTeam = hasPermission('reports:view_team');
  const canViewOrg = hasPermission('reports:view_all');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        let endpoint = '/api/reports/my-progress';
        if (reportType === 'team' && canViewTeam) {
          endpoint = '/api/reports/team';
        } else if (reportType === 'organization' && canViewOrg) {
          endpoint = '/api/reports/organization';
        }

        const response = await authFetch(`${endpoint}?range=${dateRange}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setTrends(data.trends || []);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [authFetch, reportType, dateRange, canViewTeam, canViewOrg]);

  const handleExport = async () => {
    try {
      const response = await authFetch(`/api/reports/export?type=${reportType}&range=${dateRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportType}-${dateRange}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-400 mt-1">
            Track performance and identify areas for improvement
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Report Type */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setReportType('personal')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'personal'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            My Progress
          </button>
          {canViewTeam && (
            <button
              onClick={() => setReportType('team')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'team'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Team
            </button>
          )}
          {canViewOrg && (
            <button
              onClick={() => setReportType('organization')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === 'organization'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Organization
            </button>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            {stats?.sessions_change !== undefined && (
              <span className={`text-sm flex items-center gap-1 ${
                stats.sessions_change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.sessions_change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.sessions_change)}%
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {stats?.total_sessions || 0}
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
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
            {stats?.score_change !== undefined && (
              <span className={`text-sm flex items-center gap-1 ${
                stats.score_change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.score_change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.score_change)}%
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">Average Score</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {stats?.average_score || 0}%
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
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Training Time</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {stats?.total_hours?.toFixed(1) || 0}h
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          <p className="text-gray-400 text-sm">Points Earned</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {stats?.points_earned?.toLocaleString() || 0}
          </p>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Performance by Category</h2>
        <div className="space-y-4">
          {[
            { name: 'Empathy & Rapport', key: 'empathyRapport', color: 'bg-blue-500' },
            { name: 'Problem Resolution', key: 'problemResolution', color: 'bg-green-500' },
            { name: 'Product Knowledge', key: 'productKnowledge', color: 'bg-purple-500' },
            { name: 'Professionalism', key: 'professionalism', color: 'bg-yellow-500' },
            { name: 'Scenario Specific', key: 'scenarioSpecific', color: 'bg-pink-500' }
          ].map((category) => {
            const score = stats?.category_averages?.[category.key] || 0;
            return (
              <div key={category.key}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">{category.name}</span>
                  <span className="text-gray-400">{score}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${category.color} transition-all duration-500`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Team Members (for managers) */}
      {reportType === 'team' && stats?.team_members && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-6">Team Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Member</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Sessions</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Avg Score</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Points</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {stats.team_members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/10 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 text-sm font-medium">
                            {member.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-200">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{member.sessions}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${
                        member.avg_score >= 80 ? 'text-green-400' : member.avg_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {member.avg_score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{member.points}</td>
                    <td className="py-3 px-4">
                      <span className={`flex items-center gap-1 ${
                        member.trend >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {member.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {Math.abs(member.trend)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
