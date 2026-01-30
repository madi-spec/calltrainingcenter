import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useTheme } from '../../context/ThemeContext';

function TrialStatusBanner({ onUpgradeClick }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { isDark } = useTheme();
  const {
    isOnTrial,
    isTrialExpired,
    trialDaysRemaining,
    hoursRemaining,
    isHoursExhausted,
    needsUpgrade
  } = useOrganization();

  // Don't show if dismissed or no status to show
  if (isDismissed || (!isOnTrial && !needsUpgrade)) {
    return null;
  }

  // Determine banner style and message
  const isUrgent = isTrialExpired || isHoursExhausted || trialDaysRemaining <= 2 || hoursRemaining < 0.25;
  const isWarning = trialDaysRemaining <= 5 || hoursRemaining < 0.5;

  const getBannerContent = () => {
    if (isTrialExpired) {
      return {
        icon: AlertTriangle,
        message: 'Your trial has ended.',
        subMessage: 'Upgrade to continue training.',
        color: 'red'
      };
    }
    if (isHoursExhausted) {
      return {
        icon: AlertTriangle,
        message: "You've used all your training hours.",
        subMessage: 'Upgrade or buy more hours to continue.',
        color: 'red'
      };
    }
    if (trialDaysRemaining <= 2) {
      return {
        icon: Clock,
        message: `Only ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your trial!`,
        subMessage: 'Upgrade now to keep your progress.',
        color: 'amber'
      };
    }
    if (hoursRemaining < 0.5) {
      return {
        icon: Clock,
        message: `Only ${Math.round(hoursRemaining * 60)} minutes of training left.`,
        subMessage: 'Upgrade for more hours.',
        color: 'amber'
      };
    }
    if (isOnTrial) {
      return {
        icon: Zap,
        message: `${trialDaysRemaining} days left in trial`,
        subMessage: `${hoursRemaining.toFixed(1)} hours remaining`,
        color: 'blue'
      };
    }
    return null;
  };

  const content = getBannerContent();
  if (!content) return null;

  const colorClasses = {
    red: {
      bg: isDark ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200',
      text: isDark ? 'text-red-200' : 'text-red-800',
      subText: isDark ? 'text-red-300' : 'text-red-600',
      icon: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-500 text-white'
    },
    amber: {
      bg: isDark ? 'bg-amber-900/50 border-amber-700' : 'bg-amber-50 border-amber-200',
      text: isDark ? 'text-amber-200' : 'text-amber-800',
      subText: isDark ? 'text-amber-300' : 'text-amber-600',
      icon: 'text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-500 text-white'
    },
    blue: {
      bg: isDark ? 'bg-primary-900/50 border-primary-700' : 'bg-primary-50 border-primary-200',
      text: isDark ? 'text-primary-200' : 'text-primary-800',
      subText: isDark ? 'text-primary-300' : 'text-primary-600',
      icon: 'text-primary-400',
      button: 'bg-primary-600 hover:bg-primary-500 text-white'
    }
  };

  const colors = colorClasses[content.color];
  const Icon = content.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${colors.bg} border-b ${isDark ? '' : ''} px-4 py-2`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0`} />
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${colors.text}`}>{content.message}</span>
              <span className={`text-sm ${colors.subText}`}>{content.subMessage}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onUpgradeClick}
              className={`${colors.button} px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors`}
            >
              Upgrade
              <ArrowRight className="w-4 h-4" />
            </button>
            {!isUrgent && (
              <button
                onClick={() => setIsDismissed(true)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'} transition-colors`}
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TrialStatusBanner;
