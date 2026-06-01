FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (mariadb libs for mysql-connector-python; curl for HEALTHCHECK)
RUN apt-get update && apt-get install -y \
    pkg-config \
    libmariadb-dev \
    libmariadb3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY server-flask/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server-flask/ .

# Mark as Docker environment for runtime detection
ENV IN_DOCKER=true

# Expose port
EXPOSE 5000

# Run the application - use PORT env var if set (Dokploy), fallback to 5000
ENV PORT=5000

# Healthcheck — Dokploy / Docker can detect a hung worker and restart
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

# 3 workers × 4 threads handles concurrent uploads + reads.
# 300s timeout covers slow Cloudinary uploads from poor connections (mobile, hotel wifi).
CMD ["sh", "-c", "gunicorn wsgi:app --bind 0.0.0.0:${PORT} --workers 3 --threads 4 --timeout 300 --access-logfile -"]
