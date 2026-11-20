import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMatch } from "../src/domain/analyze.ts";
import { carryForward } from "../src/domain/carry.ts";
import { hktParts, nextWindow, openWindow } from "../src/domain/clock.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const query = fs.readFileSync(path.join(root, "scripts/matchlist.graphql"), "utf8");
const BET = "https://bet.hkjc.com/ch/football/home";
const FOOTBALL = "https://football.hkjc.com/zh-hk/home";
const GRAPH = "https://info.cld.hkjc.com/graphql/base-get/";

async function readPage(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
    redirect: "follow",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return { url: response.url, status: response.status, bytes: text.length, text };
}

async function readMatches() {
  const variables = {
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
  };
  const response = await fetch(GRAPH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
      referer: BET,
      origin: "https://bet.hkjc.com",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors) {
    throw new Error(body.errors?.[0]?.message ?? `odds ${response.status}`);
  }
  return body.data.matches ?? [];
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
  const [betPage, footballPage, matches] = await Promise.all([readPage(BET), readPage(FOOTBALL), readMatches()]);
  if (!footballPage.text.includes("足球") && !footballPage.text.includes("hkjc")) {
    throw new Error("football.hkjc.com page did not look like the public football site");
  }
  const day = matches.filter((match) => String(match.kickOffTime).startsWith(now.date));
  const previousFile = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;
  const priorRows = previousFile?.date === now.date ? [...(previousFile.today ?? []), ...(previousFile.history ?? [])] : [];
  const today = [];
  const history = [];
  for (const match of day) {
    const id = match.frontEndId || match.id;
    const analyzed = carryForward(analyzeMatch(match, window), priorRows.find((row) => row.id === id), match);
    if (analyzed.today) today.push(analyzed.today);
    if (analyzed.history) history.push(analyzed.history);
  }
  today.sort((a, b) => (a.phase === b.phase ? a.kickoffHkt.localeCompare(b.kickoffHkt) : a.phase === "進行中" ? -1 : 1));
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
      odds: "info.cld.hkjc.com/graphql/base-get matchList (the public query used by bet.hkjc.com/ch/football/home)",
      scope: "Hong Kong calendar day of this edition only. The multi-day coupon is not listed.",
    },
    today,
    history,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(board, null, 2));
  console.log(`window ${window} today ${today.length} history ${history.length} fetch ${now.time}`);
  for (const row of today) console.log(row.phase, row.kickoffHkt, row.stamp, row.hero);
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
