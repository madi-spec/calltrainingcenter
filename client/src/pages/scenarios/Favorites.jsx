import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  Play,
  Star,
  Clock,
  TrendingUp,
  Folder,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BookmarkButton from '../../components/scenarios/BookmarkButton';

export default function Favorites() {
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookmarksRes, foldersRes, scenariosRes] = await Promise.all([
        authFetch('/api/bookmarks'),
        authFetch('/api/bookmarks/folders'),
        authFetch('/api/scenarios')
      ]);

      if (bookmarksRes.ok) {
        const data = await bookmarksRes.json();
        setBookmarks(data.bookmarks || []);
      }

      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Map bookmarks to scenarios
  const bookmarkedScenarios = bookmarks.map(bookmark => {
    const scenario = scenarios.find(s => s.id === bookmark.scenario_id);
    return {
      ...bookmark,
      scenario
    };
  }).filter(b => b.scenario); // Only show bookmarks with valid scenarios

  // Filter by folder, search, and favorites
  const filteredBookmarks = bookmarkedScenarios.filter(b => {
    if (activeFolder && b.folder !== activeFolder) return false;
    if (showFavoritesOnly && !b.is_favorite) return false;
    if (search) {
      const scenarioName = b.scenario?.name?.toLowerCase() || '';
      const notes = b.notes?.toLowerCase() || '';
      const searchLower = search.toLowerCase();
      if (!scenarioName.includes(searchLower) && !notes.includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  const handleRemoveBookmark = (scenarioId) => {
    setBookmarks(prev => prev.filter(b => b.scenario_id !== scenarioId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-400" />
            Favorites & Bookmarks
          </h1>
          <p className="text-gray-400 mt-1">
            Quick access to your saved scenarios
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
          </div>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${showFavoritesOnly
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'}
            `}
          >
            <Star className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            Favorites
          </button>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar - Folders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sticky top-4">
            <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Folders
            </h2>

            <div className="space-y-1">
              <button
                onClick={() => setActiveFolder(null)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors
                  ${activeFolder === null
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'hover:bg-gray-700 text-gray-300'}
                `}
              >
                <span>All Bookmarks</span>
                <span className="text-sm">{bookmarks.length}</span>
              </button>

              {folders.map(folder => (
                <button
                  key={folder.name}
                  onClick={() => setActiveFolder(folder.name)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors
                    ${activeFolder === folder.name
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'hover:bg-gray-700 text-gray-300'}
                  `}
                >
                  <span className="flex items-center gap-2">
                    <span>{folder.icon}</span>
                    <span className="capitalize">{folder.name}</span>
                  </span>
                  <span className="text-sm">{folder.count}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main content - Bookmarked scenarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          {filteredBookmarks.length === 0 ? (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
              <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                {bookmarks.length === 0 ? 'No bookmarks yet' : 'No matching bookmarks'}
              </h3>
              <p className="text-gray-400 mb-6">
                {bookmarks.length === 0
                  ? 'Start bookmarking scenarios you want to practice again!'
                  : 'Try adjusting your filters or search'}
              </p>
              {bookmarks.length === 0 && (
                <Link
                  to="/scenarios"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
                >
                  Browse Scenarios
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBookmarks.map((bookmark, index) => (
                <motion.div
                  key={bookmark.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-100">
                          {bookmark.scenario?.name}
                        </h3>
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${bookmark.scenario?.difficulty === 'easy'
                            ? 'bg-green-500/20 text-green-400'
                            : bookmark.scenario?.difficulty === 'medium'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'}
                        `}>
                          {bookmark.scenario?.difficulty}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded-full">
                          {bookmark.scenario?.category}
                        </span>
                      </div>

                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {bookmark.scenario?.situation}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {bookmark.practice_count > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {bookmark.practice_count} practices
                          </span>
                        )}
                        {bookmark.best_score && (
                          <span className="flex items-center gap-1 text-green-400">
                            <Star className="w-4 h-4" />
                            Best: {bookmark.best_score}%
                          </span>
                        )}
                        {bookmark.last_practiced_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Last: {new Date(bookmark.last_practiced_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {bookmark.notes && (
                        <p className="mt-2 text-sm text-gray-500 italic">
                          "{bookmark.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <BookmarkButton
                        scenarioId={bookmark.scenario_id}
                        initialBookmarked={true}
                        initialFavorite={bookmark.is_favorite}
                        onToggle={(isFavorite) => {
                          if (!isFavorite && showFavoritesOnly) {
                            // Refresh to remove from view
                            setBookmarks(prev =>
                              prev.map(b =>
                                b.id === bookmark.id ? { ...b, is_favorite: false } : b
                              )
                            );
                          }
                        }}
                      />
                      <Link
                        to={`/scenario/${bookmark.scenario_id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Practice
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
