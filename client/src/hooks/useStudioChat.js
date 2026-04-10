import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useStudioChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coverageStats, setCoverageStats] = useState(null);
  const { getToken } = useAuth();
  const abortRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [sessionId, getToken]);

  const sendMessage = useCallback(async (text) => {
    if (!sessionId || !text.trim()) return;
    setLoading(true);

    const userMsg = { id: Date.now(), role: 'user', content: text, message_type: 'chat', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.message,
        message_type: 'chat',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.coverageStats) setCoverageStats(data.coverageStats);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        message_type: 'chat',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken]);

  const uploadFiles = useCallback(async (files) => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const token = await getToken();
      const fileData = await Promise.all(
        Array.from(files).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          return { name: file.name, type: file.type, size: file.size, data: base64 };
        })
      );

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'user',
        content: `Uploaded ${fileData.length} file${fileData.length !== 1 ? 's' : ''}: ${fileData.map(f => f.name).join(', ')}`,
        message_type: 'upload',
        created_at: new Date().toISOString()
      }]);

      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: fileData })
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if (data.message) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.message,
          message_type: 'chat',
          created_at: new Date().toISOString()
        }]);
      }

      if (data.coverageStats) setCoverageStats(data.coverageStats);
      return data;
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken]);

  return { messages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles, setCoverageStats };
}
