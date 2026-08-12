import { useEffect, useState } from "react";
import { api, type ChurnRisk as ChurnRiskData, type RiskBucket } from "../api";
import StatTile from "../components/StatTile";
import ChartCard from "../components/ChartCard";
import RiskBadge from "../components/RiskBadge";
import SimpleBarChart from "../charts/SimpleBarChart";
import LoadingBox from "../components/LoadingBox";
import SectionDivider from "../components/SectionDivider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BUCKET_ORDER: RiskBucket[] = ["good", "warning", "serious", "critical"];
const BUCKET_LABEL: Record<RiskBucket, string> = {
  good: "Healthy",
  warning: "Warning",
  serious: "Serious",
  critical: "Critical",
};
const BUCKET_COLOR: Record<RiskBucket, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
};

function ChurnRisk() {
  const [data, setData] = useState<ChurnRiskData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .churnRisk(50)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const distribution = data
    ? BUCKET_ORDER.map((bucket) => ({
        bucket: BUCKET_LABEL[bucket],
        count: data.bucket_counts[bucket],
      }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-10 py-10">
      <header>
        <div className="font-sans text-[11px] font-bold tracking-[0.2em] text-ox uppercase">
          Retention risk
        </div>
        <h1 className="mt-3 font-serif text-[34px] leading-tight font-medium tracking-tight text-ink">
          Churn Risk
        </h1>
        <p className="mt-2.5 max-w-[560px] text-[14px] leading-relaxed text-ink2">
          Per-viewer risk of abandoning the series, scored relative to your audience -- not fixed
          thresholds. See <code>architecture.md</code> for the methodology.
        </p>
      </header>

      {error && <div className="mt-6 text-sm text-destructive">Couldn't load churn risk: {error}</div>}

      <SectionDivider label="Risk posture" note="scored per viewer" />
      <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
        {data ? (
          <>
            <StatTile label="Viewers Analyzed" value={data.total_viewers.toLocaleString()} />
            <StatTile
              label="Critical Risk"
              value={data.bucket_counts.critical.toLocaleString()}
              sublabel={`${((data.bucket_counts.critical / data.total_viewers) * 100).toFixed(1)}% of audience`}
              tone="critical"
              accent
            />
            <StatTile
              label="Serious Risk"
              value={data.bucket_counts.serious.toLocaleString()}
              sublabel={`${((data.bucket_counts.serious / data.total_viewers) * 100).toFixed(1)}% of audience`}
              tone="warning"
            />
            <StatTile
              label="Healthy"
              value={data.bucket_counts.good.toLocaleString()}
              sublabel={`${((data.bucket_counts.good / data.total_viewers) * 100).toFixed(1)}% of audience`}
              tone="good"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <LoadingBox key={i} className="h-[88px]" />)
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <ChartCard title="Risk Distribution" subtitle="Viewers per risk tier">
          {data ? (
            <SimpleBarChart
              data={distribution}
              categoryKey="bucket"
              valueKey="count"
              valueLabel="Viewers"
              colors={BUCKET_ORDER.map((b) => BUCKET_COLOR[b])}
            />
          ) : (
            <LoadingBox className="h-[280px] border-0" />
          )}
        </ChartCard>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Top At-Risk Viewers</CardTitle>
          <CardDescription>Ranked by risk score -- highest first</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Viewer</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Episodes</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_at_risk.map((v) => (
                  <TableRow key={v.user_id}>
                    <TableCell className="font-mono text-foreground">#{v.user_id}</TableCell>
                    <TableCell>
                      <RiskBadge bucket={v.risk_bucket} />
                    </TableCell>
                    <TableCell className="text-foreground">{v.primary_reason}</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {v.episodes_completed}/{v.episodes_started} completed
                    </TableCell>
                    <TableCell className="tabular-nums">{(v.completion_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {v.days_inactive.toFixed(0)}d ago
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <LoadingBox className="h-[400px] border-0" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChurnRisk;
