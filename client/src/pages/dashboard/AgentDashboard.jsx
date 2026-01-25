import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Play,
  Trophy,
  Target,
  TrendingUp,
  Clock,
  Star,
  Flame,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Award,
  Zap,
  Phone,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';

export default function AgentDashboard() {
  const { profile, authFetch } = useAuth();
  const { organization } = useOrganization();

  const [stats, setStats] = useState(null);
  const [practiceToday, setPracticeToday] = useState(null);
  const [practiceWeek, setPracticeWeek] = useState(null);
  const [courses, setCourses] = useState([]);
  const [badges, setBadges] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, practiceRes, weekRes, coursesRes, badgesRes, sessionsRes] = await Promise.all([
        authFetch('/api/reports/my-stats'),
        authFetch('/api/practice/today'),
        authFetch('/api/practice/week'),
        authFetch('/api/courses'),
        authFetch('/api/gamification/badges/mine'),
        authFetch('/api/training/recent?limit=3')
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (practiceRes.ok) setPracticeToday(await practiceRes.json());
      if (weekRes.ok) setPracticeWeek(await weekRes.json());
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        // Sort by in-progress first, then not started
        const sorted = (data.courses || []).sort((a, b) => {
          if (a.progress?.status === 'in_progress') return -1;
          if (b.progress?.status === 'in_progress') return 1;
          return 0;
        });
        setCourses(sorted.slice(0, 3));
      }
      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges?.slice(0, 6) || []);
      }
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setRecentSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const required = practiceToday?.requirement?.requiredCalls || 5;
  const completed = practiceToday?.today?.callsCompleted || 0;
  const metRequirement = practiceToday?.today?.metRequirement || false;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-600 to-purple-700 rounded-2xl p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              {stats?.current_streak > 0 && (
                <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                  <Flame className="w-4 h-4 text-orange-400" />
                  {stats.current_streak} day streak
                </span>
              )}
              {profile?.level && (
                <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Level {profile.level}
                </span>
              )}
              <span className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white text-sm">
                <Star className="w-4 h-4 text-yellow-400" />
                {(stats?.total_points || profile?.total_points || 0).toLocaleString()} pts
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Practice - Prominent Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-6 border-2 ${
          metRequirement
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-gray-800 border-primary-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              {metRequirement ? (
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              ) : (
                <div className="p-3 bg-primary-500/20 rounded-xl">
                  <Target className="w-8 h-8 text-primary-400" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-100">Today's Practice</h2>
                <p className="text-gray-400">
                  {metRequirement
                    ? 'Great job! You completed your daily practice.'
                    : `${required - completed} call${required - completed !== 1 ? 's' : ''} remaining today`}
                </p>
              </div>
            </div>

            {/* Practice Progress Dots */}
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                {Array.from({ length: required }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      i < completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {i < completed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                  </motion.div>
                ))}
              </div>
              <span className="text-sm text-gray-400 ml-2">
                {completed} / {required} calls
              </span>
            </div>
          </div>

          {/* Start Training Button */}
          <div className="flex-shrink-0">
            <Link
              to="/courses"
              className={`flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-xl transition-all shadow-lg ${
                metRequirement
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30 animate-pulse hover:animate-none'
              }`}
            >
              <Play className="w-6 h-6" />
              {metRequirement ? 'Keep Practicing' : 'Start Next Call'}
            </Link>
          </div>
        </div>

        {/* Weekly Progress Bar */}
        {practiceWeek && (
          <div className="mt-6 pt-6 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">This Week's Progress</span>
              <span className="text-sm font-medium text-gray-300">
                {practiceWeek.summary?.daysCompleted || 0} / {practiceWeek.summary?.totalDays || 5} days
              </span>
            </div>
            <div className="flex gap-1">
              {practiceWeek.days?.map((day, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${
                    day.metRequirement
                      ? 'bg-green-500'
                      : day.date === new Date().toISOString().split('T')[0]
                      ? 'bg-primary-500/50'
                      : 'bg-gray-700'
                  }`}
                  title={`${day.dayName}: ${day.callsCompleted}/${day.required || required} calls`}
                />
              )) || Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-1 h-2 rounded-full bg-gray-700" />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">Mon</span>
              <span className="text-xs text-gray-500">Fri</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Total Sessions</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{stats?.total_sessions || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-400 text-sm">Avg Score</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{stats?.average_score || 0}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-gray-400 text-sm">Best Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{stats?.longest_streak || 0} days</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gray-800 rounded-xl p-5 border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-sm">Badges</span>
          </div>
          <p className="text-2xl font-bold text-gray-100">{badges.length}</p>
        </motion.div>
      </div>

      {/* Courses and Badges */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* My Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-400" />
              My Courses
            </h2>
            <Link
              to="/courses"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{course.icon || '📚'}</div>
                    <div>
                      <p className="font-medium text-gray-200 group-hover:text-white transition-colors">
                        {course.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {course.progress?.modulesCompleted || 0} / {course.progress?.totalModules || course.modules_count || 3} modules
                      </p>
                    </div>
                  </div>
                  <div className="w-20">
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${course.progress?.percentComplete || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {course.progress?.percentComplete || 0}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No courses started yet</p>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          )}
        </motion.div>

        {/* My Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              My Badges
            </h2>
            <Link
              to="/leaderboard"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Leaderboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {badges.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors cursor-default"
                  title={badge.description}
                >
                  <div className="text-3xl mb-2">{badge.icon || '🏅'}</div>
                  <p className="text-xs text-gray-300 text-center font-medium truncate w-full">
                    {badge.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No badges earned yet</p>
              <p className="text-sm text-gray-500">
                Complete courses to earn badges
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Recent Sessions
            </h2>
            <Link
              to="/history"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${
                  session.overall_score >= 80
                    ? 'bg-green-500/20 text-green-400'
                    : session.overall_score >= 60
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {session.overall_score || '-'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-200 truncate">
                    {session.scenario_name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Mobile Start Button */}
      <div className="md:hidden fixed bottom-6 left-4 right-4">
        <Link
          to="/courses"
          className="flex items-center justify-center gap-2 w-full py-4 bg-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30"
        >
          <Play className="w-5 h-5" />
          Start Training
        </Link>
      </div>
    </div>
  );
}
