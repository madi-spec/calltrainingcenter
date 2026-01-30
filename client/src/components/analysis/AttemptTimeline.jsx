import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function AttemptTimeline({ attempts = [], selectedAttempt, onSelectAttempt }) {
  if (!attempts || attempts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No attempts recorded yet.
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Attempt History ({attempts.length})
        </h3>
      </div>

      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {/* Attempts */}
          <div className="space-y-4">
            {attempts.map((attempt, index) => {
              const isSelected = selectedAttempt === attempt.attemptNumber;
              const isFirst = index === 0;
              const isLast = index === attempts.length - 1;
              const isBest = attempt.overallScore === Math.max(...attempts.map(a => a.overallScore));

              return (
                <motion.div
                  key={attempt.sessionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative pl-10 cursor-pointer group ${
                    isSelected ? 'scale-[1.02]' : ''
                  }`}
                  onClick={() => onSelectAttempt?.(attempt.attemptNumber)}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500'
                        : isBest
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-primary-400'
                    }`}
                  >
                    {isBest && !isSelected && (
                      <svg className="w-full h-full text-green-500 p-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Content card */}
                  <div
                    className={`p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 bg-gray-50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Attempt #{attempt.attemptNumber}
                        </span>
                        {isFirst && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            First
                          </span>
                        )}
                        {isLast && attempts.length > 1 && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            Latest
                          </span>
                        )}
                        {isBest && attempts.length > 1 && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            Best
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(attempt.date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Score */}
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getScoreColor(attempt.overallScore)}`} />
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {attempt.overallScore ?? '--'}%
                          </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(attempt.duration)}
                        </div>
                      </div>

                      {/* Change from previous */}
                      {index > 0 && attempt.overallScore !== null && attempts[index - 1].overallScore !== null && (
                        <div className={`text-sm font-medium ${
                          attempt.overallScore > attempts[index - 1].overallScore
                            ? 'text-green-600 dark:text-green-400'
                            : attempt.overallScore < attempts[index - 1].overallScore
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {attempt.overallScore > attempts[index - 1].overallScore
                            ? `+${attempt.overallScore - attempts[index - 1].overallScore}`
                            : attempt.overallScore < attempts[index - 1].overallScore
                            ? attempt.overallScore - attempts[index - 1].overallScore
                            : '0'}
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                      <Link
                        to={`/results/${attempt.sessionId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View Results
                      </Link>
                      <Link
                        to={`/replay/${attempt.sessionId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Replay Call
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttemptTimeline;
