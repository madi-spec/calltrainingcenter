import { motion } from 'framer-motion';
import { Lock, Star, Sparkles, Crown, Gem, Medal } from 'lucide-react';

const RARITY_STYLES = {
  common: {
    bg: 'bg-gray-500/20',
    border: 'border-gray-500/50',
    text: 'text-gray-400',
    glow: ''
  },
  uncommon: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    glow: 'shadow-green-500/20'
  },
  rare: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/30'
  },
  epic: {
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/40'
  },
  legendary: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/50'
  }
};

const RARITY_ICONS = {
  common: Star,
  uncommon: Medal,
  rare: Gem,
  epic: Sparkles,
  legendary: Crown
};

function BadgeIcon({ icon, rarity = 'common', earned = true, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        border-2 ${style.bg} ${style.border}
        ${earned ? style.glow : 'opacity-50 grayscale'}
        ${earned && rarity !== 'common' ? 'shadow-lg' : ''}
        transition-all duration-300
      `}
    >
      {earned ? (
        <span className={`${iconSizes[size]} ${style.text}`}>
          {icon || <Star className="w-full h-full" />}
        </span>
      ) : (
        <Lock className={`${iconSizes[size]} text-gray-500`} />
      )}
    </div>
  );
}

export function BadgeCard({ badge, earned = false, showProgress = false, onClick }) {
  const style = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;
  const RarityIcon = RARITY_ICONS[badge.rarity] || Star;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border text-left w-full
        ${earned ? `${style.bg} ${style.border}` : 'bg-gray-800/50 border-gray-700'}
        ${earned && badge.rarity !== 'common' ? `shadow-lg ${style.glow}` : ''}
        hover:bg-opacity-80 transition-all duration-200
      `}
    >
      <div className="flex items-start gap-3">
        <BadgeIcon
          icon={badge.icon}
          rarity={badge.rarity}
          earned={earned}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${earned ? style.text : 'text-gray-400'}`}>
              {badge.name}
            </h3>
            <RarityIcon className={`w-3 h-3 ${style.text}`} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
            {badge.description}
          </p>
          {badge.points_value > 0 && (
            <p className={`text-xs mt-1 ${earned ? 'text-yellow-400' : 'text-gray-600'}`}>
              +{badge.points_value} points
            </p>
          )}
        </div>
      </div>

      {showProgress && !earned && badge.progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(badge.progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${style.bg} transition-all duration-500`}
              style={{ width: `${badge.progress}%` }}
            />
          </div>
        </div>
      )}

      {earned && badge.earned_at && (
        <p className="text-xs text-gray-500 mt-2">
          Earned {new Date(badge.earned_at).toLocaleDateString()}
        </p>
      )}
    </motion.button>
  );
}

export function BadgeGrid({ badges, earnedIds = [], onBadgeClick, showProgress = false }) {
  const earnedSet = new Set(earnedIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {badges.map(badge => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          earned={earnedSet.has(badge.id) || badge.earned}
          showProgress={showProgress}
          onClick={() => onBadgeClick?.(badge)}
        />
      ))}
    </div>
  );
}

export function RecentBadges({ badges, limit = 3 }) {
  if (!badges?.length) return null;

  return (
    <div className="flex items-center gap-2">
      {badges.slice(0, limit).map(badge => (
        <BadgeIcon
          key={badge.id || badge.badge_id}
          icon={badge.icon || badge.badge?.icon}
          rarity={badge.rarity || badge.badge?.rarity || 'common'}
          earned={true}
          size="sm"
        />
      ))}
      {badges.length > limit && (
        <span className="text-xs text-gray-500">
          +{badges.length - limit} more
        </span>
      )}
    </div>
  );
}

export default BadgeCard;
