import { useEffect, useRef, useCallback } from "react";

interface UseAutoSaveOptions {
  data: unknown;
  onSave: (data: unknown) => void;
  /** 最后一次变化后多少毫秒保存（debounce） */
  interval?: number;
  enabled?: boolean;
  /** 保存主体的标识（如章节 id）：切换时立即把旧数据刷盘 */
  key?: string | null;
}

export function useAutoSave({
  data,
  onSave,
  interval = 30000,
  enabled = true,
  key = null,
}: UseAutoSaveOptions) {
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const lastSavedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // 保持 onSave 为最新引用：外部回调依赖变化不应重置保存倒计时
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const save = useCallback(() => {
    const currentData = dataRef.current;
    const dataString = JSON.stringify(currentData);

    if (dataString !== lastSavedRef.current) {
      onSaveRef.current(currentData);
      lastSavedRef.current = dataString;
    }
  }, []);

  // 切换保存主体（如切章）或卸载时立即刷盘。
  // cleanup 在所有 effect body 之前执行，此时 dataRef 仍指向旧数据。
  useEffect(() => {
    return () => {
      save();
    };
  }, [key, save]);

  // 内容变化 debounce：每次变化重置计时，最后一次变化后 interval 毫秒保存
  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save();
      timerRef.current = null;
    }, interval);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, enabled, interval, save]);

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    save();
  }, [save]);

  return { saveNow };
}
