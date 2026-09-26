import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { Input } from "./Input";

export interface SearchSelectOption {
  value: string;
  label: string;
}

export interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 可检索下拉选择器：输入即过滤选项，也支持直接输入任意值（自由提交）。
 * - 聚焦时全选当前值，可直接打字覆盖
 * - 回车选中高亮项（无匹配时提交当前输入）
 * - 失焦时若输入与当前值不同则提交输入内容
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  /** null = 未在编辑（显示 value）；字符串 = 输入中的检索词 */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const text = query ?? value;

  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  // 检索词变化时重置高亮
  useEffect(() => {
    setActive(0);
  }, [query]);

  // 高亮项滚动进可视区
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const commit = () => {
    setOpen(false);
    if (query !== null) {
      const t = query.trim();
      if (t !== value) onChange(t);
      setQuery(null);
    }
  };

  const pick = (option: SearchSelectOption) => {
    if (option.value !== value) onChange(option.value);
    setQuery(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery(value);
        return;
      }
      if (filtered.length === 0) return;
      setActive((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % filtered.length
          : (i - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered.length > 0) {
        pick(filtered[Math.min(active, filtered.length - 1)]);
      } else {
        commit();
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setQuery(null);
      }
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery(value);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        onBlur={commit}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="pr-9"
      />
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
      />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-elevated py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-ink-3">无匹配项，回车使用当前输入</li>
          ) : (
            filtered.map((o, i) => (
              <li key={o.value || "__default__"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-[13px] transition-colors",
                    i === active ? "bg-hover text-ink" : "text-ink-2",
                    o.value === value && "font-medium text-primary",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
