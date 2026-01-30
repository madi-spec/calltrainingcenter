import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Flame, RefreshCw, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StreakRecoveryModal({ recoveryData, tokensAvailable, onClose, onRecover }) {
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState(null);
  const { authFetch } = useAuth();

  const handleRecover = async () => {
    if (tokensAvailable < 1) return;

    setRecovering(true);
    setError(null);

    try {
      const response = await authFetch('/api/streaks/recover', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        onRecover();
      } else {
        setError(data.error || 'Failed to recover streak');
      }
    } catch (err) {
      setError('Failed to recover streak');
    } finally {
      setRecovering(false);
    }
  };

  const timeRemaining = () => {
    if (!recoveryData?.deadline) return null;
    const deadline = new Date(recoveryData.deadline);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-800 rounded-2xl w-full max-w-md p-6 border border-gray-700 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Flame className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">Recover Your Streak</h2>
              <p className="text-sm text-gray-400">Don't lose your progress!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Streak info */}
          <div className="bg-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Your broken streak</p>
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-8 h-8 text-orange-400" />
              <span className="text-4xl font-bold text-orange-400">
                {recoveryData?.previousStreak || 0}
              </span>
              <span className="text-lg text-gray-400">days</span>
            </div>
          </div>

          {/* Time remaining */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-medium">{timeRemaining()}</span>
          </div>

          {/* Recovery tokens */}
          <div className="bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Recovery Tokens Available</span>
              <span className={`font-bold ${tokensAvailable > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tokensAvailable}
              </span>
            </div>
            {tokensAvailable === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Earn recovery tokens by reaching streak milestones (30 days)
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRecover}
              disabled={recovering || tokensAvailable < 1}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {recovering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Recovering...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Recover Streak
                </>
              )}
            </button>
          </div>

          {tokensAvailable > 0 && (
            <p className="text-xs text-center text-gray-500">
              Using 1 recovery token to restore your {recoveryData?.previousStreak}-day streak
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
