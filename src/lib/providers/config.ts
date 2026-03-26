import { Provider, ProviderType } from '@/types/trading';

export const PROVIDERS: Record<ProviderType, Provider> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyPrefix: 'sk-',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyPrefix: 'sk-or-',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyPrefix: 'gsk_',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  qwen: {
    id: 'qwen',
    name: 'Qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyPrefix: 'sk-',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyPrefix: 'sk-ant-',
    modelsEndpoint: '/models',
    chatEndpoint: '/messages',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
    modelsEndpoint: '/models',
    chatEndpoint: '/models/{model}:generateContent',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyPrefix: 'nvapi-',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyPrefix: '',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function getProvider(type: ProviderType): Provider | undefined {
  return PROVIDERS[type];
}

// Models that support vision
export const VISION_CAPABLE_MODELS: Partial<Record<ProviderType, string[]>> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4-vision-preview', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-sonnet-4', 'claude-opus-4'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-pro-vision'],
  deepseek: ['deepseek-vl', 'deepseek-vl2'],
  groq: ['llama-3.2-11b-vision', 'llama-3.2-90b-vision', 'llava-v1.5-7b'],
  openrouter: ['google/gemini-pro-vision', 'anthropic/claude-3-opus', 'openai/gpt-4-vision-preview', 'meta-llama/llama-3.2-11b-vision-instruct'],
  qwen: ['qwen-vl-plus', 'qwen-vl-max', 'qwen2.5-vl'],
  nvidia: ['llama-3.2-11b-vision', 'llama-3.2-90b-vision', 'phi-3.5-vision', 'phi-3-vision', 'phi-4-multimodal', 'neva', 'vila', 'cosmos-reason', 'nemotron-nano-vl'],
  ollama: ['llava', 'bakllava', 'moondream', 'minicpm-v'],
};

// Models that support function calling
export const TOOL_CAPABLE_MODELS: Partial<Record<ProviderType, string[]>> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4.1', 'gpt-4.1-mini'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'claude-sonnet-4', 'claude-opus-4'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  openrouter: ['anthropic/claude-3-opus', 'openai/gpt-4-turbo', 'google/gemini-pro', 'meta-llama/llama-3.1-70b-instruct'],
  qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen2.5'],
  nvidia: ['llama-3.1', 'llama-3.3', 'llama-4', 'mistral', 'nemotron', 'deepseek', 'qwen', 'mixtral', 'phi-4-mini'],
  ollama: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5'],
};
