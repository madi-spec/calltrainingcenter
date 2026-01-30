import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  Play,
  X,
  RefreshCw,
  Lightbulb,
  Brain,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SkillRadar } from '../../components/recommendations';

export default function Recommendations() {
  const { authFetch } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [skillProfile, setSkillProfile] = useState(null);
  const [benchmarks, setBenchmarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recsRes, skillsRes, benchmarksRes] = await Promise.all([
        authFetch('/api/recommendations'),
        authFetch('/api/recommendations/skills'),
        authFetch('/api/recommendations/skills/benchmarks')
      ]);

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || []);
      }

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkillProfile(data.profile);
      }

      if (benchmarksRes.ok) {
        const data = await benchmarksRes.json();
        setBenchmarks(data.benchmarks || {});
      }
    } catch (error) {
      console.error('Error fetching recommendation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await authFetch('/api/recommendations/refresh', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await authFetch(`/api/recommendations/${id}/dismiss`, { method: 'POST' });
      setRecommendations(recs => recs.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'scenario': return Play;
      case 'skill_focus': return Target;
      case 'warmup': return Brain;
      case 'course': return Lightbulb;
      default: return Target;
    }
  };

  const getRecommendationColor = (type) => {
    switch (type) {
      case 'scenario': return 'blue';
      case 'skill_focus': return 'purple';
      case 'warmup': return 'orange';
      case 'course': return 'green';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="w-7 h-7 text-purple-400" />
            Personalized Recommendations
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered suggestions based on your skill profile
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Skill Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Skill Profile
            </h2>

            {skillProfile ? (
              <div className="flex flex-col items-center">
                <SkillRadar
                  skills={skillProfile.category_scores || {}}
                  benchmarks={benchmarks}
                  size={280}
                />

                <div className="mt-6 w-full space-y-3">
                  {skillProfile.weakest_skills?.length > 0 && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="text-xs text-red-400 font-medium mb-1">Focus Areas</p>
                      <p className="text-sm text-gray-300">
                        {skillProfile.weakest_skills.map(s => s.replace(/_/g, ' ')).join(', ')}
                      </p>
                    </div>
                  )}

                  {skillProfile.strongest_skills?.length > 0 && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-green-400 font-medium mb-1">Strengths</p>
                      <p className="text-sm text-gray-300">
                        {skillProfile.strongest_skills.map(s => s.replace(/_/g, ' ')).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Complete more training sessions to build your skill profile
                </p>
                <Link
                  to="/scenarios"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Start Training
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recommendations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Recommended Actions
            </h2>

            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => {
                  const Icon = getRecommendationIcon(rec.recommendation_type);
                  const color = getRecommendationColor(rec.recommendation_type);

                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-gray-750 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-500/20`}>
                          <Icon className={`w-5 h-5 text-${color}-400`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium text-${color}-400 uppercase tracking-wide`}>
                              {rec.recommendation_type.replace(/_/g, ' ')}
                            </span>
                            {rec.target_skill && (
                              <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded-full capitalize">
                                {rec.target_skill.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>

                          {rec.scenario && (
                            <h3 className="text-white font-medium mb-1">
                              {rec.scenario.name}
                            </h3>
                          )}

                          <p className="text-sm text-gray-400">
                            {rec.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDismiss(rec.id)}
                            className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {rec.scenario && (
                            <Link
                              to={`/scenario/${rec.scenario.id}`}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Practice
                            </Link>
                          )}

                          {rec.recommendation_type === 'warmup' && (
                            <Link
                              to="/scenarios"
                              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <Brain className="w-4 h-4" />
                              Warm Up
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-200 mb-2">
                  No recommendations yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Complete a few training sessions to get personalized recommendations
                </p>
                <Link
                  to="/scenarios"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  Browse Scenarios
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
