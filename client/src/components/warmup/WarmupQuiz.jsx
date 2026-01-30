import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  ChevronRight,
  Trophy,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WarmupCard from './WarmupCard';

/**
 * Quiz container that manages multiple warmup exercises
 */
export default function WarmupQuiz({
  scenarioId,
  scenarioName,
  onComplete,
  onSkip
}) {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [startTime] = useState(Date.now());

  // Fetch exercises on mount
  useEffect(() => {
    fetchExercises();
  }, [scenarioId]);

  const fetchExercises = async () => {
    try {
      // Start a warmup session
      const sessionRes = await authFetch('/api/warmups/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId })
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSessionId(sessionData.session?.id);
      }

      // Fetch exercises for this scenario
      const exercisesRes = await authFetch(`/api/warmups/scenario/${scenarioId}?limit=3`);

      if (exercisesRes.ok) {
        const data = await exercisesRes.json();
        setExercises(data.exercises || []);
      }
    } catch (error) {
      console.error('Error fetching warmup exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (selectedIndex) => {
    const exercise = exercises[currentIndex];

    try {
      const res = await authFetch('/api/warmups/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_id: exercise.id,
          selected_option_index: selectedIndex
        })
      });

      if (res.ok) {
        const data = await res.json();
        const answerRecord = {
          exerciseId: exercise.id,
          selectedIndex,
          isCorrect: data.is_correct,
          correctIndex: data.correct_option_index,
          explanation: data.explanation
        };

        setAnswers([...answers, answerRecord]);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleNext = async () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Quiz complete
      await completeSession();
    }
  };

  const completeSession = async () => {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const correct = answers.filter(a => a.isCorrect).length;

    try {
      if (sessionId) {
        const res = await authFetch(`/api/warmups/session/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exercises_completed: exercises.length,
            exercises_correct: correct,
            total_time_seconds: totalTime
          })
        });

        if (res.ok) {
          const data = await res.json();
          setResults({
            total: exercises.length,
            correct,
            accuracy: data.accuracy,
            pointsEarned: data.points_earned,
            timeSeconds: totalTime
          });
        }
      }
    } catch (error) {
      console.error('Error completing session:', error);
    }

    setIsComplete(true);
  };

  const handleStartTraining = () => {
    if (onComplete) {
      onComplete(results);
    } else {
      navigate(`/scenario/${scenarioId}`);
    }
  };

  const currentAnswer = answers[currentIndex];
  const isCurrentAnswered = !!currentAnswer;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">Preparing your warm-up...</p>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-200 mb-2">No Warm-up Available</h3>
        <p className="text-gray-400 mb-6">
          No warm-up exercises found for this scenario.
        </p>
        <button
          onClick={onSkip}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          Continue to Training
        </button>
      </div>
    );
  }

  // Show completion screen
  if (isComplete && results) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25"
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">Warm-up Complete!</h2>
        <p className="text-gray-400 mb-8">
          You're ready for {scenarioName || 'your training session'}
        </p>

        {/* Results */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{results.accuracy}%</p>
            <p className="text-xs text-gray-400">Accuracy</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{results.correct}/{results.total}</p>
            <p className="text-xs text-gray-400">Correct</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">+{results.pointsEarned}</p>
            <p className="text-xs text-gray-400">Points</p>
          </div>
        </div>

        {/* Feedback message */}
        <div className={`p-4 rounded-xl mb-8 max-w-md mx-auto ${
          results.accuracy >= 80 ? 'bg-green-500/10 border border-green-500/30' :
          results.accuracy >= 50 ? 'bg-yellow-500/10 border border-yellow-500/30' :
          'bg-blue-500/10 border border-blue-500/30'
        }`}>
          <p className={`text-sm ${
            results.accuracy >= 80 ? 'text-green-400' :
            results.accuracy >= 50 ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {results.accuracy >= 80 ? 'Excellent preparation! You\'re ready to ace this scenario.' :
             results.accuracy >= 50 ? 'Good effort! Remember to apply what you\'ve learned.' :
             'Keep practicing! The concepts will become clearer with experience.'}
          </p>
        </div>

        <button
          onClick={handleStartTraining}
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          Start Training
          <ChevronRight className="w-5 h-5" />
        </button>
      </motion.div>
    );
  }

  // Show current exercise
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Pre-Call Warm-up</h2>
            <p className="text-sm text-gray-400">
              Question {currentIndex + 1} of {exercises.length}
            </p>
          </div>
        </div>

        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Skip warm-up
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + (isCurrentAnswered ? 1 : 0)) / exercises.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Current exercise */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <WarmupCard
            exercise={exercises[currentIndex]}
            onAnswer={handleAnswer}
            isAnswered={isCurrentAnswered}
            selectedIndex={currentAnswer?.selectedIndex}
            correctIndex={currentAnswer?.correctIndex}
            explanation={currentAnswer?.explanation}
          />
        </motion.div>
      </AnimatePresence>

      {/* Next button (after answering) */}
      {isCurrentAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex justify-end"
        >
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {currentIndex < exercises.length - 1 ? 'Next Question' : 'Complete Warm-up'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Answer summary */}
      <div className="flex justify-center gap-2 mt-6">
        {exercises.map((_, index) => {
          const answer = answers[index];
          return (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                !answer ? (index === currentIndex ? 'bg-blue-500' : 'bg-gray-600') :
                answer.isCorrect ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
