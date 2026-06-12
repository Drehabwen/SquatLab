import type { MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "small" | "medium" | "large";
  icon?: string;
  iconPosition?: "left" | "right";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  to?: string;
  href?: string;
  target?: string;
  rel?: string;
  ariaLabel?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = "button",
  className = "",
  to,
  href,
  target,
  rel,
  ariaLabel,
}: ButtonProps) {
  const buttonClass = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? "btn-full-width" : "",
    loading ? "btn-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconElement = icon && (
    <Icon name={icon} className="btn-icon" />
  );

  const isUnavailable = disabled || loading;
  const buttonContent = (
    <>
      {loading ? (
        <Icon name="sync" className="btn-icon spin" />
      ) : (
        icon && iconPosition === "left" && iconElement
      )}
      {children}
      {!loading && icon && iconPosition === "right" && iconElement}
    </>
  );

  const handleUnavailableClick = (event: MouseEvent<HTMLElement>) => {
    if (!isUnavailable) {
      onClick?.();
      return;
    }

    event.preventDefault();
  };

  if (to) {
    return (
      <Link
        to={to}
        className={buttonClass}
        aria-disabled={isUnavailable}
        aria-label={ariaLabel}
        onClick={handleUnavailableClick}
      >
        {buttonContent}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={buttonClass}
        target={target}
        rel={rel}
        aria-disabled={isUnavailable}
        aria-label={ariaLabel}
        onClick={handleUnavailableClick}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={buttonClass}
      disabled={isUnavailable}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {buttonContent}
    </button>
  );
}
