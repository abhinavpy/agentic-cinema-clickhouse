export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

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
