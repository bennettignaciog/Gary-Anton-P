import { useState, useCallback, useRef } from 'react';

export interface UndoRedoActions<T> {
  state: T;
  set: (newState: T | ((prev: T) => T), recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (initialState: T) => void;
  historyLength: number;
}

export function useUndoRedo<T>(initialState: T, maxHistory = 40): UndoRedoActions<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const lastRecordedTimeRef = useRef<number>(0);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const set = useCallback(
    (newStateOrUpdater: T | ((prev: T) => T), recordHistory = true) => {
      setPresent((prevPresent) => {
        const nextVal =
          typeof newStateOrUpdater === 'function'
            ? (newStateOrUpdater as (prev: T) => T)(prevPresent)
            : newStateOrUpdater;

        if (recordHistory) {
          const now = Date.now();
          // Throttle consecutive rapid slider micro-moves within 350ms to keep history clean
          const isRapid = now - lastRecordedTimeRef.current < 350;
          lastRecordedTimeRef.current = now;

          setPast((prevPast) => {
            if (isRapid && prevPast.length > 0) {
              // Replace last entry rather than spamming
              return [...prevPast.slice(0, prevPast.length - 1), prevPresent];
            }
            const updated = [...prevPast, prevPresent];
            return updated.length > maxHistory ? updated.slice(updated.length - maxHistory) : updated;
          });
          setFuture([]);
        }
        return nextVal;
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);
      setFuture((prevFuture) => [present, ...prevFuture]);
      setPresent(previous);
      return newPast;
    });
  }, [canUndo, present]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      setPast((prevPast) => [...prevPast, present]);
      setPresent(next);
      return newFuture;
    });
  }, [canRedo, present]);

  const resetHistory = useCallback((initial: T) => {
    setPast([]);
    setPresent(initial);
    setFuture([]);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    historyLength: past.length,
  };
}
