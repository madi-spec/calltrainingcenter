import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Flame, Zap, Award } from 'lucide-react';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000,
  17000, 24000, 33000, 45000, 60000, 80000, 105000, 140000, 185000, 250000
];

const LEVEL_TITLES = [
  'Newcomer', 'Beginner', 'Apprentice', 'Associate', 'Representative',
  'Specialist', 'Expert', 'Senior Expert', 'Master', 'Senior Master',
  'Elite', 'Champion', 'Grand Champion', 'Legend', 'Grand Legend',
  'Mythic', 'Transcendent', 'Immortal', 'Cosmic', 'Ultimate'
];

export function calculateLevel(points) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 20);
}

export function getLevelProgress(points, level) {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

export function getLevelTitle(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] || 'Unknown';
}

export function PointsBadge({ points, size = 'md', showLabel = true }) {
  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-lg px-4 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full
      bg-yellow-500/20 text-yellow-400 border border-yellow-500/30
      ${sizeClasses[size]}
    `}>
      <Star className={iconSizes[size]} />
      <span className="font-semibold">{points.toLocaleString()}</span>
      {showLabel && <span className="text-yellow-500/70">pts</span>}
    </div>
  );
}

export function LevelBadge({ level, size = 'md' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const levelColor = level >= 15 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                     level >= 10 ? 'text-purple-400 border-purple-500/30 bg-purple-500/10' :
                     level >= 5 ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' :
                     'text-green-400 border-green-500/30 bg-green-500/10';

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border
      ${levelColor} ${sizeClasses[size]}
    `}>
      <Award className={iconSizes[size]} />
      <span className="font-semibold">Lvl {level}</span>
    </div>
  );
}

export function StreakBadge({ streak, size = 'md' }) {
  if (!streak || streak < 1) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const isHot = streak >= 7;
  const isOnFire = streak >= 14;
  const isLegendary = streak >= 30;

  const color = isLegendary ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                isOnFire ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
                isHot ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                'text-gray-400 border-gray-500/30 bg-gray-500/10';

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border
      ${color} ${sizeClasses[size]}
    `}>
      <Flame className={`${iconSizes[size]} ${isOnFire ? 'animate-pulse' : ''}`} />
      <span className="font-semibold">{streak}</span>
      <span className="opacity-70">day{streak !== 1 ? 's' : ''}</span>
    </div>
  );
}

export function LevelProgress({ points, level, showTitle = true }) {
  const progress = getLevelProgress(points, level);
  const title = getLevelTitle(level);
  const nextThreshold = LEVEL_THRESHOLDS[level] || points;
  const pointsToNext = nextThreshold - points;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LevelBadge level={level} />
          {showTitle && (
            <span className="text-sm text-gray-400">{title}</span>
          )}
        </div>
        {pointsToNext > 0 && (
          <span className="text-xs text-gray-500">
            {pointsToNext.toLocaleString()} pts to level {level + 1}
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
        />
      </div>
    </div>
  );
}

export function PointsEarned({ points, reason, animate = true }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={animate ? { opacity: 0, y: 10, scale: 0.9 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        className="flex items-center gap-2 text-yellow-400"
      >
        <Zap className="w-4 h-4" />
        <span className="font-bold">+{points}</span>
        {reason && <span className="text-sm text-gray-400">{reason}</span>}
      </motion.div>
    </AnimatePresence>
  );
}

export function StatsCard({ points, level, streak, sessionsThisWeek, avgScore }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Your Stats</h3>
        <PointsBadge points={points} size="md" />
      </div>

      <LevelProgress points={points} level={level} />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{sessionsThisWeek}</div>
          <div className="text-xs text-gray-500">Sessions This Week</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{avgScore}%</div>
          <div className="text-xs text-gray-500">Avg Score</div>
        </div>
        <div className="text-center">
          <StreakBadge streak={streak} size="lg" />
          <div className="text-xs text-gray-500 mt-1">Streak</div>
        </div>
      </div>
    </div>
  );
}

export default PointsBadge;
