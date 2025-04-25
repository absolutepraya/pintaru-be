const jobService = require("../services/jobService");
const geminiService = require("../services/geminiService");
const supabaseService = require("../services/supabaseService");

/**
 * Generate a new video from prompt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generateVideo(req, res) {
	try {
		// Handle both JSON and form-data requests
		let prompt,
			user_id,
			image_data = null;

		// Check if the request is form-data or JSON
		if (req.file) {
			// Form-data request with file upload
			prompt = req.body.prompt;
			user_id = req.body.user_id;
			// Convert the uploaded image to base64
			image_data = req.file.buffer.toString("base64");
		} else {
			// JSON request
			prompt = req.body.prompt;
			user_id = req.body.user_id;
			image_data = req.body.image_data;
		}

		if (!prompt && !image_data) {
			return res.status(400).json({error: "Prompt is required"});
		}

		if (!user_id) {
			return res.status(400).json({error: "User ID is required"});
		}

		// Generate title and subject using Gemini API
		const {title, subject} = await geminiService.generateTitleAndSubject(
			prompt
		);

		// Queue the job with or without image data
		const jobInfo = await jobService.addJob(prompt, image_data || null);

		// Create video record in database
		await supabaseService.createVideoRecord({
			user_id,
			title,
			subject,
			prompt,
			job_id: jobInfo.jobId,
			has_image: !!image_data,
		});

		return res.status(202).json({
			jobId: jobInfo.jobId,
			requestId: jobInfo.requestId,
			status: "queued",
			message: "Video generation job queued successfully",
			title,
			subject,
			has_image: !!image_data,
		});
	} catch (err) {
		console.error("Error queueing job:", err);
		return res.status(500).json({error: "Failed to queue job"});
	}
}

/**
 * Get job status by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getJobStatus(req, res) {
	const {jobId} = req.params;

	try {
		const jobStatus = await jobService.getJobStatus(jobId);
		return res.json(jobStatus);
	} catch (err) {
		console.error("Error getting job:", err);
		return res.status(404).json({error: "Job not found"});
	}
}

/**
 * List all jobs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllJobs(req, res) {
	try {
		const jobs = await jobService.getAllJobs();
		return res.json(jobs);
	} catch (err) {
		console.error("Error listing jobs:", err);
		return res.status(500).json({error: "Failed to list jobs"});
	}
}

module.exports = {
	generateVideo,
	getJobStatus,
	getAllJobs,
};
