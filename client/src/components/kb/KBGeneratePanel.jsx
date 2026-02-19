import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function KBGeneratePanel({ authFetch, uploadId, onComplete, onError }) {
  const [generating, setGenerating] = useState(false);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const generate = async () => {
      setGenerating(true);
      setError(null);

      try {
        const response = await authFetch(`/api/knowledge-base/${uploadId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Generation failed');
        }

        setLog(result.generation_log || []);
        setSummary(result.summary);
        setDone(true);
        onComplete();
      } catch (err) {
        setError(err.message);
        onError?.(err.message);

        // Try to fetch the log from status
        try {
          const statusRes = await authFetch(`/api/knowledge-base/${uploadId}/status`);
          const statusResult = await statusRes.json();
          if (statusResult.upload?.generation_log) {
            setLog(statusResult.upload.generation_log);
          }
        } catch {}
      } finally {
        setGenerating(false);
      }
    };

    generate();
  }, [authFetch, uploadId, onComplete, onError]);

  const stepIcon = (status) => {
    if (status === 'done') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
      <div className="flex items-center gap-3">
        {generating ? (
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        ) : done ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-400" />
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-100">
            {generating ? 'Generating Training Content...' : done ? 'Generation Complete' : 'Generation Failed'}
          </h2>
          <p className="text-gray-400 text-sm">
            {generating
              ? 'Writing to database tables...'
              : done
                ? 'All content has been created successfully.'
                : error
            }
          </p>
        </div>
      </div>

      {/* Step log */}
      <div className="space-y-2">
        {log.map((entry, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            {stepIcon(entry.status)}
            <div className="flex-1">
              <span className="text-gray-200 font-medium capitalize">{entry.step.replace(/_/g, ' ')}</span>
              <span className="text-gray-500 ml-2">{entry.detail}</span>
            </div>
          </div>
        ))}

        {generating && log.length === 0 && (
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Starting generation...
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{summary.packages}</p>
            <p className="text-gray-400 text-xs">Packages</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{summary.guidelines}</p>
            <p className="text-gray-400 text-xs">Guidelines</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{summary.courses}</p>
            <p className="text-gray-400 text-xs">Courses</p>
          </div>
        </div>
      )}

      {error && !generating && (
        <button
          onClick={() => {
            started.current = false;
            setError(null);
            setLog([]);
            // Re-trigger
            window.location.reload();
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Retry Generation
        </button>
      )}
    </div>
  );
}
