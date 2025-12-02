FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for LiveKit Agents and audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    build-essential \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install dependencies
COPY docker/agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the agent source code
COPY docker/agent .

# Copy prompt configuration files
COPY config ./config

# Expose port for LiveKit Agents (if needed)
EXPOSE 3001

# Run the LiveKit Agents worker
CMD ["python", "aimee_agent.py", "start"]