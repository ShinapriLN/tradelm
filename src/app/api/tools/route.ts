import { NextRequest, NextResponse } from 'next/server';
import { fetchPrices, fetchOHLCV } from '@/lib/tools/price-fetcher';
import { fetchNews, analyzeNewsSentiment } from '@/lib/tools/news-fetcher';
import { 
  calculateRSI, 
  calculateSMA, 
  calculateEMA, 
  calculateMACD, 
  calculateBollingerBands, 
  calculateATR, 
  calculateStochastic,
  calculateAllIndicators 
} from '@/lib/tools/indicators';
import { TradingTool, OHLCV } from '@/types/trading';

interface ToolRequest {
  tool: TradingTool;
  params: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ToolRequest;
    const { tool, params } = body;

    let result;

    switch (tool) {
      case 'fetch_prices': {
        const symbol = params.symbol as string;
        if (!symbol) {
          return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
        }
        result = await fetchPrices(symbol);
        break;
      }

      case 'fetch_news': {
        const symbol = params.symbol as string;
        if (!symbol) {
          return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
        }
        const news = await fetchNews(symbol);
        if (news.success && news.data) {
          const sentiment = analyzeNewsSentiment(news.data);
          result = { ...news, sentiment };
        } else {
          result = news;
        }
        break;
      }

      case 'calculate_rsi': {
        const prices = params.prices as number[];
        const period = (params.period as number) || 14;
        if (!prices || !Array.isArray(prices)) {
          return NextResponse.json({ success: false, error: 'Prices array is required' }, { status: 400 });
        }
        const rsiResult = calculateRSI(prices, period);
        result = { success: rsiResult !== null, data: rsiResult };
        break;
      }

      case 'calculate_sma': {
        const prices = params.prices as number[];
        const period = params.period as number;
        if (!prices || !Array.isArray(prices) || !period) {
          return NextResponse.json({ success: false, error: 'Prices array and period are required' }, { status: 400 });
        }
        const sma = calculateSMA(prices, period);
        result = { success: sma !== null, data: sma };
        break;
      }

      case 'calculate_ema': {
        const prices = params.prices as number[];
        const period = params.period as number;
        if (!prices || !Array.isArray(prices) || !period) {
          return NextResponse.json({ success: false, error: 'Prices array and period are required' }, { status: 400 });
        }
        const ema = calculateEMA(prices, period);
        result = { success: ema !== null, data: ema };
        break;
      }

      case 'calculate_macd': {
        const prices = params.prices as number[];
        if (!prices || !Array.isArray(prices)) {
          return NextResponse.json({ success: false, error: 'Prices array is required' }, { status: 400 });
        }
        const macd = calculateMACD(prices);
        result = { success: macd !== null, data: macd };
        break;
      }

      case 'calculate_bollinger_bands': {
        const prices = params.prices as number[];
        const period = (params.period as number) || 20;
        const stdDev = (params.stdDev as number) || 2;
        if (!prices || !Array.isArray(prices)) {
          return NextResponse.json({ success: false, error: 'Prices array is required' }, { status: 400 });
        }
        const bb = calculateBollingerBands(prices, period, stdDev);
        result = { success: bb !== null, data: bb };
        break;
      }

      case 'calculate_atr': {
        const ohlcv = params.ohlcv as OHLCV[];
        const period = (params.period as number) || 14;
        if (!ohlcv || !Array.isArray(ohlcv)) {
          return NextResponse.json({ success: false, error: 'OHLCV array is required' }, { status: 400 });
        }
        const atr = calculateATR(ohlcv, period);
        result = { success: atr !== null, data: atr };
        break;
      }

      case 'calculate_stochastic': {
        const ohlcv = params.ohlcv as OHLCV[];
        if (!ohlcv || !Array.isArray(ohlcv)) {
          return NextResponse.json({ success: false, error: 'OHLCV array is required' }, { status: 400 });
        }
        const stoch = calculateStochastic(ohlcv);
        result = { success: stoch !== null, data: stoch };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown tool' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to get OHLCV data and calculate all indicators
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const days = parseInt(searchParams.get('days') || '30');

  if (!symbol) {
    return NextResponse.json({ success: false, error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Fetch OHLCV data
    const ohlcvResult = await fetchOHLCV(symbol, days);
    
    if (!ohlcvResult.success || !ohlcvResult.data) {
      return NextResponse.json(ohlcvResult);
    }

    // Calculate all indicators
    const indicators = calculateAllIndicators(ohlcvResult.data);

    // Fetch prices
    const priceResult = await fetchPrices(symbol);

    // Fetch news
    const newsResult = await fetchNews(symbol);

    return NextResponse.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        ohlcv: ohlcvResult.data,
        price: priceResult.data,
        indicators,
        news: newsResult.data?.slice(0, 10),
        newsSentiment: newsResult.success && newsResult.data ? analyzeNewsSentiment(newsResult.data) : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
