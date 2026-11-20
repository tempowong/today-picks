import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { composeEdition, officialPrintedScore } from "../src/domain/edition.ts";
import { nominationsFor } from "../src/editions/2026-11-20-19-00.ts";
import { hktParts, nextWindow, openWindow } from "../src/domain/clock.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const matchQuery = fs.readFileSync(path.join(root, "scripts/matchlist.graphql"), "utf8");
const resultQuery = fs.readFileSync(path.join(root, "scripts/match-results.graphql"), "utf8");
const BET = "https://bet.hkjc.com/ch/football/home";
const FOOTBALL = "https://football.hkjc.com/zh-hk/home";
const GRAPH = "https://info.cld.hkjc.com/graphql/base-get/";

async function readJson(response) {
  const buf = Buffer.from(await response.arrayBuffer());
  const text = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
  return JSON.parse(text);
}

async function readPage(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
    redirect: "follow",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return { url: response.url, status: response.status, bytes: text.length, text };
}

async function postQuery(query, variables, referer) {
  const response = await fetch(GRAPH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
      referer,
      origin: "https://bet.hkjc.com",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await readJson(response);
  if (!response.ok || body.errors) throw new Error(body.errors?.[0]?.message ?? `odds ${response.status}`);
  return body.data;
}

async function readMatches() {
  const data = await postQuery(
    matchQuery,
    {
      fbOddsTypes: ["HAD", "HHA", "HDC", "HIL"],
      fbOddsTypesM: ["HAD", "HHA", "HDC", "HIL"],
      inplayOnly: false,
      featuredMatchesOnly: false,
      startDate: null,
      endDate: null,
      tournIds: null,
      matchIds: null,
      frontEndIds: null,
      earlySettlementOnly: false,
      showAllMatch: true,
      startIndex: null,
      endIndex: null,
    },
    BET,
  );
  return data.matches ?? [];
}

async function readResults(date) {
  const compact = date.replaceAll("-", "");
  const rows = [];
  for (let page = 0; page < 5; page += 1) {
    const startIndex = page * 20 + 1;
    const data = await postQuery(
      resultQuery,
      { startDate: compact, endDate: compact, startIndex, endIndex: startIndex + 19, teamId: null },
      "https://bet.hkjc.com/ch/football/results",
    );
    const batch = data.matches ?? [];
    rows.push(...batch);
    if (batch.length < 20) break;
  }
  return rows;
}

function poolCheck(match) {
  const hdc = (match.foPools ?? []).find((pool) => pool.oddsType === "HDC");
  const line = hdc?.lines?.find((item) => item.main) ?? hdc?.lines?.[0];
  const home = line?.combinations?.find((item) => item.str === "H");
  const away = line?.combinations?.find((item) => item.str === "A");
  const suspended =
    !line ||
    line.status === "SUSPENDED" ||
    String(hdc?.status ?? "").includes("SUSPEND") ||
    line.combinations?.every((item) => item.currentOdds === "---" || item.status === "SUSPENDED") === true;
  return {
    frontEndId: match.frontEndId,
    home: match.homeTeam?.name_ch ?? "",
    away: match.awayTeam?.name_ch ?? "",
    status: match.status,
    hdc: line
      ? {
          condition: line.condition ?? "",
          homeOdds: home?.currentOdds != null ? Number(home.currentOdds) : null,
          awayOdds: away?.currentOdds != null ? Number(away.currentOdds) : null,
          suspended,
        }
      : undefined,
  };
}

const now = hktParts();
const window = openWindow(now);
const outPath = path.join(root, "src/generated/board.json");

if (!window) {
  if (fs.existsSync(outPath)) {
    console.log("outside 07:00–22:00, previous edition kept");
    process.exit(0);
  }
  const board = {
    beforeFirst: true,
    waiting: "等待07:00 首刊",
    nowHkt: now.time,
    date: now.date,
    job: null,
    lastSuccessAtHkt: null,
    today: [],
    history: [],
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(board, null, 2));
  console.log("before 07:00, wrote waiting board");
  process.exit(0);
}

try {
  const [betPage, footballPage, matches, results] = await Promise.all([
    readPage(BET),
    readPage(FOOTBALL),
    readMatches(),
    readResults(now.date),
  ]);
  if (!footballPage.text.includes("足球") && !footballPage.text.includes("hkjc")) {
    throw new Error("football.hkjc.com page did not look like the public football site");
  }
  const nominations = nominationsFor(now.date, window);
  if (!nominations) {
    console.log(`window ${window} has no nomination file; previous edition kept`);
    process.exit(0);
  }
  const checks = matches.map(poolCheck);
  const fullTimeById = {};
  const verified = [];
  for (const nomination of nominations) {
    const result = results.find((match) => match.frontEndId === nomination.frontEndId);
    const full = officialPrintedScore(result?.results, 5);
    const half = officialPrintedScore(result?.results, 3);
    fullTimeById[nomination.frontEndId] = full;
    const listed = checks.find((item) => item.frontEndId === nomination.frontEndId);
    const check = listed ?? (result
      ? { frontEndId: result.frontEndId, home: result.homeTeam?.name_ch ?? "", away: result.awayTeam?.name_ch ?? "", status: result.status }
      : undefined);
    if (!listed && check) checks.push(check);
    verified.push({
      frontEndId: nomination.frontEndId,
      poolHome: check?.home ?? null,
      poolAway: check?.away ?? null,
      namesMatch: check?.home === nomination.home && check?.away === nomination.away,
      hdc: check?.hdc ?? null,
      publishedOdds: nomination.odds,
      halfTime: half,
      fullTime: full,
      resultStatus: result?.status ?? null,
    });
  }
  const edition = composeEdition({ window, nominations, checks, fullTimeById });
  const board = {
    beforeFirst: false,
    waiting: nextWindow(now) ? `等待 ${nextWindow(now)} 定時提取並刊出` : null,
    nowHkt: now.time,
    date: now.date,
    currentWindow: window,
    nextWindow: nextWindow(now),
    job: {
      window,
      status: "已刊出",
      fetchedAtHkt: now.time,
      sources: ["bet.hkjc.com", "football.hkjc.com"],
    },
    lastSuccessAtHkt: now.time,
    fetch: {
      bet: { url: BET, status: betPage.status, bytes: betPage.bytes },
      football: { url: FOOTBALL, status: footballPage.status, bytes: footballPage.bytes },
      odds: "info.cld.hkjc.com/graphql/base-get matchList and matchResult",
      ingest: "src/editions/2026-11-20-19-00.ts is Ray's 定時推薦 for this window. A fetch does not create 取 rows by itself.",
      scope: "Nominated or already published matches only. The public coupon is not listed.",
      verified,
    },
    today: edition.today,
    history: edition.history,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(board, null, 2));
  console.log(`window ${window} today ${edition.today.length} history ${edition.history.length} fetch ${now.time}`);
  for (const row of edition.today) console.log("today", row.phase, row.kickoffHkt, row.stamp, row.hero);
  for (const row of edition.history) console.log("history", row.stamp, row.verdict, row.officialResult?.score, row.home);
  for (const item of verified) console.log("check", item.frontEndId, item.namesMatch, item.hdc?.condition, item.hdc?.awayOdds, "ft", item.fullTime);
} catch (error) {
  const previous = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;
  const board = {
    ...(previous ?? { today: [], history: [] }),
    beforeFirst: false,
    failure: true,
    waiting: null,
    nowHkt: now.time,
    job: {
      window,
      status: "提取失敗",
      fetchedAtHkt: null,
      sources: ["bet.hkjc.com", "football.hkjc.com"],
    },
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(board, null, 2));
  console.error(error);
  process.exitCode = 1;
}
