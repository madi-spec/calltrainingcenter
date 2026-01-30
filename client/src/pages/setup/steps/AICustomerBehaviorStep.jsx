import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Save, Loader2, Check, AlertCircle } from 'lucide-react';

const BEHAVIOR_OPTIONS = {
  customerRealism: {
    title: 'Customer Realism',
    description: 'How realistic should AI customers behave?',
    options: [
      { value: 'very_realistic', label: 'Very Realistic', description: 'Customers use filler words, interrupt, get emotional, and behave like real people' },
      { value: 'moderately_realistic', label: 'Moderately Realistic', description: 'Natural conversation flow with some emotional responses' },
      { value: 'professional', label: 'Professional', description: 'Customers are clear and direct, minimal emotional variance' }
    ]
  },
  challengeLevel: {
    title: 'Challenge Level',
    description: 'How challenging should customers be by default?',
    options: [
      { value: 'easy', label: 'Forgiving', description: 'Customers are patient and accept most solutions quickly' },
      { value: 'moderate', label: 'Moderate', description: 'Customers push back reasonably but can be satisfied with good service' },
      { value: 'demanding', label: 'Demanding', description: 'Customers require excellent service and won\'t accept mediocre responses' }
    ]
  }
};

const ESCALATION_OPTIONS = [
  { value: 'dismissive', label: 'Being dismissed or not heard' },
  { value: 'scripted', label: 'Overly scripted or robotic responses' },
  { value: 'no_solution', label: 'Not offering solutions' },
  { value: 'long_hold', label: 'Being put on hold or transferred repeatedly' },
  { value: 'no_empathy', label: 'Lack of empathy or understanding' },
  { value: 'incorrect_info', label: 'Receiving incorrect information' }
];

const DEESCALATION_OPTIONS = [
  { value: 'empathy', label: 'Genuine empathy and acknowledgment' },
  { value: 'ownership', label: 'Taking ownership of the issue' },
  { value: 'solutions', label: 'Offering concrete solutions' },
  { value: 'compensation', label: 'Offering appropriate compensation' },
  { value: 'expertise', label: 'Demonstrating product knowledge' },
  { value: 'followup', label: 'Promising and scheduling follow-up' }
];

export default function AICustomerBehaviorStep({ data, onComplete, authFetch, organization }) {
  const existingSettings = organization?.settings?.customPrompts?.agentWizardAnswers || {};

  const [formData, setFormData] = useState({
    customerRealism: existingSettings.customerRealism || data.customerRealism || 'moderately_realistic',
    challengeLevel: existingSettings.challengeLevel || data.challengeLevel || 'moderate',
    escalationTriggers: existingSettings.escalationTriggers || data.escalationTriggers || ['dismissive', 'no_empathy', 'no_solution'],
    deescalationTriggers: existingSettings.deescalationTriggers || data.deescalationTriggers || ['empathy', 'ownership', 'solutions']
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Save to organization settings
      const response = await authFetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentWizardAnswers: formData,
          preserveCoaching: true
        })
      });

      if (response.ok) {
        onComplete(formData);
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
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Bot className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100">AI Customer Behavior</h3>
        </div>
        <p className="text-sm text-gray-400">
          Configure how AI customers behave during training scenarios. These settings affect the difficulty and realism of practice calls.
        </p>
      </div>

      {/* Single Select Options */}
      {Object.entries(BEHAVIOR_OPTIONS).map(([key, config]) => (
        <div key={key} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h4 className="text-md font-semibold text-gray-100 mb-2">{config.title}</h4>
          <p className="text-sm text-gray-400 mb-4">{config.description}</p>

          <div className="space-y-3">
            {config.options.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => handleSelectChange(key, option.value)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  formData[key] === option.value
                    ? 'bg-primary-500/20 border-primary-500 text-gray-100'
                    : 'bg-gray-750 border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                    )}
                  </div>
                  {formData[key] === option.value && (
                    <Check className="w-5 h-5 text-primary-400" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}

      {/* Escalation Triggers */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-md font-semibold text-gray-100 mb-2">Escalation Triggers</h4>
        <p className="text-sm text-gray-400 mb-4">
          What should cause customers to become more upset? Select all that apply.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          {ESCALATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleArrayItem('escalationTriggers', option.value)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                formData.escalationTriggers.includes(option.value)
                  ? 'bg-red-500/20 border-red-500/50 text-gray-100'
                  : 'bg-gray-750 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formData.escalationTriggers.includes(option.value)
                    ? 'bg-red-500 border-red-500'
                    : 'border-gray-500'
                }`}>
                  {formData.escalationTriggers.includes(option.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{option.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* De-escalation Triggers */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-md font-semibold text-gray-100 mb-2">De-escalation Triggers</h4>
        <p className="text-sm text-gray-400 mb-4">
          What should help calm frustrated customers? Select all that apply.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          {DEESCALATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleArrayItem('deescalationTriggers', option.value)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                formData.deescalationTriggers.includes(option.value)
                  ? 'bg-green-500/20 border-green-500/50 text-gray-100'
                  : 'bg-gray-750 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formData.deescalationTriggers.includes(option.value)
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-500'
                }`}>
                  {formData.deescalationTriggers.includes(option.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{option.label}</span>
              </div>
            </button>
          ))}
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
          disabled={saving}
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
