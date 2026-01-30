import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

function formatTimestamp(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function TranscriptEntry({ entry, isActive, onClick }) {
  const isAgent = entry.speaker?.toLowerCase() === 'agent' || entry.role === 'agent';
  const isCustomer = entry.speaker?.toLowerCase() === 'customer' || entry.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: isActive ? 1 : 0.7 }}
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onClick}
    >
      {/* Timestamp */}
      <div className="flex-shrink-0 w-12 text-xs text-gray-400 dark:text-gray-500 pt-1">
        {formatTimestamp(entry.timestamp)}
      </div>

      {/* Speaker indicator */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
          isAgent
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : isCustomer
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {isAgent ? 'A' : isCustomer ? 'C' : '?'}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${
            isAgent
              ? 'text-green-700 dark:text-green-400'
              : isCustomer
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {entry.speaker || (isAgent ? 'Agent (You)' : isCustomer ? 'Customer' : 'Unknown')}
          </span>
        </div>
        <p className={`text-sm ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
          {entry.text || entry.content}
        </p>
      </div>
    </motion.div>
  );
}

function TranscriptSyncViewer({ transcript = [], currentTime = 0, onSeek }) {
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // Find the active entry based on current time
  const activeIndex = transcript.findIndex((entry, index) => {
    const nextEntry = transcript[index + 1];
    const entryTime = entry.timestamp || 0;
    const nextTime = nextEntry?.timestamp || Infinity;
    return currentTime >= entryTime && currentTime < nextTime;
  });

  // Auto-scroll to active entry
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Check if active element is outside visible area
      if (activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom) {
        active.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeIndex]);

  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No transcript available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Transcript
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Agent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Customer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript entries */}
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto p-2 space-y-1"
      >
        {transcript.map((entry, index) => (
          <div
            key={entry.id || index}
            ref={index === activeIndex ? activeRef : null}
          >
            <TranscriptEntry
              entry={entry}
              isActive={index === activeIndex}
              onClick={() => onSeek?.(entry.timestamp || 0)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TranscriptSyncViewer;
