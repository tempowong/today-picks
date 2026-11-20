import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { HistoryPage, TodayPage } from "./ui/Pitch.tsx";

const rootRoute = createRootRoute({
  component: () => (
    <div className="page">
      <Outlet />
    </div>
  ),
});

function readToday(search: Record<string, unknown>): { phase?: string; preview?: string } {
  const result: { phase?: string; preview?: string } = {};
  if (typeof search.phase === "string") result.phase = search.phase;
  if (typeof search.preview === "string") result.preview = search.preview;
  return result;
}

function readHistory(search: Record<string, unknown>): { filter?: string; preview?: string } {
  const result: { filter?: string; preview?: string } = {};
  if (typeof search.filter === "string") result.filter = search.filter;
  if (typeof search.preview === "string") result.preview = search.preview;
  return result;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: readToday,
  component: function IndexPage() {
    return <TodayPage search={indexRoute.useSearch()} />;
  },
});

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/m/$matchId",
  validateSearch: readToday,
  component: function MatchPage() {
    const { matchId } = matchRoute.useParams();
    return <TodayPage matchId={matchId} search={matchRoute.useSearch()} />;
  },
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  validateSearch: readHistory,
  component: function HistoryIndex() {
    return <HistoryPage search={historyRoute.useSearch()} />;
  },
});

const historyMatchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history/$matchId",
  validateSearch: readHistory,
  component: function HistoryMatch() {
    const { matchId } = historyMatchRoute.useParams();
    return <HistoryPage matchId={matchId} search={historyMatchRoute.useSearch()} />;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, matchRoute, historyRoute, historyMatchRoute]);
const basepath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const router = createRouter({
  routeTree,
  ...(basepath ? { basepath } : {}),
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
