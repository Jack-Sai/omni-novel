import { useEffect, useRef, useCallback } from "react";

interface UseAutoSaveOptions {
  data: unknown;
  onSave: (data: unknown) => void;
  interval?: number;
  enabled?: boolean;
}

export function useAutoSave({
  data,
  onSave,
  interval = 30000,
  enabled = true,
}: UseAutoSaveOptions) {
  const dataRef = useRef(data);
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const save = useCallback(() => {
    const currentData = dataRef.current;
    const dataString = JSON.stringify(currentData);

    if (dataString !== lastSavedRef.current) {
      onSave(currentData);
      lastSavedRef.current = dataString;
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(save, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, interval, save]);

  const saveNow = useCallback(() => {
    save();
  }, [save]);

  return { saveNow };
}
