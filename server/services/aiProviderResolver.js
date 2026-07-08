'use strict';

const OllamaProvider = require('./providers/ollamaProvider');
const GeminiProvider = require('./providers/geminiProvider');

/**
 * Resolves and returns the configured AI provider.
 * Supports 'ollama' and 'gemini'.
 */
function getAiProvider() {
  const providerName = process.env.AI_PROVIDER || 'ollama';

  if (providerName.toLowerCase() === 'ollama') {
    return new OllamaProvider();
  }
  if (providerName.toLowerCase() === 'gemini') {
    return new GeminiProvider();
  }
  
  throw new Error(`Unsupported AI_PROVIDER configured: ${providerName}`);
}

module.exports = {
  getAiProvider
};
