import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';

const API_URL = import.meta.env.VITE_API_URL || '';

const STATUS_CONFIG = {
  interviewing: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: MessageSquare },
  generating: { label: 'Generating', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Clock },
  reviewing: { label: 'Review', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Clock },
  published: { label: 'Published', color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle },
};

export default function StudioSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const session = await res.json();
        navigate(`/studio/${session.id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Studio</h1>
          <p className="text-muted-foreground mt-1">Build training programs from your company documents</p>
        </div>
        <button
          onClick={createSession}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-card rounded-lg border border-border">
          <EmptyState
            icon={MessageSquare}
            title="No sessions yet"
            description="Upload your training documents and let AI build your program"
            action={createSession}
            actionLabel="Start Your First Session"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const status = STATUS_CONFIG[session.status] || STATUS_CONFIG.interviewing;
            const StatusIcon = status.icon;
            return (
              <button
                key={session.id}
                onClick={() => navigate(`/studio/${session.id}`)}
                className="w-full text-left p-4 bg-card/50 hover:bg-card border border-border rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${status.color}`} />
                    <div>
                      <div className="text-foreground font-medium">
                        Session {new Date(session.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.creator?.name || 'Unknown'} · {new Date(session.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
