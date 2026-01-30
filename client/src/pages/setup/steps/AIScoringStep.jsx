import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Save, Loader2, AlertCircle, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

const DEFAULT_WEIGHTS = {
  empathyRapport: 20,
  problemResolution: 25,
  productKnowledge: 20,
  professionalism: 15,
  scenarioSpecific: 20
};

const WEIGHT_LABELS = {
  empathyRapport: { label: 'Empathy & Rapport', color: 'bg-pink-500', description: 'Building connection and showing understanding' },
  problemResolution: { label: 'Problem Resolution', color: 'bg-blue-500', description: 'Effectively solving customer issues' },
  productKnowledge: { label: 'Product Knowledge', color: 'bg-green-500', description: 'Demonstrating expertise about services' },
  professionalism: { label: 'Professionalism', color: 'bg-purple-500', description: 'Professional tone and communication' },
  scenarioSpecific: { label: 'Scenario-Specific', color: 'bg-orange-500', description: 'Meeting scenario-specific objectives' }
};

export default function AIScoringStep({ data, onComplete, authFetch, organization }) {
  const existingWeights = organization?.settings?.customPrompts?.scoringWeights || {};
  const existingCriteria = organization?.settings?.customPrompts?.scoringCriteria || {};

  const [weights, setWeights] = useState({
    empathyRapport: existingWeights.empathyRapport ?? data.scoringWeights?.empathyRapport ?? DEFAULT_WEIGHTS.empathyRapport,
    problemResolution: existingWeights.problemResolution ?? data.scoringWeights?.problemResolution ?? DEFAULT_WEIGHTS.problemResolution,
    productKnowledge: existingWeights.productKnowledge ?? data.scoringWeights?.productKnowledge ?? DEFAULT_WEIGHTS.productKnowledge,
    professionalism: existingWeights.professionalism ?? data.scoringWeights?.professionalism ?? DEFAULT_WEIGHTS.professionalism,
    scenarioSpecific: existingWeights.scenarioSpecific ?? data.scoringWeights?.scenarioSpecific ?? DEFAULT_WEIGHTS.scenarioSpecific
  });

  const [criteria, setCriteria] = useState({
    requiredPhrases: existingCriteria.requiredPhrases || data.scoringCriteria?.requiredPhrases || [],
    prohibitedPhrases: existingCriteria.prohibitedPhrases || data.scoringCriteria?.prohibitedPhrases || []
  });

  const [newRequired, setNewRequired] = useState({ phrase: '', impact: 'medium' });
  const [newProhibited, setNewProhibited] = useState({ phrase: '', impact: 'medium' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isValidTotal = totalWeight === 100;

  const handleWeightChange = (key, value) => {
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    setWeights(prev => ({ ...prev, [key]: numValue }));
  };

  const addRequiredPhrase = () => {
    if (!newRequired.phrase.trim()) return;
    setCriteria(prev => ({
      ...prev,
      requiredPhrases: [...prev.requiredPhrases, { ...newRequired }]
    }));
    setNewRequired({ phrase: '', impact: 'medium' });
  };

  const addProhibitedPhrase = () => {
    if (!newProhibited.phrase.trim()) return;
    setCriteria(prev => ({
      ...prev,
      prohibitedPhrases: [...prev.prohibitedPhrases, { ...newProhibited }]
    }));
    setNewProhibited({ phrase: '', impact: 'medium' });
  };

  const removePhrase = (type, index) => {
    setCriteria(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidTotal) {
      setError('Scoring weights must add up to 100%');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save to organization settings
      const response = await authFetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoringWeights: weights,
          scoringCriteria: criteria,
          preserveAgent: true,
          preserveCoaching: true
        })
      });

      if (response.ok) {
        onComplete({ scoringWeights: weights, scoringCriteria: criteria });
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 rounded-xl p-6 border border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Sliders className="w-6 h-6 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100">Scoring Weights & Criteria</h3>
        </div>
        <p className="text-sm text-gray-400">
          Customize how calls are scored and define specific behaviors to reward or penalize.
        </p>
      </div>

      {/* Scoring Weights */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-md font-semibold text-gray-100">Category Weights</h4>
            <p className="text-sm text-gray-400">Adjust how much each category contributes to the overall score</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isValidTotal ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            Total: {totalWeight}%
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(WEIGHT_LABELS).map(([key, config]) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-200">{config.label}</span>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[key]}
                    onChange={(e) => handleWeightChange(key, e.target.value)}
                    className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center text-gray-100 text-sm"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${config.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${weights[key]}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>

        {!isValidTotal && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              Weights must add up to 100%. Currently: {totalWeight}%
            </p>
          </div>
        )}
      </div>

      {/* Required Phrases */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h4 className="text-md font-semibold text-gray-100">Required Behaviors</h4>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          CSRs will be rewarded when they include these phrases or behaviors
        </p>

        {/* Existing items */}
        <div className="space-y-2 mb-4">
          {criteria.requiredPhrases.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex-1">
                <span className="text-sm text-green-300">"{item.phrase}"</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.impact === 'high' ? 'bg-green-500/20 text-green-400' :
                item.impact === 'low' ? 'bg-gray-500/20 text-gray-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {item.impact}
              </span>
              <button
                type="button"
                onClick={() => removePhrase('requiredPhrases', index)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Phrase or behavior to reward..."
            value={newRequired.phrase}
            onChange={(e) => setNewRequired(prev => ({ ...prev, phrase: e.target.value }))}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500"
          />
          <select
            value={newRequired.impact}
            onChange={(e) => setNewRequired(prev => ({ ...prev, impact: e.target.value }))}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="button"
            onClick={addRequiredPhrase}
            disabled={!newRequired.phrase.trim()}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prohibited Phrases */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-5 h-5 text-red-400" />
          <h4 className="text-md font-semibold text-gray-100">Prohibited Behaviors</h4>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          CSRs will be penalized when they use these phrases or behaviors
        </p>

        {/* Existing items */}
        <div className="space-y-2 mb-4">
          {criteria.prohibitedPhrases.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex-1">
                <span className="text-sm text-red-300">"{item.phrase}"</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                item.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                item.impact === 'low' ? 'bg-gray-500/20 text-gray-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {item.impact}
              </span>
              <button
                type="button"
                onClick={() => removePhrase('prohibitedPhrases', index)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Phrase to penalize..."
            value={newProhibited.phrase}
            onChange={(e) => setNewProhibited(prev => ({ ...prev, phrase: e.target.value }))}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500"
          />
          <select
            value={newProhibited.impact}
            onChange={(e) => setNewProhibited(prev => ({ ...prev, impact: e.target.value }))}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button
            type="button"
            onClick={addProhibitedPhrase}
            disabled={!newProhibited.phrase.trim()}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !isValidTotal}
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save & Continue
            </>
          )}
        </button>
      </div>
    </form>
  );
}
