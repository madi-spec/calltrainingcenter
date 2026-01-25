import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Target,
  TrendingUp,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Leaderboard() {
  const { authFetch, profile } = useAuth();

  const [timeframe, setTimeframe] = useState('weekly');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const response = await authFetch(`/api/gamification/leaderboard?timeframe=${timeframe}`);
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data.leaderboard || []);
          setUserRank(data.user_rank);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [authFetch, timeframe]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBgColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30';
      default:
        return 'bg-gray-800 border-gray-700';
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
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/10 rounded-full mb-4">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">Leaderboard</h1>
        <p className="text-gray-400 mt-1">
          See how you rank against your teammates
        </p>
      </div>

      {/* Timeframe Selector */}
      <div className="flex justify-center">
        <div className="flex bg-gray-800 rounded-lg p-1">
          {['weekly', 'monthly', 'allTime'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tf === 'weekly' ? 'This Week' : tf === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* User's Current Rank */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-600/20 border border-primary-500/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-500/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-400">#{userRank.rank}</span>
              </div>
              <div>
                <p className="text-gray-300">Your Current Rank</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    {userRank.points?.toLocaleString()} pts
                  </span>
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <Target className="w-4 h-4 text-blue-400" />
                    {userRank.sessions} sessions
                  </span>
                </div>
              </div>
            </div>
            {userRank.rank_change !== 0 && (
              <div className={`flex items-center gap-1 ${
                userRank.rank_change > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                <TrendingUp className={`w-5 h-5 ${userRank.rank_change < 0 ? 'rotate-180' : ''}`} />
                <span className="font-medium">
                  {Math.abs(userRank.rank_change)} position{Math.abs(userRank.rank_change) > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-3">
        {leaderboard.length > 0 ? (
          leaderboard.map((user, index) => {
            const isCurrentUser = user.id === profile?.id;
            const rank = index + 1;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl p-4 border transition-colors ${
                  isCurrentUser ? 'ring-2 ring-primary-500' : ''
                } ${getRankBgColor(rank)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-12 h-12 flex items-center justify-center">
                      {getRankIcon(rank)}
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        rank <= 3 ? 'bg-white/10' : 'bg-primary-500/10'
                      }`}>
                        <span className={`font-medium ${
                          rank <= 3 ? 'text-white' : 'text-primary-400'
                        }`}>
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className={`font-medium ${
                          isCurrentUser ? 'text-primary-400' : 'text-gray-200'
                        }`}>
                          {user.name}
                          {isCurrentUser && <span className="text-xs ml-2 text-gray-400">(You)</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-sm text-gray-400">
                            Level {user.level || 1}
                          </span>
                          {user.streak > 0 && (
                            <span className="text-sm text-orange-400 flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {user.streak}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Sessions</p>
                      <p className="font-semibold text-gray-200">{user.sessions}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Avg Score</p>
                      <p className={`font-semibold ${
                        user.avg_score >= 80 ? 'text-green-400' : user.avg_score >= 60 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {user.avg_score}%
                      </p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm text-gray-400">Points</p>
                      <p className="font-bold text-yellow-400">{user.points?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center"
          >
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              No rankings yet
            </h3>
            <p className="text-gray-400">
              Complete training sessions to appear on the leaderboard
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
