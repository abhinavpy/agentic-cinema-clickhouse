import { NavLink } from "react-router-dom";
import { LayoutGrid, TriangleAlert, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", Icon: LayoutGrid, end: true },
  { to: "/churn-risk", label: "Churn Risk", Icon: TriangleAlert, end: false },
  { to: "/copilot", label: "Copilot", Icon: Clapperboard, end: false },
];

function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-[57px] max-w-[1240px] items-center gap-5 px-6">
        <NavLink to="/" className="flex items-center gap-2.5 text-ink no-underline">
          <span className="inline-block h-[13px] w-[13px] rotate-45 bg-ox" />
          <b className="font-serif text-[19px] font-semibold tracking-tight">Cutting Room Copilot</b>
        </NavLink>

        <nav className="ml-1.5 flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 whitespace-nowrap px-2.5 py-1.5 font-sans text-[10.5px] font-semibold tracking-[0.12em] text-ink3 uppercase transition-colors hover:text-ink2",
                  isActive && "text-ink"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} strokeWidth={1.6} color={isActive ? "var(--ink)" : "var(--ink3)"} />
                  <span className={cn(isActive && "border-b-[1.5px] border-ox pb-0.5")}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="mr-1 hidden border-r border-rule pr-3.5 font-serif text-[13.5px] text-ink2 whitespace-nowrap sm:inline">
            nebula-heist
          </span>
          <span className="font-mono text-[10.5px] text-ink3 whitespace-nowrap">ClickHouse Cloud + Gemini</span>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
