'use strict';

const OllamaProvider = require('./providers/ollamaProvider');
const NvidiaProvider = require('./providers/nvidiaProvider');
const GeminiProvider = require('./providers/geminiProvider');

let activeProvider = null;
let lastInitializationResult = 'Not initialized';
let providerHealth = {};

class MultiProviderRuntime {
  constructor(providers) {
    this.providers = providers;
    
    return new Proxy(this, {
      get: (target, propKey) => {
        if (propKey in target) {
          return target[propKey];
        }

        if (propKey === 'then' || typeof propKey === 'symbol') {
          return undefined;
        }

        return async (...args) => {
          if (target.providers.length === 0) {
            const err = new Error('AI_PROVIDER_UNAVAILABLE: No providers available to handle the request.');
            err.status = 503;
            err.code = 'AI_PROVIDER_UNAVAILABLE';
            throw err;
          }

          let lastError = null;

          for (let i = 0; i < target.providers.length; i++) {
            const provider = target.providers[i];
            const providerName = provider.constructor.name.replace('Provider', '');

            // Check if unhealthy
            if (providerHealth[providerName] === 'unhealthy') {
              continue;
            }

            if (typeof provider[propKey] !== 'function') {
              throw new Error(`Method ${propKey.toString()} is not implemented by provider ${provider.constructor.name}`);
            }

            let attempt = 1;
            while (attempt <= 2) { // 1 attempt + 1 retry
              try {
                if (attempt > 1) {
                  console.warn(`[AI] Retrying ${propKey.toString()} on current provider ${providerName}...`);
                }
                const result = await provider[propKey](...args);
                return result; // Success
              } catch (error) {
                lastError = error;
                console.error(`[AI] Attempt ${attempt} failed on ${providerName}:`, error.message);
                attempt++;
              }
            }

            // Both attempts failed on this provider. Mark unhealthy.
            console.warn(`[AI] Marking provider ${providerName} as temporarily unhealthy.`);
            providerHealth[providerName] = 'unhealthy';
            
            // Allow health to reset after 60 seconds
            const t = setTimeout(() => {
              if (providerHealth[providerName] === 'unhealthy') {
                providerHealth[providerName] = 'healthy';
                console.log(`[AI] Provider ${providerName} marked healthy again.`);
              }
            }, 60000);
            if (t.unref) t.unref();

            if (i < target.providers.length - 1) {
              console.warn(`[AI] Fallback triggered. Switching to next available provider...`);
            }
          }

          const err = new Error(`AI_PROVIDER_UNAVAILABLE: All providers failed. Last error: ${lastError?.message}`);
          err.status = 503;
          err.code = 'AI_PROVIDER_UNAVAILABLE';
          throw err;
        };
      }
    });
  }

  getMetadata() {
    return {
      currentProvider: this.providers.find(p => providerHealth[p.constructor.name.replace('Provider', '')] !== 'unhealthy')?.constructor.name.replace('Provider', '') || 'None',
      availableProviders: this.providers.map(p => p.constructor.name.replace('Provider', '')),
      providerHealth,
      lastInitializationResult
    };
  }
}

async function initAi() {
  const preferred = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  console.log(`[AI] Provider mode: ${preferred}`);
  
  const ollama = new OllamaProvider();
  const nvidia = new NvidiaProvider();
  const gemini = new GeminiProvider();

  let instances = [
    { name: 'NVIDIA', instance: nvidia, key: 'nvidia' },
    { name: 'Ollama', instance: ollama, key: 'ollama' },
    { name: 'Gemini', instance: gemini, key: 'gemini' }
  ];

  if (preferred !== 'auto') {
    const preferredIndex = instances.findIndex(p => p.key === preferred);
    if (preferredIndex > -1) {
      const preferredProvider = instances.splice(preferredIndex, 1)[0];
      instances.unshift(preferredProvider);
    }
  }

  const active = [];
  providerHealth = {};

  for (const { name, instance } of instances) {
    console.log(`[AI] Checking ${name}...`);
    try {
      if (await instance.isAvailable()) {
        console.log(`[AI] ${name} available ✓`);
        active.push(instance);
        providerHealth[name] = 'healthy';
      } else {
        console.log(`[AI] ${name} unavailable`);
        providerHealth[name] = 'unavailable';
      }
    } catch (e) {
      console.log(`[AI] ${name} check failed: ${e.message}`);
      providerHealth[name] = 'unavailable';
    }
  }

  if (active.length === 0) {
    console.warn('[AI] WARNING: No AI provider is available. AI features will fail gracefully.');
    lastInitializationResult = 'Failed: No providers available';
  } else {
    console.log(`[AI] Selected provider: ${active[0].constructor.name.replace('Provider', '')}`);
    lastInitializationResult = `Success: Selected ${active[0].constructor.name.replace('Provider', '')}`;
  }

  activeProvider = new MultiProviderRuntime(active);
}

function getAiProvider() {
  if (!activeProvider) {
    // Should theoretically not happen unless accessed before initAi finishes, but return a safe fallback runtime just in case.
    return new MultiProviderRuntime([]);
  }
  return activeProvider;
}

function _resetAiProviderForTesting() {
  activeProvider = null;
  lastInitializationResult = 'Not initialized';
  providerHealth = {};
}

module.exports = {
  initAi,
  getAiProvider,
  _resetAiProviderForTesting
};
