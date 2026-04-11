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
          <h3 className="text-sm font-medium text-secondary-foreground mb-2">{group.label}</h3>
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
          <h3 className="text-sm font-medium text-secondary-foreground mb-2">Other</h3>
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
        className="w-full px-4 py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Guideline
      </button>
    </div>
  );
}

function GuidelineItem({ guideline, idx, expanded, onToggle, onUpdate, onRemove }) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-sm font-medium truncate">
            {guideline.title || `Guideline ${idx + 1}`}
          </p>
          <p className="text-muted-foreground text-xs truncate">{guideline.content?.slice(0, 80)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-muted-foreground hover:text-red-400 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                value={guideline.guideline_type || 'process'}
                onChange={(e) => onUpdate('guideline_type', e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              >
                {GUIDELINE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Title</label>
              <input
                type="text"
                value={guideline.title || ''}
                onChange={(e) => onUpdate('title', e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Content</label>
            <textarea
              value={guideline.content || ''}
              onChange={(e) => onUpdate('content', e.target.value)}
              rows={3}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Examples</label>
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
                    className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-foreground text-sm"
                    placeholder="Example..."
                  />
                  <button
                    onClick={() => onUpdate('examples', (guideline.examples || []).filter((_, i) => i !== ei))}
                    className="text-muted-foreground hover:text-red-400 p-1"
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
