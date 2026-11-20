import type { MatchListRow } from "./types.ts";

/** Visible copy stored with the match so the board renders the document, not a second editorial source. */
export type MatchView = {
  listMeta: string;
  flagLine?: string;
  deskFlag?: string;
  deskHero: string;
  deskOdds: string;
  deskStake: string;
  deskConf: string;
  detailHero: string;
  slotLabel: string;
  detailExtra?: string;
  oddsLine: string;
  detailMeta: string;
  printedLine?: string;
  neutralNote?: string;
  steps: Array<{ n: string; title: string; body: string }>;
  filtersLine: string;
};

export type SeedMatch = MatchListRow & { view: MatchView };

export type EditionView = {
  label: "示範賽程";
  dateLabel: string;
  verifiedAtHkt: string;
  freshness: "current" | "stale" | "empty";
  disclaimer: string;
};

export type TodayBoard = {
  edition: EditionView;
  matches: SeedMatch[];
};
