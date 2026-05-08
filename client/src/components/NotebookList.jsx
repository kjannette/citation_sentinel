import { useState } from 'react';
import CreateNotebookModal from './CreateNotebookModal.jsx';

function NotebookList({ notebooks, activeId, onSelect, onCreate, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleConfirm = (name) => {
    setModalOpen(false);
    onCreate(name);
  };

  return (
    <div className="notebook-list">
      <h2>Notebooks</h2>
      <ul>
        {notebooks.map((nb) => (
          <li
            key={nb.id}
            className={nb.id === activeId ? 'active' : ''}
            onClick={() => onSelect(nb.id)}
          >
            <span className="nb-name">{nb.name}</span>
            <button
              className="nb-delete"
              onClick={(e) => handleDelete(e, nb.id)}
              title="Delete notebook"
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
      <button
        className="btn-new-notebook"
        onClick={() => setModalOpen(true)}
      >
        + New Notebook
      </button>
      <CreateNotebookModal
        open={modalOpen}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}

export default NotebookList;
