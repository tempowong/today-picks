import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  depthOfPrematchLine,
  f2State,
  f3State,
  preMatchIntent,
  waterBand,
} from "./rules.ts";

describe("water bands", () => {
  const table = [
    [1.74, "低水"],
    [1.75, "低水"],
    [1.81, "低水"],
    [1.82, "交界"],
    [1.83, "交界"],
    [1.85, "中水"],
    [1.95, "中水"],
    [1.96, "交界"],
    [2, "交界"],
    [2.01, "高水"],
  ] as const;

  for (const [odds, band] of table) {
    it(`${odds.toFixed(2)} is ${band}`, () => {
      assert.equal(waterBand(odds), band);
    });
  }
});

describe("handicap depth", () => {
  it("keeps F2 to 讓半／一 and 讓一球", () => {
    assert.equal(depthOfPrematchLine("平手"), "其他");
    assert.equal(depthOfPrematchLine("平／半"), "淺盤");
    assert.equal(depthOfPrematchLine("讓半／一"), "深盤");
    assert.equal(depthOfPrematchLine("讓一球"), "深盤");
    assert.equal(depthOfPrematchLine("讓一／球半"), "其他");
  });
});

describe("F2 and F3 boundaries", () => {
  const bound = {
    preMatchPublished: true,
    binding: "綁定" as const,
    depth: "深盤" as const,
    redirectedByF1: false,
  };

  it("triggers F2 only when O_上 is below 1.75", () => {
    assert.equal(f2State({ ...bound, preMatchOdds: 1.74, wUpper: 0.59 }), "觸發");
    assert.equal(f2State({ ...bound, preMatchOdds: 1.75, wUpper: 0.59 }), "未觸發");
  });

  it("does not fire F2 on a shallow line or an unbound sample", () => {
    assert.equal(f2State({ ...bound, depth: "淺盤", preMatchOdds: 1.7, wUpper: 0.2 }), "不適用");
    assert.equal(
      f2State({ ...bound, binding: "不綁定", preMatchOdds: 1.7, wUpper: 0.2 }),
      "不適用",
    );
  });

  it("triggers F3 only inside the strict inequalities", () => {
    assert.equal(
      f3State({ ...bound, wUpper: 0.49, uLower: 0.61 }),
      "觸發",
    );
    assert.equal(f3State({ ...bound, wUpper: 0.5, uLower: 0.7 }), "未觸發");
    assert.equal(f3State({ ...bound, wUpper: 0.4, uLower: 0.6 }), "未觸發");
  });

  it("keeps F2 and F3 inapplicable after an F1 redirect", () => {
    assert.equal(f2State({ ...bound, redirectedByF1: true, preMatchOdds: 1.7, wUpper: 0.2 }), "不適用");
    assert.equal(f3State({ ...bound, redirectedByF1: true, wUpper: 0.2, uLower: 0.9 }), "不適用");
  });
});

describe("prematch intent", () => {
  it("does not invent 上盤低水控賠 below 1.75", () => {
    assert.equal(preMatchIntent(1.74, false), "無");
    assert.equal(preMatchIntent(1.75, false), "正向控賠");
    assert.equal(preMatchIntent(1.81, false), "正向控賠");
    assert.equal(preMatchIntent(1.82, false), "無");
    assert.equal(preMatchIntent(2.01, false), "誘下／籌碼分流");
    assert.equal(preMatchIntent(1.8, true), "誘下／籌碼分流");
    assert.equal(preMatchIntent(null, false), "無");
  });
});
