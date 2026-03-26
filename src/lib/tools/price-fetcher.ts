import { PriceData, OHLCV } from '@/types/trading';

// === CoinGecko (crypto) ===

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COIN_ID_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'BNB': 'binancecoin',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'AVAX': 'avalanche-2',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'INJ': 'injective-protocol',
  'FET': 'fetch-ai',
};

function isCryptoSymbol(symbol: string): boolean {
  return symbol.toUpperCase() in COIN_ID_MAP;
}

async function fetchCryptoPrice(symbol: string): Promise<PriceData | null> {
  const coinId = COIN_ID_MAP[symbol.toUpperCase()];
  if (!coinId) return null;

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    if (!response.ok) return null;

    const data = await response.json();
    const md = data.market_data;

    return {
      symbol: symbol.toUpperCase(),
      price: md.current_price.usd,
      change: md.price_change_24h,
      changePercent: md.price_change_percentage_24h,
      volume: md.total_volume.usd,
      high24h: md.high_24h.usd,
      low24h: md.low_24h.usd,
      marketCap: md.market_cap.usd,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

async function fetchCryptoOHLCV(symbol: string, days: number = 30): Promise<OHLCV[]> {
  const coinId = COIN_ID_MAP[symbol.toUpperCase()];
  if (!coinId) return [];

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
    );
    if (!response.ok) return [];

    const data: [number, number, number, number, number][] = await response.json();
    return data.map((item) => ({
      timestamp: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: 0,
    }));
  } catch {
    return [];
  }
}

// === Yahoo Finance (forex, commodities, stocks) ===

const YAHOO_API = 'https://query2.finance.yahoo.com/v8/finance/chart';

// Map trading symbols to Yahoo Finance ticker format
const FOREX_SYMBOL_MAP: Record<string, string> = {
  // Commodities
  'XAUUSD': 'GC=F',
  'XAGUSD': 'SI=F',
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
  'WTICOUSD': 'CL=F',
  'OIL': 'CL=F',
  'NATGAS': 'NG=F',
  // Forex pairs
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'USDJPY=X',
  'USDCHF': 'USDCHF=X',
  'AUDUSD': 'AUDUSD=X',
  'USDCAD': 'USDCAD=X',
  'NZDUSD': 'NZDUSD=X',
  'EURGBP': 'EURGBP=X',
  'EURJPY': 'EURJPY=X',
  'GBPJPY': 'GBPJPY=X',
  'CADJPY': 'CADJPY=X',
  'AUDJPY': 'AUDJPY=X',
  'CHFJPY': 'CHFJPY=X',
  'EURAUD': 'EURAUD=X',
  'EURCHF': 'EURCHF=X',
  'GBPCHF': 'GBPCHF=X',
  'GBPAUD': 'GBPAUD=X',
  'AUDCAD': 'AUDCAD=X',
  'AUDNZD': 'AUDNZD=X',
  'NZDJPY': 'NZDJPY=X',
  'USDSGD': 'USDSGD=X',
  'USDHKD': 'USDHKD=X',
  'USDMXN': 'USDMXN=X',
  'USDZAR': 'USDZAR=X',
  'USDTRY': 'USDTRY=X',
  'EURTRY': 'EURTRY=X',
};

function getYahooTicker(symbol: string): string {
  const upper = symbol.toUpperCase();
  // Check the map first
  if (upper in FOREX_SYMBOL_MAP) return FOREX_SYMBOL_MAP[upper];
  // If it looks like a forex pair (6 chars, all letters), try as =X
  if (/^[A-Z]{6}$/.test(upper)) return `${upper}=X`;
  // Otherwise treat as stock ticker
  return upper;
}

function isForexOrCommodity(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper in FOREX_SYMBOL_MAP || /^[A-Z]{6}$/.test(upper);
}

interface YahooChartResult {
  meta: {
    symbol: string;
    regularMarketPrice: number;
    previousClose?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  };
  timestamp: number[];
  indicators: {
    quote: [{
      open: (number | null)[];
      high: (number | null)[];
      low: (number | null)[];
      close: (number | null)[];
      volume: (number | null)[];
    }];
  };
}

async function fetchYahooChart(symbol: string, interval: string, range: string): Promise<YahooChartResult | null> {
  const ticker = getYahooTicker(symbol);
  try {
    const response = await fetch(
      `${YAHOO_API}/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    return result as YahooChartResult;
  } catch {
    return null;
  }
}

async function fetchYahooPrice(symbol: string): Promise<PriceData | null> {
  const result = await fetchYahooChart(symbol, '1d', '2d');
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prevClose = meta.previousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    price,
    change: Math.round(change * 10000) / 10000,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: meta.regularMarketVolume,
    high24h: meta.regularMarketDayHigh,
    low24h: meta.regularMarketDayLow,
    timestamp: Date.now(),
  };
}

async function fetchYahooOHLCV(symbol: string, days: number = 30): Promise<OHLCV[]> {
  // Yahoo Finance range strings
  const range = days <= 7 ? '7d' : days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y';
  const interval = days <= 7 ? '15m' : '1h';

  const result = await fetchYahooChart(symbol, interval, range);
  if (!result || !result.timestamp) return [];

  const q = result.indicators.quote[0];
  const ohlcv: OHLCV[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    if (q.open[i] != null && q.close[i] != null && q.high[i] != null && q.low[i] != null) {
      ohlcv.push({
        timestamp: result.timestamp[i] * 1000,
        open: q.open[i]!,
        high: q.high[i]!,
        low: q.low[i]!,
        close: q.close[i]!,
        volume: q.volume[i] ?? 0,
      });
    }
  }

  return ohlcv;
}

// === Main exports ===

export async function fetchPrices(symbol: string): Promise<{
  success: boolean;
  data?: PriceData;
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    // Try crypto first
    if (isCryptoSymbol(symbol)) {
      const priceData = await fetchCryptoPrice(symbol);
      if (priceData) return { success: true, data: priceData };
    }

    // Try Yahoo Finance (forex, commodities, stocks)
    const yahooData = await fetchYahooPrice(symbol);
    if (yahooData) return { success: true, data: yahooData };

    return { success: false, error: `Could not fetch price data for ${symbol.toUpperCase()}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchOHLCV(symbol: string, days: number = 30): Promise<{
  success: boolean;
  data?: OHLCV[];
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    // Try crypto first
    if (isCryptoSymbol(symbol)) {
      const ohlcvData = await fetchCryptoOHLCV(symbol, days);
      if (ohlcvData.length > 0) return { success: true, data: ohlcvData };
    }

    // Try Yahoo Finance
    const yahooData = await fetchYahooOHLCV(symbol, days);
    if (yahooData.length > 0) return { success: true, data: yahooData };

    return { success: false, error: `Could not fetch OHLCV data for ${symbol.toUpperCase()}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
