import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeMatch } from "./analyze.ts";
import { carryForward } from "./carry.ts";
import { hktParts, openWindow } from "./clock.ts";
import { composeEdition, editionWaitLine, f2VoidApplies, filterToday, F2_VOID_SENTENCE, officialPrintedScore } from "./edition.ts";
import { EDITION_19 } from "../editions/2026-11-20-19-00.ts";
import { formatLine, negateLine } from "./lines.ts";
import { settleHad, settleLine } from "./settle.ts";
import { waterBand } from "./rules.ts";
import { qaToday } from "../ui/qaBoard.ts";

describe("edition clock", () => {
  it("does not open an edition before 07:00 or from 23:00", () => {
    assert.equal(openWindow({ date: "2026-11-20", time: "06:59", minutes: 6 * 60 + 59 }), null);
    assert.equal(openWindow({ date: "2026-11-20", time: "23:10", minutes: 23 * 60 + 10 }), null);
    assert.equal(openWindow({ date: "2026-11-20", time: "19:40", minutes: 19 * 60 + 40 }), "19:00");
  });
});

describe("reader handicap", () => {
  it("writes +/- from the selected team", () => {
    assert.equal(formatLine([0.5, 1]), "+0.5/+1");
    assert.equal(formatLine(negateLine([1.5, 2])), "-1.5/-2");
    assert.equal(formatLine([0, 0.5]), "+0/+0.5");
  });
});

describe("settlement", () => {
  it("scores the original line and has no 贏半 grade", () => {
    assert.equal(settleHad(1, 0, "H"), "贏");
    assert.equal(settleHad(0, 1, "H"), "輸");
    assert.equal(settleLine(1, 0, "+0.5/+1"), "贏");
    assert.equal(settleLine(0, 2, "+0.5"), "輸");
    assert.equal(settleLine(0, 0, "+0"), "不入帳");
  });

  it("keeps 1.83 in the boundary band", () => {
    assert.equal(waterBand(1.83), "交界");
    assert.equal(waterBand(1.82), "交界");
  });
});

describe("official card scope", () => {
  it("labels a first-seen in-play match as observation", () => {
    const analyzed = analyzeMatch(
      {
        id: "1",
        frontEndId: "FB1",
        status: "FIRSTHALF",
        kickOffTime: "2026-11-20T20:45:00.000+08:00",
        homeTeam: { name_ch: "甲" },
        awayTeam: { name_ch: "乙" },
        foPools: [],
      },
      "19:00",
    );
    assert.equal(analyzed.today?.stamp, "觀");
    assert.equal(analyzed.today?.lineConfidence.kind, "不適用");
    assert.equal(analyzed.history, undefined);
  });

  it("does not print the F2 void sentence on a line F2 does not cover", () => {
    const analyzed = analyzeMatch(
      {
        id: "9",
        frontEndId: "FB9",
        status: "PREEVENT",
        kickOffTime: "2026-11-20T21:00:00.000+08:00",
        homeTeam: { name_ch: "艾杜哈尼" },
        awayTeam: { name_ch: "卡塔爾SC" },
        foPools: [
          {
            oddsType: "HDC",
            lines: [
              {
                main: true,
                condition: "+1.5/+2.0",
                combinations: [
                  { str: "H", currentOdds: "1.90" },
                  { str: "A", currentOdds: "1.77" },
                ],
              },
            ],
          },
        ],
      },
      "19:00",
    );
    assert.equal(analyzed.today?.invalidation.includes(F2_VOID_SENTENCE), false);
    assert.equal(f2VoidApplies({ depthName: "其他", upperOdds: 1.77, n: null, preMatch: true }), false);
  });
});

describe("published pick stays a pick", () => {
  it("tracks an already published take after kickoff instead of opening a new one", () => {
    const published = analyzeMatch(
      {
        id: "1",
        frontEndId: "FB1",
        status: "PREEVENT",
        kickOffTime: "2026-11-20T21:00:00.000+08:00",
        homeTeam: { name_ch: "甲" },
        awayTeam: { name_ch: "乙" },
        foPools: [
          {
            oddsType: "HDC",
            lines: [
              {
                main: true,
                condition: "+1.0/+1.5",
                combinations: [
                  { str: "H", currentOdds: "1.90" },
                  { str: "A", currentOdds: "1.76" },
                ],
              },
            ],
          },
        ],
      },
      "19:00",
    );
    const live = analyzeMatch(
      {
        id: "1",
        frontEndId: "FB1",
        status: "FIRSTHALF",
        kickOffTime: "2026-11-20T21:00:00.000+08:00",
        homeTeam: { name_ch: "甲" },
        awayTeam: { name_ch: "乙" },
        runningResult: { homeScore: 0, awayScore: 0 },
        foPools: [],
      },
      "22:00",
    );
    const carried = carryForward(live, published.today, {
      id: "1",
      frontEndId: "FB1",
      status: "FIRSTHALF",
      kickOffTime: "2026-11-20T21:00:00.000+08:00",
      homeTeam: { name_ch: "甲" },
      awayTeam: { name_ch: "乙" },
      runningResult: { homeScore: 0, awayScore: 0 },
    });
    assert.equal(carried.today?.stamp, "取");
    assert.equal(carried.today?.hero, "更新心水");
    assert.equal(carried.today?.decision.kind, "開波後追蹤");
    assert.equal(carried.history, undefined);
  });
});

describe("edition scope", () => {
  const coupon = [
    { frontEndId: "FB9191", home: "卡爾巴FC", away: "FC沙迦" },
    { frontEndId: "FB9196", home: "艾杜哈尼", away: "卡塔爾SC" },
    { frontEndId: "FB9198", home: "吉達艾阿里", away: "艾納斯", hdc: { condition: "0.0/+0.5", homeOdds: 2.05, awayOdds: 1.74, suspended: false } },
    { frontEndId: "FB9270", home: "大阪櫻花", away: "FC東京", hdc: { condition: "+0.5/+1.0", homeOdds: 2.05, awayOdds: 1.74, suspended: false } },
    { frontEndId: "FB9166", home: "鹿島鹿角", away: "清水心跳" },
  ];

  it("does not auto-take the coupon when there is no nomination", () => {
    const edition = composeEdition({ window: "19:00", nominations: null, checks: coupon });
    assert.equal(edition.held, true);
    assert.equal(edition.today.length, 0);
    assert.equal(edition.history.length, 0);
  });

  it("publishes only Ray's 19:00 list", () => {
    const full = officialPrintedScore(
      [
        { homeResult: 0, awayResult: 0, resultConfirmType: 5, payoutConfirmed: true, stageId: 3, resultType: 1, sequence: 1 },
        { homeResult: 1, awayResult: 1, resultConfirmType: 5, payoutConfirmed: true, stageId: 5, resultType: 1, sequence: 2 },
      ],
      5,
    );
    const edition = composeEdition({
      window: "19:00",
      nominations: EDITION_19,
      checks: coupon,
      fullTimeById: { FB9166: full },
    });
    assert.deepEqual(
      edition.today.map((row) => row.hero),
      ["HDC  艾納斯 0/-0.5  1.74", "HDC  FC東京 -0.5/-1  1.74"],
    );
    assert.equal(edition.today.some((row) => row.home === "卡爾巴FC" || row.away === "卡塔爾SC"), false);
    assert.equal(edition.history[0]?.id, "FB9166");
    assert.equal(edition.history[0]?.verdict, "不入帳");
    assert.equal(edition.history[0]?.officialResult?.score, "1-1");
    for (const row of edition.today) {
      assert.equal(row.lineConfidence.kind, "待公式");
      assert.equal(row.invalidation.includes(F2_VOID_SENTENCE), false);
      assert.equal(f2VoidApplies({ depthName: row.id === "FB9270" ? "讓半／一" : "平／半", upperOdds: 1.74, n: 8, preMatch: true }), false);
    }
  });

  it("keeps 鹿島 on 今日 when no official full-time score is published", () => {
    const edition = composeEdition({
      window: "19:00",
      nominations: EDITION_19.filter((item) => item.frontEndId === "FB9166"),
      checks: coupon,
      fullTimeById: { FB9166: null },
    });
    assert.equal(edition.today[0]?.stamp, "觀");
    assert.equal(edition.history.length, 0);
    assert.equal(edition.today[0]?.officialScore, undefined);
  });
});

describe("today filters", () => {
  it("shows only the selected phase", () => {
    const rows = [
      { phase: "未開" as const, kickoffHkt: "14:00" },
      { phase: "進行中" as const, kickoffHkt: "18:00" },
      { phase: "未開" as const, kickoffHkt: "01:30" },
    ];
    assert.deepEqual(filterToday(rows, "進行中").map((row) => row.phase), ["進行中"]);
    assert.deepEqual(filterToday(rows, "未開").map((row) => row.phase), ["未開", "未開"]);
    assert.equal(filterToday(rows, "全部")[0]?.phase, "進行中");
    assert.equal(filterToday(rows, "全部").length, 3);
  });
});

describe("wait line", () => {
  it("names the next window, not the one already on the masthead", () => {
    const line = editionWaitLine("22:00");
    assert.equal(line, "等待 22:00 定時提取並刊出");
    assert.equal(line?.includes("19:00"), false);
  });
});

describe("qa tracking", () => {
  it("treats a printed official score as settled observation", () => {
    const row = qaToday.find((item) => item.id === "qa-track");
    assert.equal(row?.officialScore, "1-0");
    assert.equal(row?.decision.kind, "原選已結算觀察");
    assert.equal(row?.hero.includes("更新心水"), false);
    assert.equal(row?.invalidation.includes("本觀察即失效"), false);
    assert.equal(row?.lineConfidence.kind === "示範佔位", false);
  });
});

describe("hkt", () => {
  it("reads a fixed instant in Hong Kong", () => {
    const parts = hktParts(new Date("2026-11-20T12:00:00.000Z"));
    assert.equal(parts.time, "20:00");
  });
});
