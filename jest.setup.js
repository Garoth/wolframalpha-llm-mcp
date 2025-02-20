import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Ensure WOLFRAM_LLM_APP_ID is set
if (!process.env.WOLFRAM_LLM_APP_ID) {
  throw new Error('WOLFRAM_LLM_APP_ID environment variable is required for tests. See README.md for setup instructions.');
}
