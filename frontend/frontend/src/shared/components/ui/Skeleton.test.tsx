import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with default variant (text)", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("skeleton-line");
  });

  it("renders circle variant with skeleton-circle class", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("skeleton-line");
    expect(el).toHaveClass("skeleton-circle");
  });

  it("applies custom width and height via inline styles", () => {
    const { container } = render(<Skeleton width="200px" height="50px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("200px");
    expect(el.style.height).toBe("50px");
  });

  it("renders rect variant with skeleton-rect class", () => {
    const { container } = render(<Skeleton variant="rect" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("skeleton-line");
    expect(el).toHaveClass("skeleton-rect");
  });
});
