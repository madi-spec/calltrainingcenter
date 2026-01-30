import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

/**
 * Countdown timer for micro-learning sessions
 */
export default function MicroTimer({
  durationSeconds = 120,
  onTimeUp,
  isPaused = false,
  showWarning = true,
  warningThreshold = 30,
  size = 'default' // 'small', 'default', 'large'
}) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, onTimeUp]);

  useEffect(() => {
    setIsWarning(timeRemaining <= warningThreshold && timeRemaining > 0);
  }, [timeRemaining, warningThreshold]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = (timeRemaining / durationSeconds) * 100;

  const sizeClasses = {
    small: {
      container: 'w-20 h-20',
      text: 'text-lg',
      icon: 'w-3 h-3',
      ring: 'w-20 h-20'
    },
    default: {
      container: 'w-32 h-32',
      text: 'text-2xl',
      icon: 'w-4 h-4',
      ring: 'w-32 h-32'
    },
    large: {
      container: 'w-40 h-40',
      text: 'text-3xl',
      icon: 'w-5 h-5',
      ring: 'w-40 h-40'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`relative ${classes.container}`}>
      {/* Background ring */}
      <svg className={`absolute inset-0 ${classes.ring}`} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-gray-700"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className={isWarning ? 'text-red-500' : 'text-blue-500'}
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          transform="rotate(-90 50 50)"
          animate={{
            strokeDashoffset: `${2 * Math.PI * 45 * (1 - progress / 100)}`
          }}
          transition={{ duration: 0.5 }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`flex items-center gap-1 ${isWarning ? 'text-red-400' : 'text-gray-400'}`}>
          {isWarning ? (
            <AlertTriangle className={classes.icon} />
          ) : (
            <Clock className={classes.icon} />
          )}
        </div>
        <motion.span
          className={`font-mono font-bold ${classes.text} ${
            isWarning ? 'text-red-400' : 'text-white'
          }`}
          animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: isWarning ? Infinity : 0 }}
        >
          {formatTime(timeRemaining)}
        </motion.span>
        {showWarning && isWarning && (
          <span className="text-xs text-red-400 mt-1">Time running out!</span>
        )}
      </div>
    </div>
  );
}
