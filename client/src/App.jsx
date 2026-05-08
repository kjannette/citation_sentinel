import { useState } from 'react';
import NotebookList from './components/NotebookList.jsx';
import SourcePanel from './components/SourcePanel.jsx';
import DocumentButtons from './components/DocumentButtons.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import DocumentModal from './components/DocumentModal.jsx';
import { useNotebook } from './hooks/useNotebook.js';
import { generateDocument } from './api/documents.js';

function App() {
  const {
    notebooks,
    activeNotebook,
    selectNotebook,
    createNotebook,
    deleteNotebook,
  } = useNotebook();

  const [hoverState, setHoverState] = useState(null);
  const [sourceCount, setSourceCount] = useState(0);
  const [generatingType, setGeneratingType] = useState(null);
  const [docModal, setDocModal] = useState({ open: false, type: null, document: null, loading: false });
  const [chatReady, setChatReady] = useState(false);

  const handleSelectNotebook = (id) => {
    setChatReady(false);
    selectNotebook(id);
  };

  const handleSourceHover = (val) => {
    if (val === null) {
      setHoverState(null);
    } else if (typeof val === 'number') {
      setHoverState({ instanceId: `sidebar-${val}`, docIndex: val });
    } else {
      setHoverState(val);
    }
  };

  const handleDocumentRequest = async (type) => {
    setGeneratingType(type);
    setDocModal({ open: true, type, document: null, loading: true });

    try {
      const res = await generateDocument(activeNotebook.id, type);
      setDocModal({ open: true, type, document: res.document, loading: false });
    } catch (err) {
      console.error('document generation failed', err);
      setDocModal({ open: false, type: null, document: null, loading: false });
    } finally {
      setGeneratingType(null);
    }
  };

  const hoveredDocIndex = hoverState?.docIndex ?? null;
  const hoveredInstanceId = hoverState?.instanceId ?? null;

  return (
    <div className="app">
      <aside className="sidebar">
        <NotebookList
          notebooks={notebooks}
          activeId={activeNotebook?.id}
          onSelect={handleSelectNotebook}
          onCreate={createNotebook}
          onDelete={deleteNotebook}
        />
        {activeNotebook && (
          <>
            <SourcePanel
              notebookId={activeNotebook.id}
              hoveredSourceIndex={hoveredDocIndex}
              onSourceHover={handleSourceHover}
              onSourcesChange={setSourceCount}
            >
              {chatReady && (
                <DocumentButtons
                  sourceCount={sourceCount}
                  onRequest={handleDocumentRequest}
                  generatingType={generatingType}
                />
              )}
            </SourcePanel>
          </>
        )}
      </aside>
      <main className="main">
        {activeNotebook ? (
          <ChatPanel
            notebookId={activeNotebook.id}
            hoveredSource={hoveredInstanceId}
            hoveredDocIndex={hoveredDocIndex}
            onSourceHover={handleSourceHover}
            onFirstResponse={() => setChatReady(true)}
          />
        ) : (
          <p>Select or create a notebook to get started.</p>
        )}
      </main>
      <DocumentModal
        open={docModal.open}
        onClose={() => setDocModal({ open: false, type: null, document: null, loading: false })}
        type={docModal.type}
        document={docModal.document}
        loading={docModal.loading}
      />
    </div>
  );
}

export default App;
