import { useEffect, useState } from "react";
import { api, type ChurnRisk as ChurnRiskData, type RiskBucket } from "../api";
import StatTile from "../components/StatTile";
import ChartCard from "../components/ChartCard";
import RiskBadge from "../components/RiskBadge";
import SimpleBarChart from "../charts/SimpleBarChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="max-w-6xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Churn Risk</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Per-viewer risk of abandoning the series, scored relative to your audience -- not fixed
          thresholds. See <code>architecture.md</code> for the methodology.
        </p>
      </header>

      {error && <div className="mt-6 text-sm text-destructive">Couldn't load churn risk: {error}</div>}

      <div className="mt-6 grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
        {data ? (
          <>
            <StatTile label="Viewers Analyzed" value={data.total_viewers.toLocaleString()} />
            <StatTile
              label="Critical Risk"
              value={data.bucket_counts.critical.toLocaleString()}
              sublabel={`${((data.bucket_counts.critical / data.total_viewers) * 100).toFixed(1)}% of audience`}
              tone="critical"
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
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)
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
            <Skeleton className="h-[280px]" />
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
            <Skeleton className="h-[400px]" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ChurnRisk;
