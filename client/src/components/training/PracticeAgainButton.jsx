import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Play, Target, TrendingUp, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PracticeAgainButton({
  session,
  scenario,
  variant = 'primary',
  size = 'medium',
  showOptions = true
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const handlePracticeAgain = async (mode = 'repeat') => {
    setLoading(true);
    setShowDropdown(false);

    try {
      if (mode === 'new') {
        // Start fresh with the same scenario
        navigate(`/scenario/${scenario?.id || session?.scenario_id}`);
      } else {
        // Create a repeat practice session linked to the original
        const response = await authFetch('/api/training/repeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.id
          })
        });

        const data = await response.json();

        if (data.session) {
          // Navigate to the scenario with repeat context
          navigate(`/scenario/${scenario?.id || session?.scenario_id}`, {
            state: {
              repeatSession: data.session,
              originalScore: data.original_score,
              attemptNumber: data.attempt_number
            }
          });
        }
      }
    } catch (error) {
      console.error('Error starting practice:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-gray-200',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  };

  if (!showOptions) {
    return (
      <button
        onClick={() => handlePracticeAgain('repeat')}
        disabled={loading}
        className={`
          flex items-center gap-2 font-medium rounded-xl transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <RotateCcw className="w-5 h-5" />
        )}
        Practice Again
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePracticeAgain('repeat')}
          disabled={loading}
          className={`
            flex items-center gap-2 font-medium rounded-l-xl transition-colors
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RotateCcw className="w-5 h-5" />
          )}
          Practice Again
        </button>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          className={`
            p-2 font-medium rounded-r-xl border-l border-white/20 transition-colors
            ${variantClasses[variant]}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={() => handlePracticeAgain('repeat')}
                  className="w-full flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <TrendingUp className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-200">Beat Your Score</p>
                    <p className="text-xs text-gray-500">
                      Track improvement from your previous {session?.overall_score}%
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handlePracticeAgain('new')}
                  className="w-full flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Play className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-200">Fresh Start</p>
                    <p className="text-xs text-gray-500">
                      Start a new session without tracking
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => navigate(`/scenario/${scenario?.id || session?.scenario_id}?difficulty=harder`)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Target className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-200">Challenge Mode</p>
                    <p className="text-xs text-gray-500">
                      Same scenario, higher difficulty
                    </p>
                  </div>
                </button>
              </div>

              {session?.attempt_number && (
                <div className="px-4 py-2 bg-gray-700/50 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    This will be attempt #{(session.attempt_number || 0) + 1}
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
