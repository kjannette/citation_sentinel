import Modal from './Modal.jsx';

function CitationDetailModal({ open, onClose, detail, sourceName, citationIndex }) {
  const loading = !detail;

  return (
    <Modal open={open} onClose={onClose} title={`Source ${citationIndex} — ${sourceName || 'Unknown'}`} width="680px">
      {loading ? (
        <p className="citation-detail-loading">Loading deeper insight<span className="loading-dots" /></p>
      ) : (
        <div className="citation-detail-content">
          <section className="citation-detail-section">
            <h4 className="citation-detail-label">Cited Passage</h4>
            <blockquote className="citation-detail-quote">{detail.citedSentence}</blockquote>
          </section>

          <section className="citation-detail-section">
            <h4 className="citation-detail-label">Topic Context</h4>
            <p>{detail.topicSummary}</p>
          </section>

          <section className="citation-detail-section">
            <h4 className="citation-detail-label">Additional Insight</h4>
            <p>{detail.additionalInsight}</p>
          </section>

          {detail.relevantLinks?.length > 0 && (
            <section className="citation-detail-section">
              <h4 className="citation-detail-label">Further Reading</h4>
              <ul className="citation-detail-links">
                {detail.relevantLinks.map((link, i) => (
                  <li key={i}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="modal-actions">
            <button className="modal-btn modal-btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default CitationDetailModal;
