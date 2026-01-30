import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Phone, Heart, ChevronRight, Plus } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import ScenarioGrid from '../components/scenarios/ScenarioGrid';

function Home() {
  const { organization: company } = useOrganization();
  const { authFetch, role } = useAuth();
  const canCreate = ['manager', 'admin', 'owner'].includes(role);
  const [scenarios, setScenarios] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    fetchData();
  }, [authFetch]);

  const fetchData = async () => {
    try {
      const [scenariosRes, bookmarksRes] = await Promise.all([
        authFetch('/api/scenarios'),
        authFetch('/api/bookmarks')
      ]);

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setScenarios(data.scenarios || []);
      }

      if (bookmarksRes.ok) {
        const data = await bookmarksRes.json();
        const ids = new Set((data.bookmarks || []).map(b => b.scenario_id));
        setBookmarkedIds(ids);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch =
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      filterDifficulty === 'all' ||
      scenario.difficulty?.toLowerCase() === filterDifficulty;
    const matchesFavorites = !showFavoritesOnly || bookmarkedIds.has(scenario.id);
    return matchesSearch && matchesDifficulty && matchesFavorites;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/25">
          <Phone className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          CSR Training Simulator
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Practice handling real customer scenarios with AI-powered voice calls.
          Get instant coaching feedback to improve your skills.
        </p>
        {company.name && (
          <p className="text-sm text-blue-400 mt-4">
            Personalized for {company.name}
          </p>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-8"
      >
        <div className="flex-1">
          <Input
            placeholder="Search scenarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterButton
            active={filterDifficulty === 'all'}
            onClick={() => setFilterDifficulty('all')}
          >
            All
          </FilterButton>
          <FilterButton
            active={filterDifficulty === 'easy'}
            onClick={() => setFilterDifficulty('easy')}
            color="green"
          >
            Easy
          </FilterButton>
          <FilterButton
            active={filterDifficulty === 'medium'}
            onClick={() => setFilterDifficulty('medium')}
            color="yellow"
          >
            Medium
          </FilterButton>
          <FilterButton
            active={filterDifficulty === 'hard'}
            onClick={() => setFilterDifficulty('hard')}
            color="red"
          >
            Hard
          </FilterButton>
          <div className="w-px bg-gray-700 mx-1 hidden sm:block" />
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${showFavoritesOnly
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
            `}
          >
            <Heart className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            Favorites
          </button>
          {bookmarkedIds.size > 0 && (
            <Link
              to="/favorites"
              className="flex items-center gap-1 px-3 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          {canCreate && (
            <Link
              to="/builder"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Scenario
            </Link>
          )}
        </div>
      </motion.div>

      {/* Scenario Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="glass-card p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
              <div className="h-20 bg-gray-700 rounded mb-4" />
              <div className="h-10 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <ScenarioGrid scenarios={filteredScenarios} />
      )}

      {/* Empty State */}
      {!loading && filteredScenarios.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Filter className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            No scenarios found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </motion.div>
      )}
    </div>
  );
}

function FilterButton({ children, active, onClick, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-green-600 text-white',
    yellow: 'bg-yellow-600 text-white',
    red: 'bg-red-600 text-white'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? colors[color]
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default Home;
