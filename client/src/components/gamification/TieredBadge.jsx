import { motion } from 'framer-motion';

const TIER_COLORS = {
  bronze: {
    bg: 'bg-amber-700/20',
    border: 'border-amber-600/50',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/20'
  },
  silver: {
    bg: 'bg-gray-400/20',
    border: 'border-gray-400/50',
    text: 'text-gray-300',
    glow: 'shadow-gray-400/20'
  },
  gold: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/30'
  },
  platinum: {
    bg: 'bg-cyan-400/20',
    border: 'border-cyan-400/50',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-400/30'
  }
};

const TIER_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum'
};

export default function TieredBadge({
  badge,
  size = 'medium',
  showTier = true,
  showProgress = false,
  onClick
}) {
  const tier = badge.currentTier || 'bronze';
  const colors = TIER_COLORS[tier] || TIER_COLORS.bronze;

  const sizeClasses = {
    small: 'w-12 h-12 text-2xl',
    medium: 'w-16 h-16 text-3xl',
    large: 'w-20 h-20 text-4xl'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative flex flex-col items-center cursor-pointer
        ${onClick ? 'hover:opacity-90' : ''}
      `}
      onClick={onClick}
    >
      {/* Badge icon with tier styling */}
      <div
        className={`
          relative flex items-center justify-center
          rounded-xl border-2 shadow-lg
          ${sizeClasses[size]}
          ${colors.bg}
          ${colors.border}
          ${colors.glow}
        `}
      >
        <span className="drop-shadow-md">{badge.icon || '🏅'}</span>

        {/* Tier indicator ring */}
        {badge.is_tiered && tier !== 'bronze' && (
          <div className={`
            absolute -top-1 -right-1 w-4 h-4 rounded-full
            flex items-center justify-center
            ${colors.bg} ${colors.border} border
          `}>
            {tier === 'platinum' && '⭐'}
            {tier === 'gold' && '✦'}
            {tier === 'silver' && '◆'}
          </div>
        )}
      </div>

      {/* Badge name */}
      <p className="mt-2 text-xs font-medium text-gray-300 text-center truncate max-w-[80px]">
        {badge.name}
      </p>

      {/* Tier label */}
      {showTier && badge.is_tiered && (
        <span className={`text-xs ${colors.text}`}>
          {TIER_LABELS[tier]}
        </span>
      )}

      {/* Progress to next tier */}
      {showProgress && badge.nextTier && (
        <div className="mt-1 w-full max-w-[60px]">
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${badge.progress}%` }}
              className={`h-full ${colors.bg.replace('/20', '')}`}
            />
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-0.5">
            {badge.remaining} to {badge.nextTier}
          </p>
        </div>
      )}
    </motion.div>
  );
}
