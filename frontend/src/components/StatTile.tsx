import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "good" | "warning" | "critical";
}

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "",
  good: "text-[var(--success-text)]",
  warning: "text-[var(--status-warning)]",
  critical: "text-[var(--status-critical)]",
};

function StatTile({ label, value, sublabel, tone = "default" }: StatTileProps) {
  return (
    <Card size="sm">
      <CardContent className="space-y-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={cn("text-2xl font-semibold tracking-tight tabular-nums", TONE_CLASS[tone])}>
          {value}
        </div>
        {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
      </CardContent>
    </Card>
  );
}

export default StatTile;
