import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskBucket } from "../api";

const LABEL: Record<RiskBucket, string> = {
  critical: "Critical",
  serious: "Serious",
  warning: "Warning",
  good: "Healthy",
};

/* Mirrors compliance-os's severity tag treatment: colored border + soft
   background + colored text per tier, not just a neutral outline. */
const TONE_CLASS: Record<RiskBucket, string> = {
  critical: "border-ox-bd bg-ox-soft text-ox",
  serious: "border-ochre-bd bg-ochre-soft text-ochre",
  warning: "border-slate-bd bg-slate-soft text-slate",
  good: "border-olive-bd bg-olive-soft text-olive",
};

function RiskBadge({ bucket }: { bucket: RiskBucket }) {
  return <Badge className={cn(TONE_CLASS[bucket])}>{LABEL[bucket]}</Badge>;
}

export default RiskBadge;
