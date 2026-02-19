import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function KBParsingProgress({ authFetch, uploadId, totalChunks, onComplete, onError }) {
  const [parsedChunks, setParsedChunks] = useState(0);
  const [synthesizing, setSynthesizing] = useState(false);
  const [counts, setCounts] = useState({ packages: 0, guidelines: 0, training_topics: 0 });
  const [chunkError, setChunkError] = useState(null);
  const parsingRef = useRef(false);

  const parseNextChunk = useCallback(async () => {
    if (parsingRef.current) return;
    parsingRef.current = true;

    try {
      const response = await authFetch(`/api/knowledge-base/${uploadId}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Parse failed');
      }

      if (result.complete) {
        setSynthesizing(false);
        onComplete(result.parsed_data);
        return;
      }

      // Update progress
      setParsedChunks(result.progress.parsed_chunks);
      if (result.chunkResult) {
        setCounts(prev => ({
          packages: prev.packages + (result.chunkResult.packages || 0),
          guidelines: prev.guidelines + (result.chunkResult.guidelines || 0),
          training_topics: prev.training_topics + (result.chunkResult.training_topics || 0)
        }));
      }

      // Check if all chunks parsed — next call will trigger synthesis
      if (result.progress.parsed_chunks >= totalChunks) {
        setSynthesizing(true);
      }

      parsingRef.current = false;
      // Continue parsing
      setTimeout(() => parseNextChunk(), 500);
    } catch (err) {
      setChunkError(err.message);
      onError?.(err.message);
      parsingRef.current = false;
    }
  }, [authFetch, uploadId, totalChunks, onComplete, onError]);

  useEffect(() => {
    parseNextChunk();
    return () => { parsingRef.current = true; }; // cancel on unmount
  }, [parseNextChunk]);

  const progress = totalChunks > 0 ? (parsedChunks / totalChunks) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
      <div className="flex items-center gap-3">
        {chunkError ? (
          <AlertCircle className="w-6 h-6 text-red-400" />
        ) : (
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            {chunkError ? 'Parsing Failed' : synthesizing ? 'Synthesizing Results...' : 'Parsing Documents...'}
          </h2>
          <p className="text-gray-400 text-sm">
            {chunkError
              ? chunkError
              : synthesizing
                ? 'Organizing extracted data into courses and scenarios...'
                : `Processing chunk ${parsedChunks + 1} of ${totalChunks}`
            }
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {!chunkError && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{synthesizing ? 'Synthesizing...' : `Chunk ${parsedChunks} / ${totalChunks}`}</span>
            <span>{synthesizing ? '100%' : `${Math.round(progress)}%`}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                synthesizing ? 'bg-yellow-500 animate-pulse' : 'bg-primary-500'
              }`}
              style={{ width: synthesizing ? '100%' : `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Extraction counts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Packages', count: counts.packages, color: 'text-blue-400' },
          { label: 'Guidelines', count: counts.guidelines, color: 'text-green-400' },
          { label: 'Topics', count: counts.training_topics, color: 'text-purple-400' }
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-gray-700/50 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-gray-400 text-xs">{label} Found</p>
          </div>
        ))}
      </div>

      {chunkError && (
        <button
          onClick={() => {
            setChunkError(null);
            parsingRef.current = false;
            parseNextChunk();
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
