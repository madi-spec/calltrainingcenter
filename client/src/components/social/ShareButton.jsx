import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Users, Building2, Lock, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const VISIBILITY_OPTIONS = [
  { value: 'team', label: 'My Team', icon: Users, description: 'Visible to teammates' },
  { value: 'organization', label: 'Organization', icon: Building2, description: 'Visible to everyone' },
  { value: 'private', label: 'Private', icon: Lock, description: 'Only you can see' }
];

export default function ShareButton({
  achievementType,
  achievementId,
  achievementData,
  size = 'medium',
  variant = 'default'
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState('team');
  const { authFetch } = useAuth();

  const handleShare = async () => {
    setSharing(true);
    try {
      const response = await authFetch('/api/social/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievement_type: achievementType,
          achievement_id: achievementId,
          achievement_data: achievementData,
          visibility: selectedVisibility
        })
      });

      if (response.ok) {
        setShared(true);
        setShowOptions(false);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (error) {
      console.error('Error sharing achievement:', error);
    } finally {
      setSharing(false);
    }
  };

  const sizeClasses = {
    small: 'p-1.5',
    medium: 'p-2',
    large: 'px-4 py-2'
  };

  const variantClasses = {
    default: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    ghost: 'hover:bg-gray-700 text-gray-400'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`
          flex items-center gap-2 rounded-lg transition-colors
          ${sizeClasses[size]}
          ${shared ? 'bg-green-600 text-white' : variantClasses[variant]}
        `}
        disabled={sharing}
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : shared ? (
          <>
            <Check className="w-4 h-4" />
            {size === 'large' && 'Shared!'}
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            {size === 'large' && 'Share'}
          </>
        )}
      </button>

      <AnimatePresence>
        {showOptions && !sharing && !shared && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-2 w-56 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50"
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide px-2 py-1">
                Share with
              </p>
              {VISIBILITY_OPTIONS.map(option => {
                const Icon = option.icon;
                const isSelected = selectedVisibility === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedVisibility(option.value)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${isSelected
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'hover:bg-gray-700 text-gray-300'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2 border-t border-gray-700">
              <button
                onClick={handleShare}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Share Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}
