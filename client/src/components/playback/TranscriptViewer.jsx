import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export default function TranscriptViewer({
  transcript,
  currentTime,
  onSeek,
  analysisMarkers = { mistakes: [], successes: [], objections: [] },
  className = ''
}) {
  const containerRef = useRef(null);
  const activeSegmentRef = useRef(null);

  // Parse transcript to segments with timestamps
  const segments = useMemo(() => {
    if (!transcript) return [];

    // If transcript is already in timestamped format
    if (Array.isArray(transcript)) {
      return transcript.map((seg, idx) => ({
        id: idx,
        timestamp: seg.timestamp || seg.start_time || 0,
        speaker: seg.speaker || seg.role || 'unknown',
        text: seg.text || seg.content || '',
        endTime: seg.end_time || seg.endTime
      }));
    }

    // If transcript is a string, try to parse it
    if (typeof transcript === 'string') {
      // Try to split by speaker patterns
      const lines = transcript.split('\n').filter(line => line.trim());
      let currentTimestamp = 0;
      const avgWordsPerSecond = 2.5; // Average speaking rate

      return lines.map((line, idx) => {
        const speakerMatch = line.match(/^(Agent|User|Customer|Rep):\s*/i);
        const speaker = speakerMatch ? speakerMatch[1].toLowerCase() : 'unknown';
        const text = line.replace(/^(Agent|User|Customer|Rep):\s*/i, '').trim();

        // Estimate timestamp based on text length
        const words = text.split(' ').length;
        const duration = words / avgWordsPerSecond;

        const segment = {
          id: idx,
          timestamp: currentTimestamp,
          speaker,
          text,
          endTime: currentTimestamp + duration
        };

        currentTimestamp += duration + 0.5; // Add small pause between turns
        return segment;
      });
    }

    return [];
  }, [transcript]);

  // Find current active segment based on currentTime
  const activeSegmentIndex = useMemo(() => {
    if (segments.length === 0) return -1;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (nextSegment) {
        if (currentTime >= segment.timestamp && currentTime < nextSegment.timestamp) {
          return i;
        }
      } else {
        // Last segment
        if (currentTime >= segment.timestamp) {
          return i;
        }
      }
    }
    return -1;
  }, [segments, currentTime]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const isVisible =
        elementRect.top >= containerRect.top &&
        elementRect.bottom <= containerRect.bottom;

      if (!isVisible) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeSegmentIndex]);

  // Get marker type for a timestamp
  const getMarkerType = (timestamp) => {
    const threshold = 3; // 3 seconds threshold for matching

    if (analysisMarkers.mistakes?.some(m =>
      Math.abs(m - timestamp) < threshold
    )) {
      return 'mistake';
    }
    if (analysisMarkers.successes?.some(m =>
      Math.abs(m - timestamp) < threshold
    )) {
      return 'success';
    }
    if (analysisMarkers.objections?.some(m =>
      Math.abs(m - timestamp) < threshold
    )) {
      return 'objection';
    }
    return null;
  };

  const formatTimestamp = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerIcon = (speaker) => {
    const normalized = speaker.toLowerCase();
    if (normalized === 'agent' || normalized === 'rep' || normalized === 'user') {
      return <User className="w-4 h-4" />;
    }
    return <Phone className="w-4 h-4" />;
  };

  const getSpeakerColor = (speaker) => {
    const normalized = speaker.toLowerCase();
    if (normalized === 'agent' || normalized === 'rep' || normalized === 'user') {
      return 'text-blue-400 bg-blue-500/10';
    }
    return 'text-green-400 bg-green-500/10';
  };

  const getMarkerIcon = (type) => {
    switch (type) {
      case 'mistake':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'objection':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getMarkerBorder = (type) => {
    switch (type) {
      case 'mistake':
        return 'border-l-4 border-red-500';
      case 'success':
        return 'border-l-4 border-green-500';
      case 'objection':
        return 'border-l-4 border-yellow-500';
      default:
        return '';
    }
  };

  if (!segments || segments.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
        <div className="text-center text-gray-400 py-12">
          <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No transcript available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100">Transcript</h3>
        <p className="text-sm text-gray-400 mt-1">
          Click any line to jump to that moment
        </p>
      </div>

      <div
        ref={containerRef}
        className="p-4 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar"
      >
        {segments.map((segment, index) => {
          const isActive = index === activeSegmentIndex;
          const markerType = getMarkerType(segment.timestamp);

          return (
            <motion.div
              key={segment.id}
              ref={isActive ? activeSegmentRef : null}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onSeek?.(segment.timestamp)}
              className={`
                p-4 rounded-lg cursor-pointer transition-all
                ${isActive ? 'bg-gray-700 ring-2 ring-primary-500' : 'bg-gray-800/50 hover:bg-gray-700/50'}
                ${markerType ? getMarkerBorder(markerType) : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Marker Icon */}
                {markerType && (
                  <div className="mt-1 flex-shrink-0">
                    {getMarkerIcon(markerType)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {/* Speaker and Timestamp */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getSpeakerColor(segment.speaker)}`}>
                      {getSpeakerIcon(segment.speaker)}
                      <span className="capitalize">{segment.speaker}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(segment.timestamp)}
                    </span>
                  </div>

                  {/* Text Content */}
                  <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-100 font-medium' : 'text-gray-300'}`}>
                    {segment.text}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}
