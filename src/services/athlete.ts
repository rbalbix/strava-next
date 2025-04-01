import { DetailedAthlete, Strava } from 'strava';

async function getAthlete(strava: Strava) {
  return await strava.athletes.getLoggedInAthlete();
}

async function getAthleteStats(strava: Strava, athlete: DetailedAthlete) {
  return await strava.athletes.getStats({
    id: athlete.id,
  });
}

export { getAthlete, getAthleteStats };
