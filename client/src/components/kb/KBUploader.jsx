import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};
const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024;

export default function KBUploader({ authFetch, onUploadComplete, onError }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((newFiles) => {
    const valid = [];
    for (const file of newFiles) {
      if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
        onError?.(`Unsupported file type: ${file.name}. Use PDF, DOCX, or TXT.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        onError?.(`File too large: ${file.name} (max 5MB)`);
        continue;
      }
      valid.push(file);
    }

    setFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        onError?.(`Maximum ${MAX_FILES} files allowed`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, [onError]);

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [addFiles]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    onError?.(null);

    try {
      const fileData = await Promise.all(
        files.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          return { name: file.name, type: file.type, data: base64 };
        })
      );

      const response = await authFetch('/api/knowledge-base/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileData })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Upload failed');

      onUploadComplete(result.upload.id, result.upload.totalChunks);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
      <h2 className="text-lg font-semibold text-gray-100">Upload Training Documents</h2>
      <p className="text-gray-400 text-sm">
        Upload your training manuals, pricing sheets, and SOPs. We'll extract structured content automatically.
      </p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-300 font-medium">
          Drop files here or click to browse
        </p>
        <p className="text-gray-500 text-sm mt-1">
          PDF, DOCX, or TXT — max {MAX_FILES} files, 5MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            if (e.target.files.length) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3"
            >
              <FileText className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-sm truncate">{file.name}</p>
                <p className="text-gray-500 text-xs">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading & Extracting Text...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Upload & Extract ({files.length} file{files.length !== 1 ? 's' : ''})
          </>
        )}
      </button>
    </div>
  );
}
