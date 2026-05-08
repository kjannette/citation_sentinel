import GroundednessScore from './GroundednessScore.jsx';
import FollowUpQuestions from './FollowUpQuestions.jsx';

function renderAnswerWithCitations(answer, citations, hoveredSource, hoveredDocIndex, onSourceHover, onCitationClick) {
  if (!citations || citations.length === 0) {
    return <span className="answer-text">{answer}</span>;
  }

  const parts = answer.split(/(\[\d+\])/g);
  let citationCounter = 0;
  const sidebarIsSource = hoveredSource?.startsWith('sidebar-');
  return (
    <span className="answer-text">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const docIndex = parseInt(match[1], 10);
          const instanceId = `c-${citationCounter++}`;
          const isHighlighted =
            hoveredSource === instanceId ||
            (sidebarIsSource && hoveredDocIndex === docIndex);
          return (
            <span
              key={i}
              className={`citation-marker${isHighlighted ? ' citation-highlighted' : ''}`}
              title={`Source ${match[1]} — click for details`}
              role="button"
              tabIndex={0}
              aria-label={`Citation source ${match[1]}`}
              onMouseEnter={() => onSourceHover({ instanceId, docIndex })}
              onMouseLeave={() => onSourceHover(null)}
              onClick={() => onCitationClick?.(docIndex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCitationClick?.(docIndex);
                }
              }}
            >
              {match[1]}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

function ChatMessage({ message, onFollowUp, hoveredSource, hoveredDocIndex, onSourceHover, onCitationClick }) {
  if (message.role === 'user') {
    return <div className="chat-message user">{message.text}</div>;
  }

  return (
    <div className="chat-message assistant">
      {renderAnswerWithCitations(message.answer, message.citations, hoveredSource, hoveredDocIndex, onSourceHover, onCitationClick)}
      <div className="message-meta">
        <GroundednessScore score={message.groundednessScore} />
      </div>
      <FollowUpQuestions
        questions={message.followUpQuestions}
        onSelect={onFollowUp}
      />
    </div>
  );
}

export default ChatMessage;
