import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function formatDuration(startedAt) {
  const start = new Date(startedAt);
  const now = new Date();
  const seconds = Math.floor((now - start) / 1000);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ActiveSessionCard({ session }) {
  const [duration, setDuration] = useState(formatDuration(session.started_at));

  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(formatDuration(session.started_at));
    }, 1000);

    return () => clearInterval(interval);
  }, [session.started_at]);

  const getStatusColor = () => {
    switch (session.status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'ending': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {session.user_avatar_url ? (
            <img
              src={session.user_avatar_url}
              alt={session.user_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                {session.user_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          {/* Live indicator */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor()} rounded-full border-2 border-white dark:border-gray-800`}>
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></span>
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {session.user_name || 'Unknown User'}
            </h4>
            <span className="text-sm font-mono text-primary-600 dark:text-primary-400">
              {duration}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {session.scenario_name || 'Training in progress...'}
          </p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 300, ease: 'linear', repeat: Infinity }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {session.status}
        </span>
      </div>
    </motion.div>
  );
}

export default ActiveSessionCard;
