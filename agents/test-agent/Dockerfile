# Multi-architecture Dockerfile for ECS Fargate
# Supports both AMD64 (local testing) and ARM64 (Graviton2)

FROM --platform=$TARGETPLATFORM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agent.py .
COPY app.py .

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/ping')" || exit 1

# Run the application
CMD ["python", "app.py"]
