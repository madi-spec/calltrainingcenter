import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Save, Loader2, Check, AlertCircle } from 'lucide-react';

const COACHING_OPTIONS = {
  coachingStyle: {
    title: 'Coaching Style',
    description: 'What coaching style works best for your team?',
    options: [
      { value: 'encouraging', label: 'Encouraging & Supportive', description: 'Focus on positives first, gentle suggestions for improvement' },
      { value: 'balanced', label: 'Balanced', description: 'Equal focus on strengths and areas for improvement' },
      { value: 'direct', label: 'Direct & Results-Focused', description: 'Straight to the point with clear action items' }
    ]
  },
  feedbackDetail: {
    title: 'Feedback Detail',
    description: 'How detailed should the coaching feedback be?',
    options: [
      { value: 'concise', label: 'Concise', description: 'Key points only, quick to read' },
      { value: 'standard', label: 'Standard', description: 'Balanced detail with examples' },
      { value: 'comprehensive', label: 'Comprehensive', description: 'In-depth analysis with multiple examples and alternatives' }
    ]
  },
  quoteExamples: {
    title: 'Example Quotes',
    description: 'Should feedback include direct quotes from the call?',
    options: [
      { value: 'always', label: 'Always', description: 'Include quotes for every piece of feedback' },
      { value: 'key_moments', label: 'Key Moments Only', description: 'Quote only the most important exchanges' },
      { value: 'minimal', label: 'Minimal', description: 'Summarize without extensive quoting' }
    ]
  },
  actionItems: {
    title: 'Action Items',
    description: 'How should improvement suggestions be framed?',
    options: [
      { value: 'specific_scripts', label: 'Specific Scripts', description: 'Provide exact phrases they could use' },
      { value: 'techniques', label: 'Techniques & Principles', description: 'Teach the underlying technique to apply broadly' },
      { value: 'both', label: 'Both', description: 'Combine specific examples with broader techniques' }
    ]
  }
};

const PRIORITY_SKILLS = [
  { value: 'empathy', label: 'Empathy & Rapport Building' },
  { value: 'problem_solving', label: 'Problem Resolution' },
  { value: 'product_knowledge', label: 'Product/Service Knowledge' },
  { value: 'professionalism', label: 'Professionalism & Tone' },
  { value: 'sales', label: 'Sales & Upselling' },
  { value: 'retention', label: 'Customer Retention' },
  { value: 'efficiency', label: 'Call Efficiency' },
  { value: 'compliance', label: 'Compliance & Script Adherence' }
];

export default function AICoachingStyleStep({ data, onComplete, authFetch, organization }) {
  const existingSettings = organization?.settings?.customPrompts?.coachingWizardAnswers || {};

  const [formData, setFormData] = useState({
    coachingStyle: existingSettings.coachingStyle || data.coachingStyle || 'balanced',
    feedbackDetail: existingSettings.feedbackDetail || data.feedbackDetail || 'standard',
    quoteExamples: existingSettings.quoteExamples || data.quoteExamples || 'key_moments',
    actionItems: existingSettings.actionItems || data.actionItems || 'both',
    prioritySkills: existingSettings.prioritySkills || data.prioritySkills || ['empathy', 'problem_solving', 'professionalism']
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleSkill = (value) => {
    setFormData(prev => ({
      ...prev,
      prioritySkills: prev.prioritySkills.includes(value)
        ? prev.prioritySkills.filter(v => v !== value)
        : [...prev.prioritySkills, value]
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
          coachingWizardAnswers: formData,
          preserveAgent: true
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
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <MessageSquare className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100">Coaching & Feedback Style</h3>
        </div>
        <p className="text-sm text-gray-400">
          Customize how AI provides feedback and coaching after practice calls. These settings shape the tone and depth of performance reviews.
        </p>
      </div>

      {/* Single Select Options */}
      {Object.entries(COACHING_OPTIONS).map(([key, config]) => (
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

      {/* Priority Skills */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h4 className="text-md font-semibold text-gray-100 mb-2">Priority Skills</h4>
        <p className="text-sm text-gray-400 mb-4">
          Which skills are most important to evaluate? Select all that apply.
        </p>

        <div className="grid md:grid-cols-2 gap-3">
          {PRIORITY_SKILLS.map((skill) => (
            <button
              key={skill.value}
              type="button"
              onClick={() => toggleSkill(skill.value)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                formData.prioritySkills.includes(skill.value)
                  ? 'bg-purple-500/20 border-purple-500/50 text-gray-100'
                  : 'bg-gray-750 border-gray-600 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  formData.prioritySkills.includes(skill.value)
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-gray-500'
                }`}>
                  {formData.prioritySkills.includes(skill.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="text-sm">{skill.label}</span>
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
