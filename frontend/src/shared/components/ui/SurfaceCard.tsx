import { ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  variant?: "lowest" | "low" | "high" | "container";
  padding?: "none" | "small" | "medium" | "large";
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function SurfaceCard({
  children,
  variant = "lowest",
  padding = "medium",
  className = "",
  onClick,
  hoverable = false,
}: SurfaceCardProps) {
  const cardClass = [
    "surface-card",
    `surface-card-${variant}`,
    `surface-card-padding-${padding}`,
    hoverable ? "surface-card-hoverable" : "",
    onClick ? "surface-card-clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button type="button" className={cardClass} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={cardClass}>{children}</div>;
}

interface GlassCardProps {
  children: ReactNode;
  opacity?: number;
  blur?: number;
  className?: string;
}

export function GlassCard({
  children,
  opacity = 80,
  blur = 20,
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: `rgba(255, 255, 255, ${opacity / 100})`,
        backdropFilter: `blur(${blur}px)`,
      }}
    >
      {children}
    </div>
  );
}
