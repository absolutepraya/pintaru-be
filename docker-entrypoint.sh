#!/bin/bash
set -e

echo "==== Docker Container Startup ===="

# Ensure media directory has correct permissions
echo "Setting up media directory permissions..."
mkdir -p /app/media/videos/generated_script
chmod -R 777 /app/media

# Check if we need to wait for Redis
if [ "${WAIT_FOR_REDIS:-true}" = "true" ]; then
    echo "Checking Redis connection..."
    echo "Waiting for Redis to be ready..."
    for i in {1..30}; do
        if nc -z ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379}; then
            echo "Redis is ready!"
            break
        fi
        echo "Waiting for Redis... ($i/30)"
        sleep 1
    done

    if ! nc -z ${REDIS_HOST:-localhost} ${REDIS_PORT:-6379}; then
        echo "WARNING: Redis not available after 30 seconds. The application may not function correctly."
    fi
fi

echo "==== Starting application: $@ ===="
exec "$@" 