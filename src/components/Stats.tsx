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
    setUserInfo,
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

      const { firstname, lastname, profile } = response.data.athlete;
      const userInfo = { name: `${firstname} ${lastname}`, avatar: profile };
      setUserInfo(userInfo);

      const strava = new Strava({
        client_id,
        client_secret,
        refresh_token: response.data.refresh_token,
      });

      // console.log(await strava.activities.getLoggedInAthleteActivities());
    } catch (error) {
      console.log(error);
      // signOut();
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
