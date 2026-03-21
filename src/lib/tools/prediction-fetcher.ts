const PREDICTION_API = 'https://shinapri-trading-no-signal.hf.space';

export interface PredictionResult {
  symbol: string;
  direction: 'BUY' | 'SELL';
  predicted_return: number;
  last_close: number;
  predicted_close: number;
  atr: number;
  last_bar_time: string;
}

export async function fetchPrediction(symbol: string): Promise<{
  success: boolean;
  data?: PredictionResult;
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    const response = await fetch(
      `${PREDICTION_API}/predict?symbol=${encodeURIComponent(symbol.toUpperCase())}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Prediction API error: ${response.status} - ${text}` };
    }

    const data: PredictionResult = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch prediction',
    };
  }
}
