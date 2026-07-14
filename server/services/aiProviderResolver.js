'use strict';

const OllamaProvider = require('./providers/ollamaProvider');
const NvidiaProvider = require('./providers/nvidiaProvider');
const GeminiProvider = require('./providers/geminiProvider');

let activeProvider = null;

class MultiProviderRuntime {
  constructor(providers) {
    this.providers = providers;
    
    // Use a proxy to intercept all method calls to the provider
    return new Proxy(this, {
      get: (target, propKey) => {
        // If the prop exists on this class itself (like providers), return it
        if (propKey in target) {
          return target[propKey];
        }

        // Otherwise, intercept the function call
        return async (...args) => {
          let lastError = null;
          let attemptCount = 0;

          for (const provider of target.providers) {
            // Check if the provider actually implements this method
            if (typeof provider[propKey] !== 'function') {
              throw new Error(`Method ${propKey.toString()} is not implemented by provider ${provider.constructor.name}`);
            }

            if (attemptCount > 0) {
              console.warn(`[AI] Fallback triggered. Retrying ${propKey.toString()} with ${provider.constructor.name.replace('Provider', '')}...`);
            }

            try {
              return await provider[propKey](...args);
            } catch (error) {
              lastError = error;
              attemptCount++;
              // Continue to the next provider in the fallback chain
            }
          }

          // If all providers failed, throw the last error
          throw lastError;
        };
      }
    });
  }
}

async function resolveAutoProvider() {
  console.log('[AI] Provider mode: auto');
  
  const ollama = new OllamaProvider();
  const nvidia = new NvidiaProvider();
  const gemini = new GeminiProvider();

  const active = [];

  console.log('[AI] Checking Ollama...');
  if (await ollama.isAvailable()) {
    console.log('[AI] Ollama available ✓');
    active.push(ollama);
  } else {
    console.log('[AI] Ollama unavailable');
  }

  console.log('[AI] Checking NVIDIA...');
  if (await nvidia.isAvailable()) {
    console.log('[AI] NVIDIA available ✓');
    active.push(nvidia);
  } else {
    console.log('[AI] NVIDIA unavailable');
  }

  console.log('[AI] Checking Gemini...');
  if (await gemini.isAvailable()) {
    console.log('[AI] Gemini available ✓');
    active.push(gemini);
  } else {
    console.log('[AI] Gemini unavailable');
  }

  if (active.length === 0) {
    throw new Error('[AI] Configuration error: No AI provider is available.');
  }

  console.log(`[AI] Using provider: ${active[0].constructor.name.replace('Provider', '')}`);
  return new MultiProviderRuntime(active);
}

async function initAi() {
  const providerMode = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (providerMode === 'auto') {
    activeProvider = await resolveAutoProvider();
  } else if (providerMode === 'ollama') {
    console.log('[AI] Provider mode: ollama');
    const p = new OllamaProvider();
    if (!await p.isAvailable()) throw new Error('Ollama provider selected but unavailable');
    activeProvider = p;
  } else if (providerMode === 'nvidia') {
    console.log('[AI] Provider mode: nvidia');
    const p = new NvidiaProvider();
    if (!await p.isAvailable()) throw new Error('NVIDIA provider selected but unavailable');
    activeProvider = p;
  } else if (providerMode === 'gemini') {
    console.log('[AI] Provider mode: gemini');
    const p = new GeminiProvider();
    if (!await p.isAvailable()) throw new Error('Gemini provider selected but unavailable');
    activeProvider = p;
  } else {
    throw new Error(`Unsupported AI_PROVIDER configured: ${providerMode}`);
  }
}

function getAiProvider() {
  if (!activeProvider) {
    throw new Error("AI provider is not initialized yet. Ensure initAi() is called during startup.");
  }
  return activeProvider;
}

function _resetAiProviderForTesting() {
  activeProvider = null;
}

module.exports = {
  initAi,
  getAiProvider,
  _resetAiProviderForTesting
};
