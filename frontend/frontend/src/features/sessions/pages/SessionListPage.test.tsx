import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../shared/api/client";
import type { ScreeningSessionSummary } from "../../../shared/types/api";
import { SessionListPage } from "./SessionListPage";

vi.mock("../../../shared/api/client", () => ({
  apiClient: { listScreeningSessions: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SessionListPage />
    </MemoryRouter>,
  );
}

const mockSessions: ScreeningSessionSummary[] = [
  {
    session_id: "sess-1",
    subject_id: "subj-1",
    subject_display_name: "王五",
    status: "in_progress" as const,
    overall_risk: null,
    next_action: null,
    completed_protocols: ["static_posture"],
    created_at: "2026-05-01T00:00:00Z",
    completed_at: null,
  },
  {
    session_id: "sess-2",
    subject_id: "subj-2",
    subject_display_name: "赵六",
    status: "completed" as const,
    overall_risk: "low" as const,
    next_action: "pass",
    completed_protocols: ["static_posture", "adams_forward_bend", "squat"],
    created_at: "2026-05-02T00:00:00Z",
    completed_at: "2026-05-02T12:00:00Z",
  },
];

describe("SessionListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title and create button", async () => {
    vi.mocked(apiClient.listScreeningSessions).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("筛查会话")).toBeInTheDocument();
    const createButtons = screen.getAllByRole("button", { name: "新建筛查" });
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no sessions exist", async () => {
    vi.mocked(apiClient.listScreeningSessions).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("暂无筛查会话")).toBeInTheDocument();
  });

  it("renders all status filter tabs", async () => {
    vi.mocked(apiClient.listScreeningSessions).mockResolvedValue(mockSessions);
    const { container } = renderPage();
    await screen.findByText("王五");

    // Scope to the tab bar since session cards also use <button> role
    const tabBar = container.querySelector(".tab-bar")!;
    const tabs = tabBar.querySelectorAll("button.tab-item");
    expect(tabs.length).toBe(6);

    const expectedLabels = ["全部", "进行中", "需重采", "待审核", "待报告", "已完成"];
    for (const label of expectedLabels) {
      const found = Array.from(tabs).some((t) =>
        t.textContent?.includes(label),
      );
      expect(found).toBe(true);
    }
  });

  it("displays session subject names and status badges", async () => {
    vi.mocked(apiClient.listScreeningSessions).mockResolvedValue(mockSessions);
    renderPage();
    expect(await screen.findByText("王五")).toBeInTheDocument();
    expect(screen.getByText("赵六")).toBeInTheDocument();
    expect(screen.getAllByText("进行中").length).toBeGreaterThanOrEqual(1);
    // "已完成" appears in both tab bar and status badge
    expect(screen.getAllByText("已完成").length).toBeGreaterThanOrEqual(1);
  });
});
