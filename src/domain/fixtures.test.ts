import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIXTURES } from "../../convex/fixtures.ts";
import { compareMatches } from "./order.ts";
import { countLine, countStamps, defaultMatchId, kickLine } from "./present.ts";
import {
  expectedBinding,
  f2State,
  f3State,
  preMatchIntent,
  roundRatio,
  waterBand,
} from "./rules.ts";
import type { MatchListRow } from "./types.ts";

const STEP_TITLES = ["來源", "水位帶", "盤深（含倒掛）", "戰績", "操盤意圖"];
const BAND_WORDS = ["低水", "中水", "高水", "交界", "正向控賠", "誘下"];

function publishedPrematch(row: (typeof FIXTURES)[number]): number | null {
  const odds = row.path.water.preMatchOdds;
  if (odds && odds.status === "published" && odds.isPreMatch) return odds.value;
  return null;
}

describe("示範賽程 fixtures", () => {
  it("stays inside the design match type", () => {
    const rows: MatchListRow[] = FIXTURES;
    assert.equal(rows.length, 9);
  });

  it("sorts in-play first, then kickoff, with full time last", () => {
    const ids = [...FIXTURES].sort(compareMatches).map((row) => row.id);
    assert.deepEqual(ids, [
      "kiu-shan",
      "lam-wan",
      "wu-hau",
      "lam-shan",
      "dung-ngon",
      "bak-luk",
      "hoi-tai",
      "gap-yuet",
      "sa-chau",
    ]);
  });

  it("counts stamps from the rows it actually lists", () => {
    const counts = countStamps(FIXTURES);
    assert.deepEqual(counts, { take: 5, drop: 3, observe: 1 });
    assert.equal(countLine(counts, "16:42", false), "取 5 · 棄 3 · 觀察 1 · 核對時間 16:42");
    assert.equal(
      countLine(counts, "14:02", true),
      "取 5 · 棄 3 · 觀察 1 · 核對時間 14:02（香港時間）",
    );
  });

  it("preselects the in-play track", () => {
    const ordered = [...FIXTURES].sort(compareMatches);
    assert.equal(defaultMatchId(ordered), "kiu-shan");
  });

  it("keeps stakes at $0 or $50 and never upgrades with confidence", () => {
    for (const row of FIXTURES) {
      if (row.decision.kind === "暫停受注" || row.decision.kind === "即場暫停") continue;
      assert.ok(row.decision.stakeAmount === 0 || row.decision.stakeAmount === 50);
      if (row.confidence === "高" && row.decision.kind === "取場") {
        assert.equal(row.decision.stakeAmount, 50);
      }
    }
    const serialized = JSON.stringify(FIXTURES);
    assert.equal(serialized.includes("落注"), false);
    assert.equal(serialized.includes("$100"), false);
    assert.equal(serialized.includes("$150"), false);
  });

  it("classifies only published prematch odds", () => {
    for (const row of FIXTURES) {
      const prematch = publishedPrematch(row);
      const published = prematch != null;
      if (published) assert.equal(row.path.water.band, waterBand(prematch));
      assert.equal(row.path.record.binding, expectedBinding(row.path.record.n, published));
      assert.equal(row.path.intent, preMatchIntent(prematch, false));
      if (row.path.record.n != null && row.path.record.wins != null && row.path.record.wUpper != null) {
        assert.equal(row.path.record.wUpper, roundRatio(row.path.record.wins, row.path.record.n));
      }
      if (
        row.path.record.n != null &&
        row.path.record.wins != null &&
        row.path.record.draws != null &&
        row.path.record.uLower != null
      ) {
        assert.equal(
          row.path.record.uLower,
          roundRatio(row.path.record.wins + row.path.record.draws, row.path.record.n),
        );
      }
      const redirected = row.decision.kind === "F1改做HIL";
      assert.equal(
        row.filters.f2,
        f2State({
          preMatchOdds: prematch,
          preMatchPublished: published,
          binding: row.path.record.binding,
          depth: row.path.depth.depth,
          wUpper: row.path.record.wUpper,
          redirectedByF1: redirected,
        }),
      );
      assert.equal(
        row.filters.f3,
        f3State({
          preMatchPublished: published,
          binding: row.path.record.binding,
          wUpper: row.path.record.wUpper,
          uLower: row.path.record.uLower,
          redirectedByF1: redirected,
        }),
      );
      const live = row.path.water.inPlayOdds;
      if (live && live.status === "published" && live.isPreMatch === false) {
        assert.equal(live.label, "即場");
        assert.ok(live.inPlayUpdatedAtHkt);
        for (const word of BAND_WORDS) {
          assert.equal(row.view.oddsLine.includes(word), false, `${row.id} odds line contains ${word}`);
        }
        if (published) assert.notEqual(row.path.water.band, waterBand(live.value));
      }
    }
  });

  it("prints the six detail variants in the design's words", () => {
    const byId = Object.fromEntries(FIXTURES.map((row) => [row.id, row]));
    assert.equal(byId["lam-shan"]?.view.detailHero, "HHA  藍山受讓  1.88");
    assert.equal(byId["lam-shan"]?.view.slotLabel, "最終心水");
    assert.equal(kickLine(byId["lam-shan"]!), "開賽 19:00  香港時間");
    assert.equal(byId["dung-ngon"]?.view.detailHero, "F2 讓半／一，上盤 1.72，同場地勝率未達 60%");
    assert.equal(byId["dung-ngon"]?.view.slotLabel, "棄單原因");
    assert.equal(byId["bak-luk"]?.view.detailHero, "HIL  大 2.5  1.90");
    assert.equal(byId["bak-luk"]?.view.detailExtra, "棄讓球，改總入球");
    assert.equal(byId["kiu-shan"]?.view.detailHero, "原選 HHA 舊山受讓，仍未結算");
    assert.equal(byId["kiu-shan"]?.view.slotLabel, "更新心水");
    assert.equal(kickLine(byId["kiu-shan"]!), "開賽 16:00  香港時間  ·  進行中");
    assert.equal(byId["wu-hau"]?.view.detailHero, "即場觀察，不開新注");
    assert.equal(byId["wu-hau"]?.stamp, "觀");
    assert.equal(kickLine(byId["wu-hau"]!), "開賽 16:30  香港時間  ·  進行中（開波後先見）");
    assert.equal(byId["sa-chau"]?.view.detailHero, "原選 HHA 沙洲受讓，結算觀察");
    assert.equal(byId["sa-chau"]?.view.slotLabel, "完場結算觀察");
    assert.equal(kickLine(byId["sa-chau"]!), "開賽 14:00  香港時間  ·  完場");
    assert.equal(byId["hoi-tai"]?.view.deskOdds, "---");
    assert.equal(byId["hoi-tai"]?.view.deskOdds.length, 3);
    assert.equal(byId["gap-yuet"]?.path.water.band, "交界");
    for (const row of FIXTURES) {
      assert.deepEqual(
        row.view.steps.map((step) => step.title),
        STEP_TITLES,
      );
      assert.equal(row.hero.length > 0, true);
      assert.equal(row.invalidation.startsWith("失效條件"), true);
    }
  });
});
