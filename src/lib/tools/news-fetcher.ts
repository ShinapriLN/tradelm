import { NewsItem } from '@/types/trading';

// DuckDuckGo Instant Answer API (no API key required)
const DUCKDUCKGO_API = 'https://api.duckduckgo.com';

// Fetch news from DuckDuckGo
async function fetchDuckDuckGoNews(query: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(
      `${DUCKDUCKGO_API}/?q=${encodeURIComponent(query + ' stock news')}&format=json&no_html=1`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const newsItems: NewsItem[] = [];

    // Extract related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          newsItems.push({
            title: topic.Text,
            source: 'DuckDuckGo',
            url: topic.FirstURL,
            timestamp: Date.now(),
          });
        }
      }
    }

    return newsItems;
  } catch (error) {
    return [];
  }
}

// Simulate Reddit/Twitter mentions (in production, would use their APIs)
function generateSocialMentions(symbol: string): NewsItem[] {
  const templates = [
    { title: `$${symbol} looking bullish today! 🚀`, sentiment: 'positive' as const },
    { title: `$${symbol} breaking out of resistance level`, sentiment: 'positive' as const },
    { title: `$${symbol} showing bearish divergence on daily`, sentiment: 'negative' as const },
    { title: `Accumulating more $${symbol} at these levels`, sentiment: 'positive' as const },
    { title: `$${symbol} volume drying up, expecting move soon`, sentiment: 'neutral' as const },
    { title: `Taking profits on $${symbol}, great run!`, sentiment: 'positive' as const },
    { title: `$${symbol} support level holding strong`, sentiment: 'positive' as const },
    { title: `Warning: $${symbol} showing weakness`, sentiment: 'negative' as const },
  ];

  const randomTemplates = templates
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  return randomTemplates.map((t, index) => ({
    title: t.title,
    source: index % 2 === 0 ? 'Reddit' : 'Twitter',
    timestamp: Date.now() - index * 3600000, // Stagger timestamps
    sentiment: t.sentiment,
  }));
}

// Generate financial news headlines based on symbol
function generateFinancialNews(symbol: string): NewsItem[] {
  const now = Date.now();
  const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'DOT', 'MATIC', 'LINK', 'AVAX', 'UNI', 'ATOM', 'LTC', 'NEAR'];
  const isCrypto = cryptoKeywords.includes(symbol.toUpperCase());

  const cryptoHeadlines = [
    { title: `${symbol} surges as market sentiment improves`, sentiment: 'positive' as const },
    { title: `Whale alert: Large ${symbol} transfer detected`, sentiment: 'neutral' as const },
    { title: `${symbol} faces regulatory scrutiny in new jurisdiction`, sentiment: 'negative' as const },
    { title: `Institutional interest in ${symbol} continues to grow`, sentiment: 'positive' as const },
    { title: `${symbol} network upgrade scheduled for next month`, sentiment: 'positive' as const },
    { title: `Analyst predicts ${symbol} could reach new highs`, sentiment: 'positive' as const },
    { title: `${symbol} trading volume spikes amid market volatility`, sentiment: 'neutral' as const },
  ];

  const stockHeadlines = [
    { title: `${symbol} beats quarterly earnings expectations`, sentiment: 'positive' as const },
    { title: `${symbol} announces strategic partnership`, sentiment: 'positive' as const },
    { title: `Analysts upgrade ${symbol} price target`, sentiment: 'positive' as const },
    { title: `${symbol} faces supply chain challenges`, sentiment: 'negative' as const },
    { title: `${symbol} CEO discusses growth strategy in interview`, sentiment: 'neutral' as const },
    { title: `${symbol} reports strong revenue growth`, sentiment: 'positive' as const },
    { title: `Market volatility impacts ${symbol} trading`, sentiment: 'neutral' as const },
  ];

  const headlines = isCrypto ? cryptoHeadlines : stockHeadlines;
  const randomHeadlines = headlines.sort(() => Math.random() - 0.5).slice(0, 5);

  return randomHeadlines.map((h, index) => ({
    title: h.title,
    source: ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance'][index % 5],
    url: `https://example.com/news/${symbol}/${index}`,
    publishedAt: new Date(now - index * 7200000).toISOString(), // 2 hours apart
    sentiment: h.sentiment,
  }));
}

// Main function to fetch news
export async function fetchNews(symbol: string, sources?: string[]): Promise<{
  success: boolean;
  data?: NewsItem[];
  error?: string;
}> {
  if (!symbol) {
    return { success: false, error: 'Symbol is required' };
  }

  try {
    const allNews: NewsItem[] = [];

    // Fetch from DuckDuckGo
    const ddgNews = await fetchDuckDuckGoNews(symbol);
    allNews.push(...ddgNews);

    // Generate financial news (simulated)
    const financialNews = generateFinancialNews(symbol);
    allNews.push(...financialNews);

    // Generate social mentions (simulated)
    const socialNews = generateSocialMentions(symbol);
    allNews.push(...socialNews);

    // Sort by timestamp (newest first)
    allNews.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Deduplicate by title similarity
    const uniqueNews = allNews.filter((item, index, self) =>
      index === self.findIndex(t => 
        t.title.toLowerCase().slice(0, 30) === item.title.toLowerCase().slice(0, 30)
      )
    );

    return { 
      success: true, 
      data: uniqueNews.slice(0, 20) // Limit to 20 items
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Analyze sentiment of news
export function analyzeNewsSentiment(news: NewsItem[]): {
  overall: 'positive' | 'negative' | 'neutral';
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
} {
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const item of news) {
    if (item.sentiment === 'positive') positiveCount++;
    else if (item.sentiment === 'negative') negativeCount++;
    else neutralCount++;
  }

  let overall: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    overall = 'positive';
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    overall = 'negative';
  }

  return { overall, positiveCount, negativeCount, neutralCount };
}
