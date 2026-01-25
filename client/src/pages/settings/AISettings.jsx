import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Save,
  RotateCcw,
  Sliders,
  Volume2,
  MessageSquare,
  AlertCircle,
  Eye,
  Edit3,
  Code,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { useNotifications } from '../../context/NotificationContext';

const AI_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Fast and capable (Recommended)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable, slower' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest, budget-friendly' }
];

const VOICE_OPTIONS = [
  { id: '11labs-Brian', name: 'Brian', gender: 'Male', accent: 'American' },
  { id: '11labs-Jenny', name: 'Jenny', gender: 'Female', accent: 'American' },
  { id: '11labs-Dorothy', name: 'Dorothy', gender: 'Female', accent: 'American' },
  { id: '11labs-Jason', name: 'Jason', gender: 'Male', accent: 'American' },
  { id: '11labs-Josh', name: 'Josh', gender: 'Male', accent: 'American' },
  { id: '11labs-Charlotte', name: 'Charlotte', gender: 'Female', accent: 'British' },
  { id: '11labs-Lily', name: 'Lily', gender: 'Female', accent: 'British' }
];

export default function AISettings() {
  const { authFetch } = useAuth();
  const { settings, updateAIConfig } = useOrganization();
  const notifications = useNotifications();
  const showSuccess = notifications?.showSuccess || ((title, msg) => console.log('Success:', title, msg));
  const showError = notifications?.showError || ((title, msg) => console.error('Error:', title, msg));

  const [formData, setFormData] = useState({
    aiModel: 'claude-sonnet-4-20250514',
    customPromptAdditions: '',
    scoringWeights: {
      empathyRapport: 20,
      problemResolution: 25,
      productKnowledge: 20,
      professionalism: 15,
      scenarioSpecific: 20
    },
    voicePreferences: {
      defaultVoiceId: '11labs-Brian',
      allowedVoices: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Prompt editor state
  const [promptData, setPromptData] = useState({
    agentPrompt: '',
    coachingSystemPrompt: '',
    coachingUserPrompt: ''
  });
  const [defaultPrompts, setDefaultPrompts] = useState(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsSaving, setPromptsSaving] = useState(false);
  const [hasCustomPrompts, setHasCustomPrompts] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState(null);
  const [editMode, setEditMode] = useState({});
  const [promptsChanged, setPromptsChanged] = useState(false);

  // Preview state
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [previewPrompt, setPreviewPrompt] = useState(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        aiModel: settings.aiModel || 'claude-sonnet-4-20250514',
        customPromptAdditions: settings.customPromptAdditions || '',
        scoringWeights: settings.scoringWeights || formData.scoringWeights,
        voicePreferences: settings.voicePreferences || formData.voicePreferences
      });
    }
  }, [settings]);

  // Fetch custom prompts on mount
  useEffect(() => {
    if (authFetch) {
      fetchCustomPrompts();
      fetchScenarios();
    }
  }, [authFetch]);

  // Fetch preview when scenario changes
  useEffect(() => {
    if (selectedScenarioId && authFetch) {
      fetchPreview(selectedScenarioId);
    }
  }, [selectedScenarioId, authFetch]);

  const fetchCustomPrompts = async () => {
    if (!authFetch) return;
    setPromptsLoading(true);
    try {
      const response = await authFetch('/api/admin/prompts/custom');
      if (response && response.ok) {
        const data = await response.json();
        setDefaultPrompts(data.defaults);
        setHasCustomPrompts(data.hasCustomPrompts);

        // Set prompt data to custom values or defaults
        setPromptData({
          agentPrompt: data.customPrompts?.agent || data.defaults.agent,
          coachingSystemPrompt: data.customPrompts?.coaching?.system || data.defaults.coachingSystem,
          coachingUserPrompt: data.customPrompts?.coaching?.user || data.defaults.coachingUser
        });
      }
    } catch (error) {
      console.error('Error fetching custom prompts:', error);
    } finally {
      setPromptsLoading(false);
    }
  };

  const fetchScenarios = async () => {
    if (!authFetch) return;
    try {
      const response = await authFetch('/api/scenarios');
      if (response && response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios || []);
        if (data.scenarios?.length > 0) {
          setSelectedScenarioId(data.scenarios[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    }
  };

  const fetchPreview = async (scenarioId) => {
    if (!authFetch) return;
    try {
      const response = await authFetch(`/api/admin/prompts/${scenarioId}`);
      if (response && response.ok) {
        const data = await response.json();
        setPreviewPrompt(data);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const handlePromptChange = (field, value) => {
    setPromptData(prev => ({ ...prev, [field]: value }));
    setPromptsChanged(true);
  };

  const handleSavePrompts = async () => {
    setPromptsSaving(true);
    try {
      const response = await authFetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPrompt: promptData.agentPrompt,
          coachingSystemPrompt: promptData.coachingSystemPrompt,
          coachingUserPrompt: promptData.coachingUserPrompt
        })
      });

      if (response && response.ok) {
        showSuccess('Prompts Saved', 'Custom prompts have been saved successfully');
        setPromptsChanged(false);
        setHasCustomPrompts(true);
        setEditMode({});
        // Refresh preview
        if (selectedScenarioId) {
          fetchPreview(selectedScenarioId);
        }
      } else {
        throw new Error('Failed to save prompts');
      }
    } catch (error) {
      showError('Error', error.message || 'Failed to save prompts');
    } finally {
      setPromptsSaving(false);
    }
  };

  const handleResetToDefaults = (promptType) => {
    if (!defaultPrompts) return;

    if (promptType === 'agent') {
      setPromptData(prev => ({ ...prev, agentPrompt: defaultPrompts.agent }));
    } else if (promptType === 'coachingSystem') {
      setPromptData(prev => ({ ...prev, coachingSystemPrompt: defaultPrompts.coachingSystem }));
    } else if (promptType === 'coachingUser') {
      setPromptData(prev => ({ ...prev, coachingUserPrompt: defaultPrompts.coachingUser }));
    }
    setPromptsChanged(true);
  };

  const handleResetAllPrompts = () => {
    if (!defaultPrompts) return;
    setPromptData({
      agentPrompt: defaultPrompts.agent,
      coachingSystemPrompt: defaultPrompts.coachingSystem,
      coachingUserPrompt: defaultPrompts.coachingUser
    });
    setPromptsChanged(true);
  };

  const togglePrompt = (promptType) => {
    setExpandedPrompt(expandedPrompt === promptType ? null : promptType);
  };

  const toggleEditMode = (promptType) => {
    setEditMode(prev => ({ ...prev, [promptType]: !prev[promptType] }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleWeightChange = (category, value) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    setFormData((prev) => ({
      ...prev,
      scoringWeights: {
        ...prev.scoringWeights,
        [category]: numValue
      }
    }));
    setHasChanges(true);
  };

  const totalWeight = Object.values(formData.scoringWeights).reduce((a, b) => a + b, 0);

  const handleSave = async () => {
    if (totalWeight !== 100) {
      showError('Invalid Weights', 'Scoring weights must add up to 100%');
      return;
    }

    setLoading(true);
    try {
      await updateAIConfig(formData);
      showSuccess('Settings Saved', 'AI configuration updated successfully');
      setHasChanges(false);
    } catch (error) {
      showError('Error', error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      aiModel: 'claude-sonnet-4-20250514',
      customPromptAdditions: '',
      scoringWeights: {
        empathyRapport: 20,
        problemResolution: 25,
        productKnowledge: 20,
        professionalism: 15,
        scenarioSpecific: 20
      },
      voicePreferences: {
        defaultVoiceId: '11labs-Brian',
        allowedVoices: []
      }
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">AI Configuration</h1>
          <p className="text-gray-400 mt-1">
            Customize AI coaching and scoring for your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* AI Model Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">AI Model</h2>
            <p className="text-sm text-gray-400">Select the AI model for coaching analysis</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {AI_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleChange('aiModel', model.id)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                formData.aiModel === model.id
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <p className="font-medium text-gray-100">{model.name}</p>
              <p className="text-sm text-gray-400 mt-1">{model.description}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Scoring Weights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Sliders className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Scoring Weights</h2>
            <p className="text-sm text-gray-400">Adjust how different categories impact the overall score</p>
          </div>
        </div>

        {totalWeight !== 100 && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-400">
              Weights must add up to 100% (currently {totalWeight}%)
            </p>
          </div>
        )}

        <div className="space-y-4">
          {[
            { key: 'empathyRapport', label: 'Empathy & Rapport' },
            { key: 'problemResolution', label: 'Problem Resolution' },
            { key: 'productKnowledge', label: 'Product Knowledge' },
            { key: 'professionalism', label: 'Professionalism' },
            { key: 'scenarioSpecific', label: 'Scenario Specific' }
          ].map((category) => (
            <div key={category.key} className="flex items-center gap-4">
              <label className="w-48 text-gray-300">{category.label}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={formData.scoringWeights[category.key]}
                onChange={(e) => handleWeightChange(category.key, e.target.value)}
                className="flex-1 accent-primary-500"
              />
              <div className="w-20 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.scoringWeights[category.key]}
                  onChange={(e) => handleWeightChange(category.key, e.target.value)}
                  className="w-14 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-100 text-center"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
          <span className="text-gray-400">Total</span>
          <span className={`font-medium ${totalWeight === 100 ? 'text-green-400' : 'text-red-400'}`}>
            {totalWeight}%
          </span>
        </div>
      </motion.div>

      {/* Voice Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Volume2 className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Voice Preferences</h2>
            <p className="text-sm text-gray-400">Configure default voice for AI customer simulations</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Default Voice
          </label>
          <div className="grid md:grid-cols-4 gap-3">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => handleChange('voicePreferences', {
                  ...formData.voicePreferences,
                  defaultVoiceId: voice.id
                })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formData.voicePreferences.defaultVoiceId === voice.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <p className="font-medium text-gray-100">{voice.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {voice.gender} - {voice.accent}
                </p>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Prompt Editor Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Edit3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Prompt Templates</h2>
              <p className="text-sm text-gray-400">
                Customize the AI prompts used for scenarios and coaching analysis
                {hasCustomPrompts && (
                  <span className="ml-2 text-xs text-indigo-400">(Using custom prompts)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {promptsChanged && (
              <button
                onClick={handleResetAllPrompts}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </button>
            )}
            <button
              onClick={handleSavePrompts}
              disabled={promptsSaving || !promptsChanged}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors"
            >
              {promptsSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {promptsSaving ? 'Saving...' : 'Save Prompts'}
            </button>
          </div>
        </div>

        {/* Template Variables Info */}
        <div className="mb-6 p-4 bg-gray-750 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Code className="w-4 h-4" />
            Available Template Variables
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded">{'{{company.name}}'}</code>
            <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded">{'{{company.services}}'}</code>
            <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded">{'{{company.pricing.quarterlyPrice}}'}</code>
            <code className="text-cyan-400 bg-gray-800 px-2 py-1 rounded">{'{{company.guarantees}}'}</code>
            <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">{'{{scenario.customerName}}'}</code>
            <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">{'{{scenario.situation}}'}</code>
            <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">{'{{scenario.customerGoals}}'}</code>
            <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">{'{{transcript}}'}</code>
          </div>
        </div>

        {promptsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Agent Prompt */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => togglePrompt('agent')}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-750 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-100">Scenario Agent Prompt</p>
                    <p className="text-sm text-gray-400">Defines how the AI customer behaves during training calls</p>
                  </div>
                </div>
                {expandedPrompt === 'agent' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedPrompt === 'agent' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-300">Template</h4>
                        <button
                          onClick={() => handleResetToDefaults('agent')}
                          className="text-xs text-gray-400 hover:text-gray-300"
                        >
                          Reset to default
                        </button>
                      </div>
                      <textarea
                        value={promptData.agentPrompt}
                        onChange={(e) => handlePromptChange('agentPrompt', e.target.value)}
                        className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        placeholder="Enter the agent prompt template..."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Coaching System Prompt */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => togglePrompt('coachingSystem')}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-750 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-100">Coaching System Prompt</p>
                    <p className="text-sm text-gray-400">Sets the AI coach's role and personality</p>
                  </div>
                </div>
                {expandedPrompt === 'coachingSystem' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedPrompt === 'coachingSystem' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-300">System Prompt</h4>
                        <button
                          onClick={() => handleResetToDefaults('coachingSystem')}
                          className="text-xs text-gray-400 hover:text-gray-300"
                        >
                          Reset to default
                        </button>
                      </div>
                      <textarea
                        value={promptData.coachingSystemPrompt}
                        onChange={(e) => handlePromptChange('coachingSystemPrompt', e.target.value)}
                        className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        placeholder="Enter the coaching system prompt..."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Coaching User Prompt */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => togglePrompt('coachingUser')}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-750 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-yellow-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-100">Coaching Analysis Prompt</p>
                    <p className="text-sm text-gray-400">Template for analyzing transcripts and generating feedback</p>
                  </div>
                </div>
                {expandedPrompt === 'coachingUser' ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <AnimatePresence>
                {expandedPrompt === 'coachingUser' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-300">Analysis Template</h4>
                        <button
                          onClick={() => handleResetToDefaults('coachingUser')}
                          className="text-xs text-gray-400 hover:text-gray-300"
                        >
                          Reset to default
                        </button>
                      </div>
                      <textarea
                        value={promptData.coachingUserPrompt}
                        onChange={(e) => handlePromptChange('coachingUserPrompt', e.target.value)}
                        className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        placeholder="Enter the coaching analysis prompt template..."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {scenarios.length > 0 && previewPrompt && (
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview Generated Prompt
              </h3>
              <select
                value={selectedScenarioId || ''}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
            </div>
            <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {previewPrompt.prompts?.agent || 'Select a scenario to preview'}
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
