import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const GUIDELINE_TYPES = [
  { value: 'pricing_rule', label: 'Pricing Rule' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'process', label: 'Process' },
  { value: 'communication', label: 'Communication' },
  { value: 'referral', label: 'Referral' }
];

function emptyGuideline() {
  return { guideline_type: 'process', title: '', content: '', examples: [] };
}

export default function GuidelinesTab({ guidelines, onChange }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const update = (idx, field, value) => {
    const updated = [...guidelines];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const addGuideline = () => {
    onChange([...guidelines, emptyGuideline()]);
    setExpanded(prev => ({ ...prev, [guidelines.length]: true }));
  };

  const removeGuideline = (idx) => {
    onChange(guidelines.filter((_, i) => i !== idx));
  };

  // Group by type for display
  const grouped = GUIDELINE_TYPES.map(type => ({
    ...type,
    items: guidelines
      .map((g, idx) => ({ ...g, _idx: idx }))
      .filter(g => g.guideline_type === type.value)
  })).filter(g => g.items.length > 0);

  const ungrouped = guidelines
    .map((g, idx) => ({ ...g, _idx: idx }))
    .filter(g => !GUIDELINE_TYPES.some(t => t.value === g.guideline_type));

  return (
    <div className="space-y-4">
      {/* Show grouped */}
      {grouped.map(group => (
        <div key={group.value}>
          <h3 className="text-sm font-medium text-gray-300 mb-2">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map(g => (
              <GuidelineItem
                key={g._idx}
                guideline={g}
                idx={g._idx}
                expanded={expanded[g._idx]}
                onToggle={() => toggle(g._idx)}
                onUpdate={(field, value) => update(g._idx, field, value)}
                onRemove={() => removeGuideline(g._idx)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Other</h3>
          <div className="space-y-2">
            {ungrouped.map(g => (
              <GuidelineItem
                key={g._idx}
                guideline={g}
                idx={g._idx}
                expanded={expanded[g._idx]}
                onToggle={() => toggle(g._idx)}
                onUpdate={(field, value) => update(g._idx, field, value)}
                onRemove={() => removeGuideline(g._idx)}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={addGuideline}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Guideline
      </button>
    </div>
  );
}

function GuidelineItem({ guideline, idx, expanded, onToggle, onUpdate, onRemove }) {
  return (
    <div className="bg-gray-700/30 rounded-lg border border-gray-600/50">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <p className="text-gray-100 text-sm font-medium truncate">
            {guideline.title || `Guideline ${idx + 1}`}
          </p>
          <p className="text-gray-500 text-xs truncate">{guideline.content?.slice(0, 80)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-gray-500 hover:text-red-400 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-600/50 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Type</label>
              <select
                value={guideline.guideline_type || 'process'}
                onChange={(e) => onUpdate('guideline_type', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
              >
                {GUIDELINE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Title</label>
              <input
                type="text"
                value={guideline.title || ''}
                onChange={(e) => onUpdate('title', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Content</label>
            <textarea
              value={guideline.content || ''}
              onChange={(e) => onUpdate('content', e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">Examples</label>
              <button
                onClick={() => onUpdate('examples', [...(guideline.examples || []), ''])}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {(guideline.examples || []).map((ex, ei) => (
                <div key={ei} className="flex gap-2">
                  <input
                    type="text"
                    value={ex}
                    onChange={(e) => {
                      const updated = [...(guideline.examples || [])];
                      updated[ei] = e.target.value;
                      onUpdate('examples', updated);
                    }}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                    placeholder="Example..."
                  />
                  <button
                    onClick={() => onUpdate('examples', (guideline.examples || []).filter((_, i) => i !== ei))}
                    className="text-gray-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
