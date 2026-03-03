import { describe, expect, it, vi } from 'vitest';
import { validateWebhookEvent } from '../../src/services/webhook-validation';

describe('webhook validation regression', () => {
  it('rejects stale events to avoid replay from old payloads', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00.000Z'));

    const result = validateWebhookEvent({
      aspect_type: 'create',
      event_time: Math.floor(Date.now() / 1000) - 3700,
      object_id: 1,
      object_type: 'activity',
      owner_id: 1,
      subscription_id: 1,
    });

    expect(result.success).toBe(false);

    vi.useRealTimers();
  });
});
