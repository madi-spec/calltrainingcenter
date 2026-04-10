import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Link, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';

export default function ChatPanel({ messages, loading, onSendMessage, onUploadFiles }) {
  const [input, setInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileChange(e) {
    if (e.target.files?.length) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      onUploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-900 border-r border-gray-700"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm">
          🧠
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Training Designer AI</div>
          <div className="text-xs text-green-400">Online</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm font-medium text-gray-400">Welcome to Content Studio</p>
            <p className="text-xs mt-2">Upload documents using the 📎 button below</p>
            <p className="text-xs mt-1">or type a message to start the conversation</p>
            <p className="text-xs mt-3 text-gray-600">Try: "What do you know about my company?" or upload a PDF, DOCX, or spreadsheet</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={msg.id || i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-4 py-3 rounded-tl-none">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 pr-20 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-gray-500"
              style={{ minHeight: '38px', maxHeight: '120px' }}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Upload files"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
