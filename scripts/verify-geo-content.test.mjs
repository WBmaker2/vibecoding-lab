// @vitest-environment node

import { describe, expect, it } from "vitest";
import { auditGeoContent } from "./verify-geo-content.mjs";

function createApp(overrides = {}) {
  return {
    id: "app-1",
    title: "빛의 경로 탐구소",
    summary: "초등학생이 빛의 경로를 바꾸며 결과를 비교하는 과학 탐구 앱입니다.",
    url: "https://example.com/light-path",
    tags: ["과학", "빛"],
    subject: "과학",
    grade: "초등 3~4학년",
    subjects: ["과학"],
    gradeBands: ["3-4"],
    audience: "student",
    interactionType: "simulation",
    learningProcess: ["예측", "조작", "비교", "설명"],
    memo: "한 가지 조건씩 바꾸며 빛의 경로와 결과를 비교하는 활동에 활용합니다.",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
    ...overrides
  };
}

function createSnapshot(apps = [createApp()]) {
  return {
    version: 1,
    generatedAt: "2026-08-03T00:00:00.000Z",
    appCount: apps.length,
    apps
  };
}

describe("GEO content audit", () => {
  it("reports complete question coverage for a well-formed app", () => {
    const result = auditGeoContent(createSnapshot());

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.questionCoverage).toMatchObject({
      what: { covered: 1, percentage: 100 },
      audience: { covered: 1, percentage: 100 },
      topic: { covered: 1, percentage: 100 },
      how: { covered: 1, percentage: 100 },
      freshness: { covered: 1, percentage: 100 }
    });
  });

  it("keeps missing grade context as a warning during the baseline audit", () => {
    const result = auditGeoContent(
      createSnapshot([createApp({ grade: null, gradeBands: [] })])
    );

    expect(result.ok).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["missing_grade_context"])
    );
    expect(result.questionCoverage.audience).toMatchObject({
      covered: 0,
      missing: 1
    });
    expect(auditGeoContent(createSnapshot([createApp({ grade: null, gradeBands: [] })]), { strict: true }).ok).toBe(false);
  });

  it("rejects duplicate identity fields and unsupported metadata values", () => {
    const first = createApp();
    const second = createApp({
      id: first.id,
      title: first.title,
      url: first.url,
      audience: "unknown",
      interactionType: "unknown",
      gradeBands: ["unknown"]
    });
    const result = auditGeoContent(createSnapshot([first, second]));

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "duplicate_id",
        "duplicate_title",
        "duplicate_url",
        "invalid_audience",
        "invalid_interaction_type",
        "invalid_grade_band"
      ])
    );
  });

  it("rejects an invalid external app URL", () => {
    const result = auditGeoContent(
      createSnapshot([createApp({ url: "javascript:alert(1)" })])
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "invalid_url" })
      ])
    );
  });
});
