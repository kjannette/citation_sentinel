import { useState, useEffect, useCallback } from 'react';
import * as notebooksApi from '../api/notebooks.js';

export function useNotebook() {
  const [notebooks, setNotebooks] = useState([]);
  const [activeNotebook, setActiveNotebook] = useState(null);

  useEffect(() => {
    notebooksApi.listNotebooks().then(setNotebooks).catch(console.error);
  }, []);

  const selectNotebook = useCallback(
    (id) => {
      const nb = notebooks.find((n) => n.id === id) || null;
      setActiveNotebook(nb);
    },
    [notebooks],
  );

  const createNotebook = useCallback(async (name) => {
    if (!name) return;
    const nb = await notebooksApi.createNotebook(name);
    setNotebooks((prev) => [...prev, nb]);
    setActiveNotebook(nb);
  }, []);

  const deleteNotebook = useCallback(
    async (id) => {
      try {
        await notebooksApi.deleteNotebook(id);
      } catch (err) {
        console.error('Failed to delete notebook', err);
        return;
      }
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      if (activeNotebook?.id === id) {
        setActiveNotebook(null);
      }
    },
    [activeNotebook],
  );

  return {
    notebooks,
    activeNotebook,
    selectNotebook,
    createNotebook,
    deleteNotebook,
  };
}
