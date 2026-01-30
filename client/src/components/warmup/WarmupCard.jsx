import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb, Clock } from 'lucide-react';

/**
 * Single warmup exercise card with multiple choice
 */
export default function WarmupCard({
  exercise,
  onAnswer,
  isAnswered = false,
  selectedIndex = null,
  correctIndex = null,
  explanation = null,
  showTimer = false,
  timeRemaining = null
}) {
  const [localSelected, setLocalSelected] = useState(null);

  const handleSelect = (index) => {
    if (isAnswered) return;
    setLocalSelected(index);
  };

  const handleSubmit = () => {
    if (localSelected === null || isAnswered) return;
    onAnswer(localSelected);
  };

  const getOptionStyle = (index) => {
    if (!isAnswered) {
      return localSelected === index
        ? 'border-blue-500 bg-blue-500/10'
        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-750';
    }

    // After answering
    const isCorrect = index === correctIndex;
    const wasSelected = index === selectedIndex;

    if (isCorrect) {
      return 'border-green-500 bg-green-500/10';
    }
    if (wasSelected && !isCorrect) {
      return 'border-red-500 bg-red-500/10';
    }
    return 'border-gray-700 bg-gray-800/50 opacity-60';
  };

  const getOptionIcon = (index) => {
    if (!isAnswered) return null;

    const isCorrect = index === correctIndex;
    const wasSelected = index === selectedIndex;

    if (isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (wasSelected && !isCorrect) {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl border border-gray-700 p-6"
    >
      {/* Header with type and timer */}
      <div className="flex items-center justify-between mb-4">
        <span className={`
          px-3 py-1 text-xs font-medium rounded-full
          ${exercise.type === 'objection_response' ? 'bg-purple-500/20 text-purple-400' :
            exercise.type === 'product_knowledge' ? 'bg-blue-500/20 text-blue-400' :
            exercise.type === 'policy_check' ? 'bg-orange-500/20 text-orange-400' :
            'bg-gray-500/20 text-gray-400'}
        `}>
          {exercise.type?.replace(/_/g, ' ')}
        </span>

        {showTimer && timeRemaining !== null && (
          <div className={`flex items-center gap-1.5 text-sm ${
            timeRemaining <= 10 ? 'text-red-400' : 'text-gray-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}s</span>
          </div>
        )}

        {exercise.difficulty && (
          <span className={`
            text-xs font-medium
            ${exercise.difficulty === 'easy' ? 'text-green-400' :
              exercise.difficulty === 'medium' ? 'text-yellow-400' : 'text-red-400'}
          `}>
            {exercise.difficulty}
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-lg font-medium text-gray-100 mb-6">
        {exercise.question}
      </h3>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {exercise.options?.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={isAnswered}
            whileHover={!isAnswered ? { scale: 1.01 } : {}}
            whileTap={!isAnswered ? { scale: 0.99 } : {}}
            className={`
              w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors
              ${getOptionStyle(index)}
              ${!isAnswered && 'cursor-pointer'}
            `}
          >
            <span className={`
              w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium flex-shrink-0
              ${localSelected === index && !isAnswered ? 'bg-blue-500 text-white' :
                isAnswered && index === correctIndex ? 'bg-green-500 text-white' :
                isAnswered && index === selectedIndex ? 'bg-red-500 text-white' :
                'bg-gray-700 text-gray-300'}
            `}>
              {String.fromCharCode(65 + index)}
            </span>
            <span className={`flex-1 ${isAnswered && index !== correctIndex && index !== selectedIndex ? 'text-gray-500' : 'text-gray-200'}`}>
              {option.text}
            </span>
            {getOptionIcon(index)}
          </motion.button>
        ))}
      </div>

      {/* Submit button (before answer) */}
      {!isAnswered && (
        <motion.button
          onClick={handleSubmit}
          disabled={localSelected === null}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            w-full py-3 rounded-lg font-medium transition-colors
            ${localSelected !== null
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
          `}
        >
          Submit Answer
        </motion.button>
      )}

      {/* Explanation (after answer) */}
      <AnimatePresence>
        {isAnswered && explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 mt-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-400 mb-1">Explanation</p>
                  <p className="text-sm text-gray-300">{explanation}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
