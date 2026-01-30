import { useMemo } from 'react';
import { motion } from 'framer-motion';

function ScoreComparisonChart({
  attempts = [],
  categoryTrends = {},
  selectedAttempt,
  showCategories = true
}) {
  // Calculate chart dimensions
  const chartHeight = 200;
  const chartPadding = 40;
  const barWidth = Math.min(50, Math.max(30, (600 - chartPadding * 2) / attempts.length - 10));

  // Category labels
  const categoryLabels = {
    empathyRapport: 'Empathy',
    problemResolution: 'Resolution',
    productKnowledge: 'Product',
    professionalism: 'Professional',
    scenarioSpecific: 'Scenario'
  };

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 90) return '#22c55e'; // green-500
    if (score >= 75) return '#3b82f6'; // blue-500
    if (score >= 60) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  const maxScore = 100;

  if (!attempts || attempts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No data available for comparison.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Score Progression</h3>
      </div>

      <div className="p-4">
        {/* Overall Score Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Overall Scores</h4>

          <div className="relative" style={{ height: chartHeight + 40 }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-10 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-x-0 top-0 bottom-8">
                {[0, 25, 50, 75].map((line) => (
                  <div
                    key={line}
                    className="absolute w-full border-t border-gray-200 dark:border-gray-700"
                    style={{ top: `${100 - line}%` }}
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="absolute inset-x-0 top-0 bottom-8 flex items-end justify-around px-2">
                {attempts.map((attempt, index) => {
                  const height = (attempt.overallScore / maxScore) * 100;
                  const isSelected = selectedAttempt === attempt.attemptNumber;

                  return (
                    <div key={attempt.sessionId} className="flex flex-col items-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`rounded-t transition-all ${
                          isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                        }`}
                        style={{
                          width: barWidth,
                          backgroundColor: getScoreColor(attempt.overallScore),
                          opacity: isSelected ? 1 : 0.8
                        }}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                        #{attempt.attemptNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Trend line */}
              {attempts.length > 1 && (
                <svg
                  className="absolute inset-x-0 top-0 bottom-8 pointer-events-none"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    d={attempts
                      .map((attempt, index) => {
                        const x = ((index + 0.5) / attempts.length) * 100;
                        const y = 100 - attempt.overallScore;
                        return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Category Trends */}
        {showCategories && Object.keys(categoryTrends).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Category Trends</h4>

            <div className="space-y-3">
              {Object.entries(categoryTrends).map(([category, data]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
                    {categoryLabels[category] || category}
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                    {/* Average bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.average}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getScoreColor(data.average) }}
                    />

                    {/* Best score marker */}
                    {data.best > data.average && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-green-600"
                        style={{ left: `${data.best}%` }}
                        title={`Best: ${data.best}`}
                      />
                    )}

                    {/* Score label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white drop-shadow">
                        {data.average}%
                      </span>
                    </div>
                  </div>

                  {/* Trend indicator */}
                  <div className={`w-12 text-sm font-medium text-right ${
                    data.trend > 0
                      ? 'text-green-600 dark:text-green-400'
                      : data.trend < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {data.trend > 0 ? '+' : ''}{data.trend}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreComparisonChart;
