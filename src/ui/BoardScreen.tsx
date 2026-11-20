import { useQuery } from "convex/react";
import { Component, type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { staticDemo } from "../dataMode.ts";
import { countLine, countStamps, defaultMatchId } from "../domain/present.ts";
import { staticBoard } from "../domain/staticBoard.ts";
import type { EditionView, SeedMatch, TodayBoard } from "../domain/view.ts";
import type { BoardSearch } from "../search.ts";
import { useDesktop } from "../useDesktop.ts";
import { Detail } from "./Detail.tsx";
import { CardList, DeskList } from "./List.tsx";
import { EmptyState, ErrorBoard, LoadingBoard, StaleLine } from "./States.tsx";

type BoundaryProps = { children: ReactNode; onRetry: () => void };
type BoundaryState = { failed: boolean };

class PoolBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <ErrorBoard onRetry={this.props.onRetry} />;
    return this.props.children;
  }
}

function Header(props: { edition: EditionView; matches: SeedMatch[] }) {
  const showCounts = props.edition.freshness !== "empty";
  const line = countLine(countStamps(props.matches), props.edition.verifiedAtHkt, props.edition.freshness === "stale");
  return (
    <>
      <header className="mast">
        <h1>今日心水</h1>
        <p className="kicker kicker-mobile">示範賽程 · 香港時間</p>
        <p className="kicker kicker-desktop">
          {showCounts
            ? `示範賽程 · ${props.edition.dateLabel} · 香港時間 · ${line}`
            : `示範賽程 · ${props.edition.dateLabel} · 香港時間`}
        </p>
      </header>
      {showCounts ? <p className="counts">{`${props.edition.dateLabel} · ${line}`}</p> : null}
      {props.edition.freshness === "stale" ? <StaleLine verifiedAtHkt={props.edition.verifiedAtHkt} /> : null}
      <p className="disclaimer">{props.edition.disclaimer}</p>
    </>
  );
}

type BoardProps = { matchId?: string; search: BoardSearch; desktop: boolean; onRetry: () => void };

function boardName(search: BoardSearch): "demo" | "empty" | "stale" | "error" {
  if (search.board === "empty" || search.board === "stale" || search.board === "error") return search.board;
  return "demo";
}

function ConvexLoaded(props: BoardProps) {
  const data = useQuery(api.board.today, { board: boardName(props.search) });
  return <BoardView {...props} data={data} />;
}

function StaticLoaded(props: BoardProps) {
  return <BoardView {...props} data={staticBoard(boardName(props.search))} />;
}

function BoardView(props: BoardProps & { data: TodayBoard | null | undefined }) {
  const { data } = props;
  const selected = data?.matches.find((match) => match.id === props.matchId);
  const fallback = data?.matches.find((match) => match.id === defaultMatchId(data.matches));
  const shown = props.matchId ? selected : fallback;

  useEffect(() => {
    if (!props.desktop && props.matchId && shown) {
      document.title = `${shown.home} 對 ${shown.away} · 今日心水`;
      return;
    }
    document.title = "今日心水";
  }, [props.desktop, props.matchId, shown]);

  if (data === undefined) return <LoadingBoard />;
  if (data === null) return <ErrorBoard onRetry={props.onRetry} />;

  if (!props.desktop && props.matchId) {
    return (
      <main>
        <Link to="/" search={props.search} className="back-link">
          今日心水
        </Link>
        <p className="demo-note">示範賽程 · 不是馬會彩池。</p>
        {data.edition.freshness === "stale" ? (
          <StaleLine verifiedAtHkt={data.edition.verifiedAtHkt} withTime />
        ) : null}
        {shown ? (
          <Detail key={shown.id} match={shown} size="mobile" heading />
        ) : (
          <p className="empty-hero">這場不在已核對場次。</p>
        )}
      </main>
    );
  }

  return (
    <main>
      <Header edition={data.edition} matches={data.matches} />
      {data.edition.freshness === "empty" ? (
        <EmptyState />
      ) : props.desktop ? (
        <>
          <p className="legend">列資料：時間 · 對賽 · 決定 · 心水／棄因／更新 · 賠率 · 注碼 · 信心。</p>
          <div className="split">
            <DeskList matches={data.matches} selectedId={shown?.id ?? null} search={props.search} />
            <div className="split-detail">
              {shown ? (
                <Detail key={shown.id} match={shown} size="desktop" heading={false} />
              ) : (
                <p className="empty-hero">這場不在已核對場次。</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <CardList matches={data.matches} search={props.search} />
      )}
    </main>
  );
}

export function BoardScreen(props: { matchId?: string; search: BoardSearch }) {
  const navigate = useNavigate();
  const desktop = useDesktop();
  const [attempt, setAttempt] = useState(0);
  const retry = () => {
    setAttempt((value) => value + 1);
    if (props.search.board === "error") {
      void navigate({
        to: props.matchId ? "/matches/$matchId" : "/",
        params: props.matchId ? { matchId: props.matchId } : {},
        search: {},
      });
    }
  };

  if (props.search.board === "loading") return <LoadingBoard />;

  return (
    <PoolBoundary key={`${props.search.board ?? "demo"}:${props.matchId ?? "list"}:${attempt}`} onRetry={retry}>
      {staticDemo ? (
        <StaticLoaded matchId={props.matchId} search={props.search} desktop={desktop} onRetry={retry} />
      ) : (
        <ConvexLoaded matchId={props.matchId} search={props.search} desktop={desktop} onRetry={retry} />
      )}
    </PoolBoundary>
  );
}
