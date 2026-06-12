import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PsiGauge } from "./PsiGauge";

describe("PsiGauge", () => {
  it("renders the PSI numeric score", async () => {
    render(<PsiGauge score={92} />);
    expect(await screen.findByText("92")).toBeInTheDocument();
  });

  it("renders '良好' level for score >= 85", () => {
    render(<PsiGauge score={90} />);
    expect(screen.getByText("良好")).toBeInTheDocument();
  });

  it("renders '需关注' level for score 70-84", () => {
    render(<PsiGauge score={75} />);
    expect(screen.getByText("需关注")).toBeInTheDocument();
  });

  it("renders '需评估' level for score < 70", () => {
    render(<PsiGauge score={45} />);
    expect(screen.getByText("需评估")).toBeInTheDocument();
  });

  it("renders with different size variants", () => {
    const { container } = render(<PsiGauge score={88} size="large" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders SVG circle for the gauge ring", () => {
    const { container } = render(<PsiGauge score={80} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });
});
