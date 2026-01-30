import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export default function BookmarkButton({
  scenarioId,
  initialBookmarked = false,
  initialFavorite = false,
  size = 'medium',
  showLabel = false,
  onToggle
}) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    checkBookmarkStatus();
  }, [scenarioId]);

  const checkBookmarkStatus = async () => {
    try {
      const response = await authFetch(`/api/bookmarks/check/${scenarioId}`);
      const data = await response.json();
      if (data.success) {
        setIsBookmarked(data.isBookmarked);
        setIsFavorite(data.bookmark?.is_favorite || false);
      }
    } catch (error) {
      console.error('Error checking bookmark:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    try {
      const response = await authFetch(`/api/bookmarks/${scenarioId}/toggle-favorite`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        setIsBookmarked(true);
        setIsFavorite(data.isFavorite);
        onToggle?.(data.isFavorite);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  if (checking) {
    return (
      <button
        disabled
        className={`rounded-lg bg-gray-700/50 ${sizeClasses[size]}`}
      >
        <Loader2 className={`${iconSizes[size]} text-gray-500 animate-spin`} />
      </button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      disabled={loading}
      className={`
        flex items-center gap-2 rounded-lg transition-all
        ${sizeClasses[size]}
        ${isFavorite
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'}
      `}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {loading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        <motion.div
          initial={false}
          animate={isFavorite ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Heart
            className={iconSizes[size]}
            fill={isFavorite ? 'currentColor' : 'none'}
          />
        </motion.div>
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {isFavorite ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </motion.button>
  );
}
