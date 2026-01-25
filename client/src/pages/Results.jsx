import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  MessageCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ScoreRing from '../components/coaching/ScoreRing';
import CategoryScore from '../components/coaching/CategoryScore';

function Results() {
  const navigate = useNavigate();
  const { lastResults, clearSession } = useConfig();

  // Redirect if no results
  useEffect(() => {
    if (!lastResults) {
      navigate('/');
    }
  }, [lastResults, navigate]);

  if (!lastResults) {
    return null;
  }

  const { analysis, scenario, duration } = lastResults;

  const isModuleScenario = scenario?.isGeneratedScenario && scenario?.moduleId;

  const handleTryAgain = () => {
    clearSession();
    if (isModuleScenario) {
      navigate(`/modules/${scenario.moduleId}`);
    } else {
      navigate(`/scenario/${scenario.id}`);
    }
  };

  const handleNewScenario = () => {
    clearSession();
    if (isModuleScenario) {
      navigate(`/modules/${scenario.moduleId}`);
    } else {
      navigate('/');
    }
  };

  const handleBackToModule = () => {
    clearSession();
    navigate(`/modules/${scenario.moduleId}`);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle case where analysis failed
  if (!analysis || analysis.parseError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Analysis Unavailable</h2>
        <p className="text-gray-400 mb-6">
          We couldn't analyze your call this time. Your conversation was still valuable practice.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={handleNewScenario}>
            Try Another Scenario
          </Button>
          <Button onClick={handleTryAgain}>
            Retry This Scenario
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleNewScenario}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to scenarios
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Training Complete</h1>
        <p className="text-gray-400">{scenario.name}</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(duration)}
          </span>
        </div>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="text-center py-8">
          <div className="mb-4">
            <ScoreRing score={analysis.overallScore} size={160} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {getScoreLabel(analysis.overallScore)}
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            {analysis.summary}
          </p>
        </Card>
      </motion.div>

      {/* Category Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Performance Breakdown</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.categories && Object.entries(analysis.categories).map(([key, data], index) => (
            <CategoryScore
              key={key}
              name={formatCategoryName(key)}
              score={data.score}
              feedback={data.feedback}
              delay={index * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-400" />
                <Card.Title>What You Did Well</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {analysis.strengths.map((strength, index) => (
                  <div key={index} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <h4 className="font-medium text-green-400 mb-1">{strength.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{strength.description}</p>
                    {strength.quote && (
                      <p className="text-sm text-gray-500 italic">"{strength.quote}"</p>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Improvements */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <Card.Title>Areas to Improve</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {analysis.improvements.map((improvement, index) => (
                  <div key={index} className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <h4 className="font-medium text-yellow-400 mb-1">{improvement.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{improvement.issue}</p>
                    {improvement.quote && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">You said:</span>
                        <p className="text-sm text-gray-400 italic">"{improvement.quote}"</p>
                      </div>
                    )}
                    {improvement.alternative && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <span className="text-xs text-blue-400 flex items-center gap-1 mb-1">
                          <Lightbulb className="w-3 h-3" /> Try instead:
                        </span>
                        <p className="text-sm text-blue-200">"{improvement.alternative}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Key Moment */}
      {analysis.keyMoment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <Card.Title>Pivotal Moment</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {analysis.keyMoment.timestamp && (
                  <p className="text-sm text-gray-500">{analysis.keyMoment.timestamp}</p>
                )}
                <p className="text-gray-300">{analysis.keyMoment.description}</p>
                {analysis.keyMoment.impact && (
                  <p className="text-sm text-gray-400">
                    <span className="text-purple-400 font-medium">Impact:</span> {analysis.keyMoment.impact}
                  </p>
                )}
                {analysis.keyMoment.betterApproach && (
                  <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-xs text-purple-400">Better approach:</span>
                    <p className="text-sm text-purple-200 mt-1">{analysis.keyMoment.betterApproach}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      {analysis.nextSteps && analysis.nextSteps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-400" />
                <Card.Title>Next Steps</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2">
                {analysis.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        {isModuleScenario ? (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBackToModule}
            >
              Back to Module
            </Button>
            <Button
              size="lg"
              icon={RotateCcw}
              onClick={handleNewScenario}
            >
              Next Scenario
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleNewScenario}
            >
              Try Different Scenario
            </Button>
            <Button
              size="lg"
              icon={RotateCcw}
              onClick={handleTryAgain}
            >
              Practice Again
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent!';
  if (score >= 80) return 'Great Job!';
  if (score >= 70) return 'Good Effort';
  if (score >= 60) return 'Room for Improvement';
  return 'Keep Practicing';
}

function formatCategoryName(key) {
  const names = {
    empathyRapport: 'Empathy & Rapport',
    problemResolution: 'Problem Resolution',
    productKnowledge: 'Product Knowledge',
    professionalism: 'Professionalism',
    scenarioSpecific: 'Scenario Performance'
  };
  return names[key] || key.replace(/([A-Z])/g, ' $1').trim();
}

export default Results;
