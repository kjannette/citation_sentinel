function FollowUpQuestions({ questions, onSelect }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="follow-up-questions">
      <h3 className="follow-up-header">Suggested Follow-Up Questions:</h3>
      {questions.map((q, i) => (
        <button key={i} className="follow-up-chip" onClick={() => onSelect(q)}>
          {q}
        </button>
      ))}
    </div>
  );
}

export default FollowUpQuestions;
