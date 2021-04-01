import { useRouter } from 'next/router';
import { useEffect } from 'react';
import api from '../services/api';

export default function Stats() {
  const router = useRouter();

  async function configStravaParams() {
    const response = await api.post(`/token`, {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: '',
      grant_type: process.env.GRANT_TYPE,
    });
  }

  useEffect(() => {
    //configStravaParams();
  }, []);
  console.log(router);

  return <div>XXXXX</div>;
}
