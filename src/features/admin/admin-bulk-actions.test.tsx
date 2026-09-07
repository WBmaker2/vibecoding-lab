import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminAppRecord } from "@/lib/apps/types";
import { AdminBulkActions } from "./admin-bulk-actions";

const selectedApps: AdminAppRecord[] = [
  {
    id: "app-1",
    title: "과학 실험실",
    summary: "실험 도구",
    url: "https://example.com/science",
    tags: ["과학", "실험"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  },
  {
    id: "app-2",
    title: "수업 기록장",
    summary: "수업 기록 도구",
    url: "https://example.com/notes",
    tags: ["기록"],
    thumbnailMode: "placeholder",
    thumbnailUrl: null,
    createdAt: new Date("2026-04-05T00:00:00.000Z"),
    updatedAt: new Date("2026-04-05T00:00:00.000Z")
  }
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminBulkActions", () => {
  it("previews the before and after tags before submitting", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const action = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();

    render(
      <AdminBulkActions
        action={action}
        classificationAction={action}
        onClassificationComplete={() => {}}
        onClear={() => {}}
        onComplete={onComplete}
        selectedApps={selectedApps}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "일괄 변경 태그" }), {
      target: { value: "#수업" }
    });
    fireEvent.click(screen.getByRole("button", { name: "태그 추가" }));

    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("과학 실험실: #과학 #실험 → #과학 #실험 #수업")
    );
    expect(onComplete).toHaveBeenCalledWith([
      { id: "app-1", tags: ["과학", "실험", "수업"] },
      { id: "app-2", tags: ["기록", "수업"] }
    ]);
  });
});
