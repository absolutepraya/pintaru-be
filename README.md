# Jawab.in Backend Service

A backend service for generating mathematical animation videos using Manim and AI.

## Features

-   REST API for video generation requests
-   AI-powered Manim code generation with Google Gemini and OpenAI
-   Job queue processing with Bull and Redis
-   Video storage with Supabase
-   Docker containerization for development and production

## Prerequisites

-   Docker and Docker Compose
-   Supabase account
-   OpenAI API key
-   Google Gemini API key

## Environment Setup

1. Copy the `.env.example` file to `.env`:

    ```
    cp .env.example .env
    ```

2. Fill in your API keys and configuration values in the `.env` file:

    ```
    # API Keys
    GEMINI_API_KEY=your_gemini_api_key_here
    OPENAI_API_KEY=your_openai_api_key_here

    # Supabase Configuration
    SUPABASE_URL=your_supabase_url_here
    SUPABASE_ANON_KEY=your_supabase_anon_key_here

    # Redis Configuration
    REDIS_HOST=redis
    REDIS_PORT=6379
    REDIS_PASSWORD=  # Optional, leave empty if no password

    # Server Configuration
    PORT=3000
    NODE_ENV=development
    ```

## Development

### Starting the Development Environment

Start the development environment with Docker Compose:

```bash
docker-compose up
```

This will:

-   Start a Redis instance
-   Build and start the Manim video service
-   Mount your local files for real-time development

The server will be accessible at http://localhost:3000 with automatic reloading enabled.

## Production

### Starting the Production Environment

For production deployment, use the production Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This uses the production-optimized Dockerfile and configurations.

### Deploying to Heroku

The project includes Heroku deployment configuration:

```bash
# Login to Heroku
heroku login

# Create a new Heroku app if needed
heroku create your-app-name

# Set the stack to container
heroku stack:set container

# Push to Heroku
git push heroku main
```

## API Endpoints

-   `GET /health` - Health check endpoint
-   `POST /api/video/generate` - Create a new video generation request with optional image input
-   `GET /api/video/status/:jobId` - Get job status by ID
-   `GET /api/video/jobs` - List all jobs

### API Usage Examples

#### Generate a video with text prompt only (JSON format)

```json
POST /api/video/generate
Content-Type: application/json

{
  "prompt": "Show me how to calculate the area of a circle",
  "user_id": "user123"
}
```

#### Generate a video with text prompt and image (JSON format)

```json
POST /api/video/generate
Content-Type: application/json

{
  "prompt": "Explain the mathematical concept shown in this image",
  "user_id": "user123",
  "image_data": "base64_encoded_image_data_here"
}
```

#### Generate a video with text prompt and image (multipart/form-data format)

```
POST /api/video/generate
Content-Type: multipart/form-data

Form fields:
- prompt: "Explain the mathematical concept shown in this image"
- user_id: "user123"
- image: [binary image file]
```

## License

ISC
