export type BoardName = "empty" | "stale" | "error" | "loading";

export type BoardSearch = {
  board?: BoardName;
};

export function readBoard(search: Record<string, unknown>): BoardSearch {
  const board = search.board;
  if (board === "empty" || board === "stale" || board === "error" || board === "loading") {
    return { board };
  }
  return {};
}
