import Modal from './Modal.jsx';

function StudyGuideContent({ doc }) {
  return (
    <div className="doc-content">
      <h2 className="doc-title">{doc.title}</h2>
      {doc.sections?.map((section, i) => (
        <section key={i} className="doc-section">
          <h3 className="doc-section-heading">{section.heading}</h3>
          {section.bullets?.length > 0 && (
            <ul className="doc-bullets">
              {section.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          )}
          {section.keyTerms?.length > 0 && (
            <div className="doc-key-terms">
              <h4 className="doc-subsection-label">Key Terms</h4>
              <dl>
                {section.keyTerms.map((kt, j) => (
                  <div key={j} className="doc-term-pair">
                    <dt>{kt.term}</dt>
                    <dd>{kt.definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {section.reviewQuestions?.length > 0 && (
            <div className="doc-review">
              <h4 className="doc-subsection-label">Self-Review</h4>
              <ol>
                {section.reviewQuestions.map((q, j) => <li key={j}>{q}</li>)}
              </ol>
            </div>
          )}
        </section>
      ))}
      {doc.mnemonics?.length > 0 && (
        <section className="doc-section">
          <h3 className="doc-section-heading">Memory Aids</h3>
          <ul className="doc-bullets">
            {doc.mnemonics.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function FaqContent({ doc }) {
  return (
    <div className="doc-content">
      <h2 className="doc-title">FAQ: {doc.subject}</h2>
      {doc.faqPairs?.map((pair, i) => (
        <div key={i} className="doc-faq-pair">
          <h4 className="doc-faq-question">Q: {pair.question}</h4>
          <p className="doc-faq-answer">{pair.answer}</p>
        </div>
      ))}
    </div>
  );
}

function ExecBriefContent({ doc }) {
  return (
    <div className="doc-content">
      <h2 className="doc-title">{doc.title}</h2>
      {doc.sections?.map((section, i) => (
        <section key={i} className="doc-section">
          <h3 className="doc-section-heading">{section.subhead}</h3>
          <p className="doc-prose">{section.prose}</p>
        </section>
      ))}
    </div>
  );
}

const LABELS = {
  'study-guide': 'Study Guide',
  'faq': 'F.A.Q.',
  'executive-brief': 'Executive Brief',
};

const RENDERERS = {
  'study-guide': StudyGuideContent,
  'faq': FaqContent,
  'executive-brief': ExecBriefContent,
};

function DocumentModal({ open, onClose, type, document: doc, loading }) {
  const Renderer = type ? RENDERERS[type] : null;
  const label = type ? LABELS[type] : '';

  return (
    <Modal open={open} onClose={onClose} title={label} width="720px">
      {loading ? (
        <p className="citation-detail-loading">Generating {label}<span className="loading-dots" /></p>
      ) : (
        <>
          {Renderer && doc && <Renderer doc={doc} />}
          <div className="modal-actions">
            <button className="modal-btn modal-btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default DocumentModal;
