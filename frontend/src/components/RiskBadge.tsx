import { Badge } from "@/components/ui/badge";
import type { RiskBucket } from "../api";

const LABEL: Record<RiskBucket, string> = {
  critical: "Critical",
  serious: "Serious",
  warning: "Warning",
  good: "Healthy",
};

const DOT_VAR: Record<RiskBucket, string> = {
  critical: "var(--status-critical)",
  serious: "var(--status-serious)",
  warning: "var(--status-warning)",
  good: "var(--status-good)",
};

function RiskBadge({ bucket }: { bucket: RiskBucket }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-semibold text-muted-foreground">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: DOT_VAR[bucket] }}
      />
      {LABEL[bucket]}
    </Badge>
  );
}

export default RiskBadge;
