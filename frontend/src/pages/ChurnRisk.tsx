import { useEffect, useState } from "react";
import { api, type ChurnRisk as ChurnRiskData, type RiskBucket } from "../api";
import StatTile from "../components/StatTile";
import ChartCard from "../components/ChartCard";
import RiskBadge from "../components/RiskBadge";
import SimpleBarChart from "../charts/SimpleBarChart";
import "./ChurnRisk.css";

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
    <div className="churn-risk">
      <header className="page-header">
        <h1>Churn Risk</h1>
        <p>
          Per-viewer risk of abandoning the series, scored relative to your audience --
          not fixed thresholds. See <code>architecture.md</code> for the methodology.
        </p>
      </header>

      {error && <div className="error-state">Couldn't load churn risk: {error}</div>}

      {data && (
        <>
          <div className="stat-grid">
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
          </div>

          <div className="chart-grid">
            <ChartCard title="Risk Distribution" subtitle="Viewers per risk tier">
              <SimpleBarChart
                data={distribution}
                categoryKey="bucket"
                valueKey="count"
                valueLabel="Viewers"
                colors={BUCKET_ORDER.map((b) => BUCKET_COLOR[b])}
              />
            </ChartCard>
          </div>

          <div className="table-card">
            <div className="chart-card-header">
              <h3>Top At-Risk Viewers</h3>
              <p>Ranked by risk score -- highest first</p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Viewer</th>
                    <th>Risk</th>
                    <th>Reason</th>
                    <th>Episodes</th>
                    <th>Completion</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_at_risk.map((v) => (
                    <tr key={v.user_id}>
                      <td className="mono">#{v.user_id}</td>
                      <td>
                        <RiskBadge bucket={v.risk_bucket} />
                      </td>
                      <td className="reason">{v.primary_reason}</td>
                      <td className="num">
                        {v.episodes_completed}/{v.episodes_started} completed
                      </td>
                      <td className="num">{(v.completion_rate * 100).toFixed(0)}%</td>
                      <td className="num">{v.days_inactive.toFixed(0)}d ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChurnRisk;
