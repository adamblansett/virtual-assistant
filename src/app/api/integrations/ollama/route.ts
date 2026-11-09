import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { OpenWeightProvider, OPEN_WEIGHT_PRESETS, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OPEN_WEIGHT_MODEL } from '@/lib/ai/openweight';

export async function GET(req: NextRequest) {
  AppStorage.initialize();
  const config = AppStorage.getIntegrationConfig();
  const { searchParams } = new URL(req.url);
  const customUrl = searchParams.get('baseUrl') || config.openWeightBaseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;

  const status = await OpenWeightProvider.checkOllamaStatus(customUrl);

  return NextResponse.json({
    ...status,
    activeModel: config.openWeightModel || process.env.OPEN_WEIGHT_MODEL || DEFAULT_OPEN_WEIGHT_MODEL,
    baseUrl: customUrl,
    presets: OPEN_WEIGHT_PRESETS
  });
}

export async function POST(req: NextRequest) {
  try {
    AppStorage.initialize();
    const config = AppStorage.getIntegrationConfig();
    const body = await req.json();
    const model = body.model || config.openWeightModel || DEFAULT_OPEN_WEIGHT_MODEL;
    const baseUrl = body.baseUrl || config.openWeightBaseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;

    const pullResult = await OpenWeightProvider.pullOllamaModel(model, baseUrl);
    const updatedStatus = await OpenWeightProvider.checkOllamaStatus(baseUrl);

    return NextResponse.json({
      ...pullResult,
      installedModels: updatedStatus.installedModels
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to pull model via Ollama' },
      { status: 500 }
    );
  }
}
