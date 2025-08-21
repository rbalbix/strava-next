import { processActivity } from './activity-processor';
import { getAthleteAccessToken } from './strava-auth';

async function handleActivityEvent(event: any) {
  const { object_id: activityId, owner_id: athleteId, aspect_type } = event;

  console.log(
    `🎯 Activity ${aspect_type}: ${activityId} by athlete ${athleteId}`
  );

  // Buscar access token do atleta
  const accessToken = await getAthleteAccessToken(athleteId);
  if (!accessToken) {
    console.error(`❌ Token não encontrado para athlete ${athleteId}`);
    return;
  }

  // Buscar atividade completa
  try {
    const activity = await fetchStravaActivity(activityId, accessToken);
    console.log('✅ Atividade recuperada:', activity.name);

    // 9. Processar a atividade (salvar no DB, cache, etc.)
    await processActivity(activity, athleteId);
  } catch (error) {
    console.error(`❌ Erro ao buscar atividade ${activityId}:`, error);
  }
}

export async function fetchStravaActivity(
  activityId: number,
  accessToken: string
) {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Strava API error: ${response.status} ${response.statusText}`
    );
  }

  const activity = await response.json();
  return activity;
}
