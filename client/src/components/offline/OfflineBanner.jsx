import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineContext } from '../../context/OfflineContext';

function OfflineBanner() {
  const { isOffline, pendingActions, isSyncing } = useOfflineContext();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-yellow-500 text-yellow-900 overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span>You're offline. Some features may be limited.</span>
            {pendingActions > 0 && (
              <span className="px-2 py-0.5 bg-yellow-600 text-yellow-100 rounded-full text-xs">
                {pendingActions} pending {pendingActions === 1 ? 'action' : 'actions'}
              </span>
            )}
          </div>
        </motion.div>
      )}

      {!isOffline && isSyncing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-blue-500 text-white overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Syncing your data...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OfflineBanner;
