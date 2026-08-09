import { describe, expect, it } from "vitest";
import {
  compareTursoApps,
  normalizeTursoApp,
  toTursoInsertStatement
} from "./turso-apps.mjs";

const app = {
  id: "app-1",
  title: "수업 도구",
  summary: "교사용 앱",
  url: "https://example.com/app",
  githubUrl: "https://github.com/example/app",
  tags: ["업무", "수업"],
  thumbnailMode: "upload",
  thumbnailUrl: "/app-thumbnails/app-1.png",
  subject: "공통",
  grade: "전학년",
  memo: "메모",
  subjects: ["공통"],
  gradeBands: ["all"],
  audience: "teacher",
  interactionType: "utility",
  learningProcess: ["확인", "저장"],
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T01:00:00.000Z"
};

describe("Turso app serialization", () => {
  it("keeps optional fields and arrays in a parameterized insert", () => {
    const statement = toTursoInsertStatement(app);

    expect(statement.sql).toContain("INSERT INTO apps");
    expect(statement.sql).not.toContain("ON CONFLICT");
    expect(statement.args).toContain(JSON.stringify(app.tags));
    expect(statement.args).toContain(app.githubUrl);
  });

  it("round-trips the full admin record shape for comparison", () => {
    const normalized = normalizeTursoApp(app);
    expect(compareTursoApps([app], [normalized])).toEqual({
      ok: true,
      sourceCount: 1,
      targetCount: 1,
      mismatches: []
    });
  });

  it("reports private GitHub field drift instead of hiding it", () => {
    const result = compareTursoApps([app], [
      { ...app, githubUrl: null }
    ]);

    expect(result.ok).toBe(false);
    expect(result.mismatches).toEqual([
      { id: "app-1", reason: "field-mismatch", fields: ["githubUrl"] }
    ]);
  });

  it("rejects a backup app without a stable id", () => {
    expect(() => normalizeTursoApp({ ...app, id: "" })).toThrow(
      "missing id"
    );
  });
});
