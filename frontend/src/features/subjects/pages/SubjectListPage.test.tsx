import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../../shared/api/client";
import type { SubjectResponse } from "../../../shared/types/api";
import { SubjectListPage } from "./SubjectListPage";

vi.mock("../../../shared/api/client", () => ({
  apiClient: { listSubjects: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SubjectListPage />
    </MemoryRouter>,
  );
}

const mockSubjects: SubjectResponse[] = [
  {
    subject_id: "s1",
    display_name: "张三",
    sex: "male" as const,
    age: 15,
    height_cm: 168,
    notes: "初中生",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    subject_id: "s2",
    display_name: "李四",
    sex: "female" as const,
    age: 12,
    height_cm: 152,
    notes: "",
    created_at: "2026-02-01T00:00:00Z",
  },
];

describe("SubjectListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title and create button", async () => {
    vi.mocked(apiClient.listSubjects).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("受试者")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建" })).toBeInTheDocument();
  });

  it("shows empty state when there are no subjects", async () => {
    vi.mocked(apiClient.listSubjects).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("暂无受试者")).toBeInTheDocument();
  });

  it("renders subjects in the list", async () => {
    vi.mocked(apiClient.listSubjects).mockResolvedValue(mockSubjects);
    renderPage();
    expect(await screen.findByText("张三")).toBeInTheDocument();
    expect(screen.getByText("李四")).toBeInTheDocument();
  });

  it("filters subjects by search query", async () => {
    vi.mocked(apiClient.listSubjects).mockResolvedValue(mockSubjects);
    const { container } = renderPage();
    await screen.findByText("张三");

    const searchInput = container.querySelector("input")!;
    // Simulate React state change + re-render by typing into the controlled input
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    nativeInputValueSetter.call(searchInput, "李");
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(screen.queryByText("张三")).not.toBeInTheDocument();
    expect(screen.getByText("李四")).toBeInTheDocument();
  });
});
