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
import LoadingBox from "../components/LoadingBox";
import RetentionChart from "../charts/RetentionChart";
import SimpleBarChart from "../charts/SimpleBarChart";

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

  const worstEpisodeIndex = dropoffs.data
    ? dropoffs.data.reduce((worst, ep, i, arr) => (ep.dropoffs > arr[worst].dropoffs ? i : worst), 0)
    : undefined;

  return (
    <div className="max-w-6xl px-10 py-8">
      <header>
        <h1 className="text-2xl font-semibold">Audience Overview</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Live metrics for <code>nebula-heist</code>, sourced directly from ClickHouse Cloud.
        </p>
      </header>

      {overview.error && (
        <div className="mt-6 text-sm text-destructive">Couldn't load metrics: {overview.error}</div>
      )}

      <div className="mt-6 grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
        {overview.data ? (
          <>
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
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <LoadingBox key={i} className="h-[88px]" />)
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <ChartCard
          title="Viewer Retention by Episode"
          subtitle="% of session still watching at each point in the episode"
          wide
        >
          {retention.data ? (
            <RetentionChart curves={retention.data} />
          ) : (
            <ChartPlaceholder error={retention.error} />
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
            <ChartPlaceholder error={dropoffs.error} />
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
            <ChartPlaceholder error={devices.error} />
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
            <ChartPlaceholder error={regions.error} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartPlaceholder({ error }: { error?: string | null }) {
  if (error) return <div className="flex h-[280px] items-center justify-center text-sm text-destructive">{error}</div>;
  return <LoadingBox className="h-[280px] border-0" />;
}

export default Dashboard;
