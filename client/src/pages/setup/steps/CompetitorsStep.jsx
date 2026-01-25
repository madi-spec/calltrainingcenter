import { useState } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Save, CheckCircle2 } from 'lucide-react';

// Convert scraped competitor names to our format
function convertExtractedCompetitors(competitorNames) {
  if (!competitorNames || !Array.isArray(competitorNames)) return [];

  return competitorNames.map(name => ({
    name: typeof name === 'string' ? name : name.name || 'Unknown',
    typicalPricing: '',
    knownWeaknesses: [],
    ourAdvantages: []
  }));
}

export default function CompetitorsStep({ data, allStepData, onComplete, authFetch }) {
  // Check for extracted competitors from website scraping
  const extractedCompetitors = allStepData?.company?.competitors_mentioned || [];
  const hasExtractedCompetitors = extractedCompetitors.length > 0;

  // Initialize with existing data, or extracted competitors if available
  const initialCompetitors = data.competitors?.length > 0
    ? data.competitors
    : hasExtractedCompetitors
      ? convertExtractedCompetitors(extractedCompetitors)
      : [];

  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [usedExtractedData, setUsedExtractedData] = useState(hasExtractedCompetitors && initialCompetitors.length > 0);
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [saving, setSaving] = useState(false);

  const addCompetitor = () => {
    const newCompetitor = {
      name: '',
      typicalPricing: '',
      knownWeaknesses: [],
      ourAdvantages: []
    };
    setCompetitors([...competitors, newCompetitor]);
    setExpandedCompetitor(competitors.length);
  };

  const updateCompetitor = (index, field, value) => {
    const updated = [...competitors];
    updated[index] = { ...updated[index], [field]: value };
    setCompetitors(updated);
  };

  const removeCompetitor = (index) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
    setExpandedCompetitor(null);
  };

  const addWeakness = (index) => {
    const updated = [...competitors];
    updated[index].knownWeaknesses = [...(updated[index].knownWeaknesses || []), ''];
    setCompetitors(updated);
  };

  const updateWeakness = (compIndex, weakIndex, value) => {
    const updated = [...competitors];
    updated[compIndex].knownWeaknesses[weakIndex] = value;
    setCompetitors(updated);
  };

  const removeWeakness = (compIndex, weakIndex) => {
    const updated = [...competitors];
    updated[compIndex].knownWeaknesses = updated[compIndex].knownWeaknesses.filter((_, i) => i !== weakIndex);
    setCompetitors(updated);
  };

  const addAdvantage = (index) => {
    const updated = [...competitors];
    updated[index].ourAdvantages = [...(updated[index].ourAdvantages || []), ''];
    setCompetitors(updated);
  };

  const updateAdvantage = (compIndex, advIndex, value) => {
    const updated = [...competitors];
    updated[compIndex].ourAdvantages[advIndex] = value;
    setCompetitors(updated);
  };

  const removeAdvantage = (compIndex, advIndex) => {
    const updated = [...competitors];
    updated[compIndex].ourAdvantages = updated[compIndex].ourAdvantages.filter((_, i) => i !== advIndex);
    setCompetitors(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Save each competitor to the API
      for (const comp of competitors) {
        if (comp.name) {
          await authFetch('/api/products/competitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: comp.name,
              typical_pricing: comp.typicalPricing,
              known_weaknesses: comp.knownWeaknesses,
              our_advantages: comp.ourAdvantages
            })
          });
        }
      }

      onComplete({ competitors });
    } catch (error) {
      console.error('Failed to save competitors:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Extracted Competitors Notice */}
      {usedExtractedData && competitors.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} found on your website
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Add details about their weaknesses and your advantages to improve training scenarios.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-blue-300 text-sm">
          Adding competitor information helps train CSRs to effectively differentiate your services
          and handle objections when customers mention competing companies.
        </p>
      </div>

      {/* Competitor List */}
      <div className="space-y-4">
        {competitors.map((comp, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => setExpandedCompetitor(expandedCompetitor === index ? null : index)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold">
                  {index + 1}
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-200">
                    {comp.name || 'New Competitor'}
                  </h4>
                  {comp.typicalPricing && (
                    <p className="text-sm text-gray-400">
                      Typical pricing: {comp.typicalPricing}
                    </p>
                  )}
                </div>
              </div>
              {expandedCompetitor === index ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedCompetitor === index && (
              <div className="p-4 pt-0 space-y-4 border-t border-gray-700">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Competitor Name
                    </label>
                    <input
                      type="text"
                      value={comp.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                      placeholder="ABC Pest Control"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Typical Pricing
                    </label>
                    <input
                      type="text"
                      value={comp.typicalPricing}
                      onChange={(e) => updateCompetitor(index, 'typicalPricing', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                      placeholder="$35-50/month"
                    />
                  </div>
                </div>

                {/* Known Weaknesses */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Known Weaknesses
                  </label>
                  <div className="space-y-2">
                    {(comp.knownWeaknesses || []).map((weakness, weakIndex) => (
                      <div key={weakIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={weakness}
                          onChange={(e) => updateWeakness(index, weakIndex, e.target.value)}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., Long response times"
                        />
                        <button
                          onClick={() => removeWeakness(index, weakIndex)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addWeakness(index)}
                      className="flex items-center gap-2 px-3 py-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add weakness
                    </button>
                  </div>
                </div>

                {/* Our Advantages */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Our Advantages Over Them
                  </label>
                  <div className="space-y-2">
                    {(comp.ourAdvantages || []).map((advantage, advIndex) => (
                      <div key={advIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={advantage}
                          onChange={(e) => updateAdvantage(index, advIndex, e.target.value)}
                          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., Same-day service available"
                        />
                        <button
                          onClick={() => removeAdvantage(index, advIndex)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addAdvantage(index)}
                      className="flex items-center gap-2 px-3 py-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add advantage
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => removeCompetitor(index)}
                    className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Competitor
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addCompetitor}
          className="w-full flex items-center justify-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 border-dashed text-gray-400 hover:text-gray-300 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Competitor
        </button>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
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
              {competitors.length > 0 ? 'Save & Continue' : 'Continue'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
