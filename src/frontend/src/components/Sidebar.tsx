import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart2,
  Building2,
  CheckSquare,
  Kanban,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/companies", icon: Building2, label: "Companies" },
  { to: "/deals", icon: TrendingUp, label: "Deals" },
  { to: "/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/activity", icon: Activity, label: "Activity" },
  { to: "/reports", icon: BarChart2, label: "Reports" },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <div className="w-52 flex-shrink-0 flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Zap
            size={14}
            className="text-sidebar-primary-foreground"
            fill="currentColor"
          />
        </div>
        <span className="font-heading text-sidebar-foreground font-semibold text-base tracking-tight flex-1">
          Orbita
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              data-ocid={`nav.${label.toLowerCase()}.link`}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary pl-[10px]"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground border-l-2 border-transparent pl-[10px]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pb-4 border-t border-sidebar-border pt-3">
        <Link
          to="/settings"
          onClick={onClose}
          data-ocid="nav.settings.link"
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            pathname === "/settings"
              ? "bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary pl-[10px]"
              : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground border-l-2 border-transparent pl-[10px]"
          }`}
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </div>
  );
}
