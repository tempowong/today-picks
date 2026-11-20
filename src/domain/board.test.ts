import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeMatch } from "./analyze.ts";
import { carryForward } from "./carry.ts";
import { hktParts, openWindow } from "./clock.ts";
import { formatLine, negateLine } from "./lines.ts";
import { settleHad, settleLine } from "./settle.ts";
import { waterBand } from "./rules.ts";

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

describe("hkt", () => {
  it("reads a fixed instant in Hong Kong", () => {
    const parts = hktParts(new Date("2026-11-20T12:00:00.000Z"));
    assert.equal(parts.time, "20:00");
  });
});
