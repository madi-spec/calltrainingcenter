import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Clock, Check, X, Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PendingChallenges({ maxDisplay = 3, onUpdate }) {
  const [challenges, setChallenges] = useState({ incoming: [], outgoing: [], active: [] });
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const { authFetch, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await authFetch('/api/social/challenges/pending');
      const data = await response.json();
      if (data.success) {
        setChallenges({
          incoming: data.incoming || [],
          outgoing: data.outgoing || [],
          active: data.active || []
        });
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (challengeId, action) => {
    setResponding(challengeId);
    try {
      const response = await authFetch(`/api/social/challenges/${challengeId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchChallenges();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error responding to challenge:', error);
    } finally {
      setResponding(null);
    }
  };

  const handleAcceptAndStart = async (challenge) => {
    await handleRespond(challenge.id, 'accept');
    navigate(`/scenario/${challenge.scenario_id}?challenge=${challenge.id}`);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-700 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalChallenges = challenges.incoming.length + challenges.active.length;

  if (totalChallenges === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl p-6 border border-gray-700"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <Swords className="w-5 h-5 text-purple-400" />
          Challenges
          {challenges.incoming.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {challenges.incoming.length}
            </span>
          )}
        </h2>
      </div>

      <div className="space-y-3">
        {/* Incoming challenges */}
        <AnimatePresence>
          {challenges.incoming.slice(0, maxDisplay).map(challenge => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                    {challenge.challenger?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-200 truncate">
                      {challenge.challenger?.full_name} challenges you!
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {challenge.message || 'No message'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRespond(challenge.id, 'decline')}
                    disabled={responding === challenge.id}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Decline"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleAcceptAndStart(challenge)}
                    disabled={responding === challenge.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {responding === challenge.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Accept
                      </>
                    )}
                  </button>
                </div>
              </div>

              {challenge.wager_points > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  {challenge.wager_points} points at stake
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Active challenges */}
        {challenges.active.slice(0, maxDisplay - challenges.incoming.length).map(challenge => (
          <div
            key={challenge.id}
            className="bg-gray-700/50 rounded-xl p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold">
                  {(challenge.challenger_id === profile?.id
                    ? challenge.challenged?.full_name
                    : challenge.challenger?.full_name)?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-200">
                    vs {challenge.challenger_id === profile?.id
                      ? challenge.challenged?.full_name
                      : challenge.challenger?.full_name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {challenge.status === 'accepted' ? 'Waiting for both to complete' : 'In progress'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/scenario/${challenge.scenario_id}?challenge=${challenge.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Play
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
