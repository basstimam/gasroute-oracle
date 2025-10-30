# Use official Bun image
FROM oven/bun:1.1 as base

# Create working directory
WORKDIR /app

# Copy dependency files first to leverage Docker cache
COPY dreams/package.json dreams/bun.lock* ./

# Install dependencies (will cache unless package.json/bun.lock changes)
RUN bun install

# Copy the rest of the project
COPY dreams/ .

# Generate the agent manifest ahead of time (optional but keeps container ready)
RUN bun run manifest

# Expose default port
EXPOSE 8787

# Start the agent
CMD ["bun", "run", "start"]
