import { ProviderType, ToolCall, TradingTool } from '@/types/trading';
import { PROVIDERS } from '@/lib/providers/config';

// Tool definitions for LLM function calling
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'fetch_prices',
      description: 'Fetch current price data for a trading symbol (stock or cryptocurrency)',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The trading symbol (e.g., BTC, ETH, AAPL, TSLA)',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_news',
      description: 'Fetch recent news and social sentiment for a trading symbol',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The trading symbol to fetch news for',
          },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_indicators',
      description: 'Calculate technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands, ATR, Stochastic) for a symbol',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The trading symbol',
          },
          days: {
            type: 'number',
            description: 'Number of days of historical data (default: 30)',
          },
        },
        required: ['symbol'],
      },
    },
  },
];

// System prompt for trading analysis
const SYSTEM_PROMPT = `You are an expert trading analyst with deep knowledge of technical analysis, market sentiment, and risk management. Your role is to analyze charts, news, and market data to provide actionable trading recommendations.

When analyzing:
1. First, examine any provided chart images carefully for patterns, trends, support/resistance levels
2. Use the available tools to fetch current prices, news, and technical indicators
3. Consider both technical and fundamental factors
4. Provide a clear recommendation: BUY, SELL, or HOLD

Your final response MUST include:
1. A clear RECOMMENDATION: BUY, SELL, or HOLD
2. A CONFIDENCE percentage (0-100)
3. A detailed REASON explaining your analysis

Format your final response as:
RECOMMENDATION: [BUY/SELL/HOLD]
CONFIDENCE: [0-100]%
REASON: [Your detailed analysis]

Be objective and consider both bullish and bearish scenarios before making a recommendation.`;

// Execute tool call via our server API
async function executeToolCall(name: TradingTool, args: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    if (name === 'calculate_indicators') {
      // For indicators, we need to fetch OHLCV first then calculate
      const response = await fetch(`/api/tools?symbol=${args.symbol}&days=${args.days || 30}`);
      const data = await response.json();
      return data;
    } else {
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: name, params: args }),
      });
      return await response.json();
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Build messages for different providers
function buildMessages(
  provider: ProviderType,
  images: string[],
  symbol?: string,
  context?: string
): unknown[] {
  const userContent: unknown[] = [];
  
  let textContent = 'Please analyze this trading opportunity.';
  if (symbol) {
    textContent += ` Symbol: ${symbol}.`;
  }
  if (context) {
    textContent += ` Additional context: ${context}`;
  }
  
  if (images.length > 0) {
    userContent.push({ type: 'text', text: textContent });
    for (const image of images) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: image.startsWith('data:') ? image : `data:image/png;base64,${image}`,
        },
      });
    }
  } else {
    userContent.push({ type: 'text', text: textContent });
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

// Parse the LLM response for recommendation
export function parseRecommendation(content: string): {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
} {
  const recommendationMatch = content.match(/RECOMMENDATION:\s*(BUY|SELL|HOLD)/i);
  const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
  const reasonMatch = content.match(/REASON:\s*([\s\S]*?)(?=\n\n|RECOMMENDATION:|CONFIDENCE:|$)/i);

  const recommendation = (recommendationMatch?.[1]?.toUpperCase() || 'HOLD') as 'BUY' | 'SELL' | 'HOLD';
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  const reason = reasonMatch?.[1]?.trim() || content;

  return { recommendation, confidence, reason };
}

// Generate a UUID for tool calls
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Call OpenAI-compatible API (client-side)
export async function callOpenAICompatible(
  provider: ProviderType,
  model: string,
  apiKey: string,
  images: string[],
  symbol?: string,
  context?: string,
  onToolCall?: (toolCall: ToolCall) => void
): Promise<string> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('Unknown provider');

  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

  const messages = buildMessages(provider, images, symbol, context);
  const messagesHistory = [...messages] as Record<string, unknown>[];

  while (iteration < maxIterations) {
    iteration++;

    const response = await fetch(`${config.baseUrl}${config.chatEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messagesHistory,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
      throw new Error('No response from API');
    }

    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messagesHistory.push({
        role: 'assistant',
        content: message.content || '',
        tool_calls: message.tool_calls,
      });

      for (const tc of message.tool_calls) {
        const toolCallId = generateUUID();
        const toolName = tc.function.name as TradingTool;
        const toolArgs = JSON.parse(tc.function.arguments);

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: result.success ? 'completed' : 'error',
          result: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
          timestamp: Date.now(),
        });

        messagesHistory.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      finalContent = message.content || '';
      break;
    }
  }

  return finalContent;
}

// Call Claude API (client-side)
export async function callClaude(
  model: string,
  apiKey: string,
  images: string[],
  symbol?: string,
  context?: string,
  onToolCall?: (toolCall: ToolCall) => void
): Promise<string> {
  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

  const messages = buildMessages('claude', images, symbol, context);
  const messagesHistory = [...messages] as Record<string, unknown>[];

  while (iteration < maxIterations) {
    iteration++;

    const formattedMessages = messagesHistory.map((msg: Record<string, unknown>) => {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        const content: unknown[] = [];
        for (const item of msg.content as unknown[]) {
          const contentItem = item as Record<string, unknown>;
          if (contentItem.type === 'text') {
            content.push({ type: 'text', text: contentItem.text });
          } else if (contentItem.type === 'image_url') {
            const imageUrl = contentItem.image_url as Record<string, string>;
            const base64Data = imageUrl.url.split(',')[1];
            const mediaType = imageUrl.url.split(';')[0].split(':')[1];
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            });
          }
        }
        return { ...msg, content };
      }
      return msg;
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: formattedMessages,
        tools: TOOL_DEFINITIONS.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const toolUseBlocks = data.content?.filter((b: Record<string, unknown>) => b.type === 'tool_use') || [];
    const textBlocks = data.content?.filter((b: Record<string, unknown>) => b.type === 'text') || [];

    if (toolUseBlocks.length > 0) {
      messagesHistory.push({
        role: 'assistant',
        content: data.content,
      });

      const toolResults: unknown[] = [];
      for (const tc of toolUseBlocks) {
        const toolCallId = generateUUID();
        const toolName = tc.name as TradingTool;
        const toolArgs = tc.input as Record<string, unknown>;

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: result.success ? 'completed' : 'error',
          result: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
          timestamp: Date.now(),
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      messagesHistory.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      finalContent = textBlocks.map((b: Record<string, unknown>) => b.text).join('\n');
      break;
    }
  }

  return finalContent;
}

// Call Gemini API (client-side)
export async function callGemini(
  model: string,
  apiKey: string,
  images: string[],
  symbol?: string,
  context?: string,
  onToolCall?: (toolCall: ToolCall) => void
): Promise<string> {
  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

  const messages = buildMessages('gemini', images, symbol, context);
  const userMessage = messages[1] as Record<string, unknown>;
  const content = userMessage.content as unknown[];
  
  const geminiContents: unknown[] = [];
  const parts: unknown[] = [];
  
  for (const item of content) {
    const contentItem = item as Record<string, unknown>;
    if (contentItem.type === 'text') {
      parts.push({ text: contentItem.text });
    } else if (contentItem.type === 'image_url') {
      const imageUrl = contentItem.image_url as Record<string, string>;
      const base64Data = imageUrl.url.split(',')[1];
      const mediaType = imageUrl.url.split(';')[0].split(':')[1];
      parts.push({
        inlineData: {
          mimeType: mediaType,
          data: base64Data,
        },
      });
    }
  }
  
  geminiContents.push({ role: 'user', parts });

  const functionDeclarations = TOOL_DEFINITIONS.map(t => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));

  while (iteration < maxIterations) {
    iteration++;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiContents,
          tools: [{ functionDeclarations }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    
    if (!candidate) {
      throw new Error('No response from API');
    }

    const parts2 = candidate.content?.parts || [];

    const functionCalls = parts2.filter((p: Record<string, unknown>) => p.functionCall);
    const textParts = parts2.filter((p: Record<string, unknown>) => p.text);

    if (functionCalls.length > 0) {
      geminiContents.push({ role: 'model', parts: parts2 });

      const functionResponses: unknown[] = [];
      for (const fc of functionCalls) {
        const fn = fc.functionCall as Record<string, unknown>;
        const toolCallId = generateUUID();
        const toolName = fn.name as TradingTool;
        const toolArgs = fn.args as Record<string, unknown>;

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall?.({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: result.success ? 'completed' : 'error',
          result: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
          timestamp: Date.now(),
        });

        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: result,
          },
        });
      }

      geminiContents.push({ role: 'user', parts: functionResponses });
    } else {
      finalContent = textParts.map((p: Record<string, unknown>) => p.text).join('\n');
      break;
    }
  }

  return finalContent;
}

// Main function to call LLM (client-side)
export async function callLLM(
  provider: ProviderType,
  model: string,
  apiKey: string,
  images: string[],
  symbol?: string,
  context?: string,
  onToolCall?: (toolCall: ToolCall) => void
): Promise<string> {
  switch (provider) {
    case 'claude':
      return callClaude(model, apiKey, images, symbol, context, onToolCall);
    case 'gemini':
      return callGemini(model, apiKey, images, symbol, context, onToolCall);
    default:
      return callOpenAICompatible(provider, model, apiKey, images, symbol, context, onToolCall);
  }
}
