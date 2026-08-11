import type { ReactNode } from "react";
import "./ChartCard.css";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

function ChartCard({ title, subtitle, children, wide }: ChartCardProps) {
  return (
    <div className={`chart-card ${wide ? "wide" : ""}`}>
      <div className="chart-card-header">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

export default ChartCard;
