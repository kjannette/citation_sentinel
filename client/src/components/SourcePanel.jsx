import { useState, useEffect, useRef } from 'react';
import * as sourcesApi from '../api/sources.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx', '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];

const FILE_ACCEPT = ALLOWED_EXTENSIONS.join(',');

function isFileAllowed(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function SourcePanel({ notebookId, hoveredSourceIndex, onSourceHover, onSourcesChange, children }) {
  const [sources, setSources] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const dragCounter = useRef(0);
  const errorTimer = useRef(null);

  const showError = (msg) => {
    setError(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 8000);
  };

  useEffect(() => {
    setSources([]);
    onSourcesChange?.(0);
    sourcesApi.listSources(notebookId).then((s) => {
      setSources(s);
      onSourcesChange?.(s.length);
    }).catch((err) => showError(err.message || 'Failed to load sources'));
  }, [notebookId, onSourcesChange]);

  useEffect(() => () => clearTimeout(errorTimer.current), []);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!isFileAllowed(file)) {
      showError(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const src = await sourcesApi.uploadSource(notebookId, file);
      setSources((prev) => {
        const next = [...prev, src];
        onSourcesChange?.(next.length);
        return next;
      });
    } catch (err) {
      showError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleUpload = (e) => {
    uploadFile(e.target.files?.[0]);
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url || addingUrl) return;
    setError(null);
    setAddingUrl(true);
    try {
      const src = await sourcesApi.addUrlSource(notebookId, url);
      if (src.error) {
        showError(src.error);
      } else {
        setSources((prev) => {
          const next = [...prev, src];
          onSourcesChange?.(next.length);
          return next;
        });
        setUrlInput('');
      }
    } catch (err) {
      showError(err.message || 'Failed to add URL');
    } finally {
      setAddingUrl(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    uploadFile(file);
  };

  const busy = uploading || addingUrl;

  return (
    <div className="source-panel">
      <h3>Sources</h3>
      <ul role="list">
        {sources.map((s, idx) => {
          const docIndex = idx + 1;
          const isHighlighted = hoveredSourceIndex === docIndex;
          return (
            <li
              key={s.id}
              className={`source-item${isHighlighted ? ' source-highlighted' : ''}`}
              tabIndex={0}
              role="button"
              aria-label={`Source ${docIndex}: ${s.name}`}
              onMouseEnter={() => onSourceHover(docIndex)}
              onMouseLeave={() => onSourceHover(null)}
              onFocus={() => onSourceHover(docIndex)}
              onBlur={() => onSourceHover(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSourceHover(docIndex);
                }
              }}
            >
              <span className="source-number">{docIndex}</span>
              {s.name}
            </li>
          );
        })}
      </ul>
      <div
        className={`source-upload-area${isDragging ? ' dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept={FILE_ACCEPT}
          onChange={handleUpload}
          hidden
        />
        <button
          className="btn-upload"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {uploading ? 'Uploading...' : '+ Upload Source'}
        </button>
        <div className="drop-zone">
          [ or drag and drop ]
        </div>
      </div>
      <form className="source-url-form" onSubmit={handleAddUrl}>
        <input
          className="source-url-input"
          type="text"
          placeholder="Paste a URL or YouTube link..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={busy}
        />
        <button
          className="btn-add-url"
          type="submit"
          disabled={busy || !urlInput.trim()}
        >
          {addingUrl ? 'Adding...' : '+ Add'}
        </button>
      </form>
      {error && (
        <div className="source-error" role="alert">
          <span>{error}</span>
          <button className="source-error-dismiss" onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      {children}
    </div>
  );
}

export default SourcePanel;
