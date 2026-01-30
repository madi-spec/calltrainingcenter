import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap,
  Clock,
  Target,
  Star,
  ChevronRight,
  Trophy,
  Filter,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MicroPractice() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [scenarios, setScenarios] = useState([]);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [stats, setStats] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedSkill, selectedDifficulty]);

  const fetchData = async () => {
    try {
      let url = '/api/microlearning?limit=12';
      if (selectedSkill) url += `&skill=${selectedSkill}`;
      if (selectedDifficulty) url += `&difficulty=${selectedDifficulty}`;

      const [scenariosRes, dailyRes, statsRes, skillsRes] = await Promise.all([
        authFetch(url),
        authFetch('/api/microlearning/daily'),
        authFetch('/api/microlearning/user/stats'),
        authFetch('/api/microlearning/meta/skills')
      ]);

      if (scenariosRes.ok) {
        const data = await scenariosRes.json();
        setScenarios(data.scenarios || []);
      }

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyChallenge(data.challenge);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error('Error fetching micro data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (scenarioId) => {
    navigate(`/micro/${scenarioId}`);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
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
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mb-4 shadow-lg shadow-yellow-500/25">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Quick Drills</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          2-minute focused practice sessions to sharpen specific skills.
          Quick feedback, instant results.
        </p>
      </motion.div>

      {/* Stats Bar */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-sm">Drills Completed</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_sessions}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">Pass Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.pass_rate}%</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-yellow-400">{stats.avg_score}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Total Time</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(stats.total_time_seconds / 60)}m
            </p>
          </div>
        </motion.div>
      )}

      {/* Daily Challenge */}
      {dailyChallenge?.micro_scenario && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-purple-400 uppercase tracking-wide">
                    Daily Challenge
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full">
                    +{dailyChallenge.bonus_points} bonus points
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {dailyChallenge.micro_scenario.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {dailyChallenge.micro_scenario.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStart(dailyChallenge.micro_scenario.id)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              Start
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filter:</span>
        </div>

        {/* Skill filter */}
        <select
          value={selectedSkill || ''}
          onChange={(e) => setSelectedSkill(e.target.value || null)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 text-sm"
        >
          <option value="">All Skills</option>
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>

        {/* Difficulty filter */}
        <div className="flex gap-2">
          {['easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                selectedDifficulty === diff
                  ? getDifficultyColor(diff)
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Scenario Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {scenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(scenario.difficulty)}`}>
                {scenario.difficulty}
              </span>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{Math.round((scenario.time_limit_seconds || 120) / 60)}m</span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              {scenario.name}
            </h3>

            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {scenario.description || scenario.context}
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 bg-gray-750 px-2 py-1 rounded capitalize">
                {scenario.target_skill?.replace(/_/g, ' ')}
              </span>

              <button
                onClick={() => handleStart(scenario.id)}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Zap className="w-4 h-4" />
                Start
              </button>
            </div>

            {scenario.avg_score && (
              <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between text-sm">
                <span className="text-gray-500">Avg Score:</span>
                <span className={`font-medium ${
                  scenario.avg_score >= 80 ? 'text-green-400' :
                  scenario.avg_score >= 60 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {scenario.avg_score}%
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {scenarios.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-200 mb-2">
            No drills found
          </h3>
          <p className="text-gray-400">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
