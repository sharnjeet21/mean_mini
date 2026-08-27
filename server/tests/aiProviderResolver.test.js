'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { initAi, getAiProvider } = require('../services/aiProviderResolver');
const OllamaProvider = require('../services/providers/ollamaProvider');
const NvidiaProvider = require('../services/providers/nvidiaProvider');
const GeminiProvider = require('../services/providers/geminiProvider');

describe('aiProviderResolver', () => {
  let originalEnv;
  let originalOllamaIsAvailable, originalOllamaGenerate;
  let originalNvidiaIsAvailable, originalNvidiaGenerate;
  let originalGeminiIsAvailable, originalGeminiGenerate;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Save original prototype methods
    originalOllamaIsAvailable = OllamaProvider.prototype.isAvailable;
    originalOllamaGenerate = OllamaProvider.prototype.generateItineraryDraft;
    originalNvidiaIsAvailable = NvidiaProvider.prototype.isAvailable;
    originalNvidiaGenerate = NvidiaProvider.prototype.generateItineraryDraft;
    originalGeminiIsAvailable = GeminiProvider.prototype.isAvailable;
    originalGeminiGenerate = GeminiProvider.prototype.generateItineraryDraft;

    // Default mocks: all available, return their names
    OllamaProvider.prototype.isAvailable = async () => true;
    OllamaProvider.prototype.generateItineraryDraft = async () => 'ollama';
    NvidiaProvider.prototype.isAvailable = async () => true;
    NvidiaProvider.prototype.generateItineraryDraft = async () => 'nvidia';
    GeminiProvider.prototype.isAvailable = async () => true;
    GeminiProvider.prototype.generateItineraryDraft = async () => 'gemini';

    const { _resetAiProviderForTesting } = require('../services/aiProviderResolver');
    _resetAiProviderForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;

    // Restore original prototype methods
    OllamaProvider.prototype.isAvailable = originalOllamaIsAvailable;
    OllamaProvider.prototype.generateItineraryDraft = originalOllamaGenerate;
    NvidiaProvider.prototype.isAvailable = originalNvidiaIsAvailable;
    NvidiaProvider.prototype.generateItineraryDraft = originalNvidiaGenerate;
    GeminiProvider.prototype.isAvailable = originalGeminiIsAvailable;
    GeminiProvider.prototype.generateItineraryDraft = originalGeminiGenerate;
  });

  it('should initialize successfully even if no providers are available', async () => {
    process.env.AI_PROVIDER = 'auto';
    OllamaProvider.prototype.isAvailable = async () => false;
    NvidiaProvider.prototype.isAvailable = async () => false;
    GeminiProvider.prototype.isAvailable = async () => false;

    await initAi();

    const provider = getAiProvider();
    await assert.rejects(provider.generateItineraryDraft({}), {
      status: 503,
      code: 'AI_PROVIDER_UNAVAILABLE'
    });
    
    const meta = provider.getMetadata();
    assert.equal(meta.currentProvider, 'None');
    assert.deepEqual(meta.availableProviders, []);
    assert.equal(meta.lastInitializationResult, 'Failed: No providers available');
  });

  it('should select Gemini as default priority in auto mode', async () => {
    process.env.AI_PROVIDER = 'auto';
    await initAi();
    
    const provider = getAiProvider();
    const result = await provider.generateItineraryDraft({});
    assert.equal(result, 'gemini');
    
    const meta = provider.getMetadata();
    assert.equal(meta.currentProvider, 'Gemini');
    assert.deepEqual(meta.availableProviders, ['Gemini', 'Nvidia', 'Ollama']);
  });

  it('should prioritize the provider set in AI_PROVIDER environment variable', async () => {
    process.env.AI_PROVIDER = 'gemini';
    await initAi();
    
    const provider = getAiProvider();
    const result = await provider.generateItineraryDraft({});
    assert.equal(result, 'gemini');
    
    const meta = provider.getMetadata();
    assert.equal(meta.currentProvider, 'Gemini');
    assert.deepEqual(meta.availableProviders, ['Gemini', 'Nvidia', 'Ollama']);
  });

  it('should retry once on the current provider before falling back', async () => {
    process.env.AI_PROVIDER = 'auto';
    
    let geminiAttempts = 0;
    GeminiProvider.prototype.generateItineraryDraft = async () => {
      geminiAttempts++;
      throw new Error(`Gemini Error ${geminiAttempts}`);
    };
      
    let nvidiaAttempts = 0;
    NvidiaProvider.prototype.generateItineraryDraft = async () => {
      nvidiaAttempts++;
      return 'nvidia';
    };

    await initAi();
    const provider = getAiProvider();
    
    const result = await provider.generateItineraryDraft({});
    assert.equal(result, 'nvidia');
    assert.equal(geminiAttempts, 2); // 1 initial + 1 retry
    assert.equal(nvidiaAttempts, 1);
    
    const meta = provider.getMetadata();
    assert.equal(meta.currentProvider, 'Nvidia');
    assert.equal(meta.providerHealth['Gemini'], 'unhealthy');
  });

  it('should throw an error if all fallback providers fail', async () => {
    process.env.AI_PROVIDER = 'auto';
    
    let totalAttempts = 0;
    const failFn = async () => {
      totalAttempts++;
      throw new Error('Timeout');
    };
    
    OllamaProvider.prototype.generateItineraryDraft = failFn;
    NvidiaProvider.prototype.generateItineraryDraft = failFn;
    GeminiProvider.prototype.generateItineraryDraft = failFn;

    await initAi();
    const provider = getAiProvider();
    
    await assert.rejects(provider.generateItineraryDraft({}), {
      status: 503,
      code: 'AI_PROVIDER_UNAVAILABLE'
    });
    
    // Each provider retries once, meaning 2 attempts per provider = 6 total calls
    assert.equal(totalAttempts, 6);
  });
});
