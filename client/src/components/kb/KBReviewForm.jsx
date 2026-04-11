import { useState, useCallback } from 'react';
import { Save, Sparkles } from 'lucide-react';
import PackagesTab from './PackagesTab';
import GuidelinesTab from './GuidelinesTab';
import CoursesTab from './CoursesTab';

const TABS = [
  { id: 'packages', label: 'Packages' },
  { id: 'guidelines', label: 'Guidelines' },
  { id: 'courses', label: 'Courses & Scenarios' }
];

export default function KBReviewForm({ parsedData, onSave, onGenerate }) {
  const [activeTab, setActiveTab] = useState('packages');
  const [data, setData] = useState(parsedData);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = useCallback((section, newValue) => {
    setData(prev => ({ ...prev, [section]: newValue }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  const handleGenerate = () => {
    setShowConfirm(true);
  };

  const confirmGenerate = async () => {
    await onSave(data);
    setShowConfirm(false);
    onGenerate();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-400 border-b-2 border-primary-500 bg-muted/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.id === 'packages' && data.packages?.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                  {data.packages.length}
                </span>
              )}
              {tab.id === 'guidelines' && data.guidelines?.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                  {data.guidelines.length}
                </span>
              )}
              {tab.id === 'courses' && data.courses?.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                  {data.courses.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'packages' && (
            <PackagesTab
              packages={data.packages || []}
              onChange={(pkgs) => handleChange('packages', pkgs)}
            />
          )}
          {activeTab === 'guidelines' && (
            <GuidelinesTab
              guidelines={data.guidelines || []}
              onChange={(gs) => handleChange('guidelines', gs)}
            />
          )}
          {activeTab === 'courses' && (
            <CoursesTab
              courses={data.courses || []}
              onChange={(cs) => handleChange('courses', cs)}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleGenerate}
          className="flex-1 px-4 py-3 bg-foreground text-background hover:opacity-90 rounded-md transition-opacity flex items-center justify-center gap-2 font-medium"
        >
          <Sparkles className="w-5 h-5" />
          Generate Training Content
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full border border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Confirm Generation</h3>
            <p className="text-muted-foreground text-sm">
              This will <span className="text-yellow-400 font-medium">replace all existing</span> packages,
              guidelines, courses, and scenarios for your organization.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmGenerate}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground hover:opacity-90 rounded-md transition-opacity"
              >
                Replace & Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
