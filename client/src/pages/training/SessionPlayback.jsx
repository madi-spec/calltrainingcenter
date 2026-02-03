import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  Play,
  Loader2,
  AlertCircle,
  Share2,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SessionPlayer, TranscriptViewer, NotesPanel } from '../../components/playback';

export default function SessionPlayback() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [recording, setRecording] = useState(null);
  const [notes, setNotes] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch session details, recording, and notes in parallel
      const [sessionRes, notesRes] = await Promise.all([
        authFetch(`/api/training/session/${sessionId}`),
        authFetch(`/api/session-notes/${sessionId}`)
      ]);

      if (!sessionRes.ok) {
        throw new Error('Failed to load session');
      }

      const sessionData = await sessionRes.json();
      setSession(sessionData.session);

      // Try to fetch recording
      try {
        const recordingRes = await authFetch(`/api/recordings/${sessionId}`);
        if (recordingRes.ok) {
          const recordingData = await recordingRes.json();
          setRecording(recordingData.recording);
        }
      } catch (err) {
        console.warn('No recording available:', err);
      }

      // Load notes
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }
    } catch (err) {
      console.error('Error fetching session data:', err);
      setError('Failed to load session. Please try again.');
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

  const handleNotesChange = useCallback((updatedNotes) => {
    setNotes(updatedNotes);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get audio URL - prefer recording.audio_url, fall back to recording_url in session
  const audioUrl = recording?.audio_url || session?.recording_url;
  const transcript = recording?.transcript_with_timestamps || session?.transcript_formatted || session?.transcript_raw;
  const analysisMarkers = session?.analysis_markers || { mistakes: [], successes: [], objections: [] };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Unable to Load Session
          </h2>
          <p className="text-gray-400 mb-6">
            {error || 'This session could not be found.'}
          </p>
          <Link
            to="/history"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {session.scenario_name || 'Training Session'}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(session.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(session.duration_seconds || 0)}
              </span>
              {session.overall_score && (
                <span className={`flex items-center gap-1 font-medium ${getScoreColor(session.overall_score)}`}>
                  <Trophy className="w-4 h-4" />
                  Score: {session.overall_score}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {audioUrl ? (
        <SessionPlayer
          audioUrl={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onSeek={handleSeek}
          currentTime={currentTime}
          duration={recording?.duration_seconds || session.duration_seconds}
        />
      ) : (
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <Play className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">No recording available</p>
          <p className="text-sm text-gray-500">
            This session was not recorded or the recording is not yet available.
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Transcript - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <TranscriptViewer
            transcript={transcript}
            currentTime={currentTime}
            onSeek={handleSeek}
            analysisMarkers={analysisMarkers}
            className="h-[700px]"
          />
        </div>

        {/* Notes Panel - Takes up 1 column */}
        <div className="lg:col-span-1">
          <NotesPanel
            sessionId={sessionId}
            currentTime={currentTime}
            notes={notes}
            onNotesChange={handleNotesChange}
            onSeek={handleSeek}
            authFetch={authFetch}
            className="h-[700px]"
          />
        </div>
      </div>

      {/* Performance Summary */}
      {session.category_scores && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Performance Breakdown
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(session.category_scores).map(([category, score]) => (
              <div key={category} className="text-center">
                <div className={`text-2xl font-bold mb-1 ${getScoreColor(score)}`}>
                  {score}
                </div>
                <div className="text-sm text-gray-400 capitalize">
                  {category.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Strengths and Improvements */}
      {(session.strengths?.length > 0 || session.improvements?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          {session.strengths?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-green-400 mb-4">
                Strengths
              </h3>
              <div className="space-y-3">
                {session.strengths.map((strength, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium text-gray-200 mb-1">
                      {strength.title || strength.area}
                    </p>
                    <p className="text-gray-400">
                      {strength.description || strength.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Improvements */}
          {session.improvements?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-yellow-400 mb-4">
                Areas to Improve
              </h3>
              <div className="space-y-3">
                {session.improvements.map((improvement, index) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium text-gray-200 mb-1">
                      {improvement.title || improvement.area}
                    </p>
                    <p className="text-gray-400">
                      {improvement.description || improvement.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
