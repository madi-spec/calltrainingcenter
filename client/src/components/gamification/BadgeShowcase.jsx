import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TieredBadge from './TieredBadge';
import BadgeProgress from './BadgeProgress';

export default function BadgeShowcase({ maxDisplay = 6, showFeatured = true }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const response = await authFetch('/api/gamification/my-badges');
      const data = await response.json();
      if (data.badges) {
        // Sort by tier (platinum first) then by earned date
        const sorted = data.badges.sort((a, b) => {
          const tierOrder = { platinum: 4, gold: 3, silver: 2, bronze: 1 };
          const aTier = tierOrder[a.current_tier || 'bronze'] || 1;
          const bTier = tierOrder[b.current_tier || 'bronze'] || 1;
          if (aTier !== bTier) return bTier - aTier;
          return new Date(b.earned_at) - new Date(a.earned_at);
        });
        setBadges(sorted);
      }
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-700 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayedBadges = badges.slice(0, maxDisplay);
  const featuredBadge = showFeatured && badges.find(b =>
    b.current_tier === 'platinum' || b.current_tier === 'gold'
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Badge Showcase
          </h2>
          <Link
            to="/leaderboard?tab=badges"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Featured badge */}
        {featuredBadge && (
          <div
            className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/20 cursor-pointer"
            onClick={() => setSelectedBadge(featuredBadge)}
          >
            <div className="flex items-center gap-4">
              <TieredBadge badge={featuredBadge.badge} size="large" showProgress />
              <div className="flex-1">
                <p className="font-medium text-gray-100">{featuredBadge.badge?.name}</p>
                <p className="text-sm text-gray-400">{featuredBadge.badge?.description}</p>
                {featuredBadge.badge?.is_tiered && (
                  <div className="mt-2">
                    <BadgeProgress badge={featuredBadge} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Badge grid */}
        {badges.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {displayedBadges.map((userBadge, index) => (
              <motion.div
                key={userBadge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <TieredBadge
                  badge={{
                    ...userBadge.badge,
                    currentTier: userBadge.current_tier,
                    progressCount: userBadge.progress_count,
                    is_tiered: userBadge.badge?.is_tiered
                  }}
                  size="medium"
                  onClick={() => setSelectedBadge(userBadge)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-1">No badges earned yet</p>
            <p className="text-sm text-gray-500">
              Complete challenges to earn your first badge!
            </p>
          </div>
        )}

        {badges.length > maxDisplay && (
          <Link
            to="/leaderboard?tab=badges"
            className="block mt-4 text-center text-sm text-primary-400 hover:text-primary-300"
          >
            +{badges.length - maxDisplay} more badges
          </Link>
        )}
      </motion.div>

      {/* Badge detail modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-2xl w-full max-w-sm p-6 border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <TieredBadge
                  badge={{
                    ...selectedBadge.badge,
                    currentTier: selectedBadge.current_tier,
                    is_tiered: selectedBadge.badge?.is_tiered
                  }}
                  size="large"
                />
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-100 mb-2">
                {selectedBadge.badge?.name}
              </h3>
              <p className="text-gray-400 mb-4">
                {selectedBadge.badge?.description}
              </p>

              {selectedBadge.badge?.is_tiered && (
                <BadgeProgress
                  badge={{
                    ...selectedBadge.badge,
                    currentTier: selectedBadge.current_tier,
                    progressCount: selectedBadge.progress_count,
                    progress: selectedBadge.progress,
                    nextTier: selectedBadge.nextTier,
                    remaining: selectedBadge.remaining
                  }}
                />
              )}

              <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-500">
                <p>Earned: {new Date(selectedBadge.earned_at).toLocaleDateString()}</p>
                {selectedBadge.progress_count > 1 && (
                  <p>Times earned: {selectedBadge.progress_count}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
