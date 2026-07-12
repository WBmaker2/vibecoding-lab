import type { AdminAppRecord } from "./types";
import { toAdminAppRecord, toPublicAppRecord } from "./repository";

const baseRecord: AdminAppRecord = {
  id: "app-1",
  title: "테스트 앱",
  summary: "요약",
  url: "https://example.com",
  githubUrl: undefined,
  tags: ["영어", "수업"],
  thumbnailMode: "upload",
  thumbnailUrl: "data:image/png;base64,iVBORw0KGgo=",
  subject: "영어",
  grade: "초등",
  memo: "메모",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T01:00:00.000Z")
};

describe("toAdminAppRecord", () => {
  it("preserves embedded thumbnail data for admin and server-side consumers", () => {
    const record = toAdminAppRecord({ ...baseRecord });

    expect(record.thumbnailUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("hides embedded thumbnail data from public records", () => {
    const record = toPublicAppRecord(baseRecord);

    expect(record.thumbnailUrl).toBeNull();
  });
});
