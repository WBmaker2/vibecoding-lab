import { toAdminAppRecord } from "./repository";

describe("toAdminAppRecord", () => {
  it("preserves embedded thumbnail data for admin and server-side consumers", () => {
    const record = toAdminAppRecord({
      id: "app-1",
      title: "테스트 앱",
      summary: "요약",
      url: "https://example.com",
      githubUrl: null,
      tags: ["영어", "수업"],
      thumbnailMode: "upload",
      thumbnailUrl: "data:image/png;base64,aGVsbG8=",
      subject: "영어",
      grade: "초등",
      memo: "메모",
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
      updatedAt: new Date("2026-05-01T01:00:00.000Z")
    });

    expect(record.thumbnailUrl).toBe("data:image/png;base64,aGVsbG8=");
  });
});
