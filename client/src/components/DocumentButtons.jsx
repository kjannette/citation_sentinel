const DOCUMENT_TYPES = [
  { type: 'study-guide', label: 'Study Guide' },
  { type: 'faq', label: 'F.A.Q.' },
  { type: 'executive-brief', label: 'Executive Brief' },
];

function DocumentButtons({ sourceCount, onRequest, generatingType }) {
  const enabled = sourceCount >= 2;

  return (
    <div className="document-buttons">
      {DOCUMENT_TYPES.map(({ type, label }) => {
        const isGenerating = generatingType === type;
        return (
          <button
            key={type}
            className={`btn-document${isGenerating ? ' generating' : ''}`}
            disabled={!enabled || !!generatingType}
            onClick={() => onRequest(type)}
          >
            {isGenerating ? `Generating ${label}...` : label}
          </button>
        );
      })}
    </div>
  );
}

export default DocumentButtons;
