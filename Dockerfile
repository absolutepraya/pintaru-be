FROM manimcommunity/manim:stable

# Switch to root user for package installation
USER root

WORKDIR /app

# Install ffmpeg, sox, and other dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    sox \
    libsox-fmt-all \
    curl \
    gnupg \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install manim-voiceover with its dependencies
RUN pip install "manim-voiceover[openai]"
RUN pip install "manim-voiceover[transcribe]"

# First, pin NumPy to 1.x series due to compatibility issues with torchaudio
RUN pip install --upgrade pip && \
    pip install "numpy<2.0" matplotlib==3.7.2 scipy==1.10.1 --force-reinstall

RUN npm install -g nodemon

# Copy package files
COPY package.json package-lock.json* ./

# Install Node dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Make sure media directory exists and has correct permissions
RUN mkdir -p /app/media/videos/generated_script && \
    chmod -R 777 /app/media

# Create startup script
RUN echo '#!/bin/bash\nchmod -R 777 /app/media\nexec "$@"' > /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Expose the port the app runs on
EXPOSE 3000

# Set entrypoint to ensure media permissions
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Command to run the application
CMD ["nodemon", "--watch", ".", "--exec", "node", "index.js"]