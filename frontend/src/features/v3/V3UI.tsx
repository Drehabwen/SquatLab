import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../../shared/components/Icon";

type BadgeTone = "success" | "attention" | "optional" | "neutral";

const NAV_ITEMS = [
  { path: "/tasks", label: "任务", icon: "assignment_turned_in" },
  { path: "/students", label: "学生", icon: "group" },
  { path: "/capture", label: "采集", icon: "photo_camera" },
  { path: "/reports", label: "报告", icon: "description" },
  { path: "/profile", label: "我的", icon: "person" },
];

function resolveActivePath(pathname: string) {
  if (
    pathname.includes("/capture/") ||
    pathname.includes("/standard-screening")
  ) {
    return "/capture";
  }
  if (
    pathname.includes("/triage-result") ||
    pathname.includes("/report-readiness")
  ) {
    return "/reports";
  }
  return NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.path;
}

export function V3Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const activePath = resolveActivePath(pathname);

  return (
    <div className="v3-app">
      <main className="v3-main">{children}</main>
      <nav className="v3-bottom-nav" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = activePath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`v3-nav-item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={item.icon} filled={active} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function V3PageHeader({
  title,
  backTo,
  trailing,
}: {
  title: string;
  backTo?: string;
  trailing?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <header className="v3-page-header">
      <div className="v3-header-side">
        {backTo ? (
          <button
            type="button"
            className="v3-icon-button"
            onClick={() => navigate(backTo)}
            aria-label="返回"
          >
            <Icon name="arrow_back_ios_new" />
          </button>
        ) : null}
      </div>
      <h1>{title}</h1>
      <div className="v3-header-side v3-header-trailing">{trailing}</div>
    </header>
  );
}

export function V3StatusBadge({
  tone,
  icon,
  children,
}: {
  tone: BadgeTone;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <span className={`v3-status-badge is-${tone}`}>
      {icon ? <Icon name={icon} size="small" /> : null}
      {children}
    </span>
  );
}

export function V3EvidenceCard({
  icon,
  title,
  description,
  badge,
  attention = false,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  badge: ReactNode;
  attention?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={`v3-evidence-icon ${attention ? "is-attention" : ""}`}>
        <Icon name={icon} size="large" />
      </span>
      <span className="v3-evidence-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {badge}
    </>
  );

  return onClick ? (
    <button
      type="button"
      className={`v3-evidence-card ${attention ? "is-attention" : ""}`}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <div className={`v3-evidence-card ${attention ? "is-attention" : ""}`}>
      {content}
    </div>
  );
}

export function V3Notice({
  tone = "information",
  title,
  children,
}: {
  tone?: "information" | "attention";
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`v3-notice is-${tone}`}>
      <Icon name={tone === "attention" ? "warning" : "info"} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </section>
  );
}

export function V3PrimaryAction({
  children,
  icon,
  onClick,
  disabled = false,
  loading = false,
}: {
  children: ReactNode;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      className="v3-primary-action"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Icon name={loading ? "progress_activity" : (icon ?? "arrow_forward")} />
      <span>{children}</span>
    </button>
  );
}

export function V3SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
  attentionValue,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  attentionValue?: T;
}) {
  return (
    <div className="v3-segmented" role="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${selected ? "is-selected" : ""} ${
              selected && option.value === attentionValue ? "is-attention" : ""
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
