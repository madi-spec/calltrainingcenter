import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Flame,
  BarChart3,
  UserPlus,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ManagerDashboard() {
  const { authFetch, profile } = useAuth();
  const [compliance, setCompliance] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [complianceRes, statsRes, sessionsRes] = await Promise.all([
          authFetch('/api/practice/compliance-overview'),
          authFetch('/api/reports/team-summary'),
          authFetch('/api/training/team-recent?limit=10')
        ]);

        if (complianceRes.ok) {
          const data = await complianceRes.json();
          setCompliance(data.overview);
          if (data.overview?.teams?.length > 0) {
            setSelectedTeam(data.overview.teams[0].id);
          }
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setTeamStats(data);
        }

        if (sessionsRes.ok) {
          const data = await sessionsRes.json();
          setRecentSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Error fetching manager data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authFetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const selectedTeamData = compliance?.teams?.find(t => t.id === selectedTeam);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
            Manager Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor your team's training progress and compliance
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/assignments"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Assign Training
          </Link>
          <Link
            to="/settings/team"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Team Settings
          </Link>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Team Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {compliance?.totalMembers || teamStats?.active_users || 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-sm">Today's Compliance</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {compliance?.todayCompleteCount || 0}
            <span className="text-lg text-gray-400">
              /{compliance?.totalMembers || 0}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Target className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-gray-400 text-sm">Week Compliance</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {compliance?.overallComplianceRate || 0}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-sm">Avg Team Score</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">
            {teamStats?.average_score || 0}%
          </p>
        </motion.div>
      </div>

      {/* Practice Compliance Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">
                Practice Compliance Grid
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Week of {compliance?.weekStart || 'N/A'} - {compliance?.daysElapsed || 0} days elapsed
              </p>
            </div>
            {compliance?.teams?.length > 1 && (
              <select
                value={selectedTeam || ''}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {compliance?.teams?.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.memberCount} members)
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-300 font-medium text-sm">
                  Team Member
                </th>
                <th className="text-center py-3 px-3 text-gray-300 font-medium text-sm">
                  Streak
                </th>
                {dayNames.slice(0, compliance?.daysElapsed || 7).map((day, i) => (
                  <th key={day} className="text-center py-3 px-2 text-gray-300 font-medium text-sm">
                    {day}
                  </th>
                ))}
                <th className="text-center py-3 px-4 text-gray-300 font-medium text-sm">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {selectedTeamData?.members?.length > 0 ? (
                selectedTeamData.members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
                          {member.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-gray-200 font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 ${
                        member.streak > 0 ? 'text-orange-400' : 'text-gray-500'
                      }`}>
                        <Flame className="w-4 h-4" />
                        {member.streak}
                      </span>
                    </td>
                    {/* Day status cells - simplified view showing compliance rate */}
                    {Array.from({ length: Math.min(compliance?.daysElapsed || 7, 7) }).map((_, dayIndex) => {
                      const isComplete = dayIndex < member.weekDaysMet;
                      const isToday = dayIndex === (compliance?.daysElapsed || 1) - 1;

                      return (
                        <td key={dayIndex} className="py-3 px-2 text-center">
                          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                            isComplete
                              ? 'bg-green-500/20 text-green-400'
                              : isToday
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : isToday ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                        member.complianceRate >= 80
                          ? 'bg-green-500/20 text-green-400'
                          : member.complianceRate >= 50
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {member.complianceRate}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedTeamData && (
          <div className="p-4 bg-gray-700/30 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Team compliance: <span className="text-gray-200 font-medium">{selectedTeamData.complianceRate}%</span>
              </span>
              <span className="text-gray-400">
                Today: <span className="text-gray-200 font-medium">
                  {selectedTeamData.todayCompleteCount}/{selectedTeamData.memberCount} complete
                </span>
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Teams Overview */}
      {compliance?.teams?.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100">All Teams</h2>
            <Link
              to="/reports"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View full reports <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compliance.teams.map((team) => (
              <div
                key={team.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedTeam === team.id
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => setSelectedTeam(team.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-200">{team.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    team.complianceRate >= 80
                      ? 'bg-green-500/20 text-green-400'
                      : team.complianceRate >= 50
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {team.complianceRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{team.memberCount} members</span>
                  <span>{team.todayCompleteCount} done today</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Team Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100">Recent Team Sessions</h2>
          <Link
            to="/reports"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    session.overall_score >= 80
                      ? 'bg-green-500/10 text-green-400'
                      : session.overall_score >= 60
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {session.overall_score || '-'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">{session.user_name}</p>
                    <p className="text-sm text-gray-400">{session.scenario_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {Math.round((session.duration_seconds || 0) / 60)} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No recent team sessions</p>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid md:grid-cols-3 gap-4"
      >
        <Link
          to="/assignments"
          className="p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-primary-500 transition-colors group"
        >
          <UserPlus className="w-8 h-8 text-primary-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-200 mb-1">Assign Training</h3>
          <p className="text-sm text-gray-400">Create new training assignments for your team</p>
        </Link>

        <Link
          to="/reports"
          className="p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-primary-500 transition-colors group"
        >
          <BarChart3 className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-200 mb-1">View Reports</h3>
          <p className="text-sm text-gray-400">Analyze team performance and trends</p>
        </Link>

        <Link
          to="/settings/team"
          className="p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-primary-500 transition-colors group"
        >
          <Settings className="w-8 h-8 text-gray-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-gray-200 mb-1">Manage Team</h3>
          <p className="text-sm text-gray-400">Add or remove team members</p>
        </Link>
      </motion.div>
    </div>
  );
}
