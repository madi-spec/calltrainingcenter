import { Plus, Sparkles, Upload } from 'lucide-react';

const STATUS_INDICATORS = {
  not_started: '',
  interviewing: '●',
  ready: '✓',
  generating: '⚡',
  generated: '✅',
  published: '🚀',
};

const STATUS_COLORS = {
  not_started: 'text-gray-500',
  interviewing: 'text-blue-400',
  ready: 'text-yellow-400',
  generating: 'text-purple-400',
  generated: 'text-green-400',
  published: 'text-green-300',
};

export default function TopicBar({ topics, activeTopic, onSelectTopic, onAddTopic, onGenerate, onPublish, onMarkReady }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-700 overflow-x-auto">
      {/* General thread */}
      <button
        onClick={() => onSelectTopic(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
          activeTopic === null
            ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
        }`}
      >
        📊 General
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Topic threads */}
      {topics.map(topic => {
        const isActive = activeTopic === topic.id;
        const indicator = STATUS_INDICATORS[topic.status] || '';
        const indicatorColor = STATUS_COLORS[topic.status] || 'text-gray-500';

        return (
          <div key={topic.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelectTopic(topic.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{topic.icon || '📝'}</span>
              <span>{topic.name}</span>
              {indicator && <span className={`text-[10px] ${indicatorColor}`}>{indicator}</span>}
            </button>

            {/* Action buttons based on status */}
            {isActive && topic.status === 'interviewing' && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkReady?.(topic.id); }}
                className="px-2 py-1 rounded text-[10px] font-medium bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors whitespace-nowrap"
                title="Mark ready for generation"
              >
                Ready
              </button>
            )}
            {isActive && topic.status === 'ready' && (
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate?.(topic.id); }}
                className="px-2 py-1 rounded text-[10px] font-medium bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors whitespace-nowrap"
                title="Generate training content"
              >
                Generate
              </button>
            )}
            {isActive && topic.status === 'generated' && (
              <button
                onClick={(e) => { e.stopPropagation(); onPublish?.(topic.id, topic.generated_version_id); }}
                className="px-2 py-1 rounded text-[10px] font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors whitespace-nowrap"
                title="Publish to live training"
              >
                Publish
              </button>
            )}
            {isActive && topic.status === 'generating' && (
              <span className="px-2 py-1 text-[10px] text-purple-400 animate-pulse whitespace-nowrap">Generating...</span>
            )}
          </div>
        );
      })}

      {/* Add topic button */}
      <button
        onClick={onAddTopic}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors whitespace-nowrap"
      >
        <Plus className="w-3 h-3" />
        Add Topic
      </button>
    </div>
  );
}
