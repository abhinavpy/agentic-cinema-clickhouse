import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SimpleBarChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  categoryKey: string;
  valueKey: string;
  valueLabel: string;
  highlightIndex?: number;
  /** Explicit per-bar colors, same length/order as `data`. Overrides highlightIndex. */
  colors?: string[];
}

function CustomTooltip({ active, payload, label, valueLabel, swatchColor }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-row">
        <span className="swatch" style={{ background: swatchColor }} />
        {valueLabel}: <strong>{payload[0].value.toLocaleString()}</strong>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, categoryKey, valueKey, valueLabel, highlightIndex, colors }: SimpleBarChartProps) {
  const colorFor = (i: number) => colors?.[i] ?? (i === highlightIndex ? "var(--status-critical)" : "var(--series-1)");

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey={categoryKey}
          stroke="var(--axis)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "var(--axis)" }}
        />
        <YAxis
          stroke="var(--axis)"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`
          }
        />
        <Tooltip
          content={(props: any) => {
            const idx = data.findIndex((d) => d[categoryKey] === props.label);
            return <CustomTooltip {...props} valueLabel={valueLabel} swatchColor={colorFor(idx)} />;
          }}
          cursor={{ fill: "var(--gridline)" }}
        />
        <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={colorFor(i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SimpleBarChart;
