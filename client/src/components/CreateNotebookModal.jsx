import { useState, useEffect, useRef } from 'react';
import Modal from './Modal.jsx';

function CreateNotebookModal({ open, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <Modal open={open} onClose={onCancel} title="New Notebook">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="modal-input"
          type="text"
          placeholder="Enter notebook name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="modal-btn modal-btn-confirm"
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateNotebookModal;
