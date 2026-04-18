import { useRef, useState } from 'react';

export default function FileDropZone({ files = [], setFiles, label = 'Attachments' }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function mergeFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    const existing = new Set(files.map((f) => `${f.name}:${f.size}`));
    const merged = [...files, ...incoming.filter((f) => !existing.has(`${f.name}:${f.size}`))];
    setFiles(merged);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    mergeFiles(e.dataTransfer?.files);
  }

  function removeAt(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  return (
    <div className="file-drop-wrap">
      <p className="file-drop-label">{label}</p>
      <div
        className={dragOver ? 'file-drop-zone drag-over' : 'file-drop-zone'}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        Drag and drop files here, or click to browse
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => mergeFiles(e.target.files)}
      />

      {files.length ? (
        <ul className="file-list">
          {files.map((file, idx) => (
            <li key={`${file.name}-${file.size}-${idx}`}>
              <span>{file.name}</span>
              <button type="button" className="btn-danger btn-compact" onClick={() => removeAt(idx)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
