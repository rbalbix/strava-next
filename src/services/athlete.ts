import { DetailedAthlete, Strava } from 'strava';

async function getAthlete(strava: Strava) {
  try {
    return strava.athletes.getLoggedInAthlete();
  } catch (error) {
    console.error('Erro ao buscar atleta:', error);
    throw error;
  }
}

async function getAthleteStats(strava: Strava, athlete: DetailedAthlete) {
  try {
    return strava.athletes.getStats({
      id: athlete.id,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do atleta:', error);
    throw error;
  }
}

export { getAthlete, getAthleteStats };
