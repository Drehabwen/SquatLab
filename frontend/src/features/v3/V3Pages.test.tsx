import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { V3FlowProvider } from "./V3Flow";
import { TasksPageV3 } from "./V3Pages";

describe("V3 task flow", () => {
  it("renders the task-first screening entry with non-diagnostic wording", () => {
    render(
      <MemoryRouter>
        <V3FlowProvider>
          <TasksPageV3 />
        </V3FlowProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "早筛任务" }),
    ).toBeInTheDocument();
    expect(screen.getByText("步态剪影采集")).toBeInTheDocument();
    expect(screen.getByText("筛查不是诊断")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "开始步态采集" }),
    ).toBeInTheDocument();
  });
});
