import { motion, AnimatePresence } from 'framer-motion';

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getScoreColor(score) {
  if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
}

function CompletionItem({ completion }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
    >
      {/* Completion icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {completion.user_name || 'Unknown'}
          </span>
          <span className="text-gray-400 dark:text-gray-500">completed</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {completion.scenario_name || 'Training session'}
        </p>
      </div>

      {/* Score */}
      {completion.score !== null && (
        <div className={`flex-shrink-0 px-2 py-1 rounded-md text-sm font-medium ${getScoreColor(completion.score)}`}>
          {completion.score}%
        </div>
      )}

      {/* Duration & time */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm text-gray-600 dark:text-gray-300 font-mono">
          {formatDuration(completion.duration_seconds)}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {formatTimeAgo(completion.completed_at)}
        </div>
      </div>
    </motion.div>
  );
}

function LiveFeed({ completions = [], loading = false }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (completions.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400">No recent completions</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Completions will appear here as they happen
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <AnimatePresence mode="popLayout">
        {completions.map((completion) => (
          <CompletionItem key={completion.id} completion={completion} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default LiveFeed;
