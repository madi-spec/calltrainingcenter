import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

      // Upload files directly to Supabase Storage (bypasses Vercel 4.5MB body limit)
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const uploadedFiles = [];

      for (const file of Array.from(files)) {
        const storagePath = `${sessionId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('studio-documents')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError.message);
          continue;
        }

        uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          storagePath
        });
      }

      if (uploadedFiles.length === 0) {
        throw new Error('No files could be uploaded');
      }

      // Show upload message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'user',
        content: `Uploaded ${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}: ${uploadedFiles.map(f => f.name).join(', ')}`,
        message_type: 'upload',
        created_at: new Date().toISOString()
      }]);

      // Tell the API to process the uploaded files
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files: uploadedFiles })
      });

      if (!res.ok) throw new Error('Processing failed');
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
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Upload failed: ${error.message}. Please try again.`,
        message_type: 'chat',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getToken]);

  return { messages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles, setCoverageStats };
}
