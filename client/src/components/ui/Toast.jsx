import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Trophy } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const TOAST_ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  achievement: Trophy
};

const TOAST_COLORS = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
  achievement: 'text-purple-500'
};

function ToastItem({ toast, onDismiss }) {
  const Icon = TOAST_ICONS[toast.type] || Info;
  const iconColor = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-md shadow-lg px-4 py-3 flex items-center gap-3"
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-sm text-foreground">{toast.title}</p>
        )}
        {toast.message && (
          <p className={`text-sm text-foreground ${toast.title ? 'mt-0.5 opacity-80' : ''}`}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const { addToast } = useNotifications();

  return {
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
    achievement: (title, message, options = {}) => addToast({
      type: 'achievement',
      title,
      message,
      duration: 8000,
      ...options
    })
  };
}
