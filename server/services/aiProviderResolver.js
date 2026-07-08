'use strict';

const OllamaProvider = require('./providers/ollamaProvider');

/**
 * Resolves and returns the configured AI provider.
 * Currently supports 'ollama'.
 */
function getAiProvider() {
  const providerName = process.env.AI_PROVIDER || 'ollama';

  if (providerName.toLowerCase() === 'ollama') {
    return new OllamaProvider();
  }

  // Future providers (like Gemini) can be added here
  
  throw new Error(`Unsupported AI_PROVIDER configured: ${providerName}`);
}

module.exports = {
  getAiProvider
};
