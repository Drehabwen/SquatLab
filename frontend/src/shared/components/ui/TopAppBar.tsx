import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";

interface TopAppBarProps {
  title: string;
  actions?: React.ReactNode;
}

export function TopAppBar({ title, actions }: TopAppBarProps) {
  return (
    <header className="top-app-bar">
      <div className="top-app-bar-content">
        <Link to="/" className="top-app-bar-brand">
          <Icon
            name="analytics"
            className="top-app-bar-brand-icon"
            color="var(--color-brand-primary-teal-500)"
          />
          <h1 className="top-app-bar-title">{title}</h1>
        </Link>
        <Link to="/settings" className="top-app-bar-settings" aria-label="Settings">
          <Icon
            name="settings"
            className="top-app-bar-settings-icon"
            color="var(--color-neutral-paper-800)"
          />
        </Link>
        {actions && <div className="top-app-bar-actions">{actions}</div>}
      </div>
      <div className="top-app-bar-divider" />
    </header>
  );
}

interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  ariaLabel?: string;
  active?: boolean;
}

export function IconButton({ icon, onClick, ariaLabel, active }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <Icon name={icon} />
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "error";
}

export function Badge({ children, variant = "primary" }: BadgeProps) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
