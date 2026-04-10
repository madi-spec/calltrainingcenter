import { FileText, Upload, Sparkles, MessageSquare } from 'lucide-react';

const TYPE_ICONS = {
  chat: MessageSquare,
  upload: Upload,
  generation: Sparkles,
  feedback: MessageSquare,
};

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const Icon = TYPE_ICONS[message.message_type] || MessageSquare;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600/20 text-white rounded-tr-none'
            : 'bg-gray-800 text-gray-200 rounded-tl-none'
        }`}
      >
        {!isUser && message.message_type !== 'chat' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <Icon className="w-3 h-3" />
            {message.message_type === 'generation' ? 'Generation Complete' : message.message_type}
          </div>
        )}
        <div className="whitespace-pre-wrap">
          {message.content.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      </div>
    </div>
  );
}
