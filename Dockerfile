# Stage 1: build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime serving the API + the built frontend
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir -e .

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uvicorn agentic_cinema.server:app --host 0.0.0.0 --port ${PORT}"]
