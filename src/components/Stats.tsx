import { useContext, useEffect, useState } from 'react';
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

  const [gears, setGears] = useState([]);
  const [activities, setActivities] = useState([]);

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

      // PEGAR OS EQUIPAMENTOS
      const gearsResult: [] = JSON.parse(JSON.stringify(athlete.bikes)).concat(
        JSON.parse(JSON.stringify(athlete.shoes))
      );
      setGears(gearsResult);

      // PEGAR TODAS AS ATIVIDADES
      let activitiesResult = await strava.activities.getLoggedInAthleteActivities(
        {
          per_page: 200,
        }
      );
      activitiesResult = activitiesResult.sort((a, b) => {
        if (a.gear_id > b.gear_id) return 1;
        if (a.gear_id < b.gear_id) return -1;
        return 0;
      });
      setActivities(activitiesResult);
    } catch (error) {
      console.log(error);
      signOut();
    }
  }

  return (
    <div className={styles.statsContainer}>
      <main>
        {gears.map((gear) => {
          let totalMovingTime = 0;
          activities.map((activity) => {
            if (activity.gear_id === gear.id) {
              totalMovingTime = totalMovingTime + activity.moving_time;
            }
          });

          return (
            <Card
              key={gear.id}
              gear={{
                name: gear.name,
                distance: gear.distance,
                totalMovingTime,
              }}
            />
          );
        })}
      </main>
    </div>
  );
}
