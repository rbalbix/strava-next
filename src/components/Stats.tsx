import { useContext, useEffect } from 'react';
import { Strava } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';

export default function Stats() {
  const {
    codeReturned,
    client_id,
    client_secret,
    grant_type,
    setAthleteInfo,
    signOut,
  } = useContext(AuthContext);

  useEffect(() => {
    configStravaParams();
  }, []);

  async function configStravaParams() {
    try {
      const response = await api.post(`/token`, null, {
        params: {
          client_id,
          client_secret,
          code: codeReturned,
          grant_type,
        },
      });

      const strava = new Strava({
        client_id,
        client_secret,
        refresh_token: response.data.refresh_token,
      });

      const athlete = await strava.athletes.getLoggedInAthlete();
      setAthleteInfo(athlete);

      // PEGOU TODAS AS ATIVIDADES
      // let activities = await strava.activities.getLoggedInAthleteActivities({
      //   per_page: 200,
      // });

      // PEGAR OS EQUIPAMENTOS
      const gears = JSON.parse(JSON.stringify(athlete.bikes)).concat(
        JSON.parse(JSON.stringify(athlete.shoes))
      );

      // activities = activities.sort((a, b) => {
      //   if (a.gear_id > b.gear_id) return 1;
      //   if (a.gear_id < b.gear_id) return -1;
      //   return 0;
      // });

      // const actX = activities.map((activity) => {
      //   // (({ distance }) => ({ distance }))(activity);
      //   return { gear_id: activity.gear_id, distance: activity.distance };
      // });
      // const picked = (({ a, c }) => ({ a, c }))(object);

      // console.log(
      //   actX.reduce((a, b) => ({
      //     gear_id: a.gear_id,
      //     distance: a.distance + b.distance,
      //   }))
      // );

      // console.log(activities);
    } catch (error) {
      console.log(error);
      signOut();
    }
  }

  return (
    <div className={styles.statsContainer}>
      <main>
        <Card />
        <Card />
        <Card />
      </main>
    </div>
  );
}
