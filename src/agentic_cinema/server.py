"""FastAPI backend exposing the Cutting Room Copilot agent and dashboard
analytics to the React UI. Also serves the built React app as static files,
so the whole product deploys as a single service."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agentic_cinema import analytics
from agentic_cinema.agent import ask

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

app = FastAPI(title="Cutting Room Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/ask", response_model=AskResponse)
async def ask_endpoint(request: AskRequest):
    answer = await ask(request.question)
    return AskResponse(answer=answer)


@app.get("/api/analytics/overview")
async def analytics_overview():
    return await run_in_threadpool(analytics.get_overview)


@app.get("/api/analytics/retention")
async def analytics_retention():
    return await run_in_threadpool(analytics.get_retention_curves)


@app.get("/api/analytics/dropoffs-by-episode")
async def analytics_dropoffs_by_episode():
    return await run_in_threadpool(analytics.get_dropoffs_by_episode)


@app.get("/api/analytics/by-device")
async def analytics_by_device():
    return await run_in_threadpool(analytics.get_by_device)


@app.get("/api/analytics/by-region")
async def analytics_by_region():
    return await run_in_threadpool(analytics.get_by_region)


@app.get("/api/analytics/churn-risk")
async def analytics_churn_risk(limit: int = 50):
    return await run_in_threadpool(analytics.get_churn_risk, limit)


# Serve the built React app (frontend/dist), if present, so the whole
# product is one deployable service. Registered last so it never shadows
# the /api/* routes above -- FastAPI/Starlette match routes in registration
# order, and the exact /api/* paths are already registered.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
