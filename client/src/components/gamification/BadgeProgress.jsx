import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

const TIER_COLORS = {
  bronze: { fill: '#B45309', bg: 'bg-amber-700' },
  silver: { fill: '#9CA3AF', bg: 'bg-gray-400' },
  gold: { fill: '#EAB308', bg: 'bg-yellow-500' },
  platinum: { fill: '#22D3EE', bg: 'bg-cyan-400' }
};

export default function BadgeProgress({ badge }) {
  if (!badge.is_tiered) return null;

  const currentTier = badge.currentTier || 'bronze';
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const thresholds = badge.tier_thresholds || { silver: 5, gold: 15, platinum: 50 };

  return (
    <div className="space-y-3">
      {/* Progress bar across all tiers */}
      <div className="relative">
        <div className="flex items-center gap-1">
          {TIER_ORDER.map((tier, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = tier === currentTier;
            const isNext = index === currentIndex + 1;

            let progressWidth = '0%';
            if (index < currentIndex) {
              progressWidth = '100%';
            } else if (isCurrent && badge.progress) {
              progressWidth = `${badge.progress}%`;
            }

            return (
              <div key={tier} className="flex-1 flex items-center">
                {/* Tier segment */}
                <div className="flex-1 relative">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: progressWidth }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`h-full ${TIER_COLORS[tier].bg}`}
                    />
                  </div>

                  {/* Tier marker */}
                  <div
                    className={`
                      absolute -top-1 right-0 w-4 h-4 rounded-full border-2
                      flex items-center justify-center text-[8px] font-bold
                      ${isActive
                        ? `${TIER_COLORS[tier].bg} border-gray-800 text-white`
                        : 'bg-gray-700 border-gray-600 text-gray-500'}
                    `}
                    title={`${tier.charAt(0).toUpperCase() + tier.slice(1)}: ${thresholds[tier] || (tier === 'bronze' ? 1 : '∞')}`}
                  >
                    {index + 1}
                  </div>
                </div>

                {index < TIER_ORDER.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-600 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current status */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-400">Current: </span>
          <span className="font-medium capitalize" style={{ color: TIER_COLORS[currentTier].fill }}>
            {currentTier}
          </span>
        </div>

        {badge.nextTier && (
          <div>
            <span className="text-gray-400">Next: </span>
            <span className="font-medium capitalize" style={{ color: TIER_COLORS[badge.nextTier].fill }}>
              {badge.nextTier}
            </span>
            <span className="text-gray-500 ml-1">
              ({badge.remaining} more)
            </span>
          </div>
        )}

        {!badge.nextTier && (
          <span className="text-cyan-400 font-medium">Max tier achieved!</span>
        )}
      </div>

      {/* Progress count */}
      <div className="text-center text-xs text-gray-500">
        Earned {badge.progressCount || 1}x
      </div>
    </div>
  );
}
