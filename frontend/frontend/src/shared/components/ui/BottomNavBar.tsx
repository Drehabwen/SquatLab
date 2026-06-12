import { NavLink } from "react-router-dom";
import { Icon } from "../Icon";

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeIcon?: string;
}

interface BottomNavBarProps {
  items: NavItem[];
}

export function BottomNavBar({ items }: BottomNavBarProps) {
  return (
    <nav className="bottom-nav-bar">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
          end={item.path === "/"}
        >
          {({ isActive }) => (
            <>
              <Icon
                name={isActive && item.activeIcon ? item.activeIcon : item.icon}
                className="nav-icon"
                filled={isActive}
              />
              <span className="nav-label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function getDefaultNavItems(): NavItem[] {
  return [
    { path: "/", label: "概览", icon: "home", activeIcon: "home_app_logo" },
    { path: "/subjects", label: "受试者", icon: "person_search" },
    { path: "/sessions", label: "筛查", icon: "fitness_center" },
    { path: "/settings", label: "设置", icon: "settings" },
  ];
}
