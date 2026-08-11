import { NavLink } from "react-router-dom";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/copilot", label: "Copilot", icon: "🎬", end: false },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">🎞️</span>
        <div>
          <div className="brand-name">Cutting Room</div>
          <div className="brand-sub">Copilot</div>
        </div>
      </div>

      <nav>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-title">nebula-heist</div>
        <div className="footer-sub">ClickHouse Cloud + Gemini</div>
      </div>
    </aside>
  );
}

export default Sidebar;
