import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, ArrowRight, AlertTriangle } from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';

function UpgradeModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const {
    isTrialExpired,
    isHoursExhausted,
    trialDaysRemaining,
    hoursRemaining,
    isOnTrial
  } = useOrganization();

  const handleUpgrade = () => {
    onClose();
    navigate('/settings/billing');
  };

  // Determine the reason for showing the modal
  const isExpired = isTrialExpired;
  const noHours = isHoursExhausted;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isExpired ? 'bg-red-500/20' : 'bg-amber-500/20'
              }`}>
                {isExpired ? (
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                ) : (
                  <Clock className="w-8 h-8 text-amber-400" />
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              {isExpired
                ? 'Trial Period Ended'
                : noHours
                  ? 'Training Hours Exhausted'
                  : 'Upgrade Your Plan'}
            </h2>

            {/* Description */}
            <p className="text-gray-400 text-center mb-6">
              {isExpired
                ? 'Your free trial has ended. Upgrade now to continue training your team with AI-powered practice calls.'
                : noHours
                  ? "You've used all your training hours for this period. Upgrade your plan or purchase additional hours to continue."
                  : 'Get more training hours and unlock advanced features for your team.'}
            </p>

            {/* Stats */}
            {isOnTrial && !isExpired && (
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-400">Trial Days Left</p>
                    <p className="text-2xl font-bold text-white">{trialDaysRemaining}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Hours Remaining</p>
                    <p className="text-2xl font-bold text-white">{hoursRemaining.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <Zap className="w-5 h-5 text-primary-400" />
                <span>Up to 25 training hours per month</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Zap className="w-5 h-5 text-primary-400" />
                <span>Unlimited team members on Enterprise</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Zap className="w-5 h-5 text-primary-400" />
                <span>Advanced analytics & custom scenarios</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpgrade}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                View Plans & Upgrade
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition-colors"
              >
                Maybe Later
              </button>
            </div>

            {/* Help text */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Questions? Contact us at support@selleverycall.com
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default UpgradeModal;
