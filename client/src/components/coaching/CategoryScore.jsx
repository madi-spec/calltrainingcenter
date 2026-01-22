import { motion } from 'framer-motion';
import Card from '../ui/Card';

function CategoryScore({ name, score, feedback, delay = 0 }) {
  const getColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card padding="sm" className="h-full">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-200 text-sm">{name}</h4>
          <span className={`text-lg font-bold ${getTextColor(score)}`}>
            {score}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
          <motion.div
            className={`h-full rounded-full ${getColor(score)}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ delay: delay + 0.3, duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <p className="text-xs text-gray-400 line-clamp-3">{feedback}</p>
        )}
      </Card>
    </motion.div>
  );
}

export default CategoryScore;
