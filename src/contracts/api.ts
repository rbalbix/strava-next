import { z } from 'zod';
import type { ActivityStats, DetailedAthlete } from 'strava';
import type { GearStats } from '../services/gear';

export type EquipmentThresholds = Record<
  string,
  Record<string, ThresholdEntry>
>;

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
    // Nomes de template — fonte única do contrato. `services/email-templates`
    // tipa o registro como `Record<SendEmailRequest['template'], ...>`, então
    // cadastrar um nome aqui sem definição lá (ou o contrário) quebra o
    // typecheck. HTML livre não é aceito: só o que o template renderiza
    // chega ao destinatário (VULN-009).
    template: z.enum(['webhook-error', 'contact']),
    // Params planos: escalares com teto de tamanho. Sem objetos aninhados,
    // o payload continua pequeno e o renderizador sabe o que esperar.
    params: z
      .record(
        z.string().min(1).max(64),
        z.union([z.string().max(8000), z.number(), z.boolean()]),
      )
      .optional(),
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
type ThresholdUnit = 'km' | 'h';

type ThresholdEntry = {
  value: number;
  unit: ThresholdUnit;
};

type EquipmentThresholdsRequest = {
  gearId: string;
  equipmentId: string;
  thresholdKm: number;
  unit?: ThresholdUnit;
};

type EquipmentThresholdsResponse = {
  equipmentThresholds: EquipmentThresholds;
};
// D14: um código não reconhecido numa observação privada, já com o nome do
// gear anexado no servidor (só existe gear conhecido aqui).
type UnrecognizedCode = {
  activityId: number;
  gearName: string;
  startDate: string;
  word: string;
  suggestion: string;
};

type DashboardResponse = {
  athlete: DetailedAthlete;
  athleteStats: ActivityStats;
  hasGear: boolean;
  hasActivities: boolean;
  gearStats: GearStats[];
  equipmentThresholds?: EquipmentThresholds;
  // D14: ausente quando não há casos (ou quando a leitura best-effort falhou).
  unrecognizedCodes?: UnrecognizedCode[];
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
  EquipmentThresholdsRequest,
  EquipmentThresholdsResponse,
  LogoutResponse,
  RemoteStorageSetRequest,
  SaveTokensRequest,
  SendEmailRequest,
  SuccessResponse,
  ThresholdEntry,
  ThresholdUnit,
  UnrecognizedCode,
};
