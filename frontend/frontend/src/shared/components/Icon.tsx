interface IconProps {
  name: string;
  size?: "small" | "medium" | "large";
  className?: string;
  color?: string;
  filled?: boolean;
}

export function Icon({
  name,
  size = "medium",
  className = "",
  color = "currentColor",
  filled = false,
}: IconProps) {
  const sizeMap = {
    small: "16px",
    medium: "24px",
    large: "32px",
  };

  return (
    <span
      className={`icon material-symbols-outlined ${className}`.trim()}
      style={{
        fontSize: sizeMap[size],
        color,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
