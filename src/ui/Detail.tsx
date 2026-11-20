import { useState } from "react";
import { kickLine, matchName } from "../domain/present.ts";
import type { SeedMatch } from "../domain/view.ts";
import { MetaText, OddsLine } from "./MetaText.tsx";
import { Stamp } from "./Stamp.tsx";

export function Detail(props: { match: SeedMatch; size: "mobile" | "desktop"; heading: boolean }) {
  const { match, size } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({ "1": true });
  const Title = props.heading ? "h1" : "p";

  return (
    <article className="detail" data-match-id={match.id}>
      <p className="detail-kicker">{kickLine(match)}</p>
      <Title className="detail-match">{matchName(match.home, match.away, "card")}</Title>
      {match.view.printedLine ? <p className="detail-printed">{match.view.printedLine}</p> : null}
      {match.view.neutralNote ? <p className="detail-neutral">{match.view.neutralNote}</p> : null}
      <div className="detail-hero-row">
        <Stamp kind={match.stamp} size={size} />
        <div className="card-body">
          <p className="slot-label">{match.view.slotLabel}</p>
          <p className={size === "desktop" ? "detail-hero detail-hero-desktop" : "detail-hero"}>
            {match.view.detailHero}
          </p>
          {match.view.detailExtra ? <p className="detail-extra">{match.view.detailExtra}</p> : null}
          <p className="odds-line">
            <OddsLine text={match.view.oddsLine} />
          </p>
          <p className="detail-meta">
            <MetaText text={match.view.detailMeta} confidence={match.confidence} />
          </p>
        </div>
      </div>
      <p className="invalid">{match.invalidation}</p>
      <div className="steps">
        {match.view.steps.map((step) => {
          const isOpen = open[step.n] === true;
          return (
            <div className="step" key={step.n}>
              <button
                type="button"
                className="step-btn"
                aria-expanded={isOpen}
                onClick={() => setOpen((current) => ({ ...current, [step.n]: !isOpen }))}
              >
                {isOpen ? "▾ " : ""}
                {step.n}. {step.title}
              </button>
              {isOpen ? <p className="step-body">{step.body}</p> : null}
            </div>
          );
        })}
        <p className="filters">{match.view.filtersLine}</p>
      </div>
    </article>
  );
}
