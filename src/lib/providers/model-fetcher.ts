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

// Fetch models from NVIDIA NIM
async function fetchNvidiaModels(apiKey: string): Promise<FetchModelsResult> {
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
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
    const allModels = data.data || [];

    // Filter to only chat/instruct models, exclude non-chat model types
    const excludePatterns = [
      'embed', 'rerank', 'rerank', 'safety', 'guard', 'nemo-guard',
      'reward', 'grpo', 'parse', 'ocdr', 'extract', 'classify',
      'segm', 'detect', 'track', 'generat', // image generation/detection
      'parakeet', 'canary', 'riva', // speech models
      'nv-wav2vec', 'whisper', // audio models
      'sdxl', 'stable-diffusion', 'consistory', 'shutterstock', // image gen
      'kosmos', 'deplot', 'pix2struct', // doc understanding (not chat)
      'grounding-dino', 'sam', 'segment-anything', // vision-only
      'molmim', 'esm', 'proteinmpnn', 'diffdock', 'megamolbart', // biology
      'steerllm', // steering models
    ];

    const chatModels: Model[] = allModels
      .filter((model: { id: string }) => {
        const id = model.id.toLowerCase();
        // Exclude models matching non-chat patterns
        if (excludePatterns.some(p => id.includes(p))) return false;
        // Include models that look like chat/instruct models
        return id.includes('instruct') || id.includes('chat') ||
               id.includes('llama') || id.includes('mistral') ||
               id.includes('mixtral') || id.includes('nemotron') ||
               id.includes('deepseek') || id.includes('qwen') ||
               id.includes('phi-') || id.includes('gemma') ||
               id.includes('yi-') || id.includes('arctic') ||
               id.includes('dbrx') || id.includes('command') ||
               id.includes('jamba') || id.includes('granite') ||
               id.includes('llava') || id.includes('vila') ||
               id.includes('cosmos-reason') || id.includes('neva') ||
               id.includes('fuyu') || id.includes('minicpm');
      })
      .map((model: { id: string }) => ({
        id: model.id,
        name: model.id,
        provider: 'nvidia' as ProviderType,
        supportsVision: supportsVision('nvidia', model.id),
        supportsTools: supportsTools('nvidia', model.id),
      }));

    return { success: true, models: chatModels };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error',
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
    case 'nvidia':
      return fetchNvidiaModels(apiKey);
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
