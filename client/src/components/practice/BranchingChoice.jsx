import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

/**
 * BranchingChoice Component
 * Displays a decision point with multiple choice options during practice
 */
function BranchingChoice({ node, onChoiceSelected, isVisible }) {
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when node changes
  useEffect(() => {
    setSelectedChoice(null);
    setIsConfirming(false);
  }, [node?.id]);

  if (!isVisible || !node) {
    return null;
  }

  const handleChoiceClick = (choice) => {
    setSelectedChoice(choice);
  };

  const handleConfirm = () => {
    if (selectedChoice) {
      setIsConfirming(true);
      onChoiceSelected(selectedChoice);
    }
  };

  const handleCancel = () => {
    setSelectedChoice(null);
  };

  const getOutcomeIcon = (outcomeType) => {
    switch (outcomeType) {
      case 'optimal':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'acceptable':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getOutcomeColor = (outcomeType) => {
    switch (outcomeType) {
      case 'optimal':
        return 'border-green-500 bg-green-50';
      case 'acceptable':
        return 'border-yellow-500 bg-yellow-50';
      case 'poor':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getScoreModifierText = (modifier) => {
    if (modifier >= 1.0) return 'Optimal path (100%)';
    if (modifier >= 0.9) return 'Great choice (90%)';
    if (modifier >= 0.7) return 'Acceptable (70%)';
    if (modifier >= 0.5) return 'Below average (50%)';
    return 'Poor choice (40%)';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
      >
        <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Decision Point
              </h3>
              <p className="text-gray-600">
                {node.description || 'Choose how to respond to this situation'}
              </p>
            </div>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Practice Paused</p>
              <p>
                Your conversation has reached a critical decision point.
                Choose your approach below. Different choices will lead to
                different outcomes and affect your final score.
              </p>
            </div>
          </div>

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {node.choices?.map((choice, index) => (
              <motion.button
                key={choice.id}
                onClick={() => handleChoiceClick(choice)}
                disabled={isConfirming}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`
                  w-full p-4 rounded-lg border-2 text-left transition-all
                  ${selectedChoice?.id === choice.id
                    ? `${getOutcomeColor(choice.outcome_type)} border-2 shadow-lg`
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                  }
                  ${isConfirming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Choice Number */}
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold
                    ${selectedChoice?.id === choice.id
                      ? 'bg-white text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {index + 1}
                  </div>

                  {/* Choice Content */}
                  <div className="flex-1">
                    <p className={`
                      font-medium mb-2
                      ${selectedChoice?.id === choice.id
                        ? 'text-gray-900'
                        : 'text-gray-700'
                      }
                    `}>
                      {choice.text}
                    </p>

                    {/* Show outcome details when selected */}
                    {selectedChoice?.id === choice.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 text-sm"
                      >
                        {getOutcomeIcon(choice.outcome_type)}
                        <span className="font-medium">
                          {getScoreModifierText(choice.score_modifier)}
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {selectedChoice?.id === choice.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!selectedChoice || isConfirming}
            >
              Change Selection
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedChoice || isConfirming}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConfirming ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Continuing...
                </>
              ) : (
                'Confirm & Continue'
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Tip: Choose the response that best demonstrates professional sales techniques
              and customer service skills for the highest score.
            </p>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export default BranchingChoice;
