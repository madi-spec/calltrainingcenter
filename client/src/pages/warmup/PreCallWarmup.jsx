import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { WarmupQuiz } from '../../components/warmup';

export default function PreCallWarmup() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScenario();
  }, [scenarioId]);

  const fetchScenario = async () => {
    try {
      const res = await authFetch(`/api/scenarios/${scenarioId}`);
      if (res.ok) {
        const data = await res.json();
        setScenario(data.scenario);
      }
    } catch (error) {
      console.error('Error fetching scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = (results) => {
    // Navigate to the scenario with warmup completion data
    navigate(`/scenario/${scenarioId}`, {
      state: { warmupCompleted: true, warmupResults: results }
    });
  };

  const handleSkip = () => {
    navigate(`/scenario/${scenarioId}`);
  };

  const handleBack = () => {
    navigate(`/scenario/${scenarioId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to scenario
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/25">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Pre-Call Warm-up</h1>
        {scenario && (
          <p className="text-gray-400">
            Prepare for: {scenario.name}
          </p>
        )}
      </motion.div>

      {/* Quiz */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WarmupQuiz
          scenarioId={scenarioId}
          scenarioName={scenario?.name}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </motion.div>
    </div>
  );
}
