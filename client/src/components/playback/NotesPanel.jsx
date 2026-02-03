import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

const NOTE_TYPES = [
  { value: 'personal', label: 'Personal Note', icon: StickyNote, color: 'blue' },
  { value: 'mistake', label: 'Mistake', icon: AlertCircle, color: 'red' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'green' },
  { value: 'question', label: 'Question', icon: HelpCircle, color: 'purple' },
  { value: 'objection', label: 'Objection', icon: FileText, color: 'yellow' }
];

export default function NotesPanel({
  sessionId,
  currentTime,
  notes = [],
  onNotesChange,
  onSeek,
  authFetch,
  className = ''
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [sortedNotes, setSortedNotes] = useState([]);

  useEffect(() => {
    // Sort notes by timestamp
    const sorted = [...notes].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    setSortedNotes(sorted);
  }, [notes]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;

    setSaving(true);
    try {
      const response = await authFetch(`/api/session-notes/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp_seconds: Math.round(currentTime),
          note_text: noteText.trim(),
          note_type: noteType
        })
      });

      if (response.ok) {
        const data = await response.json();
        onNotesChange?.([...notes, data.note]);
        setNoteText('');
        setNoteType('personal');
        setShowAddForm(false);
      } else {
        console.error('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async (noteId) => {
    if (!noteText.trim()) return;

    setSaving(true);
    try {
      const response = await authFetch(`/api/session-notes/${sessionId}/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_text: noteText.trim(),
          note_type: noteType
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedNotes = notes.map(n => n.id === noteId ? data.note : n);
        onNotesChange?.(updatedNotes);
        setEditingNoteId(null);
        setNoteText('');
        setNoteType('personal');
      }
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const response = await authFetch(`/api/session-notes/${sessionId}/${noteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedNotes = notes.filter(n => n.id !== noteId);
        onNotesChange?.(updatedNotes);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setNoteText(note.note_text);
    setNoteType(note.note_type);
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setNoteText('');
    setNoteType('personal');
  };

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getNoteTypeInfo = (type) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0];
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      red: 'text-red-400 bg-red-500/10 border-red-500/30',
      green: 'text-green-400 bg-green-500/10 border-green-500/30',
      yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">My Notes</h3>
          <p className="text-sm text-gray-400 mt-1">
            {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingNoteId(null);
            setNoteText('');
            setNoteType('personal');
          }}
          disabled={showAddForm}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {/* Add Note Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
            >
              <div className="space-y-3">
                {/* Type Selector */}
                <div className="flex flex-wrap gap-2">
                  {NOTE_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = noteType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setNoteType(type.value)}
                        className={`
                          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${isSelected ? getColorClasses(type.color) : 'text-gray-400 bg-gray-700 hover:bg-gray-600'}
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                {/* Text Input */}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write your note here..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                  rows={3}
                  autoFocus
                />

                {/* Timestamp Display */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>at {formatTimestamp(currentTime)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNoteText('');
                      setNoteType('personal');
                    }}
                    className="px-3 py-1.5 text-gray-400 hover:text-gray-300 rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Notes */}
        <AnimatePresence>
          {sortedNotes.map((note, index) => {
            const typeInfo = getNoteTypeInfo(note.note_type);
            const Icon = typeInfo.icon;
            const isEditing = editingNoteId === note.id;

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className={`
                  rounded-lg p-4 border transition-all
                  ${isEditing ? 'bg-gray-700 border-primary-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}
                `}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Type Selector */}
                    <div className="flex flex-wrap gap-2">
                      {NOTE_TYPES.map(type => {
                        const TypeIcon = type.icon;
                        const isSelected = noteType === type.value;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setNoteType(type.value)}
                            className={`
                              flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all
                              ${isSelected ? getColorClasses(type.color) : 'text-gray-400 bg-gray-700 hover:bg-gray-600'}
                            `}
                          >
                            <TypeIcon className="w-3 h-3" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                      rows={3}
                    />

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 text-gray-400 hover:text-gray-300 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={!noteText.trim() || saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Note Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getColorClasses(typeInfo.color)}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <button
                          onClick={() => onSeek?.(note.timestamp_seconds)}
                          className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                        >
                          {formatTimestamp(note.timestamp_seconds)}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(note)}
                          className="p-1.5 text-gray-400 hover:text-gray-300 rounded transition-colors"
                          aria-label="Edit note"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
                          aria-label="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {note.note_text}
                    </p>

                    {/* Timestamp */}
                    <div className="mt-2 text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()} at{' '}
                      {new Date(note.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sortedNotes.length === 0 && !showAddForm && (
          <div className="text-center py-12">
            <StickyNote className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No notes yet</p>
            <p className="text-gray-500 text-xs mt-1">
              Add notes at specific timestamps to remember key moments
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}
