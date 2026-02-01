import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

function DemoVideoModal({ isOpen, onClose }) {
  const videoRef = useRef(null);
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Pause video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  // Handle click outside
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-5xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Video container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
              <video
                ref={videoRef}
                src="/demo-video.mp4"
                controls
                autoPlay
                className="w-full aspect-video"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* CTA below video */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center"
            >
              <a
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40"
              >
                Start Your Free Trial
              </a>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DemoVideoModal;
