import { useState, useCallback } from 'react';

export type HistoryEntry = {
  id: string;
  msg: string;
  timestamp: number;
  direction: 'received';
};

const STORAGE_KEY = 'sonic-gate-history';
const MAX_HISTORY = 50;

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

export function useMessageHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const addReceived = useCallback((msg: string) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      msg,
      timestamp: Date.now(),
      direction: 'received',
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const exportHistory = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify(history, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonic-gate-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return { history, addReceived, clearHistory, exportHistory };
}
