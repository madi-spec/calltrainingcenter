import { useState } from 'react';
import { Trophy, CheckCircle2, Clock, Target, Loader2, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function DailyChallengeCard({ challenge, onProgressUpdate }) {
  const [claiming, setClaiming] = useState(false);
  const { authFetch } = useAuth();

  const progress = challenge.progress || { progress_value: 0, is_completed: false };
  const targetValue = challenge.target_value || 1;
  const progressPercent = Math.min(100, Math.round((progress.progress_value / targetValue) * 100));

  const handleClaim = async () => {
    if (!progress.is_completed || progress.points_awarded > 0) return;

    setClaiming(true);
    try {
      const response = await authFetch(`/api/challenges/${challenge.id}/claim`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success && onProgressUpdate) {
        onProgressUpdate(challenge.id, { ...progress, points_awarded: data.points_awarded });
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setClaiming(false);
    }
  };

  const getDifficultyColor = () => {
    switch (challenge.criteria_type) {
      case 'perfect_score':
        return 'from-purple-500 to-pink-500';
      case 'complete_difficulty':
        return 'from-red-500 to-orange-500';
      case 'achieve_score':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-green-500 to-emerald-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        relative overflow-hidden rounded-xl border
        ${progress.is_completed
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-gray-800 border-gray-700'}
      `}
    >
      {/* Progress bar background */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${getDifficultyColor()} opacity-10`}
        style={{ width: `${progressPercent}%` }}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {progress.is_completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <Target className="w-5 h-5 text-primary-400 flex-shrink-0" />
              )}
              <h3 className="font-semibold text-gray-100 truncate">
                {challenge.title}
              </h3>
            </div>

            <p className="text-sm text-gray-400 mb-3">
              {challenge.description}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full bg-gradient-to-r ${getDifficultyColor()}`}
                />
              </div>
              <span className="text-sm font-medium text-gray-300 whitespace-nowrap">
                {progress.progress_value}/{targetValue}
              </span>
            </div>
          </div>

          {/* Reward section */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">
                +{challenge.bonus_points}
              </span>
            </div>

            {progress.is_completed && progress.points_awarded === 0 && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {claiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Claim
                  </>
                )}
              </button>
            )}

            {progress.points_awarded > 0 && (
              <span className="text-xs text-green-400">
                Claimed!
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
