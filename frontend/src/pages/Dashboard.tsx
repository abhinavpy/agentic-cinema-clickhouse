import { useEffect, useState } from "react";
import {
  api,
  type DeviceBreakdown,
  type EpisodeDropoffs,
  type Overview,
  type RegionBreakdown,
  type RetentionCurve,
} from "../api";
import StatTile from "../components/StatTile";
import ChartCard from "../components/ChartCard";
import RetentionChart from "../charts/RetentionChart";
import SimpleBarChart from "../charts/SimpleBarChart";
import "./Dashboard.css";

function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error };
}

function Dashboard() {
  const overview = useAsync<Overview>(api.overview);
  const retention = useAsync<RetentionCurve[]>(api.retention);
  const dropoffs = useAsync<EpisodeDropoffs[]>(api.dropoffsByEpisode);
  const devices = useAsync<DeviceBreakdown[]>(api.byDevice);
  const regions = useAsync<RegionBreakdown[]>(api.byRegion);

  const loading = !overview.data && !overview.error;
  const worstEpisodeIndex = dropoffs.data
    ? dropoffs.data.reduce((worst, ep, i, arr) => (ep.dropoffs > arr[worst].dropoffs ? i : worst), 0)
    : undefined;

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1>Audience Overview</h1>
        <p>Live metrics for <code>nebula-heist</code>, sourced directly from ClickHouse Cloud.</p>
      </header>

      {loading && <div className="loading-state">Loading metrics...</div>}
      {overview.error && <div className="error-state">Couldn't load metrics: {overview.error}</div>}

      {overview.data && (
        <div className="stat-grid">
          <StatTile label="Total Viewers" value={overview.data.total_viewers.toLocaleString()} />
          <StatTile label="Total Sessions" value={overview.data.total_sessions.toLocaleString()} />
          <StatTile
            label="Completion Rate"
            value={`${(overview.data.completion_rate * 100).toFixed(1)}%`}
            tone={overview.data.completion_rate < 0.4 ? "warning" : "good"}
          />
          <StatTile
            label="Total Drop-offs"
            value={overview.data.total_dropoffs.toLocaleString()}
            sublabel={`vs ${overview.data.total_completes.toLocaleString()} completions`}
          />
        </div>
      )}

      <div className="chart-grid">
        <ChartCard
          title="Viewer Retention by Episode"
          subtitle="% of session still watching at each point in the episode"
          wide
        >
          {retention.data ? (
            <RetentionChart curves={retention.data} />
          ) : (
            <div className="chart-placeholder">{retention.error ?? "Loading..."}</div>
          )}
        </ChartCard>

        <ChartCard title="Drop-offs by Episode" subtitle="Total drop-off events per episode">
          {dropoffs.data ? (
            <SimpleBarChart
              data={dropoffs.data.map((d) => ({ ...d, label: `Ep ${d.episode_id}` }))}
              categoryKey="label"
              valueKey="dropoffs"
              valueLabel="Drop-offs"
              highlightIndex={worstEpisodeIndex}
            />
          ) : (
            <div className="chart-placeholder">{dropoffs.error ?? "Loading..."}</div>
          )}
        </ChartCard>

        <ChartCard title="Viewership by Device" subtitle="Distinct sessions per device type">
          {devices.data ? (
            <SimpleBarChart
              data={devices.data}
              categoryKey="device"
              valueKey="viewers"
              valueLabel="Sessions"
            />
          ) : (
            <div className="chart-placeholder">{devices.error ?? "Loading..."}</div>
          )}
        </ChartCard>

        <ChartCard title="Viewership by Region" subtitle="Distinct sessions per region">
          {regions.data ? (
            <SimpleBarChart
              data={regions.data}
              categoryKey="region"
              valueKey="viewers"
              valueLabel="Sessions"
            />
          ) : (
            <div className="chart-placeholder">{regions.error ?? "Loading..."}</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default Dashboard;
