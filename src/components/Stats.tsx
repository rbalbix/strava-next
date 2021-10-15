import { useContext, useEffect, useState } from 'react';
import { PushSpinner } from 'react-spinners-kit';
import { DetailedActivity, Strava, SummaryActivity } from 'strava';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import styles from '../styles/components/Stats.module.css';
import Card from './Card';

type SummaryActivityWithNote = SummaryActivity & {
  note?: string;
};

type DetailedActivityWithNote = DetailedActivity & {
  private_note?: string;
};

export default function Stats() {
  const {
    codeReturned,
    client_id,
    client_secret,
    grant_type,
    setAthleteInfo,
    signIn,
    signOut,
  } = useContext(AuthContext);

  const [gears, setGears] = useState([]);
  const [activities, setActivities] = useState<SummaryActivityWithNote[]>([]);

  useEffect(() => {
    async function configStravaParams() {
      try {
        const strava = await signIn();

        const athlete = await strava.athletes.getLoggedInAthlete();
        setAthleteInfo(athlete);

        // PEGAR OS EQUIPAMENTOS
        const gearsResult: [] = JSON.parse(
          JSON.stringify(athlete.bikes)
        ).concat(JSON.parse(JSON.stringify(athlete.shoes)));
        setGears(gearsResult);

        // PEGAR TODAS AS ATIVIDADES
        let page = 1;
        let activitiesResult = [];
        const activitiesResultTotal: SummaryActivityWithNote[] = [];

        do {
          activitiesResult =
            await strava.activities.getLoggedInAthleteActivities({
              per_page: 200,
              page,
            });

          activitiesResult.map(async (activity) => {
            if (activity.name.includes('*')) {
              const detail: DetailedActivityWithNote =
                await strava.activities.getActivityById({
                  id: activity.id,
                });

              activity.note = detail.private_note;
            }
          });

          activitiesResultTotal.push(...activitiesResult);
          page++;
        } while (activitiesResult.length !== 0 && page > 1);

        activitiesResultTotal.sort((a, b) => {
          if (a.gear_id > b.gear_id) return 1;
          if (a.gear_id < b.gear_id) return -1;
          return 0;
        });

        setActivities(activitiesResultTotal);
      } catch (error) {
        signOut();
      }
    }

    configStravaParams();
  }, []);

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
            let totalDistance = 0;
            let count = 0;
            let activityType = '';

            let totalLubMovingTime = 0;
            let totalFrontLightMovingTime = 0;
            let totalRearLightMovingTime = 0;

            let totalLubDistance = 0;
            let totalFrontLightDistance = 0;
            let totalRearLightDistance = 0;

            let isLubRegistered = false;
            let isFrontLightRegistered = false;
            let isRearLightRegistered = false;

            activities.map((activity) => {
              if (activity.gear_id === gear.id) {
                if (activity.name.includes('*')) {
                  if (!isLubRegistered && activity.note?.includes('lub')) {
                    totalLubMovingTime = totalMovingTime;
                    totalLubDistance = totalDistance;
                    isLubRegistered = true;
                  }
                  if (
                    !isFrontLightRegistered &&
                    activity.note?.includes('frontlight')
                  ) {
                    totalFrontLightMovingTime = totalMovingTime;
                    totalFrontLightDistance = totalDistance;
                    isFrontLightRegistered = true;
                  }
                  if (
                    !isRearLightRegistered &&
                    activity.note?.includes('rearlight')
                  ) {
                    totalRearLightMovingTime = totalMovingTime;
                    totalRearLightDistance = totalDistance;
                    isRearLightRegistered = true;
                  }
                }

                totalMovingTime = totalMovingTime + activity.moving_time;
                totalDistance = totalDistance + activity.distance;
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
                  distance: totalDistance,
                  lubDistance: totalLubDistance,
                  frontLightDistance: totalFrontLightDistance,
                  rearLightDistance: totalRearLightDistance,
                  totalMovingTime,
                  lubMovingTime: totalLubMovingTime,
                  frontLightMovingTime: totalFrontLightMovingTime,
                  rearLightMovingTime: totalRearLightMovingTime,
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
