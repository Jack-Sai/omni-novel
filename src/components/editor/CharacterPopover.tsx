import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, X } from "lucide-react";
import type { Character } from "../../stores/characterStore";

const genderLabel: Record<string, string> = { male: "男", female: "女", other: "其他" };

export interface CharacterPopoverProps {
  character: Character;
  /** 点击位置（视口坐标） */
  x: number;
  y: number;
  onView: (character: Character) => void;
  onClose: () => void;
}

/** 人名高亮点击后弹出的人物速览卡片（Portal 到 body，fixed 定位并做视口翻转） */
export function CharacterPopover({
  character,
  x,
  y,
  onView,
  onClose,
}: CharacterPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x + 12;
    let top = y + 14;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 12;
    if (left < 8) left = 8;
    if (top + rect.height > window.innerHeight - 8) top = y - rect.height - 14;
    if (top < 8) top = 8;
    setPos({ left, top });
  }, [x, y]);

  // Esc 或点击外部关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const meta = [
    character.gender ? genderLabel[character.gender] : null,
    character.age || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return createPortal(
    <div
      ref={ref}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
      className="omni-panel fixed z-[70] w-72 rounded-xl border border-line bg-elevated p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
          {character.name?.trim()?.[0] ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {character.name || "未命名人物"}
          </p>
          {meta && <p className="mt-0.5 text-[12px] text-ink-3">{meta}</p>}
        </div>
        <button
          type="button"
          aria-label="关闭"
          className="rounded-md p-1 text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      {character.aliases.length > 0 && (
        <p className="mt-2 text-[12px] text-ink-3">别名：{character.aliases.join("、")}</p>
      )}
      {character.personality && (
        <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-ink-2">
          {character.personality}
        </p>
      )}
      {character.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {character.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-subtle px-1.5 py-0.5 text-[11px] text-ink-3"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onView(character)}
      >
        查看人物档案
        <ArrowUpRight size={14} />
      </button>
    </div>,
    document.body,
  );
}
