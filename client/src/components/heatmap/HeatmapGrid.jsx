import { motion } from 'framer-motion';
import { useState } from 'react';

function getScoreColor(score, target = 70) {
  if (score === null || score === undefined) return 'bg-gray-100 dark:bg-gray-700';

  const gap = target - score;

  if (gap >= 30) return 'bg-red-500'; // Critical
  if (gap >= 20) return 'bg-orange-500'; // High
  if (gap >= 10) return 'bg-yellow-500'; // Medium
  if (gap >= 0) return 'bg-green-400'; // Low gap
  return 'bg-green-500'; // Above target
}

function getScoreTextColor(score, target = 70) {
  if (score === null || score === undefined) return 'text-gray-400 dark:text-gray-500';

  const gap = target - score;

  if (gap >= 20) return 'text-white';
  return 'text-gray-900 dark:text-gray-100';
}

function formatCategoryName(category) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ScoreCell({ score, target, onClick }) {
  const bgColor = getScoreColor(score, target);
  const textColor = getScoreTextColor(score, target);

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`w-full h-12 rounded-md ${bgColor} ${textColor} font-medium text-sm flex items-center justify-center transition-all hover:ring-2 hover:ring-primary-500 hover:ring-offset-2 dark:hover:ring-offset-gray-800`}
    >
      {score !== null ? `${score}%` : '--'}
    </motion.button>
  );
}

function HeatmapGrid({ users, categories, averages, onUserClick, onCategoryClick }) {
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'name') {
      return sortDir === 'asc'
        ? a.userName.localeCompare(b.userName)
        : b.userName.localeCompare(a.userName);
    } else {
      const aScore = a.scores[sortBy]?.score ?? -1;
      const bScore = b.scores[sortBy]?.score ?? -1;
      return sortDir === 'asc' ? aScore - bScore : bScore - aScore;
    }
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  if (users.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Skill Data Available
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Skill data will appear here once team members complete training sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th
              className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                Team Member
                {sortBy === 'name' && (
                  <svg className={`w-4 h-4 ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </div>
            </th>
            {categories.map(category => (
              <th
                key={category}
                className="py-3 px-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => handleSort(category)}
              >
                <div className="flex flex-col items-center">
                  <span className="truncate max-w-[100px]">
                    {formatCategoryName(category)}
                  </span>
                  {sortBy === category && (
                    <svg className={`w-4 h-4 ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {/* Averages row */}
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            <td className="py-3 px-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Team Average
              </span>
            </td>
            {categories.map(category => (
              <td key={category} className="py-2 px-2">
                <div
                  className={`h-10 rounded-md ${getScoreColor(averages[category])} flex items-center justify-center`}
                >
                  <span className={`text-sm font-bold ${getScoreTextColor(averages[category])}`}>
                    {averages[category] !== null ? `${averages[category]}%` : '--'}
                  </span>
                </div>
              </td>
            ))}
          </tr>

          {/* User rows */}
          {sortedUsers.map((user, index) => (
            <motion.tr
              key={user.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
            >
              <td className="py-3 px-4">
                <button
                  onClick={() => onUserClick?.(user)}
                  className="flex items-center gap-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.userName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-primary-600 dark:text-primary-400 text-sm font-medium">
                        {user.userName?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.userName}
                  </span>
                </button>
              </td>
              {categories.map(category => {
                const scoreData = user.scores[category];
                return (
                  <td key={category} className="py-2 px-2">
                    <ScoreCell
                      score={scoreData?.score}
                      target={scoreData?.target || 70}
                      onClick={() => onCategoryClick?.(user, category)}
                    />
                  </td>
                );
              })}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default HeatmapGrid;
