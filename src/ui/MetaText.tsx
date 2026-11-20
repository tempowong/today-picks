import type { ReactNode } from "react";
import type { Confidence } from "../domain/types.ts";

export function confidenceClass(confidence: Confidence | undefined): string {
  if (confidence === "低") return "conf conf-low";
  if (confidence === "中") return "conf conf-mid";
  if (confidence === "高") return "conf conf-high";
  return "";
}

export function MetaText(props: { text: string; confidence?: Confidence }): ReactNode {
  const { text, confidence } = props;
  if (!confidence) return text;
  const token = `信心 ${confidence}`;
  const index = text.indexOf(token);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className={confidenceClass(confidence)}>{token}</span>
      {text.slice(index + token.length)}
    </>
  );
}

export function OddsLine(props: { text: string }) {
  const parts = props.text.split("---");
  if (parts.length === 1) return props.text;
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span className="suspended-odds">---</span> : null}
          {part}
        </span>
      ))}
    </>
  );
}
