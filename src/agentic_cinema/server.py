"""FastAPI backend exposing the Cutting Room Copilot agent to the React UI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
