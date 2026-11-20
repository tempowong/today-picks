import type { HandicapDepth } from "./types.ts";

export function parseCondition(condition: string): number[] {
  return condition
    .split("/")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

export function formatSigned(value: number): string {
  const text = Number.isInteger(value) ? String(value) : String(value);
  if (value > 0) return `+${text}`;
  if (value === 0) return "+0";
  return text;
}

export function formatLine(parts: number[]): string {
  return parts.map(formatSigned).join("/");
}

export function negateLine(parts: number[]): number[] {
  return parts.map((part) => (part === 0 ? 0 : -part));
}

/** Depth used for F2. Deeper than one goal is 其他. */
export function depthOfNumbers(parts: number[]): HandicapDepth {
  const abs = parts.map((part) => Math.abs(part)).sort((a, b) => a - b);
  const key = abs.join(",");
  if (key === "0,0.5") return "淺盤";
  if (key === "0.5,1" || key === "1") return "深盤";
  return "其他";
}

export function officialDepthName(depth: HandicapDepth, parts: number[]): string {
  const abs = parts.map((part) => Math.abs(part)).sort((a, b) => a - b).join(",");
  if (abs === "0") return "平手";
  if (depth === "淺盤") return "平／半";
  if (abs === "0.5,1") return "讓半／一";
  if (abs === "1") return "讓一球";
  if (depth === "深盤") return "讓半／一";
  return "讓一／球半及更深";
}
