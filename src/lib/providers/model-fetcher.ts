import { ProviderType, Model } from '@/types/trading';
import { PROVIDERS, VISION_CAPABLE_MODELS, TOOL_CAPABLE_MODELS } from '@/lib/providers/config';

interface FetchModelsResult {
  success: boolean;
  models: Model[];
  error?: string;
}

// Helper to check if model supports vision
function supportsVision(provider: ProviderType, modelId: string): boolean {
  const visionModels = VISION_CAPABLE_MODELS[provider] || [];
  return visionModels.some(vm => modelId.toLowerCase().includes(vm.toLowerCase()));
}

// Helper to check if model supports tools
function supportsTools(provider: ProviderType, modelId: string): boolean {
  const toolModels = TOOL_CAPABLE_MODELS[provider] || [];
  return toolModels.some(tm => modelId.toLowerCase().includes(tm.toLowerCase()));
}

// Fetch models from OpenAI-compatible API
async function fetchOpenAICompatibleModels(
  provider: ProviderType,
  apiKey: string
): Promise<FetchModelsResult> {
  const config = PROVIDERS[provider];
  if (!config) {
    return { success: false, models: [], error: 'Unknown provider' };
  }

  try {
    const response = await fetch(`${config.baseUrl}${config.modelsEndpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, models: [], error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const models: Model[] = (data.data || data.models || []).map((model: { id: string; name?: string }) => ({
      id: model.id,
      name: model.name || model.id,
      provider,
      supportsVision: supportsVision(provider, model.id),
      supportsTools: supportsTools(provider, model.id),
    }));

    // Filter out embedding and other non-chat models
    const chatModels = models.filter(m => 
      !m.id.includes('embedding') && 
      !m.id.includes('whisper') &&
      !m.id.includes('tts') &&
      !m.id.includes('davinci') &&
      !m.id.includes('babbage')
    );

    return { success: true, models: chatModels };
  } catch (error) {
    return { 
      success: false, 
      models: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Fetch models from Anthropic Claude
async function fetchClaudeModels(apiKey: string): Promise<FetchModelsResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, models: [], error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const models: Model[] = (data.data || []).map((model: { id: string; display_name?: string }) => ({
      id: model.id,
      name: model.display_name || model.id,
      provider: 'claude' as ProviderType,
      supportsVision: supportsVision('claude', model.id),
      supportsTools: supportsTools('claude', model.id),
    }));

    return { success: true, models };
  } catch (error) {
    return { 
      success: false, 
      models: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Fetch models from Google Gemini
async function fetchGeminiModels(apiKey: string): Promise<FetchModelsResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, models: [], error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const models: Model[] = (data.models || [])
      .filter((model: { name: string; supportedGenerationMethods?: string[] }) => 
        model.supportedGenerationMethods?.includes('generateContent')
      )
      .map((model: { name: string; displayName?: string }) => {
        const modelId = model.name.replace('models/', '');
        return {
          id: modelId,
          name: model.displayName || modelId,
          provider: 'gemini' as ProviderType,
          supportsVision: supportsVision('gemini', modelId),
          supportsTools: supportsTools('gemini', modelId),
        };
      });

    return { success: true, models };
  } catch (error) {
    return { 
      success: false, 
      models: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Fetch models from OpenRouter
async function fetchOpenRouterModels(): Promise<FetchModelsResult> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!response.ok) {
      return { success: false, models: [], error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const models: Model[] = (data.data || []).map((model: { id: string; name?: string; context_length?: number }) => ({
      id: model.id,
      name: model.name || model.id,
      provider: 'openrouter' as ProviderType,
      contextLength: model.context_length,
      supportsVision: supportsVision('openrouter', model.id),
      supportsTools: supportsTools('openrouter', model.id),
    }));

    return { success: true, models };
  } catch (error) {
    return { 
      success: false, 
      models: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Main function to fetch models based on provider
export async function fetchModels(
  provider: ProviderType,
  apiKey: string
): Promise<FetchModelsResult> {
  switch (provider) {
    case 'claude':
      return fetchClaudeModels(apiKey);
    case 'gemini':
      return fetchGeminiModels(apiKey);
    case 'openrouter':
      // OpenRouter allows fetching models without API key
      return fetchOpenRouterModels();
    case 'openai':
    case 'deepseek':
    case 'groq':
    case 'qwen':
    case 'ollama':
      return fetchOpenAICompatibleModels(provider, apiKey);
    default:
      return { success: false, models: [], error: 'Unknown provider' };
  }
}
