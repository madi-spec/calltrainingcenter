import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, User, Bot, Clock, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function CallReplay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(`/api/training/session/${sessionId}`);

      if (res.status === 404) {
        setError('Session not found.');
        return;
      }
      if (res.status === 403) {
        setError('You do not have permission to view this session.');
        return;
      }
      if (!res.ok) {
        setError('Failed to load session.');
        return;
      }

      const data = await res.json();
      setSession(data.session);
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Failed to load session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTranscript = (session) => {
    if (session.transcript_formatted && Array.isArray(session.transcript_formatted) && session.transcript_formatted.length > 0) {
      return session.transcript_formatted.map((entry, i) => ({
        id: i,
        role: entry.role === 'agent' ? 'customer' : 'csr',
        content: entry.content
      }));
    }

    if (session.transcript_raw) {
      return session.transcript_raw.split('\n').filter(Boolean).map((line, i) => {
        const isCustomer = line.startsWith('Customer:') || line.startsWith('Agent:');
        return {
          id: i,
          role: isCustomer ? 'customer' : 'csr',
          content: line.replace(/^(Customer|CSR|Agent|User):\s*/i, '')
        };
      });
    }

    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Unable to Load Session</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-md transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const transcript = parseTranscript(session);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Replay</h1>
            <p className="text-muted-foreground mt-1">
              {session.scenario_name || 'Training Session'} &middot; {new Date(session.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {session.duration_seconds > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{formatTime(session.duration_seconds)}</span>
                </div>
              </div>
            )}
            {session.overall_score !== null && (
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-400">
                  {session.overall_score}
                </div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transcript */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-border"
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Conversation Transcript</h3>
            </div>

            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
              {transcript.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No transcript available for this session.</p>
              ) : (
                transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex gap-3 ${entry.role === 'csr' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.role === 'customer'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {entry.role === 'customer' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                      entry.role === 'customer'
                        ? 'bg-muted text-foreground'
                        : 'bg-primary-600/20 text-foreground'
                    }`}>
                      <div className="text-xs text-muted-foreground mb-1">
                        {entry.role === 'customer' ? 'Customer' : 'CSR'}
                      </div>
                      {entry.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Session info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border border-border p-5"
          >
            <h3 className="font-semibold text-foreground mb-3">Session Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Scenario</dt>
                <dd className="text-foreground font-medium text-right max-w-[60%]">{session.scenario_name || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-foreground font-medium">{formatTime(session.duration_seconds)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-foreground font-medium">{new Date(session.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground font-medium capitalize">{session.status}</dd>
              </div>
              {session.attempt_number && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Attempt</dt>
                  <dd className="text-foreground font-medium">#{session.attempt_number}</dd>
                </div>
              )}
            </dl>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Link
              to={`/results/${sessionId}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-foreground text-background hover:opacity-90 rounded-md transition-opacity text-sm font-medium"
            >
              <BarChart2 className="w-4 h-4" />
              View Full Results
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default CallReplay;
