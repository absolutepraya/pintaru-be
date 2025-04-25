const fs = require("fs");
const path = require("path");
const {exec} = require("child_process");
const {createClient} = require("@supabase/supabase-js");
const Bull = require("bull");
const config = require("../config");
const aiService = require("./aiService");
const supabaseService = require("./supabaseService"); // Added import

// Initialize Supabase
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Create a Bull queue for video generation jobs
const videoQueue = new Bull("manim-video-generation", {
	redis: {
		host: config.redis.host,
		port: config.redis.port,
		password: config.redis.password,
		retryStrategy: (times) => {
			// Exponential backoff for retry
			const delay = Math.min(Math.exp(times), 30) * 1000;
			console.log(
				`Redis connection retry in ${delay}ms (attempt ${times})`
			);
			return delay;
		},
	},
	defaultJobOptions: {
		attempts: 1,
		removeOnComplete: false,
		removeOnFail: false,
		lifo: false, // Ensure FIFO (First-In-First-Out) processing order
	},
	settings: {
		lockDuration: 300000, // 5 minutes
		stalledInterval: 30000, // 30 seconds
		maxStalledCount: 1,
	},
});

// Handle Bull queue events
videoQueue.on("error", (error) => {
	console.error("Bull queue error:", error);
});

videoQueue.on("ready", () => {
	console.log("Bull queue is ready and connected to Redis");
	// Run recovery when the queue is ready
	recoverQueue();
});

// Track active jobs with their status and highest progress
const jobsStatus = {};
const jobsHighestProgress = {};

/**
 * Generate a unique ID for video requests
 * @returns {string} - Unique ID
 */
function generateUniqueId() {
	return `manim_scene_${Date.now()}_${Math.random()
		.toString(36)
		.substr(2, 9)}`;
}

/**
 * Update job status in memory and queue
 * @param {string} jobId - The job ID
 * @param {string} status - The new status
 * @param {number} progress - The progress percentage
 * @param {string} message - Status message
 * @param {string|null} videoUrl - Optional URL of the generated video
 */
function updateJobStatus(jobId, status, progress, message, videoUrl = null) {
	// Ensure progress never decreases
	if (!jobsHighestProgress[jobId]) {
		jobsHighestProgress[jobId] = 0;
	}

	// Only update if the new progress is higher
	progress = Math.max(progress, jobsHighestProgress[jobId]);
	jobsHighestProgress[jobId] = progress;

	// Update the job status in memory
	jobsStatus[jobId] = {
		...jobsStatus[jobId],
		status,
		progress,
		message,
		updated: new Date().toISOString(),
		...(videoUrl && {videoUrl}),
	};

	// Update progress in Bull queue
	videoQueue
		.getJob(jobId)
		.then((job) => {
			if (job) job.progress(progress).catch(console.error);
		})
		.catch(console.error);

	// Update progress and message in Supabase
	supabaseService
		.updateVideoProgress(jobId, progress, message)
		.catch((error) => {
			console.error("Error updating video progress in Supabase:", error);
			// Don't throw error here as we want to continue even if Supabase update fails
		});

	console.log(`Job ${jobId}: ${status} - ${progress}% - ${message}`);
}

/**
 * Add an image-based video generation job to the queue
 * @param {string} imageBase64 - Base64 encoded image data
 * @param {string} prompt - Optional additional context prompt
 * @returns {Promise<{jobId: string, requestId: string}>} - Job info
 */
async function addImageJob(imageBase64, prompt = "") {
	try {
		// Generate a unique request ID for the video
		const requestId = generateUniqueId();

		// Add the job to the Bull queue
		const job = await videoQueue.add(
			{
				requestId,
				imageBase64,
				prompt,
				type: "image", // Flag to identify this as an image-based job
				timestamp: Date.now(),
			},
			{
				// Job options
				attempts: 1,
				removeOnComplete: false,
				removeOnFail: false,
			}
		);

		console.log(`Added image-based job to queue with ID: ${job.id}`);

		// Initialize job status in memory
		jobsStatus[job.id] = {
			id: job.id,
			requestId,
			status: "queued",
			progress: 0,
			prompt: prompt || "Image-based animation",
			message: "Job queued successfully",
			created: new Date().toISOString(),
			videoUrl: null,
		};

		// Check if this is the only job in the queue
		// If so, try to process it immediately
		try {
			const activeJobs = await videoQueue.getActive();
			const waitingJobs = await videoQueue.getWaiting();

			if (activeJobs.length === 0 && waitingJobs.length === 1) {
				// This is likely our job and there are no active jobs
				await processNextJob();
			}
		} catch (error) {
			console.error(
				"Error checking queue state after adding image job:",
				error
			);
		}

		return {
			jobId: job.id.toString(),
			requestId,
		};
	} catch (error) {
		console.error("Error adding image job to queue:", error);
		throw new Error(`Failed to add image job to queue: ${error.message}`);
	}
}

/**
 * Process a video generation job
 * @param {Object} job - The Bull job object
 * @param {Function} done - Callback function when job is done
 * @returns {Promise<void>}
 */
async function processVideoJob(job, done) {
	try {
		const {prompt, requestId, imageBase64, type} = job.data;

		// Update job status
		updateJobStatus(
			job.id,
			"processing",
			5,
			"Starting video generation process"
		);

		// Maximum retry attempts
		const MAX_RETRIES = 5;
		let retryCount = 0;
		let compilationSuccessful = false;
		let pythonCode = "";
		let errorMessage = "";

		// Update job status - AI code generation phase
		updateJobStatus(job.id, "processing", 10, "Generating script with AI");

		// Keep trying until we succeed or reach max retries
		while (!compilationSuccessful && retryCount < MAX_RETRIES) {
			try {
				console.log(
					`Attempt ${retryCount + 1} to generate Manim code...`
				);

				// Generate Manim code with or without image
				const {imageBase64, hasImage} = job.data;
				pythonCode = await aiService.generateManimCode(
					prompt,
					hasImage ? imageBase64 : null,
					errorMessage,
					retryCount
				);
				console.log(
					hasImage
						? "Generated Manim code with image context"
						: "Generated Manim code from text prompt"
				);

				updateJobStatus(
					job.id,
					"processing",
					30,
					"AI script generated successfully"
				);
			} catch (error) {
				console.error("Error in AI API request:", error.message);
				updateJobStatus(
					job.id,
					"failed",
					0,
					`AI generation error: ${error.message}`
				);
				return done(new Error(`AI API error: ${error.message}`));
			}

			// Save the generated Python script
			const scriptPath = path.join(process.cwd(), "generated_script.py");
			console.log("Writing script to:", scriptPath);
			fs.writeFileSync(scriptPath, pythonCode);

			updateJobStatus(
				job.id,
				"processing",
				40,
				"Rendering animation frames"
			);

			// Try to execute Manim
			try {
				if (!fs.existsSync(scriptPath)) {
					throw new Error(
						`Generated script not found at: ${scriptPath}`
					);
				}

				// Execute Manim and await the result using a Promise wrapper
				const manimCommand = `manim -ql --output_file=${requestId} generated_script.py ManimScene`;

				const result = await new Promise((resolve, reject) => {
					const manimProcess = exec(
						manimCommand,
						{timeout: 180000}, // 3 minutes
						(error, stdout, stderr) => {
							if (error) {
								errorMessage =
									stderr || stdout || error.message;
								reject(error);
							} else {
								resolve(stdout);
							}
						}
					);

					// Stream all Manim command output to the app logs
					manimProcess.stdout.on("data", (data) => {
						// Log all stdout data from Manim
						console.log(`[Manim] [Job ${job.id}] ${data.trim()}`);

						// Look for animation progress indicators
						if (
							data.includes("Animation") &&
							data.includes("Partial")
						) {
							// Increase progress incrementally during rendering
							updateJobStatus(
								job.id,
								"processing",
								50,
								"Rendering animation frames"
							);
						}

						if (data.includes("Combining to Movie file")) {
							updateJobStatus(
								job.id,
								"processing",
								70,
								"Combining frames into video"
							);
						}
					});

					// Stream stderr output as well
					manimProcess.stderr.on("data", (data) => {
						console.error(
							`[Manim] [Job ${job.id}] Error: ${data.trim()}`
						);
					});

					manimProcess.on("error", (err) => {
						errorMessage = `Process error: ${err.message}`;
						console.error(
							`[Manim] [Job ${job.id}] Process error: ${err.message}`
						);
						reject(err);
					});
				});

				// If we reach here, compilation was successful
				compilationSuccessful = true;
				updateJobStatus(
					job.id,
					"processing",
					80,
					"Animation rendered successfully"
				);
			} catch (execError) {
				console.error(
					"Execution error caught:",
					execError.message || execError
				);

				// Increment retry counter
				retryCount++;
				if (retryCount >= MAX_RETRIES) {
					updateJobStatus(
						job.id,
						"failed",
						0,
						`Failed after ${MAX_RETRIES} attempts: ${errorMessage}`
					);
					return done(
						new Error(
							`Failed after ${MAX_RETRIES} attempts: ${errorMessage}`
						)
					);
				}
			}
		}

		// Look for the generated video
		updateJobStatus(
			job.id,
			"processing",
			85,
			"Locating generated video file"
		);

		const mediaDir = path.join(
			process.cwd(),
			"media",
			"videos",
			"generated_script",
			"480p15"
		);

		const outputVideoPath = path.join(mediaDir, `${requestId}.mp4`);
		let videoToUpload;

		if (fs.existsSync(outputVideoPath)) {
			videoToUpload = outputVideoPath;
		} else {
			// Fall back to searching for any MP4 files
			let videoFiles = [];
			if (fs.existsSync(mediaDir)) {
				videoFiles = fs
					.readdirSync(mediaDir)
					.filter((file) => file.endsWith(".mp4"))
					.map((file) => path.join(mediaDir, file));
			}

			if (videoFiles.length === 0) {
				updateJobStatus(
					job.id,
					"failed",
					0,
					"Video file not found after rendering"
				);
				return done(new Error("Video file not found after rendering"));
			}

			// Use the most recent video file
			videoToUpload = videoFiles.sort((a, b) => {
				return (
					fs.statSync(b).mtime.getTime() -
					fs.statSync(a).mtime.getTime()
				);
			})[0];
		}

		// Upload to Supabase
		updateJobStatus(job.id, "processing", 90, "Uploading video to storage");

		try {
			const fileBuffer = fs.readFileSync(videoToUpload);
			const fileName = `${requestId}.mp4`;
			const {data, error: uploadError} = await supabase.storage
				.from("manim-videos")
				.upload(fileName, fileBuffer, {
					contentType: "video/mp4",
				});

			if (uploadError) {
				updateJobStatus(
					job.id,
					"failed",
					0,
					`Upload error: ${uploadError.message}`
				);
				return done(
					new Error(`Failed to upload video: ${uploadError.message}`)
				);
			}

			// Get public URL of uploaded video
			const videoUrl = `${config.supabase.url}/storage/v1/object/public/manim-videos/${data.path}`;

			// Update video URL in database
			await supabaseService.updateVideoUrl(job.id, videoUrl);

			// Generate and upload thumbnail
			updateJobStatus(job.id, "processing", 95, "Generating thumbnail");
			await supabaseService.generateAndUploadThumbnail(
				videoToUpload,
				job.id
			);

			// Mark job as complete
			updateJobStatus(
				job.id,
				"completed",
				100,
				"Video generation complete",
				videoUrl
			);
			done(null, {videoUrl});
		} catch (fileError) {
			updateJobStatus(
				job.id,
				"failed",
				0,
				`File handling error: ${fileError.message}`
			);
			return done(
				new Error(`Error handling the video file: ${fileError.message}`)
			);
		}
	} catch (err) {
		console.error("Worker error:", err);
		updateJobStatus(
			job.id,
			"failed",
			0,
			`Unexpected error: ${err.message}`
		);
		return done(new Error(`Worker error: ${err.message}`));
	}
}

// Wrap the processVideoJob to guarantee done() is always called
async function safeProcessVideoJob(job, done) {
	try {
		await processVideoJob(job, done);
	} catch (err) {
		console.error("Fatal error in processVideoJob:", err);
		try {
			updateJobStatus(job.id, "failed", 0, `Fatal error: ${err.message}`);
		} catch (e) {
			console.error("Could not update job status:", e);
		}
		done(new Error(`Fatal error: ${err.message}`));
	}
}

// Configure the queue processor with concurrency of 1 to process jobs in order
videoQueue.process(1, (job, done) => {
	safeProcessVideoJob(job, done).catch((err) => {
		console.error("Unhandled error in job processor:", err);
		done(err);
	});
});

// Only log drained when there are actually no more jobs - check explicitly
videoQueue.on("drained", async () => {
	// Double-check if there are any waiting jobs before declaring the queue empty
	const waitingCount = await videoQueue.getWaitingCount();
	const delayedCount = await videoQueue.getDelayedCount();
	const activeCount = await videoQueue.getActiveCount();

	if (waitingCount === 0 && delayedCount === 0 && activeCount === 0) {
		console.log("Queue is empty - all jobs have been processed");
	} else {
		console.log(
			`Queue reported as drained but still has jobs: Waiting: ${waitingCount}, Delayed: ${delayedCount}, Active: ${activeCount}`
		);
		// Try to process any waiting jobs that might have been missed
		await processNextJob(true);
	}
});

videoQueue.on("stalled", (job) => {
	console.warn(`Job ${job.id} has stalled and will be reprocessed`);
});

videoQueue.on("waiting", (jobId) => {
	console.log(`Job ${jobId} is waiting to be processed`);
});

videoQueue.on("active", (job) => {
	console.log(`Job ${job.id} has started processing`);
});

// Reset progress tracking when job is completed or failed
videoQueue.on("completed", async (job) => {
	delete jobsHighestProgress[job.id];
	console.log(`Job ${job.id} completed with result`);

	// Add a small delay before processing the next job
	// This ensures Redis has time to update its state
	setTimeout(async () => {
		// Automatically process the next job in the queue if available
		await processNextJob();
	}, 1000); // 1 second delay
});

videoQueue.on("failed", async (job, err) => {
	delete jobsHighestProgress[job.id];
	console.error(`Job ${job.id} failed with error:`, err);

	// Add a small delay before processing the next job
	setTimeout(async () => {
		// Try processing the next job even if the current one failed
		await processNextJob();
	}, 1000); // 1 second delay
});

/**
 * Process the next job in the queue if any
 * @param {boolean} force - Force promotion even if there are active jobs
 */
async function processNextJob(force = false) {
	try {
		// Log current queue state for debugging
		const [waitingCount, activeCount] = await Promise.all([
			videoQueue.getWaitingCount(),
			videoQueue.getActiveCount(),
		]);

		console.log(
			`Processing next job - Waiting: ${waitingCount}, Active: ${activeCount}`
		);

		// If no waiting jobs, nothing to do
		if (waitingCount === 0) {
			return;
		}

		// Get all waiting jobs
		const waitingJobs = await videoQueue.getWaiting();

		if (waitingJobs.length > 0) {
			// Sort jobs by their timestamp to maintain FIFO order
			waitingJobs.sort((a, b) => {
				const timestampA = a.data?.timestamp || 0;
				const timestampB = b.data?.timestamp || 0;
				return timestampA - timestampB;
			});

			// Get the oldest waiting job
			const nextJob = waitingJobs[0];
			console.log(
				`Next job to be processed: ${
					nextJob.id
				} (${nextJob.data?.prompt?.substring(0, 30)}...)`
			);

			// Only promote if there are no active jobs or if force=true
			if (activeCount === 0 || force) {
				console.log(`Promoting waiting job ${nextJob.id} to active`);
				await nextJob.promote();

				// If we have a new job in 'waiting' state after promoting, update its status
				// This ensures the job status in memory is accurate
				const jobStatus = jobsStatus[nextJob.id];
				if (
					jobStatus &&
					(jobStatus.status === "waiting" ||
						jobStatus.status === "queued")
				) {
					updateJobStatus(
						nextJob.id,
						"processing",
						jobStatus.progress || 5,
						"Starting video generation process"
					);
				}
			} else {
				console.log(
					`Not promoting job ${nextJob.id} - there are ${activeCount} active jobs`
				);
			}
		}
	} catch (error) {
		console.error("Error processing next job:", error);
	}
}

/**
 * Try to process a waiting job
 * @param {string} jobId - The job ID
 */
async function tryProcessJob(jobId) {
	try {
		const job = await videoQueue.getJob(jobId);
		if (!job) {
			console.log(`Job ${jobId} not found when trying to process`);
			return;
		}

		const state = await job.getState();
		console.log(`Job ${jobId} state: ${state}`);

		if (state === "waiting" || state === "delayed") {
			// Check if there are any active jobs
			const activeCount = await videoQueue.getActiveCount();
			if (activeCount === 0) {
				// No active jobs, we can promote this job
				console.log(`Promoting specific job ${jobId} to active`);
				await job.promote();

				// Update the job status in memory
				const jobStatus = jobsStatus[jobId];
				if (
					jobStatus &&
					(jobStatus.status === "waiting" ||
						jobStatus.status === "queued")
				) {
					updateJobStatus(
						jobId,
						"processing",
						jobStatus.progress || 5,
						"Starting video generation process"
					);
				}
			} else {
				// There is already an active job, log this information
				console.log(
					`Job ${jobId} is waiting. There are ${activeCount} active jobs.`
				);
			}
		} else if (state === "active") {
			console.log(`Job ${jobId} is already active`);
		} else {
			console.log(
				`Job ${jobId} is in state ${state} and cannot be processed now`
			);
		}
	} catch (error) {
		console.error(`Error trying to process job ${jobId}:`, error);
	}
}

/**
 * Get the status of a job
 * @param {string} jobId - The job ID
 * @returns {Promise<Object>} - Job status
 */
async function getJobStatus(jobId) {
	try {
		// Check if job exists in memory
		if (jobsStatus[jobId]) {
			const status = jobsStatus[jobId];
			// If the job is queued/waiting, try to process it
			if (status.status === "waiting" || status.status === "queued") {
				await tryProcessJob(jobId);
			}
			return status;
		}

		// If not found in memory, try to get from Bull queue
		const job = await videoQueue.getJob(jobId);

		if (job) {
			// Get current job state
			const state = await job.getState();

			// If the job is waiting, check if it can be processed
			if (state === "waiting" || state === "queued") {
				await tryProcessJob(jobId);
			}

			return {
				id: job.id,
				status: state || "unknown",
				progress: job.progress || 0,
				data: job.data,
			};
		}

		throw new Error("Job not found");
	} catch (error) {
		console.error(`Error getting job status for ${jobId}:`, error);
		throw error;
	}
}

/**
 * Add a new job to the queue
 * @param {string} prompt - The prompt for generating the video
 * @param {string|null} imageBase64 - Optional Base64 encoded image data
 * @returns {Promise<Object>} - Job info
 */
async function addJob(prompt, imageBase64 = null) {
	// Generate a unique ID for this request
	const requestId = generateUniqueId();

	// Create a new job in the queue
	const job = await videoQueue.add(
		{
			prompt,
			requestId,
			imageBase64,
			hasImage: !!imageBase64,
			timestamp: Date.now(),
		},
		{
			// Job options
			attempts: 1,
			removeOnComplete: false,
			removeOnFail: false,
		}
	);

	// Initialize job status
	jobsStatus[job.id] = {
		id: job.id,
		requestId,
		status: "queued",
		progress: 0,
		prompt,
		hasImage: !!imageBase64,
		message: "Job queued successfully",
		created: new Date().toISOString(),
		videoUrl: null,
	};

	// Check if this is the only job in the queue
	// If so, try to process it immediately
	try {
		const activeJobs = await videoQueue.getActive();
		const waitingJobs = await videoQueue.getWaiting();

		if (activeJobs.length === 0 && waitingJobs.length === 1) {
			// This is likely our job and there are no active jobs
			await processNextJob();
		}
	} catch (error) {
		console.error("Error checking queue state after adding job:", error);
	}

	return {
		jobId: job.id,
		requestId,
		status: "queued",
	};
}

/**
 * Get all jobs
 * @returns {Promise<Array>} - List of all jobs
 */
async function getAllJobs() {
	// Get jobs from all states
	const [waiting, active, completed, failed] = await Promise.all([
		videoQueue.getWaiting(),
		videoQueue.getActive(),
		videoQueue.getCompleted(),
		videoQueue.getFailed(),
	]);

	return [...waiting, ...active, ...completed, ...failed]
		.map((job) => ({
			id: job.id,
			requestId: job.data.requestId,
			status: job.status || "unknown",
			progress: jobsStatus[job.id]?.progress || 0,
			prompt: job.data.prompt,
			created: new Date(job.timestamp).toISOString(),
			videoUrl: jobsStatus[job.id]?.videoUrl || null,
		}))
		.sort((a, b) => new Date(b.created) - new Date(a.created));
}

/**
 * Log the current state of the queue for debugging purposes
 */
async function logQueueState() {
	try {
		const [waiting, active, completed, failed] = await Promise.all([
			videoQueue.getWaitingCount(),
			videoQueue.getActiveCount(),
			videoQueue.getCompletedCount(),
			videoQueue.getFailedCount(),
		]);

		console.log("=== Queue State ===");
		console.log(
			`Waiting: ${waiting} | Active: ${active} | Completed: ${completed} | Failed: ${failed}`
		);

		// If there are active jobs, log their details
		if (active > 0) {
			const activeJobs = await videoQueue.getActive();
			console.log(
				"Active jobs:",
				activeJobs.map((job) => `${job.id} (${job.progress || 0}%)`)
			);
		}

		// If there are waiting jobs, log the top 3
		if (waiting > 0) {
			const waitingJobs = await videoQueue.getWaiting(0, 2); // Get top 3 waiting jobs
			console.log(
				"Next waiting jobs:",
				waitingJobs.map((job) => job.id)
			);
		}
		console.log("==================");
	} catch (error) {
		console.error("Error logging queue state:", error);
	}
}

// Log queue state every 60 seconds
setInterval(logQueueState, 60000);

/**
 * Check for any jobs that might have been missed and try to process them
 */
async function recoverQueue() {
	try {
		console.log("Running queue recovery check...");

		// Check if there are any active jobs
		const activeCount = await videoQueue.getActiveCount();

		// If there are no active jobs but there are waiting jobs, process the next one
		if (activeCount === 0) {
			const waitingCount = await videoQueue.getWaitingCount();
			if (waitingCount > 0) {
				console.log(
					`Queue recovery: Found ${waitingCount} waiting jobs with no active jobs. Processing next job.`
				);
				await processNextJob(true);
			} else {
				console.log("Queue recovery: No waiting jobs found.");
			}
		} else {
			console.log(
				`Queue recovery: Found ${activeCount} active jobs. No recovery needed.`
			);
		}
	} catch (error) {
		console.error("Error during queue recovery:", error);
	}
}

// Run queue recovery on startup and every 5 minutes
recoverQueue();
setInterval(recoverQueue, 5 * 60 * 1000);

module.exports = {
	addJob,
	addImageJob,
	getJobStatus,
	getAllJobs,
	jobsStatus,
	tryProcessJob,
	processNextJob,
	logQueueState,
	recoverQueue,
	videoQueue,
};
