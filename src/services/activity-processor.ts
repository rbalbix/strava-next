import redis from './redis';

export async function processActivity(activity: any, athleteId: number) {
  try {
    // 1. Salvar no Redis por 24h
    // await redis.setex(
    //   `strava:activity:${activity.id}`,
    //   86400,
    //   JSON.stringify(activity)
    // );

    // 2. Atualizar estatísticas do atleta
    // await updateAthleteStats(athleteId, activity);

    // 3. Enviar para fila de processamento (opcional)
    // await sendToProcessingQueue(activity);

    console.log(`✅ Atividade ${activity.id} processada`);
  } catch (error) {
    console.error(`Erro ao processar atividade ${activity.id}:`, error);
  }
}
