import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  User,
  Target,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Save,
  Volume2
} from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input, { Textarea, Select } from '../components/ui/Input';
import { DifficultyBadge } from '../components/ui/Badge';

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

const CATEGORIES = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Retention', label: 'Retention' },
  { value: 'Complaint Resolution', label: 'Complaint Resolution' },
  { value: 'Service Recovery', label: 'Service Recovery' },
  { value: 'Emergency Response', label: 'Emergency Response' },
  { value: 'Upselling', label: 'Upselling' },
  { value: 'General Inquiry', label: 'General Inquiry' }
];

const defaultScenario = {
  name: '',
  difficulty: 'medium',
  category: 'General Inquiry',
  customerName: '',
  personality: '',
  emotionalState: '',
  voiceId: '11labs-Adrian',
  situation: '',
  customerBackground: '',
  openingLine: '',
  customerGoals: '',
  csrObjective: '',
  keyPointsToMention: '',
  escalationTriggers: '',
  deescalationTriggers: '',
  resolutionConditions: '',
  scoringFocus: ''
};

function Builder() {
  const navigate = useNavigate();
  const { organization: company } = useOrganization();
  const { authFetch } = useAuth();
  const [scenario, setScenario] = useState(defaultScenario);
  const [voices, setVoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await authFetch('/api/scenarios/meta/voices');
      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    }
  };

  const updateField = (field, value) => {
    setScenario(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!scenario.name.trim()) newErrors.name = 'Name is required';
    if (!scenario.customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!scenario.situation.trim()) newErrors.situation = 'Situation is required';
    if (!scenario.csrObjective.trim()) newErrors.csrObjective = 'CSR objective is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setSaveError('');
    try {
      const formattedScenario = {
        ...scenario,
        keyPointsToMention: scenario.keyPointsToMention
          ? scenario.keyPointsToMention.split('\n').filter(Boolean)
          : [],
        scoringFocus: scenario.scoringFocus
          ? scenario.scoringFocus.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        systemPrompt: buildSystemPrompt(scenario)
      };

      const response = await authFetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedScenario)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save scenario');
      }

      const data = await response.json();
      navigate(`/scenario/${data.scenario.id}`);
    } catch (error) {
      console.error('Error saving scenario:', error);
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const buildSystemPrompt = (s) => {
    return `You are playing the role of a customer calling {{company.name}}. You are participating in a training simulation for customer service representatives.

## Your Character
Name: ${s.customerName}
Personality: ${s.personality || 'Average customer'}
Emotional State: ${s.emotionalState || 'Neutral'}
Background: ${s.customerBackground || 'Regular customer'}

## The Situation
${s.situation}

## Your Goals
${s.customerGoals || 'Get your issue resolved satisfactorily.'}

## How to Behave
- Stay in character throughout the call
- React naturally to what the CSR says
${s.escalationTriggers ? `- Escalate if: ${s.escalationTriggers}` : '- Escalate if the CSR is dismissive or unhelpful'}
${s.deescalationTriggers ? `- Calm down if: ${s.deescalationTriggers}` : '- Calm down if the CSR shows genuine empathy'}
- Use natural speech patterns with occasional filler words

## Resolution Conditions
${s.resolutionConditions || 'Accept a reasonable solution that addresses your concerns.'}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Scenario</h1>
        </div>
        <p className="text-gray-400">
          Build a custom training scenario for your team
        </p>
      </motion.div>

      {/* Variable Helper */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Insert company variables:</span>
            <div className="flex gap-2">
              <VariableButton label="company.name" value={company.name} />
              <VariableButton label="company.pricing.quarterlyPrice" value={`$${company.pricing?.quarterlyPrice}`} />
              <VariableButton label="company.phone" value={company.phone} />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Save Error */}
      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <p className="text-red-400 text-sm">{saveError}</p>
        </motion.div>
      )}

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Header>
              <Card.Title>Basic Information</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Input
                label="Scenario Name"
                placeholder="e.g., The Angry Cancellation"
                value={scenario.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={errors.name}
              />
              <div className="grid md:grid-cols-3 gap-4">
                <Select
                  label="Difficulty"
                  options={DIFFICULTIES}
                  value={scenario.difficulty}
                  onChange={(e) => updateField('difficulty', e.target.value)}
                />
                <Select
                  label="Category"
                  options={CATEGORIES}
                  value={scenario.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
                <Select
                  label="Voice"
                  options={voices.map(v => ({ value: v.id, label: `${v.name} (${v.gender})` }))}
                  value={scenario.voiceId}
                  onChange={(e) => updateField('voiceId', e.target.value)}
                />
              </div>
            </Card.Content>
          </Card>
        </motion.div>

        {/* Customer Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                <Card.Title>Customer Profile</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Input
                label="Customer Name"
                placeholder="e.g., Margaret Thompson"
                value={scenario.customerName}
                onChange={(e) => updateField('customerName', e.target.value)}
                error={errors.customerName}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Personality"
                  placeholder="e.g., Direct, frustrated but reasonable"
                  value={scenario.personality}
                  onChange={(e) => updateField('personality', e.target.value)}
                />
                <Input
                  label="Emotional State"
                  placeholder="e.g., Frustrated, considering leaving"
                  value={scenario.emotionalState}
                  onChange={(e) => updateField('emotionalState', e.target.value)}
                />
              </div>
              <Textarea
                label="Customer Background"
                placeholder="e.g., Retired teacher, been a customer for 3 years, always paid on time..."
                value={scenario.customerBackground}
                onChange={(e) => updateField('customerBackground', e.target.value)}
                rows={3}
              />
              <Input
                label="Opening Line"
                placeholder="e.g., Hi, I need to cancel my service please."
                value={scenario.openingLine}
                onChange={(e) => updateField('openingLine', e.target.value)}
                icon={MessageCircle}
              />
            </Card.Content>
          </Card>
        </motion.div>

        {/* Situation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <Card.Title>The Situation</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Textarea
                label="Situation Description"
                placeholder="Describe the scenario the customer is calling about. Use {{company.name}} and other variables for personalization."
                value={scenario.situation}
                onChange={(e) => updateField('situation', e.target.value)}
                error={errors.situation}
                rows={4}
              />
              <Textarea
                label="Key Points Customer Will Mention (one per line)"
                placeholder="Competitor is offering $99/quarter
Husband saw the mailer and thinks we're overpaying
We've never had problems with your service"
                value={scenario.keyPointsToMention}
                onChange={(e) => updateField('keyPointsToMention', e.target.value)}
                rows={4}
              />
              <Textarea
                label="Customer Goals"
                placeholder="What does the customer want to achieve in this call?"
                value={scenario.customerGoals}
                onChange={(e) => updateField('customerGoals', e.target.value)}
                rows={2}
              />
            </Card.Content>
          </Card>
        </motion.div>

        {/* CSR Objective */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                <Card.Title>CSR Objective</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Textarea
                label="What should the CSR accomplish?"
                placeholder="e.g., Retain the customer by demonstrating value, offering solutions, and potentially matching the competitor's offer"
                value={scenario.csrObjective}
                onChange={(e) => updateField('csrObjective', e.target.value)}
                error={errors.csrObjective}
                rows={3}
              />
              <Input
                label="Scoring Focus (comma-separated)"
                placeholder="e.g., Empathy, Retention techniques, Value articulation, Negotiation"
                value={scenario.scoringFocus}
                onChange={(e) => updateField('scoringFocus', e.target.value)}
              />
            </Card.Content>
          </Card>
        </motion.div>

        {/* Behavior Triggers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <Card.Title>Behavior Triggers</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="space-y-4">
              <Textarea
                label="Escalation Triggers (customer gets more upset if...)"
                placeholder="e.g., CSR is dismissive of concerns, doesn't acknowledge loyalty, or is pushy without listening first"
                value={scenario.escalationTriggers}
                onChange={(e) => updateField('escalationTriggers', e.target.value)}
                rows={2}
              />
              <Textarea
                label="De-escalation Triggers (customer calms down if...)"
                placeholder="e.g., CSR acknowledges her loyalty, genuinely listens to concerns, offers real value or price match"
                value={scenario.deescalationTriggers}
                onChange={(e) => updateField('deescalationTriggers', e.target.value)}
                rows={2}
              />
              <Textarea
                label="Resolution Conditions"
                placeholder="e.g., Will stay if offered a price match or loyalty discount. Will leave if CSR is dismissive."
                value={scenario.resolutionConditions}
                onChange={(e) => updateField('resolutionConditions', e.target.value)}
                rows={2}
              />
            </Card.Content>
          </Card>
        </motion.div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <Card.Header>
              <Card.Title>Preview</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {scenario.name || 'Untitled Scenario'}
                  </h3>
                  <div className="flex gap-2 mb-3">
                    <DifficultyBadge difficulty={scenario.difficulty} />
                    {scenario.category && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        {scenario.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {scenario.customerName || 'Customer'} - {scenario.emotionalState || 'Unknown emotional state'}
                  </p>
                </div>
                {scenario.voiceId && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Volume2 className="w-4 h-4" />
                    {voices.find(v => v.id === scenario.voiceId)?.name || 'Default'}
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex gap-4 justify-end"
        >
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            icon={Save}
          >
            Save Scenario
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function VariableButton({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(`{{${label}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <button
      onClick={handleClick}
      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
      title={value}
    >
      {copied ? 'Copied!' : `{{${label.split('.').pop()}}}`}
    </button>
  );
}

export default Builder;
