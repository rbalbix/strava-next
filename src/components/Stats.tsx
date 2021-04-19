import { useContext, useEffect, useState } from 'react';
import { Strava } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';

import { PushSpinner } from 'react-spinners-kit';

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
      let page = 1;
      let activitiesResult = [];
      let activitiesResultTotal = [];

      do {
        activitiesResult = await strava.activities.getLoggedInAthleteActivities(
          {
            per_page: 200,
            page,
          }
        );
        activitiesResultTotal.push(...activitiesResult);
        page++;
      } while (activitiesResult.length !== 0 && page > 1);

      activitiesResultTotal = activitiesResultTotal.sort((a, b) => {
        if (a.gear_id > b.gear_id) return 1;
        if (a.gear_id < b.gear_id) return -1;
        return 0;
      });
      setActivities(activitiesResultTotal);
    } catch (error) {
      console.log(error);
      signOut();
    }
  }

  return (
    <div className={styles.statsContainer}>
      <main>
        {gears.length === 0 || activities.length === 0 ? (
          <div className={styles.spinnerLoading}>
            <PushSpinner size={30} loading={true} />
            <span>Loading ...</span>
          </div>
        ) : (
          gears.map((gear) => {
            let totalMovingTime = 0;
            let count = 0;
            let activityType = '';
            activities.map((activity) => {
              if (activity.gear_id === gear.id) {
                totalMovingTime = totalMovingTime + activity.moving_time;
                activityType = activity.type;
                count++;
              }
            });

            return (
              <Card
                key={gear.id}
                gear={{
                  name: gear.name,
                  type: activityType,
                  distance: gear.distance,
                  totalMovingTime,
                  count,
                }}
              />
            );
          })
        )}
      </main>
    </div>
  );
}
