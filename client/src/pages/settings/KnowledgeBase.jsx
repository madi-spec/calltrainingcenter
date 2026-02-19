import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import KBUploader from '../../components/kb/KBUploader';
import KBParsingProgress from '../../components/kb/KBParsingProgress';
import KBReviewForm from '../../components/kb/KBReviewForm';
import KBGeneratePanel from '../../components/kb/KBGeneratePanel';

const STATES = {
  UPLOAD: 'upload',
  PARSING: 'parsing',
  REVIEW: 'review',
  GENERATE: 'generate',
  COMPLETE: 'complete'
};

export default function KnowledgeBase() {
  const { authFetch } = useAuth();
  const [state, setState] = useState(STATES.UPLOAD);
  const [uploadId, setUploadId] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState(null);

  const handleUploadComplete = useCallback((id, chunks) => {
    setUploadId(id);
    setTotalChunks(chunks);
    setState(STATES.PARSING);
    setError(null);
  }, []);

  const handleParseComplete = useCallback((data) => {
    setParsedData(data);
    setState(STATES.REVIEW);
  }, []);

  const handleReviewSave = useCallback(async (data) => {
    setParsedData(data);
    try {
      await authFetch(`/api/knowledge-base/${uploadId}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_data: data })
      });
    } catch (err) {
      console.error('Save error:', err);
    }
  }, [authFetch, uploadId]);

  const handleStartGenerate = useCallback(() => {
    setState(STATES.GENERATE);
  }, []);

  const handleGenerateComplete = useCallback(() => {
    setState(STATES.COMPLETE);
  }, []);

  const handleReset = useCallback(() => {
    setState(STATES.UPLOAD);
    setUploadId(null);
    setParsedData(null);
    setTotalChunks(0);
    setError(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Knowledge Base</h1>
          <p className="text-gray-400 mt-1">
            Upload training documents to auto-generate courses, packages, and scenarios
          </p>
        </div>
      </div>

      {/* State machine steps */}
      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Parse', 'Review', 'Generate'].map((step, i) => {
          const stepKeys = [STATES.UPLOAD, STATES.PARSING, STATES.REVIEW, STATES.GENERATE];
          const currentIdx = stepKeys.indexOf(state);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx || state === STATES.COMPLETE;

          return (
            <div key={step} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-green-500' : 'bg-gray-700'}`} />}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isActive ? 'bg-primary-500/20 text-primary-400 ring-1 ring-primary-500/30' :
                isDone ? 'bg-green-500/20 text-green-400' :
                'bg-gray-800 text-gray-500'
              }`}>
                {isDone && !isActive ? '✓ ' : ''}{step}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <motion.div
        key={state}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {state === STATES.UPLOAD && (
          <KBUploader
            authFetch={authFetch}
            onUploadComplete={handleUploadComplete}
            onError={setError}
          />
        )}

        {state === STATES.PARSING && uploadId && (
          <KBParsingProgress
            authFetch={authFetch}
            uploadId={uploadId}
            totalChunks={totalChunks}
            onComplete={handleParseComplete}
            onError={setError}
          />
        )}

        {state === STATES.REVIEW && parsedData && (
          <KBReviewForm
            parsedData={parsedData}
            onSave={handleReviewSave}
            onGenerate={handleStartGenerate}
          />
        )}

        {state === STATES.GENERATE && uploadId && (
          <KBGeneratePanel
            authFetch={authFetch}
            uploadId={uploadId}
            onComplete={handleGenerateComplete}
            onError={setError}
          />
        )}

        {state === STATES.COMPLETE && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <Database className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-100">Generation Complete</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Your training content has been generated. Visit Courses to see the new content, or upload more documents.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/courses"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                View Courses
              </Link>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Upload More
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
