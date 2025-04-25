#!/bin/bash
set -e

echo "==== Heroku Container Startup ===="
echo "Checking Python environment..."

# Verify key modules are correctly installed
echo "Checking NumPy..."
python -c "import numpy; print('NumPy version:', numpy.__version__)"

echo "Checking PyTorch..."
python -c "import torch; print('PyTorch version:', torch.__version__)"

echo "Checking Whisper..."
python -c "import whisper; print('Whisper version:', whisper.__version__)"

echo "Checking Manim-Voiceover..."
python -c "import manim_voiceover; print('Manim-Voiceover version:', manim_voiceover.__version__)"

echo "Checking for DTW compatibility..."
python -c "import whisper.timing; print('DTW function available:', hasattr(whisper.timing, 'dtw'))"

echo "==== Creating media directories ===="
mkdir -p /app/media/videos/generated_script
chmod -R 777 /app/media

echo "==== Checking Redis connection ===="
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
    echo "Redis not available after 30 seconds. The application may not function correctly."
fi

echo "==== Starting application ===="
exec "$@" 