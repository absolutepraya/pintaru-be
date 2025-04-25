const app = require("./app");
const config = require("./config");
const jobService = require("./services/jobService"); // Import properly to initialize job processing service

const PORT = config.port;

// Wait for connections to be ready, then start the server
const startServer = async () => {
	try {
		console.log("Initializing job queue and connecting to Redis...");

		// Give Redis connection time to establish
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Run queue recovery to check for any pending jobs
		await jobService.recoverQueue();

		// Start the server
		const server = app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
			console.log("Bull queue worker started for video generation");
		});

		// Setup graceful shutdown
		setupGracefulShutdown(server);
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
};

// Handle graceful shutdown
const setupGracefulShutdown = (server) => {
	// Handle SIGTERM (Docker stop, kubectl delete, etc)
	process.on("SIGTERM", async () => {
		console.log("SIGTERM received, shutting down gracefully");
		await gracefulShutdown(server);
	});

	// Handle SIGINT (Ctrl+C)
	process.on("SIGINT", async () => {
		console.log("SIGINT received, shutting down gracefully");
		await gracefulShutdown(server);
	});

	// Handle uncaught exceptions
	process.on("uncaughtException", async (error) => {
		console.error("Uncaught exception:", error);
		await gracefulShutdown(server);
	});
};

// Perform graceful shutdown
const gracefulShutdown = async (server) => {
	try {
		// Close the HTTP server first (stop accepting new connections)
		await new Promise((resolve) => {
			server.close(resolve);
		});
		console.log("HTTP server closed");

		// Close the Bull queue connections
		if (jobService.videoQueue) {
			console.log("Closing Bull queue connections...");
			await jobService.videoQueue.close();
			console.log("Bull queue connections closed");
		}

		console.log("Graceful shutdown completed");
		process.exit(0);
	} catch (error) {
		console.error("Error during graceful shutdown:", error);
		process.exit(1);
	}
};

startServer();
