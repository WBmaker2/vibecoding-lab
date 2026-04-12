import type { AdminAppRecord } from "@/lib/apps/types";
import {
  buildAdminAppPreviewFromFormData,
  getChangedAdminFieldLabels
} from "./change-highlights";

const app: AdminAppRecord = {
  id: "app-1",
  title: "Talking Vocab Quiz",
  summary: "단어 세트로 바로 여는 수업용 퀴즈 앱",
  url: "https://example.com/talking-vocab-quiz",
  githubUrl: "https://github.com/WBmaker2/talking-vocab-quiz",
  tags: ["영어", "게임형", "형성평가"],
  thumbnailMode: "placeholder",
  thumbnailUrl: null,
  subject: "영어",
  grade: "초등 4학년",
  memo: "기존 메모",
  createdAt: new Date("2026-04-05T00:00:00.000Z"),
  updatedAt: new Date("2026-04-05T00:00:00.000Z")
};

function createFormData() {
  const formData = new FormData();

  formData.set("title", "Talking Vocab Quiz");
  formData.set(
    "summary",
    "초등 영어 수업에서 단어 세트를 불러와 듣기·말하기·게임 활동을 바로 여는 수업용 퀴즈 앱"
  );
  formData.set("url", "https://example.com/talking-vocab-quiz");
  formData.set("githubUrl", "https://github.com/WBmaker2/talking-vacab-quiz");
  formData.set("tagsJson", JSON.stringify(["영어", "게임형", "형성평가"]));
  formData.set("thumbnailMode", "placeholder");
  formData.set("subject", "영어");
  formData.set("grade", "초등 3~6학년");
  formData.set(
    "memo",
    "교사가 단어 세트를 저장·공개하면 학생은 학교·선생님·학년·단원을 선택해 여러 활동으로 이어서 사용할 수 있습니다."
  );

  return formData;
}

describe("change-highlights", () => {
  it("builds an updated admin preview record from submitted form data", () => {
    const updated = buildAdminAppPreviewFromFormData(app, createFormData());

    expect(updated.summary).toContain("듣기·말하기·게임 활동");
    expect(updated.grade).toBe("초등 3~6학년");
    expect(updated.memo).toContain("학교·선생님·학년·단원");
    expect(updated.githubUrl).toBe(
      "https://github.com/WBmaker2/talking-vacab-quiz"
    );
    expect(updated.updatedAt.getTime()).toBeGreaterThan(app.updatedAt.getTime());
  });

  it("returns only the user-facing labels for fields that actually changed", () => {
    const updated = buildAdminAppPreviewFromFormData(app, createFormData());

    expect(getChangedAdminFieldLabels(app, updated)).toEqual([
      "한 줄 설명",
      "GitHub 링크",
      "학년",
      "메이커 노트"
    ]);
  });
});
