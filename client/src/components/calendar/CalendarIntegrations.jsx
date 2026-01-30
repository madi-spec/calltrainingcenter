import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function IntegrationCard({ integration, onDisconnect }) {
  const getProviderIcon = (provider) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z"/>
            <path fill="#00A4EF" d="M13 1h10v10H13z"/>
            <path fill="#7FBA00" d="M1 13h10v10H1z"/>
            <path fill="#FFB900" d="M13 13h10v10H13z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'expired': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        {getProviderIcon(integration.provider)}
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white capitalize">
              {integration.provider} Calendar
            </h4>
            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(integration.status)}`}>
              {integration.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {integration.provider_email}
          </p>
          {integration.last_sync_at && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last synced: {new Date(integration.last_sync_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDisconnect(integration.id)}
        className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

function CalendarIntegrations() {
  const { getAuthHeader } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/calendar/integrations`, { headers });

      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = async (provider) => {
    setConnecting(provider);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/calendar/${provider}/auth-url`, { headers });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!confirm('Are you sure you want to disconnect this calendar?')) return;

    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/calendar/integrations/${integrationId}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setIntegrations(integrations.filter(i => i.id !== integrationId));
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const hasGoogle = integrations.some(i => i.provider === 'google');

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Calendar Integrations
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your calendar to schedule and sync training sessions.
        </p>
      </div>

      {/* Connected integrations */}
      {integrations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connected Calendars
          </h4>
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* Available connections */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {integrations.length > 0 ? 'Add Another Calendar' : 'Connect a Calendar'}
        </h4>

        {!hasGoogle && (
          <button
            onClick={() => handleConnect('google')}
            disabled={connecting === 'google'}
            className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-900 dark:text-white">
              {connecting === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
            </span>
          </button>
        )}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          When you connect a calendar, you can:
        </p>
        <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li>- Schedule training sessions directly to your calendar</li>
          <li>- Get reminders before scheduled training</li>
          <li>- See your training schedule alongside other events</li>
        </ul>
      </div>
    </div>
  );
}

export default CalendarIntegrations;
