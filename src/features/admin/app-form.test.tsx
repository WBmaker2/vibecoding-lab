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
});
