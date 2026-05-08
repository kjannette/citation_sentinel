import { useState, useRef, useEffect } from 'react';
import { sendQuery } from '../api/query.js';
import ChatMessage from './ChatMessage.jsx';
import CitationDetailModal from './CitationDetailModal.jsx';

function ChatPanel({ notebookId, hoveredSource, hoveredDocIndex, onSourceHover, onFirstResponse }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [citationDetails, setCitationDetails] = useState({});
  const [activeCitation, setActiveCitation] = useState(null);
  const bottomRef = useRef(null);
  const firstResponseFired = useRef(false);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setCitationDetails({});
    setActiveCitation(null);
    firstResponseFired.current = false;
  }, [notebookId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submitQuery = async (question) => {
    if (!question.trim() || loading) return;

    const userMsg = { role: 'user', text: question, msgId: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const msgId = crypto.randomUUID();

    try {
      const res = await sendQuery(notebookId, question, (details) => {
        const detailMap = {};
        for (const d of details) {
          detailMap[d.sourceIndex] = d;
        }
        setCitationDetails((prev) => ({ ...prev, [msgId]: detailMap }));
      });

      const assistantMsg = {
        role: 'assistant',
        answer: res.answer,
        citations: res.citations || [],
        groundednessScore: res.groundednessScore,
        followUpQuestions: res.followUpQuestions || [],
        msgId,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (!firstResponseFired.current) {
        firstResponseFired.current = true;
        onFirstResponse?.();
      }
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        msgId,
        answer: 'Something went wrong. Please try again.',
        citations: [],
        groundednessScore: null,
        followUpQuestions: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
      console.error('query failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitQuery(input);
  };

  const handleFollowUp = (question) => {
    submitQuery(question);
  };

  const handleCitationClick = (msgId, docIndex) => {
    const citation = messages.find(
      (m) => m.msgId === msgId
    )?.citations?.find((c) => c.sourceIndex === docIndex);

    setActiveCitation({
      msgId,
      docIndex,
      sourceName: citation?.name || 'Unknown',
    });
  };

  const activeDetail =
    activeCitation
      ? citationDetails[activeCitation.msgId]?.[activeCitation.docIndex] ?? null
      : null;

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            Upload sources and ask a question to get started.
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.msgId}
            message={msg}
            onFollowUp={handleFollowUp}
            hoveredSource={hoveredSource}
            hoveredDocIndex={hoveredDocIndex}
            onSourceHover={onSourceHover}
            onCitationClick={(docIndex) => handleCitationClick(msg.msgId, docIndex)}
          />
        ))}
        {loading && (
          <div className="chat-message assistant loading">
            Thinking<span className="loading-dots" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask a question about your sources..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
      <CitationDetailModal
        open={!!activeCitation}
        onClose={() => setActiveCitation(null)}
        detail={activeDetail}
        sourceName={activeCitation?.sourceName}
        citationIndex={activeCitation?.docIndex}
      />
    </div>
  );
}

export default ChatPanel;
