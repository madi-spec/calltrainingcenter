import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ActiveSessionCard, LiveFeed, LiveStats } from '../../components/live';

const API_URL = import.meta.env.VITE_API_URL || '';

function LiveDashboard() {
  const { user, getAuthHeader } = useAuth();
  const [stats, setStats] = useState({
    activeSessionCount: 0,
    todayCompletions: 0,
    averageScore: null,
    totalTrainingMinutes: 0
  });
  const [activeSessions, setActiveSessions] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);

    try {
      const headers = await getAuthHeader();

      const [statsRes, sessionsRes, completionsRes] = await Promise.all([
        fetch(`${API_URL}/api/live/stats`, { headers }),
        fetch(`${API_URL}/api/live/active-sessions`, { headers }),
        fetch(`${API_URL}/api/live/recent-completions?limit=20`, { headers })
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setActiveSessions(data.sessions || []);
      }

      if (completionsRes.ok) {
        const data = await completionsRes.json();
        setCompletions(data.completions || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [getAuthHeader]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const handleManualRefresh = () => {
    fetchData(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="relative">
              <span className="w-3 h-3 bg-red-500 rounded-full inline-block mr-2"></span>
              <span className="absolute top-0 left-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
            </span>
            Live Training Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time view of team training activity
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Last refresh indicator */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Updated {lastRefresh.toLocaleTimeString()}
          </div>

          {/* Refresh interval selector */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>

          {/* Manual refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <LiveStats stats={stats} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Active Sessions Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Active Sessions
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {activeSessions.length} active
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No active sessions</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Training sessions will appear here in real-time
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {activeSessions.map((session) => (
                    <ActiveSessionCard key={session.id} session={session} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Recent Completions Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Recent Completions
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Last 20 sessions
                </span>
              </div>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              <LiveFeed completions={completions} loading={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        This dashboard updates automatically every {refreshInterval} seconds.
        Training sessions appear in real-time using Supabase Realtime subscriptions.
      </div>
    </div>
  );
}

export default LiveDashboard;
