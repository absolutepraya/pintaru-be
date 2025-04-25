const {createClient} = require("@supabase/supabase-js");
const config = require("../config");
const path = require("path");

const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Create a new video record in the database
 * @param {Object} videoData - The video data to insert
 * @param {string} videoData.user_id - The user ID
 * @param {string} videoData.title - The video title
 * @param {string} videoData.subject - The video subject
 * @param {string} videoData.prompt - The original prompt
 * @param {string} videoData.job_id - The job ID for processing
 * @param {boolean} videoData.has_image - Whether the video was created with an image
 * @returns {Promise<Object>} - The created video record
 */
async function createVideoRecord({
	user_id,
	title,
	subject,
	prompt,
	job_id,
	has_image = false,
}) {
	try {
		const {data, error} = await supabase
			.from("videos")
			.insert([
				{
					user_id,
					title,
					subject,
					prompt,
					id: job_id,
					thumbnail_url: null,
					video_url: null,
					created_at: new Date().toISOString(),
					has_image,
				},
			])
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error creating video record:", error);
		throw new Error("Failed to create video record in database");
	}
}

/**
 * Update video record with generated video URL
 * @param {string} jobId - The job ID
 * @param {string} videoUrl - The generated video URL
 * @returns {Promise<Object>} - The updated video record
 */
async function updateVideoUrl(jobId, videoUrl) {
	try {
		const {data, error} = await supabase
			.from("videos")
			.update({
				video_url: videoUrl,
				is_ready: true,
				updated_at: new Date().toISOString(),
			})
			.eq("id", jobId)
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error updating video URL:", error);
		throw new Error("Failed to update video URL in database");
	}
}

/**
 * Update video progress and message
 * @param {string} jobId - The job ID
 * @param {number} progress - The progress percentage
 * @param {string} message - Status message
 * @returns {Promise<Object>} - The updated video record
 */
async function updateVideoProgress(jobId, progress, message) {
	try {
		console.log("Updating video progress:", jobId, progress, message);
		const {data, error} = await supabase
			.from("videos")
			.update({
				progress,
				message,
				updated_at: new Date().toISOString(),
			})
			.eq("id", jobId); // Changed from 'job_id' to 'id' to match updateVideoUrl

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error updating video progress:", error);
		throw new Error("Failed to update video progress in database");
	}
}

/**
 * Generate thumbnail from video at 5 seconds and upload it
 * @param {string} videoPath - Path to the video file
 * @param {string} jobId - The job ID
 * @returns {Promise<string>} - The thumbnail URL
 */
async function generateAndUploadThumbnail(videoPath, jobId) {
	try {
		// Create temporary thumbnail path
		const thumbnailPath = path.join(
			path.dirname(videoPath),
			`thumbnail_${jobId}.jpg`
		);

		// Generate thumbnail using ffmpeg at 5 seconds
		await new Promise((resolve, reject) => {
			const ffmpeg = require("child_process").spawn("ffmpeg", [
				"-ss",
				"5", // Seek to 5 seconds
				"-i",
				videoPath,
				"-vframes",
				"1", // Extract one frame
				"-q:v",
				"2", // High quality
				thumbnailPath,
			]);

			ffmpeg.on("close", (code) => {
				if (code === 0) resolve();
				else
					reject(
						new Error(`FFmpeg process exited with code ${code}`)
					);
			});

			ffmpeg.on("error", (err) => reject(err));
		});

		// Upload thumbnail to Supabase storage
		const fileBuffer = require("fs").readFileSync(thumbnailPath);
		const fileName = `thumbnails/${jobId}.jpg`;

		const {data, error} = await supabase.storage
			.from("manim-videos")
			.upload(fileName, fileBuffer, {
				contentType: "image/jpeg",
				upsert: true,
			});

		if (error) throw error;

		// Clean up temporary thumbnail file
		require("fs").unlinkSync(thumbnailPath);

		// Get and return the public URL
		const thumbnailUrl = `${config.supabase.url}/storage/v1/object/public/manim-videos/${fileName}`;

		// Update the video record with the thumbnail URL
		await updateThumbnailUrl(jobId, thumbnailUrl);

		return thumbnailUrl;
	} catch (error) {
		console.error("Error generating thumbnail:", error);
		throw new Error("Failed to generate thumbnail");
	}
}

/**
 * Update video record with generated thumbnail URL
 * @param {string} jobId - The job ID
 * @param {string} thumbnailUrl - The generated thumbnail URL
 * @returns {Promise<Object>} - The updated video record
 */
async function updateThumbnailUrl(jobId, thumbnailUrl) {
	try {
		const {data, error} = await supabase
			.from("videos")
			.update({
				thumbnail_url: thumbnailUrl,
				updated_at: new Date().toISOString(),
			})
			.eq("id", jobId)
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error("Error updating thumbnail URL:", error);
		throw new Error("Failed to update thumbnail URL in database");
	}
}

module.exports = {
	createVideoRecord,
	updateVideoUrl,
	updateVideoProgress,
	generateAndUploadThumbnail,
};
