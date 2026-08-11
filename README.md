# Cutting Room Copilot

An audience-analytics product for a streaming studio's editorial team: a
**dashboard** of live viewership metrics plus a **copilot** you can ask
open-ended questions like *"Where do viewers drop off in episode 3, and what
should we cut?"* — it queries real viewing-event data in **ClickHouse Cloud**
via the official `mcp-clickhouse` MCP server, reasons over the results with
**Gemini Enterprise Agent Platform**, and returns a grounded, actionable
recommendation.

Built for the [Agentic Cinema hackathon](https://agentic-cinema.devpost.com/) — ClickHouse partner track.

## Architecture

1. **Data**: synthetic viewer-event stream for a fictional series, loaded into
   a ClickHouse Cloud `MergeTree` table (`agentic_cinema.viewing_events`).
2. **Agent**: built on Google's **Agent Development Kit (ADK)** — an
   `LlmAgent` running Gemini, wired to ClickHouse via ADK's `McpToolset`
   pointed at the official `mcp-clickhouse` MCP server (read-only queries).
   ADK's `InMemoryRunner` drives the query → execute → respond loop natively;
   a system instruction requires every claim to cite a real query result.
3. **Analytics**: fast, direct ClickHouse queries (`src/agentic_cinema/analytics.py`)
   for at-a-glance dashboard metrics — no LLM involved. The agent is reserved
   for open-ended natural-language questions.
4. **API**: a FastAPI backend (`src/agentic_cinema/server.py`) exposing the
   agent as `POST /api/ask` and analytics as `GET /api/analytics/*`.
5. **UI**: a React + TypeScript frontend (`frontend/`, Vite) with two pages —
   a **Dashboard** (stat tiles + charts, using a validated colorblind-safe
   categorical palette) and the **Copilot** chat.

See [architecture.md](architecture.md) for the full request-lifecycle diagram
and step-by-step walkthrough.

## Setup

### 1. ClickHouse Cloud
Create a free-trial service at [clickhouse.com/cloud](https://clickhouse.com/cloud)
and note the HTTPS host, port, user, and password.

### 2. Google Cloud / Gemini Enterprise Agent Platform
Set up a GCP project with **billing enabled** and the **Agent Platform API**
(`aiplatform.googleapis.com`) enabled, and the `roles/aiplatform.user` IAM
role granted to your account. Then authenticate locally:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

### 3. Environment
```bash
cp .env.example .env
# fill in your ClickHouse Cloud and GCP project details
```

### 4. Install dependencies
Requires **Python 3.11+** (the `mcp` package needs 3.10+).

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

### 5. Generate and load synthetic data
```bash
python -m agentic_cinema.data.generate_events --users 50000 --out data/viewing_events.parquet
python -m agentic_cinema.data.load --parquet data/viewing_events.parquet
```

### 6. Run it

```bash
# CLI smoke test
python -m agentic_cinema.agent

# API backend (http://localhost:8000)
uvicorn agentic_cinema.server:app --port 8000
```

In a second terminal, run the frontend (requires Node.js):

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

## License
MIT — see [LICENSE](LICENSE).
