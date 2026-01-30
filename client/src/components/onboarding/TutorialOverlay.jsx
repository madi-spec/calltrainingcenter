import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TutorialTooltip from './TutorialTooltip';
import WelcomeModal from './WelcomeModal';
import useTutorial from '../../hooks/useTutorial';

/**
 * Main tutorial overlay component
 * Handles highlighting elements and showing tooltips/modals
 */
export default function TutorialOverlay() {
  const {
    isActive,
    isLoading,
    currentStep,
    progress,
    nextStep,
    previousStep,
    skipTutorial,
    completedSteps
  } = useTutorial();

  const [targetRect, setTargetRect] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Find and measure target element
  const updateTargetRect = useCallback(() => {
    if (!currentStep || currentStep.type === 'modal') {
      setTargetRect(null);
      return;
    }

    const target = document.querySelector(currentStep.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      const padding = currentStep.highlightPadding || 4;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + (padding * 2),
        height: rect.height + (padding * 2),
        bottom: rect.bottom + padding,
        right: rect.right + padding
      });
    } else if (currentStep.waitForElement) {
      // Element not found yet, will retry
      setTargetRect(null);
    }
  }, [currentStep]);

  // Update target rect on step change and resize
  useEffect(() => {
    if (!isActive) return;

    updateTargetRect();

    // Re-measure on resize and scroll
    const handleResize = () => updateTargetRect();
    const handleScroll = () => updateTargetRect();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Poll for element if waitForElement is true
    let pollInterval;
    if (currentStep?.waitForElement && !targetRect) {
      pollInterval = setInterval(() => {
        const target = document.querySelector(currentStep.target);
        if (target) {
          updateTargetRect();
          clearInterval(pollInterval);
        }
      }, 200);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isActive, currentStep, updateTargetRect]);

  // Handle step transitions
  const handleNext = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      nextStep();
      setIsTransitioning(false);
    }, 150);
  }, [nextStep]);

  const handlePrevious = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      previousStep();
      setIsTransitioning(false);
    }, 150);
  }, [previousStep]);

  const handleSkip = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      skipTutorial();
      setIsTransitioning(false);
    }, 150);
  }, [skipTutorial]);

  // Scroll target element into view
  useEffect(() => {
    if (targetRect && currentStep?.type === 'highlight') {
      const target = document.querySelector(currentStep.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!isInView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [targetRect, currentStep]);

  if (!isActive || isLoading || !currentStep) {
    return null;
  }

  // Render modal type steps
  if (currentStep.type === 'modal') {
    return createPortal(
      <WelcomeModal
        step={currentStep}
        isOpen={true}
        onNext={handleNext}
        onSkip={handleSkip}
        isComplete={currentStep.id === 'complete'}
      />,
      document.body
    );
  }

  // Render highlight type steps
  return createPortal(
    <AnimatePresence>
      {!isTransitioning && (
        <>
          {/* Overlay with cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] pointer-events-none"
          >
            {/* Semi-transparent overlay */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="tutorial-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {targetRect && (
                    <rect
                      x={targetRect.left}
                      y={targetRect.top}
                      width={targetRect.width}
                      height={targetRect.height}
                      rx="8"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.75)"
                mask="url(#tutorial-mask)"
              />
            </svg>

            {/* Highlight border */}
            {targetRect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute rounded-lg border-2 border-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.3)]"
                style={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height
                }}
              />
            )}
          </motion.div>

          {/* Click blocker with hole for target */}
          <div
            className="fixed inset-0 z-[10000]"
            onClick={(e) => {
              // Allow clicks on the target element
              if (targetRect && currentStep) {
                const { clientX, clientY } = e;
                const isInTarget =
                  clientX >= targetRect.left &&
                  clientX <= targetRect.right &&
                  clientY >= targetRect.top &&
                  clientY <= targetRect.bottom;
                if (isInTarget) {
                  // Find the actual target element and trigger click
                  const target = document.querySelector(currentStep.target);
                  if (target) {
                    // Try to find a clickable element: link, button, or element with cursor-pointer
                    const clickable =
                      target.querySelector('a, button, [role="button"]') ||
                      target.querySelector('[class*="cursor-pointer"]') ||
                      target.firstElementChild ||
                      target;

                    // Dispatch a real click event that will trigger React handlers
                    const clickEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    });
                    clickable.dispatchEvent(clickEvent);
                  }
                  // Advance tutorial after a short delay
                  setTimeout(handleNext, 400);
                  return;
                }
              }
              // Block other clicks
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* Tooltip */}
          <TutorialTooltip
            step={currentStep}
            position={currentStep.position}
            targetRect={targetRect}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSkip={handleSkip}
            progress={progress}
            canGoBack={completedSteps.length > 0}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
