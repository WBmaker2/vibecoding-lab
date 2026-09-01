import { render, screen } from "@testing-library/react";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AppForm } from "./app-form";

const app: AdminAppRecord = {
  id: "app-1",
  title: "PAPS 학생 기록 시스템",
  summary: "학생 체력평가 기록을 정리하는 도구",
  url: "https://example.com/paps",
  githubUrl: undefined,
  tags: ["수업", "체육", "PAPS", "학생기록", "시트연동", "업무경감"],
  thumbnailMode: "placeholder",
  thumbnailUrl: null,
  subject: "체육",
  grade: "전학년",
  memo: "",
  subjects: ["체육"],
  gradeBands: ["all"],
  audience: "mixed",
  interactionType: "management",
  learningProcess: ["기록", "정리", "확인"],
  createdAt: new Date("2026-04-05T00:00:00.000Z"),
  updatedAt: new Date("2026-04-05T00:00:00.000Z")
};

describe("AppForm", () => {
  it("does not nest tag remove buttons inside a label", () => {
    render(
      <AppForm
        action={async () => {}}
        initialApp={app}
        submitLabel="수정 저장"
        suggestedTags={[]}
      />
    );

    const lastTagRemoveButton = screen.getByRole("button", {
      name: "#업무경감 제거"
    });

    expect(lastTagRemoveButton.closest("label")).toBeNull();
  });

  it("renders structured metadata controls with current values", () => {
    render(
      <AppForm
        action={async () => {}}
        initialApp={app}
        submitLabel="수정 저장"
        suggestedTags={[]}
      />
    );

    expect(screen.getByRole("combobox", { name: "사용자" })).toHaveValue("mixed");
    expect(screen.getByRole("combobox", { name: "상호작용 유형" })).toHaveValue(
      "management"
    );
    expect(screen.getByRole("textbox", { name: "학습 과정" })).toHaveValue(
      "기록, 정리, 확인"
    );
    expect(
      screen.getByText("누가 무엇을 하기 위한 앱인지 한두 문장으로 적어 주세요.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("수업이나 업무에서 언제, 어떻게 활용하는지 적어 주세요.")
    ).toBeInTheDocument();
  });
});
