const express = require("express");
const router = express.Router();
const multer = require("multer");
const videoController = require("../controllers/videoController");

// Configure multer storage for handling form-data
const storage = multer.memoryStorage();
const upload = multer({storage});

/**
 * @route   POST /api/video/generate
 * @desc    Generate a new video from prompt
 * @access  Public
 */
router.post("/generate", upload.single("image"), videoController.generateVideo);

/**
 * @route   GET /api/video/status/:jobId
 * @desc    Get job status by ID
 * @access  Public
 */
router.get("/status/:jobId", videoController.getJobStatus);

/**
 * @route   GET /api/video/jobs
 * @desc    List all jobs
 * @access  Public
 */
router.get("/jobs", videoController.getAllJobs);

module.exports = router;
