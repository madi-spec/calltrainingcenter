import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Save,
  RotateCcw,
  Check,
  Trash2,
  ChevronRight,
  Trophy,
  ClipboardList,
  AlertCircle,
  Users,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Notifications() {
  const { profile, authFetch } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, showSuccess, showError } = useNotifications();

  const [settings, setSettings] = useState({
    // Email notifications
    email_assignments: true,
    email_reminders: true,
    email_achievements: true,
    email_team_updates: true,
    email_weekly_digest: false,

    // In-app notifications
    in_app_all: true,
    in_app_achievements: true,
    in_app_assignments: true,
    in_app_reminders: true,

    // Timing preferences
    reminder_days_before: 2,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    if (profile?.preferences?.notifications) {
      setSettings(prev => ({
        ...prev,
        ...profile.preferences.notifications
      }));
    }
  }, [profile]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            notifications: settings
          }
        })
      });

      if (response.ok) {
        showSuccess('Settings Saved', 'Your notification preferences have been updated');
        setHasChanges(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      showError('Error', error.message || 'Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (profile?.preferences?.notifications) {
      setSettings(prev => ({
        ...prev,
        ...profile.preferences.notifications
      }));
    }
    setHasChanges(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 'assignment':
        return <ClipboardList className="w-5 h-5 text-blue-400" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'team':
        return <Users className="w-5 h-5 text-purple-400" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const ToggleSwitch = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Notifications</h1>
          <p className="text-gray-400 mt-1">
            Manage how and when you receive notifications
          </p>
        </div>
        {activeTab === 'settings' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'settings'
              ? 'text-primary-400 border-primary-400'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'inbox'
              ? 'text-primary-400 border-primary-400'
              : 'text-gray-400 border-transparent hover:text-gray-300'
          }`}
        >
          Inbox
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="space-y-6">
          {/* Email Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Email Notifications</h2>
                <p className="text-sm text-gray-400">Choose which emails you want to receive</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { key: 'email_assignments', label: 'New Assignments', description: 'When you receive new training assignments', icon: ClipboardList },
                { key: 'email_reminders', label: 'Due Date Reminders', description: 'Reminders before assignment deadlines', icon: Clock },
                { key: 'email_achievements', label: 'Achievements', description: 'When you earn badges or complete milestones', icon: Trophy },
                { key: 'email_team_updates', label: 'Team Updates', description: 'Updates about your team\'s progress (managers only)', icon: Users },
                { key: 'email_weekly_digest', label: 'Weekly Digest', description: 'A summary of your weekly training activity', icon: Zap }
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-100">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={settings[item.key]}
                    onChange={(value) => handleSettingChange(item.key, value)}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* In-App Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">In-App Notifications</h2>
                <p className="text-sm text-gray-400">Configure toast notifications within the app</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <p className="font-medium text-gray-100">Enable All In-App Notifications</p>
                  <p className="text-sm text-gray-400">Master toggle for all in-app notifications</p>
                </div>
                <ToggleSwitch
                  enabled={settings.in_app_all}
                  onChange={(value) => handleSettingChange('in_app_all', value)}
                />
              </div>

              {settings.in_app_all && (
                <div className="ml-4 space-y-3 border-l-2 border-gray-700 pl-4">
                  {[
                    { key: 'in_app_achievements', label: 'Achievement notifications' },
                    { key: 'in_app_assignments', label: 'Assignment notifications' },
                    { key: 'in_app_reminders', label: 'Reminder notifications' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <p className="text-gray-300">{item.label}</p>
                      <ToggleSwitch
                        enabled={settings[item.key]}
                        onChange={(value) => handleSettingChange(item.key, value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Timing Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Timing Preferences</h2>
                <p className="text-sm text-gray-400">Control when you receive notifications</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-750 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-100">Reminder Timing</p>
                    <p className="text-sm text-gray-400">How many days before due date to send reminders</p>
                  </div>
                </div>
                <select
                  value={settings.reminder_days_before}
                  onChange={(e) => handleSettingChange('reminder_days_before', parseInt(e.target.value))}
                  className="w-full md:w-48 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>1 day before</option>
                  <option value={2}>2 days before</option>
                  <option value={3}>3 days before</option>
                  <option value={5}>5 days before</option>
                  <option value={7}>1 week before</option>
                </select>
              </div>

              <div className="p-4 bg-gray-750 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-100">Quiet Hours</p>
                    <p className="text-sm text-gray-400">Pause notifications during specific hours</p>
                  </div>
                  <ToggleSwitch
                    enabled={settings.quiet_hours_enabled}
                    onChange={(value) => handleSettingChange('quiet_hours_enabled', value)}
                  />
                </div>

                {settings.quiet_hours_enabled && (
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">From</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_start}
                        onChange={(e) => handleSettingChange('quiet_hours_start', e.target.value)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">To</label>
                      <input
                        type="time"
                        value={settings.quiet_hours_end}
                        onChange={(e) => handleSettingChange('quiet_hours_end', e.target.value)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Inbox Tab */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
        >
          {/* Inbox Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="font-semibold text-gray-100">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
              >
                <Check className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="divide-y divide-gray-700">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notifications yet</p>
                <p className="text-sm text-gray-500 mt-1">You'll see notifications here when you receive them</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-750 transition-colors ${
                    !notification.read_at ? 'bg-gray-750/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${!notification.read_at ? 'text-gray-100' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-400 mt-0.5">{notification.message}</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {!notification.read_at && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
