import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import usePWA from '../../hooks/usePWA';

function InstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSince < 7) {
        setDismissed(true);
      }
    }
  }, []);

  // Show prompt after a delay
  useEffect(() => {
    if (isInstallable && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 30000); // Show after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, dismissed]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-white dark:bg-card rounded-lg shadow-xl border border-border dark:border-border p-4">
          <div className="flex items-start gap-4">
            {/* App icon */}
            <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground dark:text-foreground">
                Install CSR Training
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                Install our app for quick access and offline support.
              </p>

              {/* Buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-1.5 text-muted-foreground dark:text-secondary-foreground text-sm hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-muted-foreground hover:text-muted-foreground dark:hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InstallPrompt;
