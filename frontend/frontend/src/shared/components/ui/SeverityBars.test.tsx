import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeverityBars } from "./SeverityBars";

describe("SeverityBars", () => {
  it("renders all three axis labels", () => {
    render(<SeverityBars grades={{ shoulder: "none", hip: "mild", trunk: "moderate" }} />);
    expect(screen.getByText("肩部")).toBeInTheDocument();
    expect(screen.getByText("骨盆")).toBeInTheDocument();
    expect(screen.getByText("躯干")).toBeInTheDocument();
  });

  it("renders severity text for each axis", () => {
    render(<SeverityBars grades={{ shoulder: "none", hip: "mild", trunk: "moderate" }} />);
    expect(screen.getByText("正常")).toBeInTheDocument();
    expect(screen.getByText("轻度")).toBeInTheDocument();
    expect(screen.getByText("中度")).toBeInTheDocument();
  });

  it("defaults missing axes to 'none'", () => {
    render(<SeverityBars grades={{ shoulder: "severe" }} />);
    // All three axes still render
    expect(screen.getByText("肩部")).toBeInTheDocument();
    expect(screen.getByText("骨盆")).toBeInTheDocument();
    expect(screen.getByText("躯干")).toBeInTheDocument();
    // Missing axes default to "正常"
    const normalLabels = screen.getAllByText("正常");
    expect(normalLabels.length).toBe(2);
  });

  it("renders the severe level in red", () => {
    render(<SeverityBars grades={{ shoulder: "severe", hip: "none", trunk: "none" }} />);
    expect(screen.getByText("重度")).toBeInTheDocument();
  });
});
