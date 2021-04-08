import { GetServerSideProps } from 'next';
import { useEffect, useRef, useState } from 'react';
import { Strava } from 'strava';
import Card from '../components/Card';
import Header from '../components/Header';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../services/api';
import styles from '../styles/pages/Stats.module.css';

interface StatsProps {
  client_id: string;
  client_secret: string;
  code: string;
  grant_type: string;
}

export default function Stats(props: StatsProps) {
  const { client_id, client_secret, code, grant_type } = props;

  const [user, setUser] = useState(null);

  const userRef = useRef(null);

  useEffect(() => {
    configStravaParams();
  }, []);

  async function configStravaParams() {
    try {
      const response = await api.post(`/token`, null, {
        params: {
          client_id,
          client_secret,
          code,
          grant_type,
        },
      });

      const strava = new Strava({
        client_id,
        client_secret,
        refresh_token: response.data.refresh_token,
      });

      const { firstname, lastname, profile } = response.data.athlete;
      const userInfo = { name: `${firstname} ${lastname}`, avatar: profile };

      setUser(userInfo);

      userRef.current = userInfo;

      console.log('stats.tsx ', user, userInfo, userRef);
      // console.log(setUserInfo);

      // setUserInfo(user);

      // console.log(await strava.activities.getLoggedInAthleteActivities());
    } catch (error) {
      console.log(error);
      // signOut();
    }
  }

  return (
    // <AuthProvider codeReturned={code} user={userRef.current}>
    //   <div className={styles.statsContainer}>
    //     <Header />
    //     <main>
    //       <Card />
    //       <Card />
    //       <Card />
    //     </main>
    //   </div>
    // </AuthProvider>
    <></>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;
  const grant_type = process.env.GRANT_TYPE;
  const { code } = ctx.query;

  return {
    props: {
      client_id,
      client_secret,
      code,
      grant_type,
    },
  };
};
