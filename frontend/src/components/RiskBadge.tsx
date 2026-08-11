import type { RiskBucket } from "../api";
import "./RiskBadge.css";

const LABEL: Record<RiskBucket, string> = {
  critical: "Critical",
  serious: "Serious",
  warning: "Warning",
  good: "Healthy",
};

function RiskBadge({ bucket }: { bucket: RiskBucket }) {
  return (
    <span className={`risk-badge risk-${bucket}`}>
      <span className="risk-dot" />
      {LABEL[bucket]}
    </span>
  );
}

export default RiskBadge;
