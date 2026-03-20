import { OHLCV, RSIResult, MACDResult, BollingerBandsResult, StochasticResult } from '@/types/trading';

// Calculate RSI (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): RSIResult | null {
  if (prices.length < period + 1) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI for all remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }

  if (avgLoss === 0) {
    return { value: 100, signal: 'overbought' };
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (rsi >= 70) signal = 'overbought';
  else if (rsi <= 30) signal = 'oversold';

  return {
    value: Math.round(rsi * 100) / 100,
    signal,
  };
}

// Calculate SMA (Simple Moving Average)
export function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }

  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Math.round((sum / period) * 100) / 100;
}

// Calculate EMA (Exponential Moving Average)
export function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  
  // Start with SMA
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return Math.round(ema * 100) / 100;
}

// Calculate MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult | null {
  if (prices.length < slowPeriod + signalPeriod) {
    return null;
  }

  // Calculate EMAs
  const fastEMA = calculateEMAArray(prices, fastPeriod);
  const slowEMA = calculateEMAArray(prices, slowPeriod);

  if (!fastEMA || !slowEMA) return null;

  // Calculate MACD line
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine.push(fastEMA[i]! - slowEMA[i]!);
    }
  }

  if (macdLine.length < signalPeriod) return null;

  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const macdValue = macdLine[macdLine.length - 1];

  if (signalLine === null) return null;

  const histogram = macdValue - signalLine;

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (macdValue > signalLine && histogram > 0) trend = 'bullish';
  else if (macdValue < signalLine && histogram < 0) trend = 'bearish';

  return {
    macd: Math.round(macdValue * 100) / 100,
    signal: Math.round(signalLine * 100) / 100,
    histogram: Math.round(histogram * 100) / 100,
    trend,
  };
}

// Helper function to calculate EMA array
function calculateEMAArray(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
    if (i < period - 1) result[i] = null;
  }
  result[period - 1] = sum / period;

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    result[i] = (prices[i] - result[i - 1]!) * multiplier + result[i - 1]!;
  }

  return result;
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult | null {
  if (prices.length < period) {
    return null;
  }

  const slice = prices.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;

  // Calculate standard deviation
  const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);

  const upper = sma + stdDev * standardDeviation;
  const lower = sma - stdDev * standardDeviation;
  const currentPrice = prices[prices.length - 1];

  let position: 'above_upper' | 'below_lower' | 'within' = 'within';
  if (currentPrice > upper) position = 'above_upper';
  else if (currentPrice < lower) position = 'below_lower';

  const bandwidth = ((upper - lower) / sma) * 100;

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    bandwidth: Math.round(bandwidth * 100) / 100,
    position,
  };
}

// Calculate ATR (Average True Range)
export function calculateATR(ohlcv: OHLCV[], period: number = 14): number | null {
  if (ohlcv.length < period + 1) {
    return null;
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < ohlcv.length; i++) {
    const high = ohlcv[i].high;
    const low = ohlcv[i].low;
    const prevClose = ohlcv[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // Calculate average
  const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  return Math.round(atr * 100) / 100;
}

// Calculate Stochastic Oscillator
export function calculateStochastic(
  ohlcv: OHLCV[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticResult | null {
  if (ohlcv.length < kPeriod + dPeriod) {
    return null;
  }

  const kValues: number[] = [];

  for (let i = kPeriod - 1; i < ohlcv.length; i++) {
    const slice = ohlcv.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const close = ohlcv[i].close;

    const k = ((close - low) / (high - low)) * 100;
    kValues.push(k);
  }

  // Calculate %D (SMA of %K)
  const dValues = kValues.slice(-dPeriod);
  const d = dValues.reduce((a, b) => a + b, 0) / dPeriod;
  const k = kValues[kValues.length - 1];

  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (k >= 80 && d >= 80) signal = 'overbought';
  else if (k <= 20 && d <= 20) signal = 'oversold';

  return {
    k: Math.round(k * 100) / 100,
    d: Math.round(d * 100) / 100,
    signal,
  };
}

// Calculate all indicators at once
export function calculateAllIndicators(ohlcv: OHLCV[]): {
  rsi: RSIResult | null;
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  ema50: number | null;
  macd: MACDResult | null;
  bollingerBands: BollingerBandsResult | null;
  atr: number | null;
  stochastic: StochasticResult | null;
} {
  const closePrices = ohlcv.map(c => c.close);

  return {
    rsi: calculateRSI(closePrices),
    sma20: calculateSMA(closePrices, 20),
    sma50: calculateSMA(closePrices, 50),
    ema20: calculateEMA(closePrices, 20),
    ema50: calculateEMA(closePrices, 50),
    macd: calculateMACD(closePrices),
    bollingerBands: calculateBollingerBands(closePrices),
    atr: calculateATR(ohlcv),
    stochastic: calculateStochastic(ohlcv),
  };
}
