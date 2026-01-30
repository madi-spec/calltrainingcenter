import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useOffline from '../hooks/useOffline';

const OfflineContext = createContext(null);

// Simple IndexedDB wrapper for offline data
const DB_NAME = 'csr-training-offline';
const DB_VERSION = 1;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for cached scenarios
      if (!db.objectStoreNames.contains('scenarios')) {
        db.createObjectStore('scenarios', { keyPath: 'id' });
      }

      // Store for pending actions (sync queue)
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }

      // Store for user data cache
      if (!db.objectStoreNames.contains('userData')) {
        db.createObjectStore('userData', { keyPath: 'key' });
      }
    };
  });
}

export function OfflineProvider({ children }) {
  const { isOffline, isOnline, wasOffline } = useOffline();
  const [pendingActions, setPendingActions] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  // Cache data for offline use
  const cacheData = useCallback(async (store, key, data) => {
    try {
      const db = await openDB();
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);

      await new Promise((resolve, reject) => {
        const request = objectStore.put({ ...data, key, cachedAt: Date.now() });
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });

      db.close();
      return true;
    } catch (error) {
      console.error('Error caching data:', error);
      return false;
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(async (store, key) => {
    try {
      const db = await openDB();
      const tx = db.transaction(store, 'readonly');
      const objectStore = tx.objectStore(store);

      const data = await new Promise((resolve, reject) => {
        const request = objectStore.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }, []);

  // Queue an action for sync when back online
  const queueAction = useCallback(async (action) => {
    try {
      const db = await openDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');

      await new Promise((resolve, reject) => {
        const request = store.add({
          ...action,
          timestamp: Date.now(),
          status: 'pending'
        });
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });

      db.close();
      setPendingActions((prev) => prev + 1);
      return true;
    } catch (error) {
      console.error('Error queueing action:', error);
      return false;
    }
  }, []);

  // Get pending actions count
  const getPendingCount = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');

      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();
      return count;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  }, []);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (isSyncing || isOffline) return;

    setIsSyncing(true);

    try {
      const db = await openDB();
      const tx = db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');

      const actions = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      // Process each action
      for (const action of actions) {
        try {
          // Execute the action
          const response = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body ? JSON.stringify(action.body) : undefined
          });

          if (response.ok) {
            // Remove from queue
            const db2 = await openDB();
            const tx2 = db2.transaction('syncQueue', 'readwrite');
            const store2 = tx2.objectStore('syncQueue');
            store2.delete(action.id);
            db2.close();
          }
        } catch (error) {
          console.error('Error syncing action:', error);
        }
      }

      setLastSyncAt(new Date());
      const remaining = await getPendingCount();
      setPendingActions(remaining);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOffline, getPendingCount]);

  // Listen for back-online event
  useEffect(() => {
    const handleBackOnline = () => {
      syncPendingActions();
    };

    window.addEventListener('app:back-online', handleBackOnline);
    return () => window.removeEventListener('app:back-online', handleBackOnline);
  }, [syncPendingActions]);

  // Load pending count on mount
  useEffect(() => {
    getPendingCount().then(setPendingActions);
  }, [getPendingCount]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      await indexedDB.deleteDatabase(DB_NAME);
      setPendingActions(0);
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }, []);

  const value = {
    isOffline,
    isOnline,
    wasOffline,
    pendingActions,
    isSyncing,
    lastSyncAt,
    cacheData,
    getCachedData,
    queueAction,
    syncPendingActions,
    clearCache
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOfflineContext() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineContext;
