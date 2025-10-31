# Use official Bun image
FROM oven/bun:1.1

WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install

# Copy application code
COPY . .

# Generate manifest ahead of time
RUN bun run manifest

EXPOSE 8080

ENV PORT=8080

CMD ["bun", "run", "start"]
