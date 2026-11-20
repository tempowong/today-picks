import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { BoardScreen } from "./ui/BoardScreen.tsx";
import { readBoard } from "./search.ts";

const rootRoute = createRootRoute({
  component: () => (
    <div className="page">
      <Outlet />
    </div>
  ),
  notFoundComponent: () => (
    <main>
      <Link to="/" className="back-link">
        今日心水
      </Link>
      <p className="empty-hero">今日未有已核對場次</p>
    </main>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: readBoard,
  component: function IndexPage() {
    const search = indexRoute.useSearch();
    return <BoardScreen search={search} />;
  },
});

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/matches/$matchId",
  validateSearch: readBoard,
  component: function MatchPage() {
    const search = matchRoute.useSearch();
    const { matchId } = matchRoute.useParams();
    return <BoardScreen matchId={matchId} search={search} />;
  },
});

const routeTree = rootRoute.addChildren([indexRoute, matchRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
