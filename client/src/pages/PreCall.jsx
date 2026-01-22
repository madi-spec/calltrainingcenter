import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  User,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mic,
  ArrowLeft
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useCompany } from '../context/CompanyContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { DifficultyBadge, CategoryBadge } from '../components/ui/Badge';

function PreCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCurrentScenario } = useConfig();
  const { company } = useCompany();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchScenario();
  }, [id]);

  const fetchScenario = async () => {
    try {
      const response = await fetch(`/api/scenarios/${id}`);
      if (response.ok) {
        const data = await response.json();
        setScenario(data.scenario);
      }
    } catch (error) {
      console.error('Error fetching scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async () => {
    setStarting(true);
    setCurrentScenario(scenario);
    navigate('/training');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass-card p-8 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-8" />
          <div className="h-32 bg-gray-700 rounded mb-4" />
          <div className="h-32 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Scenario not found</h2>
        <Button onClick={() => navigate('/')}>Back to Scenarios</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to scenarios
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-white">{scenario.name}</h1>
          <div className="flex gap-2">
            <DifficultyBadge difficulty={scenario.difficulty} />
            {scenario.category && (
              <CategoryBadge category={scenario.category} />
            )}
          </div>
        </div>
        {scenario.estimatedDuration && (
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{scenario.estimatedDuration}</span>
          </div>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Customer Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Card.Title>Customer Profile</Card.Title>
                  <p className="text-sm text-gray-400">{scenario.customerName}</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Personality</h4>
                  <p className="text-sm text-gray-400">{scenario.personality}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Emotional State</h4>
                  <p className="text-sm text-gray-400">{scenario.emotionalState}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Background</h4>
                  <p className="text-sm text-gray-400">{scenario.customerBackground}</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </motion.div>

        {/* Situation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <Card.Title>The Situation</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-gray-300 mb-4">{scenario.situation}</p>
              {scenario.keyPointsToMention && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Key Points Customer Will Mention:</h4>
                  <ul className="space-y-1">
                    {scenario.keyPointsToMention.map((point, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Your Objective */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <Card.Title>Your Objective</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-gray-300 mb-4">{scenario.csrObjective}</p>
              {scenario.scoringFocus && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">You'll Be Scored On:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scenario.scoringFocus.map((focus, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full"
                      >
                        {focus}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Success Criteria */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <Card.Title>Success Criteria</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {scenario.deescalationTriggers && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-1">Customer Will Calm Down If:</h4>
                    <p className="text-sm text-gray-400">{scenario.deescalationTriggers}</p>
                  </div>
                )}
                {scenario.escalationTriggers && (
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-1">Customer Will Escalate If:</h4>
                    <p className="text-sm text-gray-400">{scenario.escalationTriggers}</p>
                  </div>
                )}
                {scenario.resolutionConditions && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-1">Resolution:</h4>
                    <p className="text-sm text-gray-400">{scenario.resolutionConditions}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      </div>

      {/* Company Context */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <Card>
          <Card.Header>
            <Card.Title>Company Context</Card.Title>
            <Card.Description>Use this information during the call</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Company:</span>
                <p className="text-white font-medium">{company.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Quarterly Price:</span>
                <p className="text-white font-medium">${company.pricing?.quarterlyPrice}/quarter</p>
              </div>
              <div>
                <span className="text-gray-500">Guarantee:</span>
                <p className="text-white font-medium">{company.guarantees?.[0]}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="text-white font-medium">{company.phone}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </motion.div>

      {/* Start Call Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center"
      >
        <Button
          size="xl"
          onClick={handleStartCall}
          loading={starting}
          icon={starting ? null : Phone}
          className="px-12"
        >
          {starting ? 'Preparing Call...' : 'Start Training Call'}
        </Button>
        <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-2">
          <Mic className="w-4 h-4" />
          Make sure your microphone is ready
        </p>
      </motion.div>
    </div>
  );
}

export default PreCall;
