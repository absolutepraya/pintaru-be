// Importing the server from the src directory
require("./src/server");

// Global error handlers to ensure queue continues and errors are logged
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
	console.error("Uncaught Exception thrown:", err);
});
