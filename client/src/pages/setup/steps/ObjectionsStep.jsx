import { useState, useEffect } from 'react';
import { Loader2, Save, ChevronDown, ChevronUp, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { INDUSTRIES } from '../../../utils/industryTerminology';

const OBJECTION_CATEGORIES = [
  { id: 'price', name: 'Price Objections', color: 'yellow' },
  { id: 'value', name: 'Value Questions', color: 'blue' },
  { id: 'timing', name: 'Timing Concerns', color: 'purple' },
  { id: 'trust', name: 'Trust & Safety', color: 'green' },
  { id: 'commitment', name: 'Commitment Fears', color: 'orange' },
  { id: 'competition', name: 'Competition', color: 'red' }
];

export default function ObjectionsStep({ data, allStepData, onComplete, authFetch }) {
  const [templates, setTemplates] = useState([]);
  const [customObjections, setCustomObjections] = useState(data.customObjections || []);
  const [selectedTemplates, setSelectedTemplates] = useState(data.selectedTemplates || []);
  const [expandedCategory, setExpandedCategory] = useState('price');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newObjection, setNewObjection] = useState({ category: 'price', text: '', response: '' });

  // Get selected industry
  const selectedIndustry = allStepData?.industry || INDUSTRIES.PEST_CONTROL;

  useEffect(() => {
    fetchTemplates();
  }, [selectedIndustry]);

  const fetchTemplates = async () => {
    try {
      const url = `/api/products/objection-templates?industry=${selectedIndustry}`;
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        // Select all templates by default
        setSelectedTemplates(data.templates?.map(t => t.id) || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
    } else {
      setSelectedTemplates([...selectedTemplates, templateId]);
    }
  };

  const startEditing = (template) => {
    setEditingTemplate(template.id);
    setEditedResponse(template.customResponse || template.default_response);
  };

  const saveEdit = (templateId) => {
    setTemplates(templates.map(t =>
      t.id === templateId
        ? { ...t, customResponse: editedResponse }
        : t
    ));
    setEditingTemplate(null);
    setEditedResponse('');
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setEditedResponse('');
  };

  const addCustomObjection = () => {
    if (newObjection.text && newObjection.response) {
      setCustomObjections([...customObjections, { ...newObjection, id: Date.now() }]);
      setNewObjection({ category: 'price', text: '', response: '' });
      setShowAddCustom(false);
    }
  };

  const removeCustomObjection = (id) => {
    setCustomObjections(customObjections.filter(o => o.id !== id));
  };

  const getTemplatesByCategory = (categoryId) => {
    return templates.filter(t => t.objection_category === categoryId);
  };

  const getCategoryColor = (categoryId) => {
    const category = OBJECTION_CATEGORIES.find(c => c.id === categoryId);
    const colors = {
      yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      green: 'bg-green-500/10 text-green-400 border-green-500/30',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      red: 'bg-red-500/10 text-red-400 border-red-500/30'
    };
    return colors[category?.color] || colors.blue;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Save selected templates and custom objections
      // In a real implementation, this would create package objections or save to org settings
      onComplete({
        selectedTemplates,
        customObjections,
        customizedResponses: templates
          .filter(t => t.customResponse)
          .map(t => ({ templateId: t.id, response: t.customResponse }))
      });
    } catch (error) {
      console.error('Failed to save objections:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Configure Objection Handling</h3>
        <p className="text-gray-400">
          Select common objections your team encounters and customize the recommended responses.
          These will be used to train your CSRs on effective responses.
        </p>
      </div>

      {/* Category Accordion */}
      <div className="space-y-3">
        {OBJECTION_CATEGORIES.map(category => {
          const categoryTemplates = getTemplatesByCategory(category.id);
          const selectedCount = categoryTemplates.filter(t => selectedTemplates.includes(t.id)).length;
          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category.id)}`}>
                    {category.name}
                  </span>
                  <span className="text-sm text-gray-400">
                    {selectedCount}/{categoryTemplates.length} selected
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-700">
                  {categoryTemplates.map(template => {
                    const isSelected = selectedTemplates.includes(template.id);
                    const isEditing = editingTemplate === template.id;

                    return (
                      <div
                        key={template.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-gray-700/50 border-gray-600'
                            : 'bg-gray-800 border-gray-700 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <button
                                onClick={() => toggleTemplate(template.id)}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-primary-500 border-primary-500'
                                    : 'border-gray-600 hover:border-gray-500'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </button>
                              <p className="font-medium text-gray-200">
                                "{template.objection_text}"
                              </p>
                              {template.frequency === 'very_common' && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">
                                  Common
                                </span>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="ml-8 space-y-2">
                                <textarea
                                  value={editedResponse}
                                  onChange={(e) => setEditedResponse(e.target.value)}
                                  rows={3}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm focus:ring-2 focus:ring-primary-500"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEdit(template.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white text-sm rounded transition-colors hover:bg-primary-700"
                                  >
                                    <Check className="w-3 h-3" />
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded transition-colors hover:bg-gray-600"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="ml-8">
                                <p className="text-sm text-gray-400">
                                  {template.customResponse || template.default_response}
                                </p>
                                {template.customResponse && (
                                  <span className="text-xs text-primary-400 mt-1 inline-block">
                                    (Customized)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {isSelected && !isEditing && (
                            <button
                              onClick={() => startEditing(template)}
                              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Objections */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-200">Custom Objections</h4>
            <button
              onClick={() => setShowAddCustom(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {customObjections.length === 0 && !showAddCustom && (
            <p className="text-sm text-gray-500 text-center py-4">
              No custom objections added yet
            </p>
          )}

          {customObjections.map(objection => (
            <div key={objection.id} className="p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(objection.category)}`}>
                    {OBJECTION_CATEGORIES.find(c => c.id === objection.category)?.name}
                  </span>
                  <p className="font-medium text-gray-200 mt-2">"{objection.text}"</p>
                  <p className="text-sm text-gray-400 mt-1">{objection.response}</p>
                </div>
                <button
                  onClick={() => removeCustomObjection(objection.id)}
                  className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {showAddCustom && (
            <div className="p-4 bg-gray-700/50 rounded-lg space-y-3">
              <select
                value={newObjection.category}
                onChange={(e) => setNewObjection({ ...newObjection, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
              >
                {OBJECTION_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newObjection.text}
                onChange={(e) => setNewObjection({ ...newObjection, text: e.target.value })}
                placeholder="What the customer says..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
              />
              <textarea
                value={newObjection.response}
                onChange={(e) => setNewObjection({ ...newObjection, response: e.target.value })}
                placeholder="Recommended response..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={addCustomObjection}
                  disabled={!newObjection.text || !newObjection.response}
                  className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white text-sm rounded transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddCustom(false);
                    setNewObjection({ category: 'price', text: '', response: '' });
                  }}
                  className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded transition-colors hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
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
              Save & Continue
            </>
          )}
        </button>
      </div>
    </div>
  );
}
