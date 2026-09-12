import type { ReactNode } from "react";
import * as RadixDropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";

export const Menu = RadixDropdown.Root;
export const MenuTrigger = RadixDropdown.Trigger;

export interface MenuContentProps {
  children: ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export function MenuContent({
  children,
  align = "end",
  sideOffset = 6,
  className,
}: MenuContentProps) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "omni-pop z-50 min-w-[11rem] rounded-lg border border-line bg-elevated p-1 shadow-lg",
          className,
        )}
      >
        {children}
      </RadixDropdown.Content>
    </RadixDropdown.Portal>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <RadixDropdown.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
      {children}
    </RadixDropdown.Label>
  );
}

export interface MenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function MenuItem({ children, onSelect, icon, destructive, className }: MenuItemProps) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] outline-none",
        "transition-colors duration-100",
        destructive
          ? "text-danger data-[highlighted]:bg-danger-soft"
          : "text-ink data-[highlighted]:bg-hover",
        className,
      )}
    >
      {icon && <span className="text-ink-3 [&_svg]:size-3.5">{icon}</span>}
      {children}
    </RadixDropdown.Item>
  );
}

export function MenuSeparator() {
  return <RadixDropdown.Separator className="my-1 h-px bg-line" />;
}
