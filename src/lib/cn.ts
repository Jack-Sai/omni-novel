import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 class 名称。
 * clsx 负责条件拼接，tailwind-merge 负责消解同组冲突
 * （例如同时传入 "px-2" 与 "px-4" 时只保留后者）。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
