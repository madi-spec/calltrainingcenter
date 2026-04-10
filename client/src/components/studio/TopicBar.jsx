import { Plus } from 'lucide-react';

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

export default function TopicBar({ topics, activeTopic, onSelectTopic, onAddTopic }) {
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
          <button
            key={topic.id}
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
