# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python planner + serve frontend
FROM python:3.11-slim
WORKDIR /app

COPY planner/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY planner/ .
COPY --from=frontend-build /app/dist /app/static

ENV FRONTEND_DIR=/app/static
EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "api.server:app", "--host", "0.0.0.0", "--port", "8000"]
