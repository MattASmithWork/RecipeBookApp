FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install minimal build deps for some packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies (paths are relative to the repo root build context defined in railway.json)
COPY Backend/RecipeBookAppBackend/src/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY Backend/RecipeBookAppBackend/src /app

EXPOSE 8000

# Run the FastAPI app (module: app_api, variable: app) and honor PORT if provided by the platform
CMD ["bash", "-c", "uvicorn app_api:app --host 0.0.0.0 --port ${PORT:-8000}"]
