import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Swords, Trophy, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ChallengeColleagueModal({ scenario, onClose, onChallengeSent }) {
  const [colleagues, setColleagues] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedColleague, setSelectedColleague] = useState(null);
  const [message, setMessage] = useState('');
  const [wagerPoints, setWagerPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const { authFetch, profile } = useAuth();

  useEffect(() => {
    fetchColleagues();
  }, [search]);

  const fetchColleagues = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await authFetch(`/api/social/colleagues?${params}`);
      const data = await response.json();
      if (data.success) {
        setColleagues(data.colleagues || []);
      }
    } catch (error) {
      console.error('Error fetching colleagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedColleague) return;

    setSending(true);
    setError(null);

    try {
      const response = await authFetch('/api/social/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenged_id: selectedColleague.id,
          scenario_id: scenario.id,
          wager_points: wagerPoints,
          message: message || null
        })
      });

      const data = await response.json();

      if (data.success) {
        onChallengeSent?.(data.challenge);
        onClose();
      } else {
        setError(data.error || 'Failed to send challenge');
      }
    } catch (err) {
      setError('Failed to send challenge');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-lg w-full max-w-md border border-border shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Swords className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Challenge a Colleague</h2>
                <p className="text-sm text-muted-foreground">{scenario?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search colleagues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Colleague list */}
        <div className="max-h-64 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : colleagues.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No colleagues found
            </p>
          ) : (
            colleagues.map(colleague => (
              <button
                key={colleague.id}
                onClick={() => setSelectedColleague(colleague)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                  ${selectedColleague?.id === colleague.id
                    ? 'bg-primary-500/20 border-primary-500/50 border'
                    : 'bg-muted/50 hover:bg-muted border border-transparent'}
                `}
              >
                <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 font-bold">
                  {colleague.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{colleague.full_name}</p>
                  <p className="text-sm text-muted-foreground">Level {colleague.level || 1}</p>
                </div>
                <div className="text-right">
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Trophy className="w-4 h-4" />
                    {colleague.total_points || 0}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Challenge options */}
        {selectedColleague && (
          <div className="p-4 border-t border-border space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-foreground mb-1">
                Message (optional)
              </label>
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Let's see who's better at this!"
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-foreground mb-1">
                Wager Points (optional)
              </label>
              <div className="flex items-center gap-2">
                {[0, 10, 25, 50].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setWagerPoints(amount)}
                    className={`
                      flex-1 py-2 rounded-lg transition-colors
                      ${wagerPoints === amount
                        ? 'bg-primary-600 text-foreground'
                        : 'bg-muted text-secondary-foreground hover:bg-muted'}
                    `}
                  >
                    {amount === 0 ? 'None' : `${amount} pts`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Winner takes the wager points
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-muted hover:bg-muted text-foreground font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendChallenge}
            disabled={!selectedColleague || sending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-muted disabled:cursor-not-allowed text-foreground font-medium rounded-md transition-colors"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Swords className="w-5 h-5" />
                Send Challenge
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
