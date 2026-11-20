import type { StampKind } from "../domain/types.ts";

export function Stamp(props: { kind: StampKind; size: "mobile" | "desktop" }) {
  return (
    <div className={props.size === "mobile" ? "stamp stamp-mobile" : "stamp stamp-desktop"} data-kind={props.kind}>
      {props.kind}
    </div>
  );
}
