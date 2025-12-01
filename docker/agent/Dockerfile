FROM node:20-bullseye-slim

WORKDIR /app

# Install system dependencies for @livekit/rtc-node
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# TODO: May need additional build dependencies if compilation is required:
# - build-essential (for native module compilation)
# - python3 (for node-gyp)
# - pkg-config (for native library discovery)

# Install Node.js dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove legacy file
RUN rm -f livekit-agent.ts

EXPOSE 3001

CMD ["npm", "start"]