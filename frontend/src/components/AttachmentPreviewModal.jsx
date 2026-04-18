function normalizeUrls(urls) {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  if (typeof urls === 'string') {
    return urls
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function toPreviewUrl(raw) {
  const cleanUrl = String(raw || '').trim();
  if (!cleanUrl) return '';

  if (cleanUrl.includes('drive.google.com')) {
    if (cleanUrl.includes('/view')) {
      return cleanUrl.replace('/view', '/preview');
    }
    if (cleanUrl.includes('open?id=')) {
      const id = cleanUrl.split('id=')[1]?.split('&')[0];
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
  }

  return cleanUrl;
}

export default function AttachmentPreviewModal({ open, urls, title = 'File Preview', onClose }) {
  if (!open) return null;
  const normalized = normalizeUrls(urls);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card modal-card-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        {normalized.length ? (
          <div className="preview-list">
            {normalized.map((url, idx) => {
              const previewUrl = toPreviewUrl(url);
              return (
                <article key={`${url}-${idx}`} className="preview-item">
                  <div className="preview-head">
                    <span>Attachment {idx + 1}</span>
                    <a href={url} target="_blank" rel="noreferrer">
                      Original Link
                    </a>
                  </div>
                  <iframe src={previewUrl} title={`Attachment ${idx + 1}`} loading="lazy" />
                </article>
              );
            })}
          </div>
        ) : (
          <p className="panel-empty">No attachments available.</p>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
