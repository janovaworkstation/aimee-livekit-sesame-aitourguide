FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY docker/backend/package.json docker/backend/package-lock.json ./
RUN npm install

# Copy TypeScript configuration and source code
COPY docker/backend/tsconfig.json ./
COPY docker/backend/src ./src

# Copy prompt configuration files
COPY config ./config

# Build TypeScript
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]