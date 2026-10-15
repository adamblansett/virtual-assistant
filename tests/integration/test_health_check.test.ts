import { describe, it, expect, beforeEach } from 'vitest';
import { GET as getHealth } from '@/app/api/health/route';
import { AppStorage } from '@/lib/storage/db';

describe('Production Health Check Endpoint (/api/health)', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('returns healthy status code 200 with complete diagnostics and metrics', async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.version).toBe('1.0.0');
    expect(typeof data.timestamp).toBe('string');
    expect(typeof data.uptimeSeconds).toBe('number');

    // Memory metrics
    expect(data.memory).toBeDefined();
    expect(typeof data.memory.rssMb).toBe('number');
    expect(typeof data.memory.heapUsedMb).toBe('number');

    // Services diagnostics
    expect(data.services).toBeDefined();
    expect(data.services.storage).toBe('operational');
    expect(['mock', 'live']).toContain(data.services.gmail);
    expect(['mock', 'live']).toContain(data.services.calendar);
    expect(['configured', 'mock_ready']).toContain(data.services.telegram);
    expect(data.services.scheduler.totalJobs).toBeGreaterThan(0);

    // Preferences summary
    expect(data.preferences).toBeDefined();
    expect(typeof data.preferences.autoApproveReadOperations).toBe('boolean');
    expect(typeof data.preferences.requireExplicitSendApproval).toBe('boolean');
  });
});
