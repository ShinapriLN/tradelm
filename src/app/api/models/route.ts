import { NextRequest, NextResponse } from 'next/server';
import { fetchModels } from '@/lib/providers/model-fetcher';
import { ProviderType } from '@/types/trading';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey } = body as { provider: ProviderType; apiKey: string };

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider is required' },
        { status: 400 }
      );
    }

    // Some providers don't require API key to list models (like OpenRouter)
    if (provider !== 'openrouter' && !apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    const result = await fetchModels(provider, apiKey);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      models: result.models,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
