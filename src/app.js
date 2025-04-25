const express = require("express");
const cors = require("cors");
const videoRoutes = require("./routes/videoRoutes");
const config = require("./config");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/video", videoRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
	res.status(200).json({status: "OK", message: "Server is running"});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error("Unhandled error:", err);
	res.status(500).json({
		error: "Server error",
		message:
			process.env.NODE_ENV === "production"
				? "An unexpected error occurred"
				: err.message,
	});
});

module.exports = app;
