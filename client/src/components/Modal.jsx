import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

function Modal({ open, onClose, title, width, children }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector(FOCUSABLE);
    if (first) first.focus();
    else dialog?.focus();

    return () => previousFocus.current?.focus();
  }, [open]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = [...dialog.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <div
        className="modal-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        tabIndex={-1}
        style={width ? { width } : undefined}
      >
        {title && <h3 className="modal-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export default Modal;
