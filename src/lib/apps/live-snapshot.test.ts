import { extractInitialAppsFromHomeHtml } from "./live-snapshot";

const homeHtmlFixture = `
  <script>
    self.__next_f.push([1,"d:I[23880,[\\"/_next/static/chunks/12n52vb9l7nj6.js\\"],\\"ArchivePage\\"]\\n4:[\\"$\\",\\"$Ld\\",null,{\\"initialApps\\":[{\\"id\\":\\"app-1\\",\\"title\\":\\"영어 단어 게임\\",\\"summary\\":\\"영어 수업용 복습 앱\\",\\"url\\":\\"https://example.com/word-game\\",\\"tags\\":[\\"영어\\",\\"게임형\\"],\\"thumbnailMode\\":\\"placeholder\\",\\"thumbnailUrl\\":null,\\"subject\\":\\"영어\\",\\"grade\\":\\"초등 5학년\\",\\"memo\\":\\"짧은 복습에 적합합니다.\\",\\"createdAt\\":\\"$D2026-04-05T00:00:00.000Z\\",\\"updatedAt\\":\\"$D2026-04-05T01:00:00.000Z\\"}]}]\\n"])
  </script>
`;

describe("extractInitialAppsFromHomeHtml", () => {
  it("extracts the current public app list from Next.js home HTML", () => {
    expect(extractInitialAppsFromHomeHtml(homeHtmlFixture)).toEqual([
      {
        id: "app-1",
        title: "영어 단어 게임",
        summary: "영어 수업용 복습 앱",
        url: "https://example.com/word-game",
        tags: ["영어", "게임형"],
        thumbnailMode: "placeholder",
        thumbnailUrl: null,
        subject: "영어",
        grade: "초등 5학년",
        memo: "짧은 복습에 적합합니다.",
        createdAt: "2026-04-05T00:00:00.000Z",
        updatedAt: "2026-04-05T01:00:00.000Z"
      }
    ]);
  });

  it("throws when no initialApps payload is present", () => {
    expect(() => extractInitialAppsFromHomeHtml("<html></html>")).toThrow(
      "initialApps payload"
    );
  });
});
