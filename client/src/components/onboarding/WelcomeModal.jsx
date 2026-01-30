import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  TrendingUp,
  Award,
  CheckCircle,
  X,
  Sparkles
} from 'lucide-react';

/**
 * Welcome modal shown at the start and end of the tutorial
 */
export default function WelcomeModal({
  step,
  isOpen,
  onNext,
  onSkip,
  isComplete = false
}) {
  const navigate = useNavigate();

  if (!isOpen || !step) return null;

  const handlePrimaryAction = () => {
    if (step.primaryAction?.path) {
      navigate(step.primaryAction.path);
    }
    onNext();
  };

  const handleSecondaryAction = () => {
    if (step.secondaryAction?.path) {
      navigate(step.secondaryAction.path);
    }
    onSkip();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onSkip}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Header decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25"
            >
              {isComplete ? (
                <Sparkles className="w-10 h-10 text-white" />
              ) : (
                <Phone className="w-10 h-10 text-white" />
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-3"
            >
              {step.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-300 mb-6"
            >
              {step.description}
            </motion.p>

            {/* Tips/Features */}
            {step.tips && step.tips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-8"
              >
                <div className="grid gap-3">
                  {step.tips.map((tip, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-750 rounded-lg text-left"
                    >
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-gray-200 text-sm">{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feature icons for welcome */}
            {!isComplete && step.id === 'welcome' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-8 mb-8"
              >
                {[
                  { icon: MessageCircle, label: 'AI Conversations', color: 'blue' },
                  { icon: TrendingUp, label: 'Track Progress', color: 'green' },
                  { icon: Award, label: 'Earn Badges', color: 'yellow' }
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-2 bg-${color}-500/20 rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 text-${color}-400`} />
                    </div>
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              {step.secondaryAction ? (
                <>
                  <button
                    onClick={handleSecondaryAction}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl transition-colors"
                  >
                    {step.secondaryAction.label}
                  </button>
                  <button
                    onClick={handlePrimaryAction}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                  >
                    {step.primaryAction.label}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onSkip}
                    className="px-6 py-3 text-gray-400 hover:text-gray-200 font-medium rounded-xl transition-colors"
                  >
                    Skip Tutorial
                  </button>
                  <button
                    onClick={onNext}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
