import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import ShortcutHint from '../ui/ShortcutHint';

/**
 * Modal displaying all available keyboard shortcuts
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = {
    navigation: [
      { keys: ['g', 'h'], description: 'Go to Home/Scenarios' },
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'l'], description: 'Go to Leaderboard' },
      { keys: ['g', 'c'], description: 'Go to Courses' },
      { keys: ['g', 'a'], description: 'Go to Assignments' },
      { keys: ['g', 's'], description: 'Go to Settings' },
      { keys: ['g', 'f'], description: 'Go to Favorites' }
    ],
    global: [
      { keys: ['?'], description: 'Show this help' },
      { keys: ['Esc'], description: 'Close modal/dialog' }
    ],
    training: [
      { keys: ['Space'], description: 'Toggle mute during call' },
      { keys: ['Esc'], description: 'End call (with confirmation)' }
    ],
    preCall: [
      { keys: ['Ctrl', 'Enter'], description: 'Start training session' }
    ]
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Keyboard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Keyboard Shortcuts</h2>
                <p className="text-sm text-muted-foreground">Speed up your workflow</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Navigation */}
              <ShortcutSection title="Navigation" shortcuts={shortcuts.navigation} />

              {/* Global */}
              <ShortcutSection title="Global" shortcuts={shortcuts.global} />

              {/* Training */}
              <ShortcutSection title="During Training" shortcuts={shortcuts.training} />

              {/* Pre-Call */}
              <ShortcutSection title="Before Training" shortcuts={shortcuts.preCall} />
            </div>

            {/* Tip */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-blue-300">
                <strong>Tip:</strong> Navigation shortcuts use a two-key sequence.
                Press <ShortcutHint keys="g" className="mx-1" /> first, then the destination key within 1 second.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ShortcutSection({ title, shortcuts }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted transition-colors"
          >
            <span className="text-foreground text-sm">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && i < shortcut.keys.length - 1 && shortcut.keys.length > 2 && (
                    <span className="text-muted-foreground mx-1">then</span>
                  )}
                  {i > 0 && shortcut.keys.length <= 2 && (
                    <span className="text-muted-foreground mx-1">+</span>
                  )}
                  <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded text-secondary-foreground min-w-[1.75rem] text-center">
                    {key}
                  </kbd>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
