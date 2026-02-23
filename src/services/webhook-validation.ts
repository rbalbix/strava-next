import { z } from 'zod';
import { getLogger } from './logger';

// Schemas for Strava webhook events
const AspectTypeSchema = z.enum(['create', 'update', 'delete']);
const ObjectTypeSchema = z.enum(['activity', 'athlete']);

const UpdatesSchema = z.record(z.string(), z.unknown()).optional();

export const StravaWebhookEventSchema = z
  .object({
    aspect_type: AspectTypeSchema,
    event_time: z.number().int().positive(),
    object_id: z.number().int().positive(),
    object_type: ObjectTypeSchema,
    owner_id: z.number().int().positive(),
    subscription_id: z.number().int().positive(),
    updates: UpdatesSchema,
  })
  .strict()
  .refine((event) => {
    // Reject events older than 1 hour
    const eventTimeMs = event.event_time * 1000;
    const nowMs = Date.now();
    const maxAgeMs = 60 * 60 * 1000; // 1 hour
    return nowMs - eventTimeMs <= maxAgeMs;
  }, {
    message: 'event_time is older than 1 hour',
    path: ['event_time'],
  });

export type StravaWebhookEvent = z.infer<typeof StravaWebhookEventSchema>;

export function validateWebhookEvent(payload: unknown): { success: true; data: StravaWebhookEvent } | { success: false; error: string } {
  const log = getLogger();
  try {
    const validated = StravaWebhookEventSchema.parse(payload);
    return { success: true, data: validated };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const details = e.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const msg = `Webhook validation failed: ${details}`;
      log.warn({ payload, issues: e.issues }, msg);
      return { success: false, error: msg };
    }
    log.error({ err: e, payload }, 'Unknown error validating webhook payload');
    return { success: false, error: 'Unknown validation error' };
  }
}
