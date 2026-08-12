import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "good" | "warning" | "critical";
  accent?: boolean;
}

const TONE_CLASS: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-ink",
  good: "text-olive",
  warning: "text-ochre",
  critical: "text-ox",
};

function StatTile({ label, value, sublabel, tone = "default", accent = false }: StatTileProps) {
  return (
    <Card size="sm" className={cn(accent && "shadow-[inset_3px_0_0_var(--ox)]")}>
      <CardContent className="space-y-3.5">
        <div className="font-sans text-[9.5px] font-semibold tracking-[0.16em] text-ink3 uppercase">{label}</div>
        <div className={cn("font-serif text-[2.4rem] leading-none font-medium tracking-tight tabular-nums", TONE_CLASS[tone])}>
          {value}
        </div>
        {sublabel && <div className="text-[12.5px] leading-snug text-ink2">{sublabel}</div>}
      </CardContent>
    </Card>
  );
}

export default StatTile;
