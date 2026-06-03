import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getAuthenticatedAthleteId } from '../../../server/auth';
import {
  getEquipmentThresholds,
  saveEquipmentThreshold,
} from '../../../services/thresholds';

const EquipmentThresholdsRequestSchema = z
  .object({
    gearId: z.string().trim().min(1),
    equipmentId: z.string().trim().min(1),
    thresholdKm: z.number().min(0),
  })
  .strict();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { equipmentThresholds: Record<string, Record<string, number>> }
    | { error: string }
  >,
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const athleteId = getAuthenticatedAthleteId(req);
  if (!athleteId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const equipmentThresholds = await getEquipmentThresholds(athleteId);
    return res.status(200).json({ equipmentThresholds });
  }

  const parseResult = EquipmentThresholdsRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { gearId, equipmentId, thresholdKm } = parseResult.data;
  const equipmentThresholds = await saveEquipmentThreshold(
    athleteId,
    gearId,
    equipmentId,
    thresholdKm,
  );
  return res.status(200).json({ equipmentThresholds });
}
