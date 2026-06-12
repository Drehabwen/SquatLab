interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: "text" | "rect" | "circle";
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = "text",
  className = "",
}: SkeletonProps) {
  const variantClass =
    variant === "circle"
      ? "skeleton-circle"
      : variant === "rect"
        ? "skeleton-rect"
        : "";

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={["skeleton-line", variantClass, className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    />
  );
}
