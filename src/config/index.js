require("dotenv").config();

module.exports = {
	port: process.env.PORT || 3000,
	supabase: {
		url: process.env.SUPABASE_URL,
		anonKey: process.env.SUPABASE_ANON_KEY,
	},
	gemini: {
		apiKey: process.env.GEMINI_API_KEY,
	},
	openai: {
		apiKey: process.env.OPENAI_API_KEY,
	},
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: process.env.REDIS_PORT || 6379,
		password: process.env.REDIS_PASSWORD,
	},
	azure: {
		subscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY,
		serviceRegion: process.env.AZURE_SERVICE_REGION,
	},
};
