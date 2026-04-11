import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Phone, Heart, ChevronRight, Plus } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import ScenarioGrid from '../components/scenarios/ScenarioGrid';

function Home() {
  const { organization: company } = useOrganization();
  const { authFetch, role } = useAuth();
  const canCreate = ['manager', 'admin', 'super_admin'].includes(role);
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

  const handleDeleteScenario = async (scenarioId) => {
    try {
      const response = await authFetch(`/api/scenarios/${scenarioId}`, { method: 'DELETE' });
      if (response.ok) {
        setScenarios(prev => prev.filter(s => s.id !== scenarioId));
      }
    } catch (err) {
      console.error('Error deleting scenario:', err);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Practice Scenarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {company.name ? `Practice calls personalized for ${company.name}` : 'Practice handling real customer scenarios with AI-powered voice calls'}
        </p>
      </div>

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
          <div className="w-px bg-muted mx-1 hidden sm:block" />
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${showFavoritesOnly
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}
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
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background hover:opacity-90 rounded-md text-sm font-medium transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Scenario
            </Link>
          )}
        </div>
      </motion.div>

      {/* Scenario Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/3 mb-4" />
              <div className="h-16 bg-muted rounded mb-4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <ScenarioGrid scenarios={filteredScenarios} canEdit={canCreate} onDelete={handleDeleteScenario} />
      )}

      {/* Empty State */}
      {!loading && filteredScenarios.length === 0 && (
        <EmptyState
          icon={Filter}
          title="No scenarios found"
          description="Try adjusting your search or filter criteria"
        />
      )}
    </div>
  );
}

function FilterButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

export default Home;
