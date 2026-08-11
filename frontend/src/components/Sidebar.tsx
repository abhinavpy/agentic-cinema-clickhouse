import { NavLink } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/churn-risk", label: "Churn Risk", icon: "⚠️", end: false },
  { to: "/copilot", label: "Copilot", icon: "🎬", end: false },
];

function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3.5 py-5 text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-1.5 pb-6">
        <span className="text-2xl">🎞️</span>
        <div>
          <div className="text-sm font-semibold leading-tight">Cutting Room</div>
          <div className="text-xs text-muted-foreground">Copilot</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                isActive && "bg-sidebar-accent text-sidebar-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
              )
            }
          >
            <span className="text-sm">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-3">
        <Separator className="mb-3 bg-sidebar-border" />
        <div className="px-1.5">
          <div className="font-mono text-[0.82rem] font-semibold">nebula-heist</div>
          <div className="mt-0.5 text-xs text-muted-foreground">ClickHouse Cloud + Gemini</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
