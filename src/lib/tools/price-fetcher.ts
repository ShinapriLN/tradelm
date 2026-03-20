import { PriceData, OHLCV } from '@/types/trading';

// Free API for crypto prices (CoinGecko - no API key required)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Free API for stock prices (we'll use Yahoo Finance via a proxy or simulate)
// For demo purposes, we'll use CoinGecko for crypto and simulate stocks

// Mapping of common crypto symbols to CoinGecko IDs
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

// Check if symbol is a cryptocurrency
function isCryptoSymbol(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  return upperSymbol in COIN_ID_MAP;
}

// Fetch cryptocurrency prices from CoinGecko
async function fetchCryptoPrice(symbol: string): Promise<PriceData | null> {
  const coinId = COIN_ID_MAP[symbol.toUpperCase()];
  if (!coinId) return null;

  try {
    const response = await fetch(
      `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const marketData = data.market_data;

    return {
      symbol: symbol.toUpperCase(),
      price: marketData.current_price.usd,
      change: marketData.price_change_24h,
      changePercent: marketData.price_change_percentage_24h,
      volume: marketData.total_volume.usd,
      high24h: marketData.high_24h.usd,
      low24h: marketData.low_24h.usd,
      marketCap: marketData.market_cap.usd,
      timestamp: Date.now(),
    };
  } catch (error) {
    // CoinGecko API error - fall through to simulation
    return null;
  }
}

// Fetch OHLCV data for crypto
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
      volume: 0, // CoinGecko OHLC doesn't include volume
    }));
  } catch (error) {
    // CoinGecko API error - fall through to simulation
    return [];
  }
}

// Simulate stock price for demo (in production, use a real API like Alpha Vantage or Yahoo Finance)
function simulateStockPrice(symbol: string): PriceData {
  // Generate somewhat realistic prices based on symbol
  const basePrice = symbol.charCodeAt(symbol.length - 1) * 10 + 50;
  const randomChange = (Math.random() - 0.5) * 10;
  const price = basePrice + randomChange;
  const change = randomChange;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol: symbol.toUpperCase(),
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: Math.round(Math.random() * 10000000),
    high24h: Math.round((price + Math.random() * 5) * 100) / 100,
    low24h: Math.round((price - Math.random() * 5) * 100) / 100,
    marketCap: Math.round(Math.random() * 100000000000),
    timestamp: Date.now(),
  };
}

// Simulate OHLCV for stocks
function simulateStockOHLCV(symbol: string, days: number = 30): OHLCV[] {
  const basePrice = symbol.charCodeAt(symbol.length - 1) * 10 + 50;
  const ohlcv: OHLCV[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = days; i >= 0; i--) {
    const volatility = basePrice * 0.02;
    const open = basePrice + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.round(Math.random() * 1000000) + 100000;

    ohlcv.push({
      timestamp: now - i * dayMs,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
  }

  return ohlcv;
}

// Main function to fetch prices
export async function fetchPrices(symbol: string): Promise<{
  success: boolean;
  data?: PriceData;
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    if (isCryptoSymbol(symbol)) {
      const priceData = await fetchCryptoPrice(symbol);
      if (priceData) {
        return { success: true, data: priceData };
      }
    }

    // For non-crypto or failed crypto fetch, simulate stock price
    const simulatedData = simulateStockPrice(symbol);
    return { success: true, data: simulatedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Main function to fetch OHLCV data
export async function fetchOHLCV(symbol: string, days: number = 30): Promise<{
  success: boolean;
  data?: OHLCV[];
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    if (isCryptoSymbol(symbol)) {
      const ohlcvData = await fetchCryptoOHLCV(symbol, days);
      if (ohlcvData.length > 0) {
        return { success: true, data: ohlcvData };
      }
    }

    // For non-crypto or failed crypto fetch, simulate stock OHLCV
    const simulatedData = simulateStockOHLCV(symbol, days);
    return { success: true, data: simulatedData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
