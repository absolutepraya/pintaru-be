# Pintaru Backend Service

An AI-powered backend service for generating educational mathematical animation videos using Manim. This service takes a user prompt, intelligently analyzes it to create a title and subject, and then generates a complete Manim Python script with automated voice-over to produce an engaging animated video.

## Features

- **REST API**: Asynchronous endpoints for generating videos and checking their status.
- **Dual AI Model Architecture**:
  - **Google Gemini**: Used for intelligent prompt analysis to automatically generate a video title and categorize the subject.
  - **OpenAI**: Powers the generation of complex Manim animation scripts in Python.
- **Automated Voice-over**: Integrates with Azure Cognitive Services to generate high-quality text-to-speech narration synchronized with the animation.
- **Job Queue**: Uses Bull and Redis for robust, background processing of video generation jobs.
- **Scalable Storage**: Leverages Supabase for storing video metadata and the final video files.
- **Flexible Input**: Accepts both `application/json` and `multipart/form-data` to handle requests with or without image inputs.
- **Containerized**: Fully containerized with Docker for consistent development, testing, and production environments.
- **Deployment-Ready**: Includes configurations for easy deployment to platforms like Heroku.

## How It Works

1.  A user sends a `POST` request to `/api/video/generate` with a prompt (e.g., "Explain the Pythagorean theorem").
2.  **Gemini API** analyzes the prompt to generate a title and subject (e.g., `title: "Understanding Pythagoras"`, `subject: "Math"`).
3.  A new job is added to the **Redis queue** via Bull.
4.  A worker process picks up the job and calls the **OpenAI API** to generate a Manim Python script based on the prompt. The script includes voice-over commands using Azure TTS.
5.  The Manim script is executed in a sandboxed environment to render the video.
6.  The final video is uploaded to **Supabase Storage**.
7.  The video's metadata and URL are updated in the Supabase database.
8.  The user can poll the `/api/video/status/:jobId` endpoint to get the final video URL.

## Prerequisites

- Docker and Docker Compose
- Supabase Account & Project
- OpenAI API Key
- Google Gemini API Key
- Azure Account with Speech Service

## Environment Setup

1.  Clone the repository and create a `.env` file from the example:

    ```bash
    git clone https://github.com/your-username/pintaru-be.git
    cd pintaru-be
    cp .env.example .env
    ```

2.  Fill in your API keys and configuration in the `.env` file:

    ```
    # API Keys
    GEMINI_API_KEY=your_gemini_api_key_here
    OPENAI_API_KEY=your_openai_api_key_here

    # Supabase Configuration
    SUPABASE_URL=your_supabase_project_url_here
    SUPABASE_ANON_KEY=your_supabase_anon_key_here

    # Redis Configuration
    REDIS_HOST=redis
    REDIS_PORT=6379
    REDIS_PASSWORD=  # Optional

    # Azure Cognitive Services for Voice-over
    AZURE_SUBSCRIPTION_KEY=your_azure_subscription_key_here
    AZURE_SERVICE_REGION=your_azure_service_region_here

    # Server Configuration
    PORT=3000
    NODE_ENV=development
    ```

## Development

Start the development environment using Docker Compose:

```bash
docker-compose up --build
```

The service will be available at `http://localhost:3000`. The code is hot-reloaded on changes.

## Production

To run in production mode, use the production-specific Docker Compose file:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

This uses optimized settings for a production environment.

## API Endpoints

### `GET /health`

Health check endpoint to verify that the server is running.

- **Response `200 OK`**
  ```json
  {
    "status": "OK",
    "message": "Server is running"
  }
  ```

### `POST /api/video/generate`

Creates a new video generation job. Accepts `application/json` or `multipart/form-data`.

- **Request Body (`application/json`)**

  ```json
  {
    "prompt": "Show me how to calculate the area of a circle",
    "user_id": "user123",
    "image_data": "base64_encoded_image_data_here" // Optional
  }
  ```

- **Request Body (`multipart/form-data`)**

  - `prompt`: "Explain the concept in the image"
  - `user_id`: "user123"
  - `image`: [binary image file]

- **Response `202 Accepted`**
  ```json
  {
    "jobId": "12345",
    "requestId": "some-unique-request-id",
    "status": "queued",
    "message": "Video generation job queued successfully",
    "title": "Calculating the Area of a Circle",
    "subject": "Math",
    "has_image": true
  }
  ```

### `GET /api/video/status/:jobId`

Retrieves the status of a specific video generation job.

- **Response (Job Queued)**
  ```json
  { "status": "queued" }
  ```
- **Response (Job Completed)**
  ```json
  {
    "status": "completed",
    "videoUrl": "https://your-supabase-url/path/to/video.mp4"
  }
  ```

### `GET /api/video/jobs`

Lists all jobs in the queue.

## Project Structure

    .
    ├── src/
    │   ├── app.js             # Express app configuration and middleware
    │   ├── config/            # Configuration loader (from .env)
    │   ├── controllers/       # Route handlers and business logic
    │   ├── routes/            # API route definitions
    │   ├── services/          # External service integrations (AI, DB, Queue)
    │   └── server.js          # Server entry point
    ├── docker-compose.yml     # Docker setup for development
    ├── docker-compose.prod.yml # Docker setup for production
    ├── Dockerfile             # Dockerfile for development
    ├── Dockerfile.prod        # Dockerfile for production
    └── package.json           # Project dependencies

## License

ISC
