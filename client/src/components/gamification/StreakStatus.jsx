import { useState, useEffect } from 'react';
import { Flame, Shield, AlertTriangle, Snowflake, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import StreakRecoveryModal from './StreakRecoveryModal';

export default function StreakStatus({ compact = false }) {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [usingFreeze, setUsingFreeze] = useState(false);
  const { authFetch, profile } = useAuth();

  useEffect(() => {
    fetchStreakStatus();
  }, []);

  const fetchStreakStatus = async () => {
    try {
      const response = await authFetch('/api/streaks/status');
      const data = await response.json();
      if (data.success) {
        setStreakData(data);
      }
    } catch (error) {
      console.error('Error fetching streak status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseFreeze = async () => {
    setUsingFreeze(true);
    try {
      const response = await authFetch('/api/streaks/use-freeze', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchStreakStatus();
      }
    } catch (error) {
      console.error('Error using freeze:', error);
    } finally {
      setUsingFreeze(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-2'} bg-gray-700/50 rounded-full`}>
        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!streakData) return null;

  const { streak, tokens, recovery } = streakData;

  // Compact version for header/badges
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`
          flex items-center gap-1.5 px-3 py-1 rounded-full
          ${streak.current > 0
            ? streak.atRisk
              ? 'bg-orange-500/20 border border-orange-500/30'
              : 'bg-orange-500/20'
            : recovery.available
              ? 'bg-red-500/20 border border-red-500/30'
              : 'bg-gray-700/50'}
        `}>
          <Flame className={`w-4 h-4 ${streak.current > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${streak.current > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
            {streak.current || 0}
          </span>
          {streak.atRisk && (
            <AlertTriangle className="w-3 h-3 text-orange-400" />
          )}
        </div>

        {streak.shieldActive && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-full">
            <Shield className="w-3 h-3 text-blue-400" />
          </div>
        )}
      </div>
    );
  }

  // Full version for dashboard
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          rounded-xl p-4 border
          ${streak.atRisk
            ? 'bg-orange-500/10 border-orange-500/30'
            : recovery.available
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-gray-800 border-gray-700'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-xl
              ${streak.current > 0
                ? 'bg-orange-500/20'
                : 'bg-gray-700'}
            `}>
              <Flame className={`w-6 h-6 ${streak.current > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-100">
                  {streak.current || 0}
                </span>
                <span className="text-sm text-gray-400">day streak</span>
                {streak.atRisk && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded-full text-xs text-orange-400">
                    <AlertTriangle className="w-3 h-3" />
                    At Risk
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-400">
                Best: {streak.longest || 0} days
              </p>
            </div>
          </div>

          {/* Tokens */}
          <div className="flex items-center gap-2">
            {tokens.freezesAvailable > 0 && (
              <button
                onClick={streak.atRisk ? handleUseFreeze : undefined}
                disabled={usingFreeze || !streak.atRisk}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg
                  ${streak.atRisk
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-blue-500/20 cursor-default'}
                  transition-colors
                `}
                title={streak.atRisk ? 'Use freeze to protect your streak' : `${tokens.freezesAvailable} freeze${tokens.freezesAvailable !== 1 ? 's' : ''} available`}
              >
                {usingFreeze ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Snowflake className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-sm font-medium text-white">
                  {tokens.freezesAvailable}
                </span>
              </button>
            )}

            {streak.shieldActive && (
              <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 rounded-lg">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400">Protected</span>
              </div>
            )}
          </div>
        </div>

        {/* Recovery option */}
        {recovery.available && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">
                  Your {recovery.previousStreak}-day streak was broken
                </p>
                <p className="text-xs text-gray-400">
                  Recover it before the deadline expires
                </p>
              </div>
              <button
                onClick={() => setShowRecoveryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recover
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showRecoveryModal && (
          <StreakRecoveryModal
            recoveryData={recovery}
            tokensAvailable={tokens.recoveriesAvailable}
            onClose={() => setShowRecoveryModal(false)}
            onRecover={() => {
              setShowRecoveryModal(false);
              fetchStreakStatus();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
