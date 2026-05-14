FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (gcc for C extensions, mariadb libs for mysql-connector-python)
RUN apt-get update && apt-get install -y \
gcc \
pkg-config \
libmariadb-dev \
libmariadb3 \
&& rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Mark as Docker environment for runtime detection
ENV IN_DOCKER=true

# Expose port
EXPOSE 5000

# Run the application — use PORT env var if set (Dokploy), fallback to 5000
ENV PORT=5000
CMD ["sh", "-c", "gunicorn wsgi:app --bind 0.0.0.0:${PORT} --workers 1 --timeout 120 --access-logfile -"]
