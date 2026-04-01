# Multi-stage Dockerfile for Cursor Self-Hosted Agent
FROM node:20-bookworm-slim AS base

# Install additional dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Cursor CLI
RUN curl https://cursor.com/install -fsS | bash

# Runtime stage
FROM node:20-bookworm-slim

# Run as root from the start
USER root

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the agent from builder
COPY --from=base /root/.local /root/.local

# Fix permissions
RUN chmod -R +x /root/.local/bin /root/.local/share/cursor-agent

# Set PATH
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /workspace

# Expose port
EXPOSE 8080

# Authenticate with CURSOR_API_KEY (or mount CLI login token). Repo is bind-mounted at /workspace.
ENTRYPOINT ["sh", "-c", "exec agent worker start --worker-dir /workspace"]
