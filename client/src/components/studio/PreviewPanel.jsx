import { useState } from 'react';
import { BarChart3, FileText, Target, BookOpen } from 'lucide-react';

const TABS = [
  { id: 'knowledge', label: 'Knowledge Graph', icon: BarChart3 },
  { id: 'scripts', label: 'Scripts', icon: FileText },
  { id: 'scenarios', label: 'Scenarios', icon: Target },
  { id: 'courses', label: 'Courses', icon: BookOpen },
];

export default function PreviewPanel({ activeTab, onTabChange, children, versions, activeVersion, onVersionChange }) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-foreground border-primary-500 bg-background/50'
                  : 'text-muted-foreground border-transparent hover:text-secondary-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
        {versions?.length > 0 && (
          <div className="ml-auto px-3">
            <select
              value={activeVersion || ''}
              onChange={e => onVersionChange(e.target.value)}
              className="bg-input text-secondary-foreground text-xs rounded px-2 py-1 border border-border"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} {v.status === 'published' ? '(live)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}
