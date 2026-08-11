"""FastAPI backend exposing the Cutting Room Copilot agent and dashboard
analytics to the React UI."""
from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agentic_cinema import analytics
from agentic_cinema.agent import ask

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
