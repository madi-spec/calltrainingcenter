import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  Filter,
  Search,
  Play
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../components/ui/EmptyState';

export default function SessionHistory() {
  const { authFetch } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await authFetch('/api/training/history');
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [authFetch]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.scenario_name?.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesDate = true;

    if (dateFilter !== 'all') {
      const sessionDate = new Date(s.created_at);
      const now = new Date();

      switch (dateFilter) {
        case 'today':
          matchesDate = sessionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          matchesDate = sessionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
          matchesDate = sessionDate >= monthAgo;
          break;
      }
    }

    return matchesSearch && matchesDate;
  });

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/10';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10';
    return 'text-red-400 bg-red-500/10';
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
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Session History</h1>
        <p className="text-muted-foreground mt-1">
          Review your past training sessions and coaching feedback
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by scenario..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-lg p-6 border border-border hover:border-border transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-xl font-bold ${getScoreColor(session.overall_score)}`}>
                    {session.overall_score || '-'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {session.scenario_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.round((session.duration_seconds || 0) / 60)} min
                      </span>
                      <span className="text-sm text-yellow-400 flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        +{session.points_earned || 0} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {session.category_scores && (
                    <div className="hidden md:flex items-center gap-2">
                      {Object.entries(session.category_scores).slice(0, 3).map(([key, value]) => (
                        <div
                          key={key}
                          className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                          title={key}
                        >
                          {typeof value === 'object' ? value.score : value}%
                        </div>
                      ))}
                    </div>
                  )}
                  {(session.recording_url || session.recording_id) && (
                    <Link
                      to={`/playback/${session.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-foreground text-background hover:opacity-90 rounded-lg font-medium text-sm transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Watch Replay
                    </Link>
                  )}
                  <Link
                    to={`/results?session=${session.id}`}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium"
                  >
                    Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Quick Stats */}
              {session.strengths && session.improvements && (
                <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-400 font-medium mb-2">Top Strength</p>
                    <p className="text-sm text-secondary-foreground">
                      {session.strengths[0]?.title || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-yellow-400 font-medium mb-2">Area to Improve</p>
                    <p className="text-sm text-secondary-foreground">
                      {session.improvements[0]?.title || 'N/A'}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <div className="bg-card rounded-lg border border-border">
            <EmptyState
              icon={TrendingUp}
              title="No sessions found"
              description={
                searchQuery || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Complete your first training session to see it here'
              }
              action={() => window.location.href = '/scenarios'}
              actionLabel="Start Training"
            />
          </div>
        )}
      </div>
    </div>
  );
}
