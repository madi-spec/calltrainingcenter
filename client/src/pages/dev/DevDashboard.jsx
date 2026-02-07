import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DEV_EMAIL = 'ballen@xrailabsteam.com';

export default function DevDashboard() {
  const { profile, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Access guard
  useEffect(() => {
    if (profile && profile.email !== DEV_EMAIL) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch('/api/dev-dashboard/stats');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (profile && profile.email !== DEV_EMAIL) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error loading dashboard: {error}</p>
          <button onClick={fetchStats} className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview, recentUsers, recentSessions, orgBreakdown, featureUsage } = stats;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Developer Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Cross-tenant platform overview
            {lastRefresh && <> &middot; Last updated {lastRefresh.toLocaleTimeString()}</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchStats}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={overview.totalUsers} />
        <StatCard label="Total Orgs" value={overview.totalOrgs} />
        <StatCard label="Total Sessions" value={overview.totalSessions} />
        <StatCard label="Sessions Today" value={overview.sessionsToday} accent />
        <StatCard label="Signups This Week" value={overview.signupsThisWeek} accent />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Completed Sessions" value={overview.completedSessions} small />
        <StatCard label="Signups Today" value={overview.signupsToday} small />
        <StatCard label="Invites Pending" value={overview.invitations?.pending || 0} small />
        <StatCard label="Invites Accepted" value={overview.invitations?.accepted || 0} small />
      </div>

      {/* Recent Users */}
      <Section title="Recent Signups" subtitle="Last 20 users">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Organization</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2">Signed Up</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {recentUsers.map(u => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 pr-4 font-medium text-white">{u.full_name}</td>
                  <td className="py-2 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-2 pr-4">{u.organization?.name || '-'}</td>
                  <td className="py-2 pr-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="py-2 text-gray-400">{formatDate(u.created_at)}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Recent Training Sessions */}
      <Section title="Recent Training Sessions" subtitle="Last 20 sessions">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Scenario</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Duration</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {recentSessions.map(s => (
                <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 pr-4 font-medium text-white">
                    {s.user?.full_name || s.user?.email || '-'}
                  </td>
                  <td className="py-2 pr-4">{s.scenario_name || s.scenario_id}</td>
                  <td className="py-2 pr-4">
                    {s.overall_score != null ? (
                      <span className={`font-semibold ${
                        s.overall_score >= 80 ? 'text-green-400' :
                        s.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {s.overall_score}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {s.duration_seconds ? formatDuration(s.duration_seconds) : '-'}
                  </td>
                  <td className="py-2 text-gray-400">{formatDate(s.created_at)}</td>
                </tr>
              ))}
              {recentSessions.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-gray-500">No sessions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Organization Breakdown */}
      <Section title="Organization Breakdown" subtitle="All organizations">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="pb-2 pr-4">Organization</th>
                <th className="pb-2 pr-4">Users</th>
                <th className="pb-2 pr-4">Sessions</th>
                <th className="pb-2">Last Activity</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {orgBreakdown.map(org => (
                <tr key={org.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 pr-4 font-medium text-white">{org.name}</td>
                  <td className="py-2 pr-4">{org.userCount}</td>
                  <td className="py-2 pr-4">{org.sessionCount}</td>
                  <td className="py-2 text-gray-400">{org.lastSession ? formatDate(org.lastSession) : 'Never'}</td>
                </tr>
              ))}
              {orgBreakdown.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-500">No organizations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Feature Usage */}
      <Section title="Feature Usage" subtitle="Last 7 days">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <FeatureCard label="Bookmarks" count={featureUsage.bookmarks} />
          <FeatureCard label="Certificates" count={featureUsage.certificates} />
          <FeatureCard label="Micro Sessions" count={featureUsage.microSessions} />
          <FeatureCard label="Warmup Sessions" count={featureUsage.warmupSessions} />
          <FeatureCard label="Challenges" count={featureUsage.challenges} />
          <FeatureCard label="Courses Started" count={featureUsage.coursesStarted} />
          <FeatureCard label="Analysis Cache" count={featureUsage.analysisCache} />
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value, accent, small }) {
  return (
    <div className={`bg-gray-800 rounded-lg ${small ? 'p-3' : 'p-4'} border border-gray-700`}>
      <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
      <p className={`font-bold ${small ? 'text-xl' : 'text-2xl'} ${accent ? 'text-blue-400' : 'text-white'} mt-1`}>
        {value?.toLocaleString?.() ?? value}
      </p>
    </div>
  );
}

function FeatureCard({ label, count }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-lg font-semibold text-white mt-0.5">{count}</p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    super_admin: 'bg-purple-500/20 text-purple-300',
    admin: 'bg-blue-500/20 text-blue-300',
    manager: 'bg-green-500/20 text-green-300',
    trainee: 'bg-gray-500/20 text-gray-300'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[role] || colors.trainee}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    completed: 'bg-green-500/20 text-green-300',
    in_progress: 'bg-yellow-500/20 text-yellow-300',
    abandoned: 'bg-red-500/20 text-red-300'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatDuration(seconds) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
