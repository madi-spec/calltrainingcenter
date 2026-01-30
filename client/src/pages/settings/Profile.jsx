import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Bell,
  Save,
  RotateCcw,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BadgeShowcase } from '../../components/gamification';

export default function Profile() {
  const { profile, authFetch } = useAuth();
  const notifications = useNotifications();
  const showSuccess = notifications?.showSuccess || (() => {});
  const showError = notifications?.showError || (() => {});

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    notification_preferences: {
      email_assignments: true,
      email_reminders: true,
      email_achievements: true,
      in_app_all: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        notification_preferences: profile.preferences?.notifications || formData.notification_preferences
      });
    }
  }, [profile]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNotificationChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          preferences: {
            notifications: formData.notification_preferences
          }
        })
      });

      if (response.ok) {
        showSuccess('Profile Updated', 'Your preferences have been saved');
        setHasChanges(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      showError('Error', error.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || '',
        notification_preferences: profile.preferences?.notifications || {
          email_assignments: true,
          email_reminders: true,
          email_achievements: true,
          in_app_all: true
        }
      });
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">User Preferences</h1>
          <p className="text-gray-400 mt-1">
            Manage your personal settings and notification preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-medium rounded-lg transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Profile Information</h2>
            <p className="text-sm text-gray-400">Your basic profile details</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-400">{formData.email}</span>
              <span className="text-xs text-gray-500">(managed by auth provider)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Bell className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Notification Preferences</h2>
            <p className="text-sm text-gray-400">Configure how you receive notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300">Email Notifications</h3>

          {[
            { key: 'email_assignments', label: 'New Assignments', description: 'Get notified when you receive new training assignments' },
            { key: 'email_reminders', label: 'Due Date Reminders', description: 'Receive reminders before assignment due dates' },
            { key: 'email_achievements', label: 'Achievements', description: 'Celebrate when you earn badges and reach milestones' }
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
              <div>
                <p className="font-medium text-gray-100">{pref.label}</p>
                <p className="text-sm text-gray-400">{pref.description}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(pref.key, !formData.notification_preferences[pref.key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.notification_preferences[pref.key] ? 'bg-primary-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.notification_preferences[pref.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}

          <h3 className="text-sm font-medium text-gray-300 mt-6">In-App Notifications</h3>

          <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
            <div>
              <p className="font-medium text-gray-100">All In-App Notifications</p>
              <p className="text-sm text-gray-400">Show toast notifications for all events</p>
            </div>
            <button
              onClick={() => handleNotificationChange('in_app_all', !formData.notification_preferences.in_app_all)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.notification_preferences.in_app_all ? 'bg-primary-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.notification_preferences.in_app_all ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Badge Showcase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Award className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Your Achievements</h2>
            <p className="text-sm text-gray-400">Badges and achievements you've earned</p>
          </div>
        </div>

        <BadgeShowcase maxDisplay={8} />
      </motion.div>
    </div>
  );
}
