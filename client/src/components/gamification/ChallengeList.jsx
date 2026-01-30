import { useState, useEffect } from 'react';
import { Trophy, ChevronRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DailyChallengeCard from './DailyChallengeCard';

export default function ChallengeList({ maxDisplay = 3, showViewAll = true }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await authFetch('/api/challenges/today');
      const data = await response.json();
      if (data.success) {
        setChallenges(data.challenges || []);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = (challengeId, newProgress) => {
    setChallenges(prev =>
      prev.map(c =>
        c.id === challengeId ? { ...c, progress: newProgress } : c
      )
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-700 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayedChallenges = challenges.slice(0, maxDisplay);
  const completedCount = challenges.filter(c => c.progress?.is_completed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-100">Daily Challenges</h2>
            <p className="text-xs text-gray-400">
              {completedCount}/{challenges.length} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>Resets at midnight</span>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">No challenges available</p>
          <p className="text-sm text-gray-500">
            Check back tomorrow for new challenges!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedChallenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <DailyChallengeCard
                challenge={challenge}
                onProgressUpdate={handleProgressUpdate}
              />
            </motion.div>
          ))}
        </div>
      )}

      {showViewAll && challenges.length > maxDisplay && (
        <Link
          to="/challenges"
          className="flex items-center justify-center gap-2 mt-4 py-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          View all challenges
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
}
