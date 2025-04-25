const {GoogleGenerativeAI} = require("@google/generative-ai");
const config = require("../config");

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Generate video title and subject from prompt
 * @param {string} prompt - The user's prompt for video generation
 * @returns {Promise<{title: string, subject: string}>}
 */
async function generateTitleAndSubject(prompt) {
	try {
		const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

		const result = await model.generateContent(`
            Based on this video generation prompt: "${prompt}"
            Generate a JSON response with two fields:
            1. title: A catchy, descriptive title for the educational video (max 50 characters). Make sure the title can really differentiate the subject of the video.
            2. subject: Choose one from this subject category list: "Math", "Science", "History", "Literature", "Art", "Technology", "Health", "Business", "Music", "Sports", and "Others"
            
            Response must be valid JSON format only, no other text or explanation.
            DON'T FORMAT IT WITH ANY MARKDOWN OR CODE BLOCKS.

            Example return format: {"title": "Understanding Quadratic Equations", "subject": "Math"}
        `);
		const response = JSON.parse(result.response.text());
		return {
			title: response.title,
			subject: response.subject,
		};
	} catch (error) {
		console.error("Error generating title and subject:", error);
		throw new Error("Failed to generate title and subject");
	}
}

module.exports = {
	generateTitleAndSubject,
};
