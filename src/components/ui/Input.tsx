import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";

/** 输入类控件共用的外观基线：边框、聚焦环、禁用态、错误态 */
export const controlBase = cn(
  "w-full border border-line bg-surface text-ink placeholder:text-ink-3",
  "transition-colors duration-150 outline-none",
  "focus:border-primary focus:ring-2 focus:ring-[var(--app-ring)]",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:focus:ring-[var(--app-ring-danger)]",
);

export const controlSize = {
  sm: "h-9 rounded-lg px-3 text-[13px]",
  md: "h-10 rounded-lg px-3.5 text-sm",
} as const;

export type ControlSize = keyof typeof controlSize;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: ControlSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { inputSize = "md", className, ...props },
  ref,
) {
  return (
    <input ref={ref} className={cn(controlBase, controlSize[inputSize], className)} {...props} />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 是否允许手动拖拽调整高度，默认纵向可调 */
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        controlBase,
        "resize-y rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-ink", className)} {...props}>
      {children}
    </label>
  );
}

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** 表单字段容器：统一标签、说明文字与错误提示的间距 */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[13px] text-danger">{error}</p>
      ) : (
        hint && <p className="text-[13px] text-ink-3">{hint}</p>
      )}
    </div>
  );
}
