// In production the frontend is served by the same FastAPI app (same origin),
// so relative paths just work. In local dev, Vite and uvicorn run on
// different ports, so default to localhost:8000 unless overridden.
export const API_BASE =
  import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? "" : "http://localhost:8000");

export interface Overview {
  total_viewers: number;
  total_sessions: number;
  total_completes: number;
  total_dropoffs: number;
  completion_rate: number;
}

export interface RetentionPoint {
  position_seconds: number;
  viewers: number;
  pct_remaining: number;
}

export interface RetentionCurve {
  episode_id: number;
  points: RetentionPoint[];
}

export interface EpisodeDropoffs {
  episode_id: number;
  dropoffs: number;
}

export interface DeviceBreakdown {
  device: string;
  viewers: number;
}

export interface RegionBreakdown {
  region: string;
  viewers: number;
}

export type RiskBucket = "critical" | "serious" | "warning" | "good";

export interface AtRiskViewer {
  user_id: number;
  risk_score: number;
  risk_bucket: RiskBucket;
  primary_reason: string;
  episodes_started: number;
  episodes_completed: number;
  completion_rate: number;
  max_episode_reached: number;
  days_inactive: number;
}

export interface ChurnRisk {
  total_viewers: number;
  bucket_counts: Record<RiskBucket, number>;
  top_at_risk: AtRiskViewer[];
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json();
}

export const api = {
  overview: () => getJSON<Overview>("/api/analytics/overview"),
  retention: () => getJSON<RetentionCurve[]>("/api/analytics/retention"),
  dropoffsByEpisode: () => getJSON<EpisodeDropoffs[]>("/api/analytics/dropoffs-by-episode"),
  byDevice: () => getJSON<DeviceBreakdown[]>("/api/analytics/by-device"),
  byRegion: () => getJSON<RegionBreakdown[]>("/api/analytics/by-region"),
  churnRisk: (limit = 50) => getJSON<ChurnRisk>(`/api/analytics/churn-risk?limit=${limit}`),
  async ask(question: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    return data.answer;
  },
};
