'use strict';

const { initAi, getAiProvider } = require('../services/aiProviderResolver');

// Mock Providers
jest.mock('../services/providers/ollamaProvider', () => {
  class OllamaProvider {
    async isAvailable() { return true; }
    async generateItineraryDraft() { return 'ollama'; }
  }
  Object.defineProperty(OllamaProvider, 'name', { value: 'OllamaProvider' });
  return OllamaProvider;
});
jest.mock('../services/providers/nvidiaProvider', () => {
  class NvidiaProvider {
    async isAvailable() { return true; }
    async generateItineraryDraft() { return 'nvidia'; }
  }
  Object.defineProperty(NvidiaProvider, 'name', { value: 'NvidiaProvider' });
  return NvidiaProvider;
});
jest.mock('../services/providers/geminiProvider', () => {
  class GeminiProvider {
    async isAvailable() { return true; }
    async generateItineraryDraft() { return 'gemini'; }
  }
  Object.defineProperty(GeminiProvider, 'name', { value: 'GeminiProvider' });
  return GeminiProvider;
});

const OllamaProvider = require('../services/providers/ollamaProvider');
const NvidiaProvider = require('../services/providers/nvidiaProvider');
const GeminiProvider = require('../services/providers/geminiProvider');

describe('aiProviderResolver', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.restoreAllMocks();
    
    const { _resetAiProviderForTesting } = require('../services/aiProviderResolver');
    _resetAiProviderForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should initialize successfully even if no providers are available', async () => {
    process.env.AI_PROVIDER = 'auto';
    jest.spyOn(NvidiaProvider.prototype, 'isAvailable').mockResolvedValue(false);
    jest.spyOn(OllamaProvider.prototype, 'isAvailable').mockResolvedValue(false);
    jest.spyOn(GeminiProvider.prototype, 'isAvailable').mockResolvedValue(false);

    await expect(initAi()).resolves.toBeUndefined(); // Should not throw

    const provider = getAiProvider();
    await expect(provider.generateItineraryDraft({})).rejects.toMatchObject({
      status: 503,
      code: 'AI_PROVIDER_UNAVAILABLE'
    });
    
    const meta = provider.getMetadata();
    expect(meta.currentProvider).toBe('None');
    expect(meta.availableProviders).toEqual([]);
    expect(meta.lastInitializationResult).toBe('Failed: No providers available');
  });

  it('should select Gemini as default priority in auto mode', async () => {
    process.env.AI_PROVIDER = 'auto';
    await initAi();
    
    const provider = getAiProvider();
    const result = await provider.generateItineraryDraft({});
    expect(result).toBe('gemini');
    
    const meta = provider.getMetadata();
    expect(meta.currentProvider).toBe('Gemini');
    expect(meta.availableProviders).toEqual(['Gemini', 'Nvidia', 'Ollama']);
  });

  it('should prioritize the provider set in AI_PROVIDER environment variable', async () => {
    process.env.AI_PROVIDER = 'gemini';
    await initAi();
    
    const provider = getAiProvider();
    const result = await provider.generateItineraryDraft({});
    expect(result).toBe('gemini');
    
    const meta = provider.getMetadata();
    expect(meta.currentProvider).toBe('Gemini');
    expect(meta.availableProviders).toEqual(['Gemini', 'Nvidia', 'Ollama']);
  });

  it('should retry once on the current provider before falling back', async () => {
    process.env.AI_PROVIDER = 'auto';
    
    const geminiGenerate = jest.fn()
      .mockRejectedValueOnce(new Error('Gemini Error 1'))
      .mockRejectedValueOnce(new Error('Gemini Error 2'));
      
    const nvidiaGenerate = jest.fn().mockResolvedValue('nvidia');

    jest.spyOn(GeminiProvider.prototype, 'generateItineraryDraft').mockImplementation(geminiGenerate);
    jest.spyOn(NvidiaProvider.prototype, 'generateItineraryDraft').mockImplementation(nvidiaGenerate);

    await initAi();
    const provider = getAiProvider();
    
    const result = await provider.generateItineraryDraft({});
    expect(result).toBe('nvidia');
    expect(geminiGenerate).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    expect(nvidiaGenerate).toHaveBeenCalledTimes(1);
    
    const meta = provider.getMetadata();
    expect(meta.currentProvider).toBe('Nvidia');
    expect(meta.providerHealth['Gemini']).toBe('unhealthy');
  });

  it('should throw an error if all fallback providers fail', async () => {
    process.env.AI_PROVIDER = 'auto';
    
    const generateFn = jest.fn().mockRejectedValue(new Error('Timeout'));
    
    jest.spyOn(NvidiaProvider.prototype, 'generateItineraryDraft').mockImplementation(generateFn);
    jest.spyOn(OllamaProvider.prototype, 'generateItineraryDraft').mockImplementation(generateFn);
    jest.spyOn(GeminiProvider.prototype, 'generateItineraryDraft').mockImplementation(generateFn);

    await initAi();
    const provider = getAiProvider();
    
    await expect(provider.generateItineraryDraft({})).rejects.toMatchObject({
      status: 503,
      code: 'AI_PROVIDER_UNAVAILABLE'
    });
    
    // Each provider retries once, meaning 2 attempts per provider = 6 total calls
    expect(generateFn).toHaveBeenCalledTimes(6);
  });
});
