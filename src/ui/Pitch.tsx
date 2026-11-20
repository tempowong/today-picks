import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import boardData from "../generated/board.json";
import { qaHistory, qaToday } from "./qaBoard.ts";
import { confidenceLabel } from "../domain/analyze.ts";
import { editionWaitLine, filterToday } from "../domain/edition.ts";
import { EDITION_WINDOWS, type EditionWindow, type HistoryRow, type MatchListRow } from "../domain/types.ts";
import { useDesktop } from "../useDesktop.ts";

type BoardFile = {
  beforeFirst: boolean;
  waiting: string | null;
  nowHkt: string;
  currentWindow?: EditionWindow | null;
  nextWindow?: EditionWindow | null;
  job: { window: EditionWindow; status: string; fetchedAtHkt: string | null; sources: ["bet.hkjc.com", "football.hkjc.com"] } | null;
  lastSuccessAtHkt: string | null;
  failure?: boolean;
  today: MatchListRow[];
  history: HistoryRow[];
};

const board = boardData as unknown as BoardFile;
type Preview = "live" | "before" | "error" | "loading" | "between" | "empty" | "qa";
type TodayPhase = "進行中" | "未開";
type HistFilter = "全部" | "贏" | "輸" | "不入帳";

function previewOf(value: unknown): Preview {
  if (value === "before" || value === "error" || value === "loading" || value === "between" || value === "empty" || value === "qa") return value;
  return "live";
}

export function TeamVs(props: { home: string; away: string }) {
  return (
    <div className="vs">
      <b>{props.home}</b>
      <i>VS</i>
      <b>{props.away}</b>
    </div>
  );
}

function Stamp(props: { kind: "取" | "棄" | "觀" }) {
  return (
    <div className="stamp" data-kind={props.kind}>
      {props.kind}
    </div>
  );
}

function Mast(props: { window: string; next: string }) {
  return (
    <header className="mast">
      <h1>今日心水</h1>
      <p className="mast-meta">
        香港時間 {board.nowHkt} · 本刊 {props.window} · 下次 {props.next}
      </p>
    </header>
  );
}

function Tabs(props: { current: "今日" | "往績" }) {
  return (
    <nav className="tabs">
      <Link to="/" className={props.current === "今日" ? "tab on" : "tab"}>
        今日
      </Link>
      <Link to="/history" className={props.current === "往績" ? "tab on" : "tab"}>
        往績
      </Link>
    </nav>
  );
}

function counts(rows: { stamp: string }[], labels: ["取" | "棄" | "觀", string][]) {
  return labels.map(([stamp, label]) => ({ label, value: String(rows.filter((row) => row.stamp === stamp).length) }));
}

function leftOf(row: MatchListRow): string {
  const odds = row.path.water.inPlayOdds;
  if (row.decision.kind === "即場觀察" && odds?.status === "suspended") return "暫停 ---";
  if (row.decision.kind === "即場觀察" && odds && odds.status === "published") {
    return `即場 HAD ${odds.value.toFixed(2)}`;
  }
  if (row.decision.kind === "開波後追蹤" && row.decision.inPlayOdds.status === "published") {
    return `即場 ${row.decision.inPlayOdds.value.toFixed(2)}`;
  }
  if (row.decision.kind === "原選已結算觀察") return `原選 ${row.decision.original.selection}`;
  if (row.decision.kind === "暫停受注" || row.decision.kind === "即場暫停") return "暫停 ---";
  if (row.decision.kind === "棄單") return row.decision.code === "其他" ? "棄單" : `${row.decision.code} 棄單`;
  return row.hero;
}

function rightOf(row: MatchListRow): { text: string; dim: boolean } {
  const text = confidenceLabel(row.lineConfidence);
  return { text, dim: row.lineConfidence.kind === "不適用" || text === "-" };
}

function TodayCard(props: { row: MatchListRow; selected?: boolean; search?: { phase?: string; preview?: string } }) {
  const right = rightOf(props.row);
  const meta = [
    props.row.publishedAtWindow ? `刊於 ${props.row.publishedAtWindow}` : "",
    props.row.flags.join(" · "),
    props.row.inPlayUpdatedAtHkt ? `更新 ${props.row.inPlayUpdatedAtHkt}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      to="/m/$matchId"
      params={{ matchId: props.row.id }}
      search={props.search ?? {}}
      className={props.selected ? "card selected" : "card"}
      data-match-id={props.row.id}
    >
      <div className="card-top">
        <Stamp kind={props.row.stamp} />
        <div className="card-body">
          <div className="meta">
            {props.row.kickoffHkt} · {meta}
          </div>
          <TeamVs home={props.row.home} away={props.row.away} />
          {props.row.decision.kind !== "取場" ? <p className="reason">{props.row.hero}</p> : null}
        </div>
      </div>
      <div className="tiles">
        <div className="tile">{leftOf(props.row)}</div>
        <div className={right.dim ? "tile dim" : "tile"}>{right.text === "-" ? "-" : `盤口信心 ${right.text}`}</div>
      </div>
    </Link>
  );
}

function HistoryCard(props: { row: HistoryRow; selected?: boolean }) {
  const verdictClass = props.row.verdict === "贏" ? "verdict win" : props.row.verdict === "輸" ? "verdict loss" : "verdict plain";
  return (
    <Link
      to="/history/$matchId"
      params={{ matchId: props.row.id }}
      className={props.selected ? "card selected" : "card"}
      data-match-id={props.row.id}
    >
      <div className="card-top">
        <Stamp kind={props.row.stamp} />
        <div className="card-body">
          <div className="meta">
            {props.row.kickoffHkt} · {props.row.publishedAtWindow ? `刊於 ${props.row.publishedAtWindow}` : props.row.decisionKind} ·{" "}
            {props.row.officialResult ? `官果 ${props.row.officialResult.score}` : "官果未刊"}
          </div>
          <TeamVs home={props.row.home} away={props.row.away} />
        </div>
      </div>
      <div className="tiles">
        <div className="tile">原選 {props.row.originalSelection?.selection ?? "無賽前刊出心水"}</div>
        <div className={`tile ${verdictClass}`}>{props.row.verdict}</div>
      </div>
      <div className="meta" style={{ marginTop: 8 }}>
        盤口信心 {confidenceLabel(props.row.lineConfidence)}
      </div>
    </Link>
  );
}

function Steps(props: { row: MatchListRow }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ "1": true });
  const bodies = props.row.stepNotes ?? [
    "只讀 bet.hkjc.com/ch/football/home 與 football.hkjc.com。先 HAD，有刊出再 HHA／HDC／HIL。電視標記不是市場。",
    props.row.path.water.band
      ? `賽前水位帶：${props.row.path.water.band}。即場價不另分類。`
      : "無賽前水位可分類。即場價只標「即場」，不觸發或解除 F2／F3。",
    `盤口 ${props.row.path.depth.line}，${props.row.path.depth.depth}。${props.row.path.depth.inPlayDescriptiveOnly ? "即場盤深只作描述。" : ""}`,
    props.row.path.record.n == null
      ? "同場地近績未見於這次公開提取，n 不補至 10。F2／F3 因此不綁定。"
      : `同場地 n 為 ${props.row.path.record.n}，不補至 10。${props.row.path.record.binding}。`,
    `意圖：${props.row.path.intent}。只跟賽前。`,
  ];
  const titles = ["來源", "水位帶", "盤深（含倒掛）", "戰績", "操盤意圖"];
  return (
    <div className="steps">
      {titles.map((title, index) => {
        const n = String(index + 1);
        const isOpen = open[n] === true;
        return (
          <div className="step" key={n}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((current) => ({ ...current, [n]: !isOpen }))}>
              {isOpen ? "▾ " : ""}
              {n}. {title}
            </button>
            {isOpen ? <p>{bodies[index]}</p> : null}
          </div>
        );
      })}
      <p className="filters">
        F1 {props.row.filters.f1} · F2 {props.row.filters.f2} · F3 {props.row.filters.f3}
      </p>
    </div>
  );
}

function TodayDetail(props: { row: MatchListRow; desktop: boolean }) {
  const right = rightOf(props.row);
  return (
    <article className="detail" data-match-id={props.row.id}>
      {!props.desktop ? (
        <Link to="/" className="back-link">
          今日
        </Link>
      ) : null}
      <p className="meta">
        開賽 {props.row.kickoffHkt} 香港時間 · {props.row.phase}
        {props.row.publishedAtWindow ? ` · 刊於 ${props.row.publishedAtWindow}` : ""}
        {props.row.phase === "進行中" ? ` · 即場${props.row.inPlayUpdatedAtHkt ? ` · 更新 ${props.row.inPlayUpdatedAtHkt}` : ""}` : ""}
        {props.row.officialScore ? ` · 官果 ${props.row.officialScore}` : ""}
        {props.row.decision.kind === "開波後追蹤" ? " · 原選未結算" : ""}
        {props.row.decision.kind === "原選已結算觀察" ? " · 原選已結算" : ""}
      </p>
      <TeamVs home={props.row.home} away={props.row.away} />
      <div className="card-top" style={{ marginTop: 16 }}>
        <Stamp kind={props.row.stamp} />
        <div>
          <p className="slot">
            {props.row.decision.kind === "開波後追蹤"
              ? "更新心水"
              : props.row.decision.kind === "原選已結算觀察" ||
                  props.row.decision.kind === "即場觀察" ||
                  props.row.decision.kind === "賽前棄單即場更新"
                ? "即場觀察"
                : props.row.decision.kind === "即場暫停" || props.row.decision.kind === "暫停受注"
                  ? "暫停"
                  : props.row.stamp === "取"
                    ? "最終心水"
                    : "棄單原因"}
          </p>
          <h2 className={props.desktop ? "hero desk" : "hero"}>{props.row.hero}</h2>
          <p className="odds-line">{leftOf(props.row)}</p>
          <p className={right.dim ? "conf dim" : "conf"}>盤口信心 {right.text}</p>
        </div>
      </div>
      <p className="invalid">{props.row.invalidation}</p>
      <Steps row={props.row} />
    </article>
  );
}

export function TodayPage(props: { matchId?: string; search: { phase?: string; preview?: string } }) {
  const desktop = useDesktop();
  const navigate = useNavigate();
  const preview = previewOf(props.search.preview);
  const phase: TodayPhase | "全部" =
    props.search.phase === "未開" || props.search.phase === "進行中" ? props.search.phase : "全部";
  if (preview === "loading") {
    return (
      <main className="board" aria-busy="true">
        <Mast window="--" next="07:00" />
        <Tabs current="今日" />
        {[0, 1, 2].map((key) => (
          <div className="sk" key={key} aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        ))}
      </main>
    );
  }
  if (preview === "error" || board.failure) {
    return (
      <main className="board">
        <Mast window={board.currentWindow ?? "--"} next={board.nextWindow ?? "07:00"} />
        <Tabs current="今日" />
        <p className="empty">無法讀取公開彩池</p>
        <button type="button" className="retry" onClick={() => navigate({ to: "/", search: {} })}>
          重試
        </button>
      </main>
    );
  }
  if (preview === "before" || board.beforeFirst) {
    return (
      <main className="board">
        <Mast window="--" next="07:00" />
        <Tabs current="今日" />
        <p className="empty">等待07:00 首刊</p>
      </main>
    );
  }
  const todayRows = preview === "qa" ? qaToday : preview === "empty" ? [] : board.today;
  const rows = filterToday(todayRows, phase);
  const selected = props.matchId ? todayRows.find((row) => row.id === props.matchId) : rows.find((row) => row.phase === "進行中") ?? rows[0];
  const showDetail = Boolean(props.matchId) || desktop;
  return (
    <main className="board">
      <Mast window={board.job?.window ?? "--"} next={board.nextWindow ?? "--"} />
      <Tabs current="今日" />
      <div className="rail">
        {EDITION_WINDOWS.map((window) => {
          const current = window === board.currentWindow;
          const future = board.currentWindow ? window > board.currentWindow : true;
          const className = current ? "chip now" : future ? "chip future" : "chip past";
          return (
            <span key={window} className={className}>
              {window}
              {current ? " 本刊" : ""}
            </span>
          );
        })}
      </div>
      {preview === "qa" ? <p className="wait">示範佔位，不是本刊</p> : null}
      {preview !== "qa" && (preview === "between" || board.waiting) ? (
        <p className="wait">{editionWaitLine(board.nextWindow ?? null) ?? board.waiting}</p>
      ) : null}
      <div className="counts">
        {counts(todayRows, [
          ["取", "取"],
          ["棄", "棄"],
          ["觀", "觀察"],
        ]).map((item) => (
          <div className="count" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="section-head">
        <h2>
          <i className="bar" />
          當下賽事
        </h2>
        <div className="fetch-time">核對時間 {board.lastSuccessAtHkt}</div>
      </div>
      <div className="phases">
        {(["進行中", "未開"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={item === phase ? "phase on" : "phase"}
            onClick={() =>
              navigate({
                to: props.matchId ? "/m/$matchId" : "/",
                params: props.matchId ? { matchId: props.matchId } : {},
                search: {
                  ...(props.search.preview ? { preview: props.search.preview } : {}),
                  ...(phase === item ? {} : { phase: item }),
                },
              })
            }
          >
            {item}
          </button>
        ))}
      </div>
      {preview === "empty" || rows.length === 0 ? (
        <p className="empty">{preview === "empty" || todayRows.length === 0 ? "今日未有已核對場次" : "沒有符合此篩選的場次"}</p>
      ) : null}
      <div className="split">
        {preview !== "empty" && (!props.matchId || desktop) && (
          <div className="list">
            {rows.map((row) => (
              <TodayCard
                key={row.id}
                row={row}
                selected={desktop && row.id === selected?.id}
                search={{
                  ...(phase === "全部" ? {} : { phase }),
                  ...(preview === "live" ? {} : { preview }),
                }}
              />
            ))}
            <div className="pad-bottom" />
          </div>
        )}
        {preview !== "empty" && showDetail && selected ? (
          <div className="detail-pane">
            <TodayDetail row={selected} desktop={desktop} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function HistoryPage(props: { matchId?: string; search: { filter?: string; preview?: string } }) {
  const desktop = useDesktop();
  const navigate = useNavigate();
  const filter: HistFilter =
    props.search.filter === "贏" || props.search.filter === "輸" || props.search.filter === "不入帳" ? props.search.filter : "全部";
  const historyRows = props.search.preview === "qa" ? qaHistory : board.history;
  const rows = historyRows.filter((row) => (filter === "全部" ? true : row.verdict === filter));
  const selected = rows.find((row) => row.id === props.matchId) ?? rows[0];
  const tally = {
    贏: historyRows.filter((row) => row.verdict === "贏").length,
    輸: historyRows.filter((row) => row.verdict === "輸").length,
    不入帳: historyRows.filter((row) => row.verdict === "不入帳").length,
  };
  return (
    <main className="board">
      <Mast window={board.job?.window ?? "--"} next={board.nextWindow ?? "--"} />
      <Tabs current="往績" />
      <div className="counts">
        {(
          [
            ["贏", tally.贏],
            ["輸", tally.輸],
            ["不入帳", tally.不入帳],
          ] as const
        ).map(([label, value]) => (
          <div className="count" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="section-head">
        <h2>
          <i className="bar" />
          已完場
        </h2>
        <div className="fetch-time">核對時間 {board.lastSuccessAtHkt}</div>
      </div>
      <div className="phases">
        {(["全部", "贏", "輸", "不入帳"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={item === filter ? "phase on" : "phase"}
            onClick={() => navigate({ to: "/history", search: { filter: item } })}
          >
            {item}
          </button>
        ))}
      </div>
      {rows.length === 0 ? <p className="empty">沒有符合此篩選的往績</p> : null}
      <div className="split">
        {(!props.matchId || desktop) && (
          <div className="list">
            {rows.map((row) => (
              <HistoryCard key={row.id} row={row} selected={desktop && row.id === selected?.id} />
            ))}
          </div>
        )}
        {selected && (desktop || props.matchId) ? (
          <div className="detail-pane">
            <article className="detail">
              {!desktop ? (
                <Link to="/history" className="back-link">
                  往績
                </Link>
              ) : null}
              <p className="meta">
                開賽 {selected.kickoffHkt} 香港時間 · 已完場
              </p>
              <TeamVs home={selected.home} away={selected.away} />
              <div className="card-top" style={{ marginTop: 16 }}>
                <Stamp kind={selected.stamp} />
                <div>
                  <p className="slot">往績結算</p>
                  <h2 className={desktop ? "hero desk" : "hero"}>原選 {selected.originalSelection?.selection ?? "無賽前刊出心水"}</h2>
                  <p className="odds-line">{selected.officialResult ? `官果 ${selected.officialResult.score}` : "官果未刊"}</p>
                  <p className={selected.verdict === "贏" ? "verdict win" : selected.verdict === "輸" ? "verdict loss" : "verdict plain"}>
                    {selected.verdict}
                  </p>
                  <p className="conf dim">盤口信心 {confidenceLabel(selected.lineConfidence)}</p>
                </div>
              </div>
              <p className="invalid">{selected.note ?? "結算對原選與官果。棄單與即場觀察不入帳。完場後不再分析即場盤口。"}</p>
            </article>
          </div>
        ) : null}
      </div>
    </main>
  );
}
