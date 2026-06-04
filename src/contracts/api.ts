import { z } from 'zod';
import type { ActivityStats, DetailedAthlete } from 'strava';
import type { GearStats } from '../services/gear';

export type EquipmentThresholds = Record<string, Record<string, number>>;

const ApiErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .passthrough();

const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string().optional(),
  })
  .passthrough();

const SaveTokensRequestSchema = z
  .object({
    athleteId: z.number().int().positive(),
    refreshToken: z.string().min(1),
    accessToken: z.string().min(1),
    expiresAt: z.number().int().positive(),
    athleteInfo: z.unknown().optional(),
  })
  .strict();

const SendEmailRequestSchema = z
  .object({
    to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
    subject: z.string().min(1).max(200),
    html: z.string().min(1).max(20000),
  })
  .strict();

const RemoteStorageKeySchema = z
  .string()
  .trim()
  .regex(/^strava:(activities|statistics):\d+$/)
  .refine((key) => {
    const athleteId = Number(key.split(':')[2]);
    return Number.isFinite(athleteId) && athleteId > 0;
  });

const RemoteStorageSetRequestSchema = z
  .object({
    key: RemoteStorageKeySchema,
    value: z.unknown(),
  })
  .strict();

type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
type SaveTokensRequest = z.infer<typeof SaveTokensRequestSchema>;
type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
type RemoteStorageSetRequest = z.infer<typeof RemoteStorageSetRequestSchema>;

type DashboardResponse = {
  athlete: DetailedAthlete;
  athleteStats: ActivityStats;
  hasGear: boolean;
  hasActivities: boolean;
  gearStats: GearStats[];
  equipmentThresholds?: EquipmentThresholds;
};

type LogoutResponse = SuccessResponse;

export {
  ApiErrorResponseSchema,
  RemoteStorageKeySchema,
  RemoteStorageSetRequestSchema,
  SaveTokensRequestSchema,
  SendEmailRequestSchema,
  SuccessResponseSchema,
};

export type {
  ApiErrorResponse,
  DashboardResponse,
  LogoutResponse,
  RemoteStorageSetRequest,
  SaveTokensRequest,
  SendEmailRequest,
  SuccessResponse,
};
