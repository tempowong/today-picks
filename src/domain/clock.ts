import { EDITION_WINDOWS, type EditionWindow } from "./types.ts";

export type HktParts = { date: string; time: string; minutes: number };

export function hktParts(now = new Date()): HktParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  const hour = Number(bag.hour);
  const minute = Number(bag.minute);
  return {
    date: `${bag.year}-${bag.month}-${bag.day}`,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    minutes: hour * 60 + minute,
  };
}

function windowMinutes(window: EditionWindow): number {
  const [hour, minute] = window.split(":").map(Number);
  return hour * 60 + minute;
}

/** Latest edition window that has already opened. Null before 07:00. No window is opened from 23:00 until 07:00. */
export function openWindow(parts: HktParts): EditionWindow | null {
  if (parts.minutes < windowMinutes("07:00") || parts.minutes >= 23 * 60) return null;
  let open: EditionWindow = "07:00";
  for (const window of EDITION_WINDOWS) {
    if (parts.minutes >= windowMinutes(window)) open = window;
  }
  return open;
}

export function nextWindow(parts: HktParts): EditionWindow | null {
  if (parts.minutes >= windowMinutes("22:00")) return null;
  for (const window of EDITION_WINDOWS) {
    if (parts.minutes < windowMinutes(window)) return window;
  }
  return null;
}

export function waitingCopy(parts: HktParts, hasEdition: boolean): string | null {
  if (!openWindow(parts)) return "等待07:00 首刊";
  const next = nextWindow(parts);
  if (hasEdition && next) return `等待 ${next} 定時提取並刊出`;
  return null;
}
