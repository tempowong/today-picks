import { Link } from "@tanstack/react-router";
import { matchName } from "../domain/present.ts";
import type { SeedMatch } from "../domain/view.ts";
import type { BoardSearch } from "../search.ts";
import { confidenceClass, MetaText } from "./MetaText.tsx";
import { Stamp } from "./Stamp.tsx";

export function CardList(props: { matches: SeedMatch[]; search: BoardSearch }) {
  return (
    <div className="card-list">
      {props.matches.map((match) => (
        <Link
          key={match.id}
          className="match-card"
          to="/matches/$matchId"
          params={{ matchId: match.id }}
          search={props.search}
          data-match-id={match.id}
        >
          <Stamp kind={match.stamp} size="mobile" />
          <div className="card-body">
            <div className="card-time">{match.kickoffHkt}</div>
            <div className="card-match">{matchName(match.home, match.away, "card")}</div>
            <div className="card-hero">{match.hero}</div>
            <div className="card-meta">
              <MetaText text={match.view.listMeta} confidence={match.confidence} />
            </div>
            {match.view.flagLine ? <div className="card-flag">{match.view.flagLine}</div> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

export function DeskList(props: { matches: SeedMatch[]; selectedId: string | null; search: BoardSearch }) {
  return (
    <div className="split-list">
      {props.matches.map((match) => {
        const flag = match.view.deskFlag ?? match.view.flagLine;
        return (
          <Link
            key={match.id}
            className={match.id === props.selectedId ? "desk-row is-selected" : "desk-row"}
            to="/matches/$matchId"
            params={{ matchId: match.id }}
            search={props.search}
            aria-current={match.id === props.selectedId ? "true" : undefined}
            data-match-id={match.id}
          >
            <Stamp kind={match.stamp} size="desktop" />
            <div className="card-body">
              <div className="desk-line">
                <span className="card-time">{match.kickoffHkt}</span>
                <span className="card-match">{matchName(match.home, match.away, "row")}</span>
              </div>
              <div className="desk-hero">{match.view.deskHero}</div>
              <div className="desk-meta">
                <span>{match.view.deskOdds}</span>
                <span>{"  ·  "}</span>
                <span>{match.view.deskStake}</span>
                {match.view.deskConf ? (
                  <>
                    <span>{"  ·  "}</span>
                    <span className={confidenceClass(match.confidence)}>{match.view.deskConf}</span>
                  </>
                ) : null}
              </div>
              {flag ? <div className="card-flag">{flag}</div> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
