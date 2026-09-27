import { useI18nStore, LANG_LOCALE } from "./index";

/**
 * 日期/数字本地化（v1.3.3）：按当前语言映射 Intl locale。
 * 替换散落的 "zh-CN" 字面量与无参 toLocaleString()。
 */
export function currentLocale(): string {
  return LANG_LOCALE[useI18nStore.getState().lang];
}

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

/** 日期时间：2026-09-26 14:05 → 9/26/2026, 2:05 PM */
export function formatDateTime(input: Date | string | number, withSeconds = false): string {
  return toDate(input).toLocaleString(currentLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: useI18nStore.getState().lang === "en",
  });
}

/** 仅日期 */
export function formatDate(input: Date | string | number): string {
  return toDate(input).toLocaleDateString(currentLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 仅时间 HH:mm */
export function formatTime(input: Date | string | number): string {
  return toDate(input).toLocaleTimeString(currentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: useI18nStore.getState().lang === "en",
  });
}

/** 数字分组：1234567 → 1,234,567 */
export function formatNumber(n: number): string {
  return n.toLocaleString(currentLocale());
}

/** 字数（万）：英文下转为 plain grouped number，中文保留 1.2万 */
export function formatWordCount(n: number): string {
  if (useI18nStore.getState().lang === "en") return n.toLocaleString(currentLocale());
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
