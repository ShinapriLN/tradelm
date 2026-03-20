import { NextRequest } from 'next/server';
import { ProviderType, ToolCall, TradingTool } from '@/types/trading';
import { PROVIDERS } from '@/lib/providers/config';
import { fetchPrices, fetchOHLCV } from '@/lib/tools/price-fetcher';
import { fetchNews, analyzeNewsSentiment } from '@/lib/tools/news-fetcher';
import { calculateAllIndicators } from '@/lib/tools/indicators';
import { randomUUID } from 'crypto';

// Helper to send SSE event
function sendEvent(encoder: TextEncoder, event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Tool definitions for LLM function calling
const TOOL_DEFINITIONS = [
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
5. ALWAYS provide specific trading levels (entry, stop loss, take profit) when recommending BUY or SELL
6. If no symbol is provided by the user, IDENTIFY the symbol from the chart or determine the most likely trading pair

★★★ CRITICAL FORMATTING RULES - STRICT COMPLIANCE REQUIRED ★★★

1. MARKDOWN IS ONLY ALLOWED IN THE 'REASON' SECTION
   - The REASON field CAN use markdown formatting: **bold**, *italic*, bullet points, headings, etc.
   - ALL OTHER FIELDS MUST BE PLAIN TEXT ONLY
   - DO NOT use any markdown symbols (no **, *, #, ~, \`, etc.) in RECOMMENDATION, CONFIDENCE, SYMBOL, ENTRY, STOP_LOSS, TAKE_PROFIT, or RISK_REWARD

2. EXAMPLE OF CORRECT OUTPUT:
RECOMMENDATION: BUY
CONFIDENCE: 75%
SYMBOL: BTC/USDT
ENTRY: 42500
STOP_LOSS: 41500
TAKE_PROFIT_1: 43500
TAKE_PROFIT_2: 44500
TAKE_PROFIT_3: 46000
RISK_REWARD: 1:2
REASON: **Technical Analysis**\nThe chart shows a clear **bullish engulfing pattern** at the $42,000 support level. Key observations:\n- RSI is at 45, indicating room for upside\n- MACD shows bullish crossover\n- Volume increasing on up moves\n\n**Support/Resistance Levels:**\n- Support: $41,500\n- Resistance: $44,000

3. WRONG - DO NOT DO THIS:
❌ RECOMMENDATION: **BUY**  <-- NO MARKDOWN HERE
❌ CONFIDENCE: **75%**  <-- NO MARKDOWN HERE
❌ ENTRY: **$42,500**  <-- NO MARKDOWN HERE

Your final response MUST follow this EXACT format:
RECOMMENDATION: [BUY/SELL/HOLD]  <-- Plain text only
CONFIDENCE: [0-100]%  <-- Plain number with %
SYMBOL: [Trading symbol, e.g., BTC/USDT, AAPL, EUR/USD]  <-- Plain text only
ENTRY: [price number only, no $ sign]  <-- Plain number only
STOP_LOSS: [price number only]  <-- Plain number only
TAKE_PROFIT_1: [price number only]  <-- Plain number only
TAKE_PROFIT_2: [price number only]  <-- Plain number only
TAKE_PROFIT_3: [price number only]  <-- Plain number only
RISK_REWARD: [e.g., 1:2.5]  <-- Plain text ratio
REASON: [Your comprehensive analysis - MARKDOWN IS ALLOWED AND ENCOURAGED HERE. Include:\n- Technical analysis (trend, patterns, indicators)\n- Support and resistance levels identified\n- Market sentiment from news\n- Why the entry price is chosen\n- Why the stop loss is set at that level\n- Why take profit targets are set at those levels\n- Risk factors and considerations\n- Timeframe recommendations]\n\nBe objective and consider both bullish and bearish scenarios before making a recommendation. For HOLD recommendations, explain why it's better to wait.`;

// Execute tool call
async function executeToolCall(name: TradingTool, args: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (name) {
    case 'fetch_prices': {
      const symbol = args.symbol as string;
      return await fetchPrices(symbol);
    }
    case 'fetch_news': {
      const symbol = args.symbol as string;
      const result = await fetchNews(symbol);
      if (result.success && result.data) {
        return { success: true, data: { news: result.data, sentiment: analyzeNewsSentiment(result.data) } };
      }
      return result;
    }
    case 'calculate_indicators': {
      const symbol = args.symbol as string;
      const days = (args.days as number) || 30;
      const ohlcvResult = await fetchOHLCV(symbol, days);
      if (ohlcvResult.success && ohlcvResult.data) {
        return {
          success: true,
          data: {
            symbol,
            ohlcv: ohlcvResult.data,
            indicators: calculateAllIndicators(ohlcvResult.data),
          },
        };
      }
      return ohlcvResult;
    }
    default:
      return { success: false, error: `Unknown tool: ${name}` };
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

// Call OpenAI-compatible API with streaming updates
async function callOpenAICompatible(
  provider: ProviderType,
  model: string,
  apiKey: string,
  messages: unknown[],
  onToolCall: (toolCall: ToolCall) => void
): Promise<string> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('Unknown provider');

  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

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
        const toolCallId = randomUUID();
        const toolName = tc.function.name as TradingTool;
        const toolArgs = JSON.parse(tc.function.arguments);

        onToolCall({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall({
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

// Call Claude API with streaming updates
async function callClaude(
  model: string,
  apiKey: string,
  messages: unknown[],
  onToolCall: (toolCall: ToolCall) => void
): Promise<string> {
  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

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
        const toolCallId = randomUUID();
        const toolName = tc.name as TradingTool;
        const toolArgs = tc.input as Record<string, unknown>;

        onToolCall({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall({
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

// Call Gemini API with streaming updates
async function callGemini(
  model: string,
  apiKey: string,
  messages: unknown[],
  onToolCall: (toolCall: ToolCall) => void
): Promise<string> {
  const maxIterations = 10;
  let iteration = 0;
  let finalContent = '';

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
        const toolCallId = randomUUID();
        const toolName = fn.name as TradingTool;
        const toolArgs = fn.args as Record<string, unknown>;

        onToolCall({
          id: toolCallId,
          name: toolName,
          arguments: toolArgs,
          status: 'running',
          timestamp: Date.now(),
        });

        const result = await executeToolCall(toolName, toolArgs);

        onToolCall({
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

// Parse the LLM response for recommendation
function parseRecommendation(content: string) {
  const recommendationMatch = content.match(/RECOMMENDATION:\s*(BUY|SELL|HOLD)/i);
  const confidenceMatch = content.match(/CONFIDENCE:\s*(\d+)/i);
  const symbolMatch = content.match(/SYMBOL:\s*([^\n]+)/i);
  const entryMatch = content.match(/ENTRY:\s*([\d.,]+)/i);
  const stopLossMatch = content.match(/STOP_LOSS:\s*([\d.,]+)/i);
  const takeProfit1Match = content.match(/TAKE_PROFIT_1:\s*([\d.,]+)/i);
  const takeProfit2Match = content.match(/TAKE_PROFIT_2:\s*([\d.,]+)/i);
  const takeProfit3Match = content.match(/TAKE_PROFIT_3:\s*([\d.,]+)/i);
  const riskRewardMatch = content.match(/RISK_REWARD:\s*([\d:.]+)/i);
  const reasonMatch = content.match(/REASON:\s*([\s\S]*?)(?=\n\nRECOMMENDATION:|\n\nCONFIDENCE:|$)/i);

  const recommendation = (recommendationMatch?.[1]?.toUpperCase() || 'HOLD') as 'BUY' | 'SELL' | 'HOLD';
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  const reason = reasonMatch?.[1]?.trim() || content;
  const detectedSymbol = symbolMatch?.[1]?.trim();

  const parsePrice = (match: RegExpMatchArray | null): number | undefined => {
    if (!match) return undefined;
    const num = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  };

  const tradingLevels = {
    entry: parsePrice(entryMatch),
    stopLoss: parsePrice(stopLossMatch),
    takeProfit1: parsePrice(takeProfit1Match),
    takeProfit2: parsePrice(takeProfit2Match),
    takeProfit3: parsePrice(takeProfit3Match),
  };

  return {
    recommendation,
    confidence,
    reason,
    tradingLevels,
    riskRewardRatio: riskRewardMatch?.[1],
    detectedSymbol,
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const body = await request.json();
    const { images, symbol, context, provider, model, apiKey } = body;

    if (!provider || !model || !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provider, model, and API key are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial status
        controller.enqueue(sendEvent(encoder, 'status', {
          message: 'Starting analysis...',
          provider,
          model,
          symbol: symbol || null,
          imageCount: images.length
        }));

        // Track tool calls
        const toolCalls: ToolCall[] = [];
        const onToolCall = (tc: ToolCall) => {
          const existingIndex = toolCalls.findIndex(t => t.id === tc.id);
          if (existingIndex >= 0) {
            toolCalls[existingIndex] = tc;
          } else {
            toolCalls.push(tc);
          }
          
          // Send tool call update
          controller.enqueue(sendEvent(encoder, 'tool_call', tc));
        };

        try {
          // Build messages
          const messages = buildMessages(provider as ProviderType, images, symbol, context);

          controller.enqueue(sendEvent(encoder, 'status', {
            message: 'Sending request to AI model...'
          }));

          let content: string;

          // Call appropriate API
          switch (provider) {
            case 'claude':
              content = await callClaude(model, apiKey, messages, onToolCall);
              break;
            case 'gemini':
              content = await callGemini(model, apiKey, messages, onToolCall);
              break;
            default:
              content = await callOpenAICompatible(provider, model, apiKey, messages, onToolCall);
          }

          controller.enqueue(sendEvent(encoder, 'status', {
            message: 'Processing response...'
          }));

          // Parse recommendation
          const result = parseRecommendation(content);

          // Send final result
          controller.enqueue(sendEvent(encoder, 'result', {
            success: true,
            data: {
              ...result,
              detailedAnalysis: content,
              toolCalls,
              timestamp: Date.now(),
            }
          }));

          controller.close();
        } catch (error) {
          controller.enqueue(sendEvent(encoder, 'error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
