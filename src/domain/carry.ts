import { isFullTime, isInPlay, type RawMatch } from "./analyze.ts";
import { settlePick } from "./settle.ts";
import { EMPTY_CONFIDENCE, PENDING_CONFIDENCE, type HistoryRow, type MatchListRow, type PublishedPick } from "./types.ts";

function publishedPick(row: MatchListRow): PublishedPick | null {
  const decision = row.decision;
  if (decision.kind === "取場" || decision.kind === "F1改做HIL") return decision.pick;
  if (decision.kind === "開波後追蹤" || decision.kind === "原選已結算觀察") return decision.original;
  return null;
}

function isPriorDrop(row: MatchListRow): boolean {
  return row.decision.kind === "棄單" || row.decision.kind === "賽前棄單即場更新";
}

function sideOf(pick: PublishedPick, home: string, away: string): "H" | "A" | "D" | null {
  if (pick.selection.startsWith(home)) return "H";
  if (pick.selection.startsWith(away)) return "A";
  return null;
}

function lineOf(selection: string): string | null {
  const match = selection.match(/[+-][0-9.]+(?:\/[+-]?[0-9.]+)?/);
  return match?.[1] ?? null;
}

function scoreOf(match: RawMatch): { home: number; away: number; text: string } | null {
  const score = match.runningResult;
  if (score?.homeScore == null || score.awayScore == null) return null;
  return { home: score.homeScore, away: score.awayScore, text: `${score.homeScore}-${score.awayScore}` };
}

function historyFromPick(row: MatchListRow, pick: PublishedPick, match: RawMatch, verdict: HistoryRow["verdict"]): HistoryRow {
  const score = scoreOf(match);
  return {
    id: row.id,
    kickoffHkt: row.kickoffHkt,
    home: row.home,
    away: row.away,
    stamp: "取",
    originalSelection: { market: pick.market, selection: pick.selection },
    officialResult: score ? { score: score.text } : null,
    verdict,
    lineConfidence: pick.lineConfidence,
    publishedAtWindow: pick.publishedAtWindow,
    decisionKind: "取場",
  };
}

/**
 * A later fetch is not a new edition of a match already published today.
 * Prematch 取 stays a 取 while the match is in play (更新心水) and settles only at full time.
 * A match first seen after kickoff stays 即場觀察.
 */
export function carryForward(
  analyzed: { today?: MatchListRow; history?: HistoryRow },
  previous: MatchListRow | HistoryRow | undefined,
  match: RawMatch,
): { today?: MatchListRow; history?: HistoryRow } {
  if (!previous) return analyzed;
  if ("verdict" in previous) {
    if (previous.verdict === "贏" || previous.verdict === "輸" || previous.verdict === "不入帳") return { history: previous };
    return analyzed.history ? { history: analyzed.history } : analyzed;
  }
  const pick = publishedPick(previous);
  const full = isFullTime(match.status);
  const inPlay = isInPlay(match.status);
  if (!pick) {
    if (!isPriorDrop(previous) || (!inPlay && !full)) return analyzed;
    if (full) {
      return {
        history: {
          id: previous.id,
          kickoffHkt: previous.kickoffHkt,
          home: previous.home,
          away: previous.away,
          stamp: "棄",
          originalSelection: null,
          officialResult: scoreOf(match) ? { score: scoreOf(match)!.text } : null,
          verdict: "不入帳",
          lineConfidence: EMPTY_CONFIDENCE,
          publishedAtWindow: previous.publishedAtWindow,
          decisionKind: "棄單",
        },
      };
    }
    return {
      today: {
        ...previous,
        phase: "進行中",
        decision: {
          kind: "賽前棄單即場更新",
          stamp: "棄",
          heroLabel: "即場觀察",
          lineConfidence: EMPTY_CONFIDENCE,
          reason: "賽前已棄。開波後只作觀察，不開新心水。",
        },
        hero: "即場觀察",
        stamp: "棄",
        lineConfidence: EMPTY_CONFIDENCE,
        officialScore: scoreOf(match)?.text,
        flags: ["即場觀察"],
      },
    };
  }
  const score = scoreOf(match);
  if (full) {
    const side = sideOf(pick, previous.home, previous.away);
    const verdict =
      score && side
        ? settlePick({ market: pick.market, home: score.home, away: score.away, line: lineOf(pick.selection), side })
        : "待結算";
    return { history: historyFromPick(previous, pick, match, verdict) };
  }
  if (!inPlay) return analyzed;
  const suspended = analyzed.today?.decision.kind === "暫停受注" || analyzed.today?.decision.kind === "即場暫停";
  const updated = analyzed.today?.inPlayUpdatedAtHkt;
  if (suspended) {
    return {
      today: {
        ...previous,
        phase: "進行中",
        decision: { kind: "即場暫停", oddsDisplay: "---", pausedCopy: "暫停", inPlayUpdatedAtHkt: updated ?? previous.kickoffHkt },
        hero: "暫停",
        stamp: "取",
        lineConfidence: PENDING_CONFIDENCE,
        inPlayUpdatedAtHkt: updated,
        officialScore: score?.text,
        flags: ["即場追蹤", "暫停 ---"],
      },
    };
  }
  const inPlayOdds = analyzed.today?.path.water.inPlayOdds;
  return {
    today: {
      ...previous,
      phase: "進行中",
      decision: {
        kind: "開波後追蹤",
        stamp: "取",
        heroLabel: "更新心水",
        original: pick,
        originalSettled: false,
        inPlayOdds: inPlayOdds ?? {
          status: "suspended",
          display: "---",
          isPreMatch: false,
          label: "即場",
          pausedCopy: "暫停",
          source: "bet.hkjc.com",
          verified: true,
        },
      },
      hero: "更新心水",
      stamp: "取",
      lineConfidence: pick.lineConfidence,
      inPlayUpdatedAtHkt: updated,
      officialScore: score?.text,
      flags: ["即場追蹤"],
    },
  };
}
