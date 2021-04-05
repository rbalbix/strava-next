import { GetServerSideProps } from 'next';
import { useEffect } from 'react';
import api from '../services/api';

import { Strava } from 'strava';

interface StatsProps {
  client_id: string;
  client_secret: string;
  code: string;
  grant_type: string;
}

export default function Stats(props: StatsProps) {
  const { client_id, client_secret, code, grant_type } = props;

  useEffect(() => {
    configStravaParams();
  }, []);

  async function configStravaParams() {
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

    console.log(
      await strava.activities.getLoggedInAthleteActivities({
        per_page: 200,
      })
    );
  }

  return <div>zzzzzzz</div>;
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
