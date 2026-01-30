import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AudioPlayer, TranscriptSyncViewer } from '../../components/replay';
import api from '../../services/api';

function CallReplay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(null);
  const [session, setSession] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [pendingBookmarkTime, setPendingBookmarkTime] = useState(null);

  useEffect(() => {
    fetchRecording();
  }, [sessionId]);

  const fetchRecording = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recording, session details, and bookmarks in parallel
      const [recordingRes, sessionRes, bookmarksRes] = await Promise.all([
        api.get(`/api/recordings/${sessionId}`),
        api.get(`/api/training/sessions/${sessionId}`),
        api.get(`/api/recordings/${sessionId}/bookmarks`)
      ]);

      setRecording(recordingRes.data.recording);
      setSession(sessionRes.data.session);
      setBookmarks(bookmarksRes.data.bookmarks || []);
    } catch (err) {
      console.error('Error fetching recording:', err);
      if (err.response?.status === 404) {
        setError('Recording not found. This session may not have been recorded.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this recording.');
      } else {
        setError('Failed to load recording. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  const handleSeek = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  const handleBookmark = useCallback((time) => {
    setPendingBookmarkTime(time);
    setBookmarkLabel('');
    setBookmarkNote('');
    setShowBookmarkModal(true);
  }, []);

  const saveBookmark = async () => {
    if (pendingBookmarkTime === null) return;

    try {
      const res = await api.post(`/api/recordings/${sessionId}/bookmarks`, {
        timestampSeconds: pendingBookmarkTime,
        label: bookmarkLabel || null,
        note: bookmarkNote || null,
        bookmarkType: 'general'
      });

      setBookmarks(prev => [...prev, res.data.bookmark].sort((a, b) =>
        a.timestamp_seconds - b.timestamp_seconds
      ));
      setShowBookmarkModal(false);
    } catch (err) {
      console.error('Error saving bookmark:', err);
    }
  };

  const deleteBookmark = async (bookmarkId) => {
    try {
      await api.delete(`/api/recordings/${sessionId}/bookmarks/${bookmarkId}`);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (err) {
      console.error('Error deleting bookmark:', err);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Unable to Load Recording</h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/results/${sessionId}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Results
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Call Replay
            </h1>
            {session && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {session.scenario?.name || 'Training Session'} • {new Date(session.started_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {session?.overall_score !== null && (
            <div className="text-right">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {session.overall_score}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Overall Score</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Audio player and transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audio Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AudioPlayer
              src={recording?.audio_url}
              duration={recording?.duration_seconds}
              onTimeUpdate={handleTimeUpdate}
              onBookmark={handleBookmark}
              bookmarks={bookmarks}
            />
          </motion.div>

          {/* Transcript */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TranscriptSyncViewer
              transcript={recording?.transcript_with_timestamps || []}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          </motion.div>
        </div>

        {/* Sidebar - Bookmarks and info */}
        <div className="space-y-6">
          {/* Bookmarks panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Bookmarks ({bookmarks.length})
              </h3>
            </div>
            <div className="p-4">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No bookmarks yet. Click the bookmark button while playing to add one.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group"
                    >
                      <button
                        onClick={() => handleSeek(bookmark.timestamp_seconds)}
                        className="flex-shrink-0 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-mono rounded"
                      >
                        {formatTime(bookmark.timestamp_seconds)}
                      </button>
                      <div className="flex-1 min-w-0">
                        {bookmark.label && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {bookmark.label}
                          </p>
                        )}
                        {bookmark.note && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {bookmark.note}
                          </p>
                        )}
                        {!bookmark.label && !bookmark.note && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Bookmark
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete bookmark"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Session info */}
          {session && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Session Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Duration</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {formatTime(recording?.duration_seconds || session.duration_seconds)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {new Date(session.started_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Time</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">
                    {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </dd>
                </div>
                {session.difficulty && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Difficulty</dt>
                    <dd className="text-gray-900 dark:text-white font-medium capitalize">
                      {session.difficulty}
                    </dd>
                  </div>
                )}
              </dl>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <Link
              to={`/results/${sessionId}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Full Results
            </Link>
            <Link
              to={`/analysis/${sessionId}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Compare with Previous
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bookmark Modal */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Bookmark at {formatTime(pendingBookmarkTime)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={bookmarkLabel}
                  onChange={(e) => setBookmarkLabel(e.target.value)}
                  placeholder="e.g., Great objection handling"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="Add a note about this moment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBookmarkModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBookmark}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Bookmark
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default CallReplay;
