import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Positioned tooltip for tutorial highlights
 */
export default function TutorialTooltip({
  step,
  position = 'bottom',
  targetRect,
  onNext,
  onPrevious,
  onSkip,
  progress,
  canGoBack = true
}) {
  if (!step) return null;

  // If target element not found, show a centered fallback tooltip
  const showFallback = !targetRect;

  // Calculate tooltip position based on target element
  const getTooltipStyle = () => {
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Approximate

    let top, left;

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.right + padding;
        break;
      default:
        top = targetRect.bottom + padding;
        left = targetRect.left;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding;
    }

    return { top, left, width: tooltipWidth };
  };

  // Use centered style for fallback, otherwise calculate position
  const style = showFallback
    ? {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 320
      }
    : getTooltipStyle();

  // Arrow position based on tooltip position
  const getArrowStyle = () => {
    const arrowSize = 8;

    switch (position) {
      case 'top':
        return {
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          borderRight: '1px solid rgba(59, 130, 246, 0.5)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.5)'
        };
      case 'bottom':
        return {
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          borderLeft: '1px solid rgba(59, 130, 246, 0.5)',
          borderTop: '1px solid rgba(59, 130, 246, 0.5)'
        };
      case 'left':
        return {
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          borderRight: '1px solid rgba(59, 130, 246, 0.5)',
          borderTop: '1px solid rgba(59, 130, 246, 0.5)'
        };
      case 'right':
        return {
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          borderLeft: '1px solid rgba(59, 130, 246, 0.5)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.5)'
        };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed z-[10001] bg-gray-800 rounded-xl border border-blue-500/50 shadow-xl shadow-blue-500/10"
      style={style}
    >
      {/* Arrow - only show when we have a target */}
      {!showFallback && (
        <div
          className="absolute w-4 h-4 bg-gray-800"
          style={getArrowStyle()}
        />
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-white pr-2">
            {step.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            title="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm mb-4">
          {step.description}
        </p>

        {/* Fallback message when element not found */}
        {showFallback && (
          <p className="text-yellow-400 text-xs mb-4 bg-yellow-400/10 p-2 rounded-lg">
            The highlighted element isn't visible yet. Click "Next" to continue or navigate to the correct page.
          </p>
        )}

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Step {progress.current} of {progress.total}</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={!canGoBack}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
