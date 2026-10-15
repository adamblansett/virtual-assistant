import { NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { TelegramBotService } from '@/lib/services/telegram';

export async function GET() {
  try {
    AppStorage.initialize();
    const config = AppStorage.getIntegrationConfig();
    const prefs = AppStorage.getPreferences();
    const scheduledJobs = AppStorage.listScheduledJobs();
    const enabledJobs = scheduledJobs.filter(j => j.enabled);

    const mem = process.memoryUsage();

    return NextResponse.json({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024))
      },
      services: {
        storage: 'operational',
        aiProvider: config.aiProvider,
        gmail: config.useMockGmail ? 'mock' : 'live',
        calendar: (config.useMockCalendar ?? config.useMockGmail) ? 'mock' : 'live',
        telegram: TelegramBotService.hasLiveToken() ? 'configured' : 'mock_ready',
        scheduler: {
          totalJobs: scheduledJobs.length,
          enabledJobs: enabledJobs.length
        }
      },
      preferences: {
        autoApproveReadOperations: prefs.autoApproveReadOperations,
        requireExplicitSendApproval: prefs.requireExplicitSendApproval,
        requireBulkConfirmationThreshold: prefs.requireBulkConfirmationThreshold
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err.message || 'Health check failure'
      },
      { status: 503 }
    );
  }
}
