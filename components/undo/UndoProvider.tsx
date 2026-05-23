'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';

export interface UndoEntry {
  label: string;
  undo: () => Promise<void>;
}

interface UndoContextValue {
  canUndo: boolean;
  undoLabel: string | null;
  undoing: boolean;
  registerUndo: (entry: UndoEntry) => void;
  performUndo: () => Promise<void>;
  clearUndo: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<UndoEntry | null>(null);
  const [undoing, setUndoing] = useState(false);

  const registerUndo = useCallback((next: UndoEntry) => {
    setEntry(next);
  }, []);

  const clearUndo = useCallback(() => {
    setEntry(null);
  }, []);

  const performUndo = useCallback(async () => {
    if (!entry || undoing) return;
    setUndoing(true);
    try {
      await entry.undo();
      setEntry(null);
      toast.success('Restored.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not undo.');
    } finally {
      setUndoing(false);
    }
  }, [entry, undoing]);

  const value = useMemo(
    () => ({
      canUndo: entry !== null,
      undoLabel: entry?.label ?? null,
      undoing,
      registerUndo,
      performUndo,
      clearUndo,
    }),
    [entry, undoing, registerUndo, performUndo, clearUndo]
  );

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndo(): UndoContextValue {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return ctx;
}

/** Register undo for a delete and show a short confirmation toast (no inline Undo). */
export function useDeleteWithUndo() {
  const { registerUndo } = useUndo();

  return useCallback(
    (toastMessage: string, undo: () => Promise<void>, undoLabel?: string) => {
      registerUndo({ label: undoLabel ?? toastMessage, undo });
      toast.success(toastMessage);
    },
    [registerUndo]
  );
}
