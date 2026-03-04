import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import * as webhookValidation from '../../../src/services/webhook-validation';

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    aspect_type: 'create',
    event_time: Math.floor(Date.now() / 1000),
    object_id: 12345,
    object_type: 'activity',
    owner_id: 54321,
    subscription_id: 9999,
    updates: { title: 'Morning Ride' },
    ...overrides,
  };
}

describe('validateWebhookEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a valid webhook payload', () => {
    const result = webhookValidation.validateWebhookEvent(makePayload());
    expect(result.success).toBe(true);
  });

  it('rejects payload older than 1 hour', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
    const result = webhookValidation.validateWebhookEvent(
      makePayload({ event_time: oldTimestamp }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('event_time');
    }
  });

  it('rejects payload with invalid enum values', () => {
    const result = webhookValidation.validateWebhookEvent(
      makePayload({ aspect_type: 'invalid-value' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects non-object payload and reports payload type', () => {
    const result = webhookValidation.validateWebhookEvent('invalid-payload');
    expect(result.success).toBe(false);
  });

  it('rejects payload with unexpected fields', () => {
    const payload = {
      ...makePayload(),
      unexpected: 'field',
    };
    const result = webhookValidation.validateWebhookEvent(payload);
    expect(result.success).toBe(false);
  });

  it('returns unknown validation error when parser throws non-zod error', () => {
    const spy = vi
      .spyOn(webhookValidation.StravaWebhookEventSchema, 'parse')
      .mockImplementationOnce(() => {
        throw new Error('unexpected');
      });

    const result = webhookValidation.validateWebhookEvent(makePayload());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unknown validation error');
    }
    spy.mockRestore();
  });

  it('returns unknown validation error for non-object payload when parser throws', () => {
    const spy = vi
      .spyOn(webhookValidation.StravaWebhookEventSchema, 'parse')
      .mockImplementationOnce(() => {
        throw new Error('unexpected');
      });

    const result = webhookValidation.validateWebhookEvent(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Unknown validation error');
    }
    spy.mockRestore();
  });
});
