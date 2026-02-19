import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

function emptyPackage() {
  return {
    name: '',
    description: '',
    initial_price: null,
    recurring_price: null,
    service_frequency: '',
    included_services: [],
    selling_points: [],
    objections: []
  };
}

export default function PackagesTab({ packages, onChange }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const update = (idx, field, value) => {
    const updated = [...packages];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const addPackage = () => {
    onChange([...packages, emptyPackage()]);
    setExpanded(prev => ({ ...prev, [packages.length]: true }));
  };

  const removePackage = (idx) => {
    onChange(packages.filter((_, i) => i !== idx));
  };

  const addListItem = (pkgIdx, field, defaultItem) => {
    const updated = [...packages];
    updated[pkgIdx] = {
      ...updated[pkgIdx],
      [field]: [...(updated[pkgIdx][field] || []), defaultItem]
    };
    onChange(updated);
  };

  const updateListItem = (pkgIdx, field, itemIdx, value) => {
    const updated = [...packages];
    const list = [...(updated[pkgIdx][field] || [])];
    list[itemIdx] = value;
    updated[pkgIdx] = { ...updated[pkgIdx], [field]: list };
    onChange(updated);
  };

  const removeListItem = (pkgIdx, field, itemIdx) => {
    const updated = [...packages];
    updated[pkgIdx] = {
      ...updated[pkgIdx],
      [field]: (updated[pkgIdx][field] || []).filter((_, i) => i !== itemIdx)
    };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {packages.map((pkg, idx) => (
        <div key={idx} className="bg-gray-700/30 rounded-lg border border-gray-600/50">
          {/* Header */}
          <div
            className="flex items-center gap-3 p-4 cursor-pointer"
            onClick={() => toggle(idx)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-gray-100 font-medium truncate">
                {pkg.name || `Package ${idx + 1}`}
              </p>
              <p className="text-gray-500 text-xs">
                {pkg.recurring_price ? `$${pkg.recurring_price}/${pkg.service_frequency || 'mo'}` : pkg.initial_price ? `$${pkg.initial_price} one-time` : 'No pricing'}
                {' · '}{pkg.selling_points?.length || 0} selling points
                {' · '}{pkg.objections?.length || 0} objections
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removePackage(idx); }}
              className="text-gray-500 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {expanded[idx] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>

          {/* Expanded content */}
          {expanded[idx] && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-600/50 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Name</label>
                  <input
                    type="text"
                    value={pkg.name}
                    onChange={(e) => update(idx, 'name', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Frequency</label>
                  <input
                    type="text"
                    value={pkg.service_frequency || ''}
                    onChange={(e) => update(idx, 'service_frequency', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                    placeholder="monthly, quarterly, etc."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Description</label>
                <textarea
                  value={pkg.description || ''}
                  onChange={(e) => update(idx, 'description', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Initial Price ($)</label>
                  <input
                    type="number"
                    value={pkg.initial_price ?? ''}
                    onChange={(e) => update(idx, 'initial_price', e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Recurring Price ($)</label>
                  <input
                    type="number"
                    value={pkg.recurring_price ?? ''}
                    onChange={(e) => update(idx, 'recurring_price', e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Selling Points */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Selling Points</label>
                  <button
                    onClick={() => addListItem(idx, 'selling_points', '')}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(pkg.selling_points || []).map((point, pi) => (
                    <div key={pi} className="flex gap-2">
                      <input
                        type="text"
                        value={typeof point === 'string' ? point : point.text || ''}
                        onChange={(e) => updateListItem(idx, 'selling_points', pi, e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                      />
                      <button
                        onClick={() => removeListItem(idx, 'selling_points', pi)}
                        className="text-gray-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Objections</label>
                  <button
                    onClick={() => addListItem(idx, 'objections', { objection: '', response: '' })}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(pkg.objections || []).map((obj, oi) => (
                    <div key={oi} className="bg-gray-700/50 rounded p-2.5 space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={obj.objection || ''}
                          onChange={(e) => updateListItem(idx, 'objections', oi, { ...obj, objection: e.target.value })}
                          placeholder="Objection..."
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                        />
                        <button
                          onClick={() => removeListItem(idx, 'objections', oi)}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={obj.response || ''}
                        onChange={(e) => updateListItem(idx, 'objections', oi, { ...obj, response: e.target.value })}
                        placeholder="Recommended response..."
                        rows={2}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addPackage}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Package
      </button>
    </div>
  );
}
