const path = require('path');
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.join(__dirname, '..', 'data'),
  
  // DeepSeek API Configuration
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '', // Left empty to prevent key leak on GitHub. Users configure via .env or in-app UI.
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', // DeepSeek-V3 / Flash architecture
    temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.85'),
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2048', 10)
  }
};

module.exports = config;
