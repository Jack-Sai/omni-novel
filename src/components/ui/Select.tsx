import { Children, forwardRef, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { controlBase, controlSize } from "./Input";
import type { ControlSize } from "./Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: ControlSize;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** 解析 <option> 子元素（与原生 select 用法完全一致） */
function parseOptions(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const p = child.props as {
      value?: unknown;
      children?: ReactNode;
      disabled?: boolean;
    };
    const value = p.value == null ? "" : String(p.value);
    const raw = p.children;
    const label =
      typeof raw === "string" || typeof raw === "number" ? String(raw) : value;
    out.push({ value, label, disabled: p.disabled === true });
  });
  return out;
}

/**
 * 下拉选择器：外观与 SearchSelect 统一（自定义弹层，替代原生 select 的系统样式）。
 * 用法不变：value + onChange(e.target.value) + <option> 子元素。
 * - 隐藏原生 select 承载 ref / name 等表单语义
 * - 键盘：↑↓ 移动、Enter/Space 选中、Esc 关闭、Tab 收起
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    selectSize = "md",
    className,
    children,
    value,
    onChange,
    onFocus,
    onBlur,
    disabled,
    ...props
  },
  ref,
) {
  const options = useMemo(() => parseOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const strValue = value == null ? "" : String(value);
  const selectedIndex = options.findIndex((o) => o.value === strValue);
  const display =
    selectedIndex >= 0
      ? options[selectedIndex].label
      : strValue || options[0]?.label || "";

  // 打开时高亮当前值
  useEffect(() => {
    if (open) setActive(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 高亮项滚动进可视区
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (option: SelectOption) => {
    setOpen(false);
    if (option.value !== strValue) {
      onChange?.({
        target: { value: option.value },
      } as ChangeEvent<HTMLSelectElement>);
    }
    triggerRef.current?.focus();
  };

  const move = (dir: 1 | -1) => {
    if (options.length === 0) return;
    setActive((i) => {
      let n = i;
      for (let step = 0; step < options.length; step++) {
        n = (n + dir + options.length) % options.length;
        if (!options[n].disabled) return n;
      }
      return i;
    });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) {
        const o = options[active];
        if (o && !o.disabled) pick(o);
      } else {
        setOpen(true);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      {/* 隐藏原生 select：承载 ref / name 等表单语义，值与外观同步 */}
      <select
        ref={ref}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        value={strValue}
        disabled={disabled}
        onChange={() => undefined}
        {...props}
      >
        {children}
      </select>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onFocus={onFocus as unknown as (e: ReactFocusEvent<HTMLButtonElement>) => void}
        onBlur={onBlur as unknown as (e: ReactFocusEvent<HTMLButtonElement>) => void}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={cn(
          controlBase,
          controlSize[selectSize],
          "flex cursor-pointer items-center gap-2 pr-9 text-left",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </button>
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
          {options.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-ink-3">暂无选项</li>
          ) : (
            options.map((o, i) => (
              <li key={o.value || "__empty__"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === strValue}
                  disabled={o.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center px-3 py-1.5 text-left text-[13px] transition-colors",
                    i === active ? "bg-hover text-ink" : "text-ink-2",
                    o.value === strValue && "font-medium text-primary",
                    o.disabled && "cursor-not-allowed opacity-50",
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
});
