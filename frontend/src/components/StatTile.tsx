import "./StatTile.css";

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "good" | "warning" | "critical";
}

function StatTile({ label, value, sublabel, tone = "default" }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`stat-value tone-${tone}`}>{value}</div>
      {sublabel && <div className="stat-sublabel">{sublabel}</div>}
    </div>
  );
}

export default StatTile;
