import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { RetentionCurve } from "../api";

const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
];

function mergeCurves(curves: RetentionCurve[]) {
  const positions = new Set<number>();
  const byEpisode = new Map<number, Map<number, number>>();

  for (const curve of curves) {
    const lookup = new Map<number, number>();
    for (const point of curve.points) {
      positions.add(point.position_seconds);
      lookup.set(point.position_seconds, Math.round(point.pct_remaining * 1000) / 10);
    }
    byEpisode.set(curve.episode_id, lookup);
  }

  return Array.from(positions)
    .sort((a, b) => a - b)
    .map((pos) => {
      const row: Record<string, number | null> = { minute: Math.round((pos / 60) * 10) / 10 };
      for (const [episodeId, lookup] of byEpisode) {
        row[`ep${episodeId}`] = lookup.has(pos) ? lookup.get(pos)! : null;
      }
      return row;
    });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">Minute {label}</div>
      {payload
        .filter((p: any) => p.value !== null)
        .sort((a: any, b: any) => b.value - a.value)
        .map((p: any) => (
          <div key={p.dataKey} className="chart-tooltip-row">
            <span className="swatch" style={{ background: p.color }} />
            {p.name}: <strong>{p.value}%</strong>
          </div>
        ))}
    </div>
  );
}

function RetentionChart({ curves }: { curves: RetentionCurve[] }) {
  const data = mergeCurves(curves);
  const episodeIds = curves.map((c) => c.episode_id).sort((a, b) => a - b);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="minute"
          stroke="var(--axis)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--axis)" }}
          label={{ value: "Minutes into episode", position: "insideBottom", offset: -2, fontSize: 12, fill: "var(--text-muted)" }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          stroke="var(--axis)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              Episode {value.replace("ep", "")}
            </span>
          )}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12 }}
        />
        {episodeIds.map((id, i) => (
          <Line
            key={id}
            type="monotone"
            dataKey={`ep${id}`}
            name={`ep${id}`}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default RetentionChart;
